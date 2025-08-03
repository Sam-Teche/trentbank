const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const {
  limiter,
  authLimiter,
  loginLimiter,
} = require("./middleware/rateLimiter");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const { initializeSampleData } = require("./utils/sampleData");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const adminDashboardRoutes = require("./routes/adminDashboard");
require("dotenv").config();

const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "https://trentbank.netlify.app",
      "https://trentbank.netlify.app/",
      "https://trentbank.onrender.com",
      "https://trentadmin.netlify.app/",
      "https://trentadmin.netlify.app",
    ],
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.set("trust proxy", 1);

// Apply general rate limiting to all routes
app.use(limiter);

// MongoDB connection
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/trentbank";

mongoose
  .connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
  })
  .then(async () => {
    console.log("✅ Connected to MongoDB");
    await initializeSampleData();
    console.log("📝 Sample users for testing:");
    console.log(
      "   Username: john_doe, Email: john@example.com, Password: password123"
    );
    console.log(
      "   Username: jane_smith, Email: jane@example.com, Password: password123"
    );
  })
  .catch((error) => {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  });

// Health check route (before rate limiting)
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// Apply auth rate limiting to all auth routes
// Apply specific login rate limiting to login route only
app.use("/api/auth/login", loginLimiter);


app.use("/api/auth", authLimiter);
// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin/dashboard", adminDashboardRoutes);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Trent Bank Backend Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔗 Database: ${MONGODB_URI}`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  // ✅ Added async
  console.log("SIGTERM received, shutting down gracefully");
  try {
    await mongoose.connection.close(); // ✅ Changed to async/await
    console.log("Database connection closed");
    process.exit(0);
  } catch (error) {
    // ✅ Added error handling
    console.error("Error closing database connection:", error);
    process.exit(1);
  }
});


module.exports = app;
