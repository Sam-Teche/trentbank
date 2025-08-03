const mongoose = require("mongoose");

// Reset Token Schema
const resetTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: Date.now,
      expires: 3600, // 1 hour
    },
  },
  {
    timestamps: true,
  }
);

const ResetToken = mongoose.model("ResetToken", resetTokenSchema);

module.exports = ResetToken;
