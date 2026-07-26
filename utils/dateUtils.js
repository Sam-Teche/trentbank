//utils/dateUtils.js
// -------------------------------------------------------------
// NOTE: This runs on the BACKEND (Node/Render), which has no concept
// of the recipient's device timezone unless the frontend sends it.
// Pass `timeZone` through from the client on each request; falls back
// to a default if none is provided.
 
function formatDate(date, timeZone = 'UTC') {
    try {
        return new Date(date).toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short',
            timeZone
        });
    } catch (err) {
        // Invalid/unrecognized timeZone string (e.g. bad IANA id) — fall back safely
        return new Date(date).toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short',
            timeZone: 'UTC'
        });
    }
}
 
module.exports = { formatDate };
 
// -------------------------------------------------------------
// emailService.js
// -------------------------------------------------------------
// const { formatDate } = require('./utils/dateUtils');
//
// Then when calling sendTransferConfirmationEmail, pass the
// recipient's timezone through (captured on the frontend via
// Intl.DateTimeFormat().resolvedOptions().timeZone and sent
// with the transfer request):
//
// await sendTransferConfirmationEmail(transaction, {
//     ...otherParams,
//     timeZone: req.body.timeZone // e.g. "America/New_York"
// });
//
// Inside the email template:
// ${formatDate(transaction.date, timeZo