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
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

module.exports = mongoose.model("Transaction", transactionSchema);
