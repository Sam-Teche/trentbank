const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      trim: true,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    date: {
      type: Date,
      default: Date.now,
    },
    // Optional: Link to which account (if multi accounts)
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
    },
    // Optional: Transaction reference
    reference: {
      type: String,
      unique: true,
      sparse: true,
    },
    // NEW: Store additional transaction metadata
    metadata: {
      type: Object,
      default: {},
      // For transfers, this might include:
      // recipientName, recipientEmail, bankName, accountType,
      // accountNumber (last 4 digits), routingNumber,
      // transferAmount, transferFee, transferPurpose, totalAmount
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

// Index for better query performance
transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ reference: 1 });
transactionSchema.index({ status: 1 });

module.exports = mongoose.model("Transaction", transactionSchema);
