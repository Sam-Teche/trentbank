// utils/watchTransactions.js
const Transaction = require("../models/Transaction");
const { sendTransferConfirmationEmail } = require("./emailService");

let activeChangeStream = null;

function watchTransactionStatusChanges() {
  // Guard: prevent starting a second watcher if this function is
  // accidentally called more than once in the same process (e.g. from a
  // duplicate require, hot-reload, or double invocation in server.js).
  if (activeChangeStream) {
    console.warn(
      "⚠️ Transaction watcher already running — skipping duplicate start.",
    );
    return;
  }

  const changeStream = Transaction.watch([], { fullDocument: "updateLookup" });
  activeChangeStream = changeStream;

  changeStream.on("change", async (change) => {
    try {
      // Two cases trigger an email:
      // 1. INSERT — a brand new transaction is created (default status: "pending")
      // 2. UPDATE — an existing transaction's "status" field was changed
      const isNewTransaction = change.operationType === "insert";
      const isStatusUpdate =
        change.operationType === "update" &&
        change.updateDescription?.updatedFields?.status;

      if (isNewTransaction || isStatusUpdate) {
        const transaction = change.fullDocument;
        if (!transaction) return;

        // The email goes to the RECIPIENT of the transfer, not the account owner.
        // This must be stored in metadata.recipientEmail when the transfer is created.
        const recipientEmail = transaction.metadata?.recipientEmail;
        const recipientName = transaction.metadata?.recipientName;

        if (!recipientEmail) {
          console.warn(
            "No metadata.recipientEmail found — skipping email for transaction",
            transaction._id,
          );
          return;
        }

        console.log(
          isNewTransaction
            ? `New transaction ${transaction.reference} created with status "${transaction.status}" — sending email to ${recipientEmail}`
            : `Status changed to "${transaction.status}" for transaction ${transaction.reference} — sending email to ${recipientEmail}`,
        );

        await sendTransferConfirmationEmail({
          email: recipientEmail,
          firstName: recipientName,
          transaction,
          failureReason:
            transaction.status === "failed"
              ? transaction.metadata?.failureReason
              : undefined,
        });
      }
    } catch (err) {
      console.error("Error handling transaction change:", err);
    }
  });

  changeStream.on("error", (err) => {
    console.error("Change stream error:", err);
  });

  console.log("👀 Watching Transaction collection for status changes...");
}

// Call this during graceful shutdown (e.g. in your SIGTERM handler)
async function closeTransactionWatcher() {
  if (activeChangeStream) {
    try {
      await activeChangeStream.close();
      console.log("Transaction change stream closed");
    } catch (err) {
      console.error("Error closing change stream:", err);
    }
  }
}

module.exports = watchTransactionStatusChanges;
module.exports.closeTransactionWatcher = closeTransactionWatcher;
