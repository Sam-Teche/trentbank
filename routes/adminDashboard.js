// routes/adminDashboard.js
const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User"); // Your existing User model
const Transaction = require("../models/Transaction"); // Your existing Transaction model
const Admin = require("../models/Admin"); // We'll create this if you don't have it

const router = express.Router();

// Admin Authentication Middleware
const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(401)
        .json({ error: "Access denied. No token provided." });
    }

    // Handle fixed token for demo purposes (works with your frontend)
    if (token.startsWith("fixed-admin-token-")) {
      req.admin = {
        id: "demo-admin",
        username: "admin",
        role: "super_admin",
        name: "System Administrator",
      };
      return next();
    }

    // Handle regular JWT tokens
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );

    // If you have Admin model, uncomment this:
    // const admin = await Admin.findById(decoded.id);
    // if (!admin) {
    //     return res.status(401).json({ error: 'Invalid token.' });
    // }
    // req.admin = admin;

    // For now, if token is valid, allow access
    req.admin = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token." });
  }
};

// Admin Login (works with your frontend's fixed credentials)
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check for fixed credentials that match your frontend
    if (username === "admin" && password === "admin123") {
      const token = jwt.sign(
        {
          id: "demo-admin",
          username: "admin",
          role: "super_admin",
        },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "24h" }
      );

      return res.json({
        token,
        admin: {
          id: "demo-admin",
          username: "admin",
          name: "System Administrator",
          role: "super_admin",
        },
      });
    }

    // If you have other admin accounts in database, check here
    // const admin = await Admin.findOne({ username });
    // if (!admin || !await bcrypt.compare(password, admin.password)) {
    //     return res.status(401).json({ error: 'Invalid credentials' });
    // }

    return res.status(401).json({ error: "Invalid credentials" });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Dashboard Stats
router.get("/stats", authenticateAdmin, async (req, res) => {
  try {
    const [totalUsers, totalTransactions, pendingReviews, revenueData] =
      await Promise.all([
        User.countDocuments(),
        Transaction.countDocuments(),
        Transaction.countDocuments({ status: "pending" }),
        Transaction.aggregate([
          { $match: { status: "completed" } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
      ]);

    const totalRevenue = revenueData[0]?.total || 0;

    res.json({
      totalUsers,
      totalTransactions,
      totalRevenue,
      pendingReviews,
    });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Admin Profile
router.get("/profile", authenticateAdmin, async (req, res) => {
  try {
    // For demo admin
    if (req.admin.id === "demo-admin") {
      return res.json({
        name: "System Administrator",
        username: "admin",
        role: "super_admin",
      });
    }

    // For database admin users
    res.json({
      name: req.admin.name || "Admin User",
      username: req.admin.username,
      role: req.admin.role || "admin",
    });
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Recent Transactions
router.get("/transactions/recent", authenticateAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // Adjust field names based on your Transaction model
    const transactions = await Transaction.find()
      .populate("userId", "name email username") // Adjust based on your User model fields
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const formattedTransactions = transactions.map((txn) => ({
      ...txn,
      user_name: txn.userId?.name || txn.userId?.username,
      user_email: txn.userId?.email,
      id: txn._id,
    }));

    res.json(formattedTransactions);
  } catch (error) {
    console.error("Recent transactions error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Recent Users
router.get("/users/recent", authenticateAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const users = await User.find()
      .select("-password") // Exclude password
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const formattedUsers = users.map((user) => ({
      ...user,
      id: user._id,
    }));

    res.json(formattedUsers);
  } catch (error) {
    console.error("Recent users error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Approve Transaction
router.put("/transactions/:id/approve", authenticateAdmin, async (req, res) => {
  try {
    const transaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      {
        status: "completed",
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    // Update user balance if it's a deposit
    if (transaction.type === "deposit") {
      await User.findByIdAndUpdate(transaction.userId, {
        $inc: { balance: transaction.amount },
      });
    }

    res.json({ message: "Transaction approved", transaction });
  } catch (error) {
    console.error("Approve transaction error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Reject Transaction
router.put("/transactions/:id/reject", authenticateAdmin, async (req, res) => {
  try {
    const transaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      {
        status: "failed",
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    res.json({ message: "Transaction rejected", transaction });
  } catch (error) {
    console.error("Reject transaction error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get Transaction Details
router.get("/transactions/:id", authenticateAdmin, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id).populate(
      "userId",
      "name email username accountNumber"
    );

    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    res.json(transaction);
  } catch (error) {
    console.error("Transaction details error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Activate User
router.put("/users/:id/activate", authenticateAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        status: "active",
        updatedAt: new Date(),
      },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User activated", user });
  } catch (error) {
    console.error("Activate user error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Suspend User
router.put("/users/:id/suspend", authenticateAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        status: "suspended",
        updatedAt: new Date(),
      },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User suspended", user });
  } catch (error) {
    console.error("Suspend user error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get User Details
router.get("/users/:id", authenticateAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("User details error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get All Users (with pagination)
router.get("/users", authenticateAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const search = req.query.search;

    let query = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get All Transactions (with pagination)
router.get("/transactions", authenticateAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const type = req.query.type;

    let query = {};
    if (status) query.status = status;
    if (type) query.type = type;

    const transactions = await Transaction.find(query)
      .populate("userId", "name email username")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Transaction.countDocuments(query);

    res.json({
      transactions,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error("Get transactions error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
