const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "admin_secret_key";

function verifyAdminToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(403).json({ message: "No token provided" });
  }

  jwt.verify(token, JWT_SECRET, (err, admin) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.admin = admin;
    next();
  });
}

module.exports = { verifyAdminToken };
