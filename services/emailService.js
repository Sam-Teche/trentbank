const nodemailer = require("nodemailer");

// Email configuration
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.sendgrid.net",
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Send password reset email
const sendPasswordResetEmail = async (email, firstName, resetToken) => {
  const resetUrl = `${
    process.env.FRONTEND_URL || "https://trentbank.netlify.app"
  }/reset-password?token=${resetToken}`;

  if (process.env.NODE_ENV !== "test") {
    try {
      await emailTransporter.sendMail({
        from: process.env.SMTP_FROM || "noreply@trentbank.com",
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
};
