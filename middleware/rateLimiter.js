const rateLimit = require("express-rate-limit");

const createRateLimiter = (windowMs, max, messageText) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: "Rate limit exceeded",
        message: messageText,
        retryAfter: Math.ceil(windowMs / 1000),
        limit: max,
        windowMs: windowMs,
      });
    },
  });
};

const limiter = createRateLimiter(
  15 * 60 * 1000,
  100,
  "Too many requests from this IP, please try again later."
);

const authLimiter = createRateLimiter(
  15 * 60 * 1000,
  5,
  "Too many authentication attempts, please try again later."
);

const loginLimiter = createRateLimiter(
  1 * 60 * 1000,
  3,
  "Too many login attempts. Please wait 1 minute before trying again."
);

module.exports = {
  limiter,
  authLimiter,
  loginLimiter,
};
