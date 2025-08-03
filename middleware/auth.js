const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "J3m7P0s4V8y1C5f9K2n6Q9t3W7z0E4h8";

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Middleware to authenticate JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      message: "Access denied. No token provided.",
    });
  }

  try {
    // Use ACCESS_TOKEN_SECRET, fallback to JWT_SECRET for backward compatibility
    const secret = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;
    const decoded = jwt.verify(token, secret);
    req.user = {
      ...decoded,
      _id: decoded.id || decoded._id, // Use whichever exists
    };
    next();
  } catch (error) {
    console.error("Token verification error:", error);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Token expired. Please refresh your session.",
      });
    } else if (error.name === "JsonWebTokenError") {
      return res.status(403).json({
        message: "Invalid token.",
      });
    } else {
      return res.status(500).json({
        message: "Token verification failed.",
      });
    }
  }
};
module.exports = {
  authenticateToken,
  verifyToken,
};
