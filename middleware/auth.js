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
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }

  try {
    const user = await User.findById(decoded.userId).select("-password");
    if (!user || !user.isActive) {
      return res.status(403).json({ message: "User not found or inactive" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(403).json({ message: "Invalid token" });
  }
};

module.exports = {
  authenticateToken,
  verifyToken,
};
