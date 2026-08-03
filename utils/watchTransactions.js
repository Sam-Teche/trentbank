// utils/watchTransactions.js
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const { sendTransferConfirmationEmail } = require("../services/emailService");

function watchTransactionStatusChanges() {
  const changeStream = Transaction.watch([], { fullDocument: "updateLookup" });

  changeStream.on("change", async (change) => {
    try {
      // Only care about updates where "status" was one of the changed fields
      if (
        change.operationType === "update" &&
        change.updateDescription?.updatedFields?.status
      ) {
        const transaction = change.fullDocument;
        if (!transaction) return;

        const user = await User.findById(transaction.userId);
        if (!user || !user.email) {
          console.warn("No user/email found for transaction", transaction._id);
          return;
        }

        console.log(
          `Status changed to "${transaction.status}" for transaction ${transaction.reference} — sending email...`,
        );

        await sendTransferConfirmationEmail({
          email: user.email,
          firstName: user.firstName,
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

module.exports = watchTransactionStatusChanges;
