const mongoose = require("mongoose");

const notificationSettingSchema = new mongoose.Schema(
  {
    notificationsEnabled: { type: Boolean, default: false },
    senderEmail: { type: String },
    smtpHost: { type: String },
    smtpPort: { type: Number },
    smtpUser: { type: String },
    smtpPass: { type: String }, // Encrypt or protect in production
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "NotificationSetting",
  notificationSettingSchema
);
