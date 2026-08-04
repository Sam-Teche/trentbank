// utils/watchTransactions.js
const Transaction = require("../models/Transaction");
const { sendTransferConfirmationEmail } = require("../services/emailService");

let activeChangeStream = null;

function watchTransactionStatusChanges() {
  const changeStream = Transaction.watch([], { fullDocument: "updateLookup" });
  activeChangeStream = changeStream;

  changeStream.on("change", async (change) => {
    try {
      // Only care about updates where "status" was one of the changed fields
      if (
        change.operationType === "update" &&
        change.updateDescription?.updatedFields?.status
      ) {
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
          `Status changed to "${transaction.status}" for transaction ${transaction.reference} — sending email to ${recipientEmail}`,
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
