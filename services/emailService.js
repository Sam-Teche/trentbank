const { Resend } = require("resend");
const generateReceiptPdf = require("../utils/generateReceiptPdf")// fixed: default export, no braces

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

      // Build receipt HTML for this specific transaction
      const receiptHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Trent Bank - Transfer Receipt</h2>
          <p><strong>Reference:</strong> ${transaction.reference}</p>
          <p><strong>Recipient:</strong> ${recipientName || ""}</p>
          <p><strong>Bank:</strong> ${bankName || ""}</p>
          <p><strong>Amount:</strong> $${Number(transferAmount).toFixed(2)}</p>
          <p><strong>Fee:</strong> $${Number(transferFee).toFixed(2)}</p>
          <p><strong>Total:</strong> $${Number(totalAmount).toFixed(2)}</p>
          <p><strong>Status:</strong> ${transaction.status}</p>
        </div>
      `;

      // Generate PDF only when this function actually runs (no top-level await)
      const pdfBuffer = await generateReceiptPdf(receiptHtml);

      const { data, error } = await resend.emails.send({
        from: process.env.RESEND_FROM || "Trent Bank <noreply@cryptoneve.com>",
        to: email,
        subject: `Transfer Confirmation - ${transaction.reference}`,
        html: `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; background-color: #eef1f5; padding: 32px 20px;">
        <div style="background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(11,37,69,0.08); border: 1px solid #e2e6ec;">

            <!-- Header -->
            <div style="background-color: #0b2545; padding: 28px 36px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="vertical-align: middle;">
                            <table style="border-collapse: collapse;">
                                <tr>
                                    <td style="width: 34px; height: 34px; background-color: #d4af37; border-radius: 6px; text-align: center; vertical-align: middle; font-weight: bold; color: #0b2545; font-size: 16px;">S</td>
                                    <td style="padding-left: 10px; color: #ffffff; font-size: 17px; font-weight: bold; letter-spacing: 0.4px;">SAMUEL TESTING</td>
                                </tr>
                            </table>
                        </td>
                        <td style="text-align: right; vertical-align: middle;">
                            <span style="background-color: rgba(212,175,55,0.15); color: #d4af37; font-size: 11px; font-weight: bold; padding: 5px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.6px; border: 1px solid rgba(212,175,55,0.4);">${transaction.status}</span>
                        </td>
                    </tr>
                </table>
            </div>

            <div style="height: 3px; background: linear-gradient(90deg, #d4af37, #0b2545);"></div>

            <!-- Body -->
            <div style="padding: 36px;">
                <p style="color: #8a8f98; font-size: 11px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; margin: 0 0 6px 0;">Transfer notification</p>
                <h2 style="color: #0b2545; font-size: 22px; margin: 0 0 18px 0;">Your transfer is on its way</h2>

                <p style="color: #444; font-size: 14px; line-height: 1.7; margin: 0 0 6px 0;">Dear ${firstName},</p>
                <p style="color: #444; font-size: 14px; line-height: 1.7; margin: 0 0 28px 0;">
                    We're writing to confirm that your transfer has been initiated and is currently <strong style="color: #0b2545;">${transaction.status}</strong>. A summary of the transaction is provided below for your records.
                </p>

                <!-- Transaction Summary Card -->
                <div style="border: 1px solid #e2e6ec; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #f7f9fb; padding: 14px 20px; border-bottom: 1px solid #e2e6ec;">
                        <p style="margin: 0; color: #0b2545; font-size: 13px; font-weight: bold;">Transaction summary</p>
                    </div>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 13px 20px; color: #6b7280; font-size: 13px; border-bottom: 1px solid #eef1f5;">Reference</td>
                            <td style="padding: 13px 20px; text-align: right; color: #0b2545; font-size: 13px; font-weight: 600; font-family: 'Courier New', monospace; border-bottom: 1px solid #eef1f5;">${transaction.reference}</td>
                        </tr>
                        <tr>
                            <td style="padding: 13px 20px; color: #6b7280; font-size: 13px; border-bottom: 1px solid #eef1f5;">Date initiated</td>
                            <td style="padding: 13px 20px; text-align: right; color: #1f2937; font-size: 13px; border-bottom: 1px solid #eef1f5;">${formatDate(transaction.date)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 13px 20px; color: #6b7280; font-size: 13px; border-bottom: 1px solid #eef1f5;">Recipient</td>
                            <td style="padding: 13px 20px; text-align: right; color: #1f2937; font-size: 13px; border-bottom: 1px solid #eef1f5;">${recipientName || ""}</td>
                        </tr>
                        <tr>
                            <td style="padding: 13px 20px; color: #6b7280; font-size: 13px; border-bottom: 1px solid #eef1f5;">Recipient bank</td>
                            <td style="padding: 13px 20px; text-align: right; color: #1f2937; font-size: 13px; border-bottom: 1px solid #eef1f5;">${bankName || ""}</td>
                        </tr>
                        <tr>
                            <td style="padding: 13px 20px; color: #6b7280; font-size: 13px; border-bottom: 1px solid #eef1f5;">Account number</td>
                            <td style="padding: 13px 20px; text-align: right; color: #1f2937; font-size: 13px; font-family: 'Courier New', monospace; border-bottom: 1px solid #eef1f5;">${accountNumber || ""}</td>
                        </tr>
                        <tr>
                            <td style="padding: 13px 20px; color: #6b7280; font-size: 13px; border-bottom: 1px solid #eef1f5;">Amount</td>
                            <td style="padding: 13px 20px; text-align: right; color: #1f2937; font-size: 13px; border-bottom: 1px solid #eef1f5;">$${Number(transferAmount).toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 13px 20px; color: #6b7280; font-size: 13px;">Transfer fee</td>
                            <td style="padding: 13px 20px; text-align: right; color: #1f2937; font-size: 13px;">$${Number(transferFee).toFixed(2)}</td>
                        </tr>
                    </table>
                    <div style="background-color: #0b2545; padding: 16px 20px;">
                        <table style="width: 100%;">
                            <tr>
                                <td style="color: #ffffff; font-size: 14px; font-weight: bold;">Total debited</td>
                                <td style="text-align: right; color: #d4af37; font-size: 18px; font-weight: bold;">$${Number(totalAmount).toFixed(2)}</td>
                            </tr>
                        </table>
                    </div>
                </div>

                <!-- Action Buttons -->
                <table style="width: 100%; margin-top: 28px;">
                    <tr>
                        <td style="width: 50%; padding-right: 8px;">
                            <a href="${transactionUrl || "#"}" style="display: block; text-align: center; background-color: #0b2545; color: #ffffff; font-size: 13px; font-weight: bold; padding: 12px; border-radius: 6px; text-decoration: none;">View transaction</a>
                        </td>
                        <td style="width: 50%; padding-left: 8px;">
                            <a href="${receiptUrl || "#"}" style="display: block; text-align: center; background-color: #ffffff; color: #0b2545; font-size: 13px; font-weight: bold; padding: 11px; border-radius: 6px; text-decoration: none; border: 1px solid #0b2545;">Download receipt</a>
                        </td>
                    </tr>
                </table>

                <!-- Security Notice -->
                <div style="margin-top: 24px; padding: 14px 18px; background-color: #fff7e6; border-radius: 6px; border: 1px solid #f0d999;">
                    <table style="border-collapse: collapse;">
                        <tr>
                            <td style="vertical-align: top; padding-right: 10px; color: #b8860b; font-size: 14px;">&#9888;</td>
                            <td style="color: #664d03; font-size: 13px; line-height: 1.6;">
                                If you did not authorize this transfer, please contact our support team immediately. For your security, we will never ask for your PIN or full password by email.
                            </td>
                        </tr>
                    </table>
                </div>

                <p style="color: #444; font-size: 14px; line-height: 1.7; margin-top: 30px; margin-bottom: 0;">
                    Thank you for banking with us.<br>
                    <strong style="color: #0b2545;">The Samuel TESTING Team</strong>
                </p>
            </div>

            <!-- Footer -->
            <div style="background-color: #f7f9fb; padding: 22px 36px; border-top: 1px solid #e2e6ec;">
                <p style="margin: 0 0 8px 0; color: #8a8f98; font-size: 11px; text-align: center;">
                    Samuel TESTING is a licensed financial institution. This is an automated message &mdash; please do not reply directly.
                </p>
                <p style="margin: 0; color: #b0b4bb; font-size: 11px; text-align: center;">
                    &copy; ${new Date().getFullYear()} Samuel TESTING &nbsp;&bull;&nbsp;
                    <a href="${privacyUrl || "#"}" style="color: #8a8f98; text-decoration: underline;">Privacy policy</a> &nbsp;&bull;&nbsp;
                    <a href="${supportUrl || "#"}" style="color: #8a8f98; text-decoration: underline;">Contact support</a>
                </p>
            </div>
        </div>
    </div>
`,
      //   attachments: [
      //     {
      //       filename: `Receipt-${transaction.reference}.pdf`,
      //       content: pdfBuffer.toString("base64"),
      //     },
      //   ],
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
