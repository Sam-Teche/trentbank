const rateLimit = require("express-rate-limit");

// General rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests",
    message: "Too many requests from this IP, please try again later.",
    retryAfter: Math.ceil(15 * 60),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Authentication rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Increased from 5 to 10 for auth routes
  message: {
    error: "Too many authentication attempts",
    message: "Too many authentication attempts, please try again later.",
    retryAfter: Math.ceil(15 * 60),
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// Specific login rate limiting
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes (shorter window)
  max: 5, // 5 attempts per 5 minutes
  message: {
    error: "Too many login attempts",
    message:
      "Too many login attempts. Please wait 5 minutes before trying again.",
    retryAfter: Math.ceil(5 * 60),
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

module.exports = {
  limiter,
  authLimiter,
  loginLimiter,
};
