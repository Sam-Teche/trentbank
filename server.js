const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const { limiter, authLimiter } = require("./middleware/rateLimiter");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const { initializeSampleData } = require("./utils/sampleData");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
require("dotenv").config();

const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:5500",
      "http://127.0.0.1:5500",
      "http://localhost:5500",
      "https://trentbank.netlify.app",
      "https://trentbank.netlify.app/",
    ],
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.set("trust proxy", 1);
// Rate limiting
app.use(limiter);
app.use("/api/auth", authLimiter);

// MongoDB connection
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/trentbank";

mongoose
  .connect(MONGODB_URI, {
    //useNewUrlParser: true,
    //useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000, // Add timeout settings
    socketTimeoutMS: 45000,
  })
  .then(async () => {
    console.log("✅ Connected to MongoDB");

    // Initialize sample data AFTER MongoDB connection is established
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

// Health check route
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);

// Error handling middleware
app.use(errorHandler);
app.use(notFoundHandler);

const PORT = process.env.PORT || 3000;

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Trent Bank Backend Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔗 Database: ${MONGODB_URI}`);

  // Remove the sample data initialization from here
  // It's now handled in the MongoDB connection .then() block
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  mongoose.connection.close(() => {
    console.log("Database connection closed");
    process.exit(0);
  });
});

module.exports = app;
