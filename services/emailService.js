const { Resend } = require("resend");

// Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Send password reset email
const sendPasswordResetEmail = async (email, firstName, resetToken) => {
  const resetUrl = `${
    process.env.FRONTEND_URL || "https://trentbank.netlify.app"
  }/reset-password?token=${resetToken}`;

  if (process.env.NODE_ENV !== "test") {
    try {
      const { data, error } = await resend.emails.send({
        from: process.env.RESEND_FROM || "Trent Bank <noreply@trentbank.com>",
        to: email,
        subject: "Password Reset Request - Trent Bank",
        html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333;">Password Reset Request</h2>
                        <p>Dear ${firstName},</p>
                        <p>You have requested to reset your password for your Trent Bank account.</p>
                        <p>Click the button below to reset your password:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
                        </div>
                        <p>This link will expire in 1 hour.</p>
                        <p>If you did not request this reset, please ignore this email.</p>
                        <p>Best regards,<br>Trent Bank Team</p>
                    </div>
                `,
      });

      if (error) {
        console.error("Email sending error:", error);
        return false;
      }

      return true;
    } catch (emailError) {
      console.error("Email sending error:", emailError);
      return false;
    }
  }

  return true; // Return true for test environment
};

const sendTransferConfirmationEmail = async ({
  email,
  firstName,
  transaction,
}) => {
  if (process.env.NODE_ENV !== "test") {
    try {
      const {
        recipientName,
        bankName,
        transferAmount,
        transferFee,
        totalAmount,
      } = transaction.metadata || {};

      const { data, error } = await resend.emails.send({
        from: process.env.RESEND_FROM || "Trent Bank <noreply@cryptoneve.com>",
        to: email,
        subject: `Transfer Confirmation - ${transaction.reference}`,
        html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333;">Transfer Initiated</h2>
                        <p>Dear ${firstName},</p>
                        <p>Your transfer has been initiated and is currently <strong>${transaction.status}</strong>.</p>
                        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                            <tr><td style="padding: 8px 0; color: #666;">Reference</td><td style="padding: 8px 0; text-align: right;">${transaction.reference}</td></tr>
                            <tr><td style="padding: 8px 0; color: #666;">Recipient</td><td style="padding: 8px 0; text-align: right;">${recipientName || ""}</td></tr>
                            <tr><td style="padding: 8px 0; color: #666;">Bank</td><td style="padding: 8px 0; text-align: right;">${bankName || ""}</td></tr>
                            <tr><td style="padding: 8px 0; color: #666;">Amount</td><td style="padding: 8px 0; text-align: right;">$${Number(transferAmount).toFixed(2)}</td></tr>
                            <tr><td style="padding: 8px 0; color: #666;">Fee</td><td style="padding: 8px 0; text-align: right;">$${Number(transferFee).toFixed(2)}</td></tr>
                            <tr><td style="padding: 8px 0; color: #333; font-weight: bold; border-top: 1px solid #eee;">Total</td><td style="padding: 8px 0; text-align: right; font-weight: bold; border-top: 1px solid #eee;">$${Number(totalAmount).toFixed(2)}</td></tr>
                        </table>
                        <p>If you did not authorize this transfer, please contact us immediately.</p>
                        <p>Best regards,<br>Trent Bank Team</p>
                    </div>
                `,
      });

      if (error) {
        console.error("Email sending error:", error);
        return false;
      }

      return true;
    } catch (emailError) {
      console.error("Email sending error:", emailError);
      return false;
    }
  }

  return true; // Return true for test environment
};

module.exports = {
  sendPasswordResetEmail,
  sendTransferConfirmationEmail,
};