const express = require("express");
const { validationResult } = require("express-validator");
const User = require("../models/User");
const Account = require("../models/Account")
const Transaction = require("../models/Transaction");
const { authenticateToken } = require("../middleware/auth");
const { profileUpdateValidation } = require("../middleware/validation");

const router = express.Router();

// Get user profile
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Fetch accounts linked to the user
    const accounts = await Account.find({ userId: user._id }).lean();

    // Example: If you also have a Transaction model
    const transactions = await Transaction.find({ userId: user._id })
      .sort({ date: -1 }) // latest first
      .limit(10) // send only recent 10
      .lean();

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        accountNumber: user.accountNumber,
        accountType: user.accountType,
        balance: user.balance,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
      accounts: accounts.map((acc) => ({
        id: acc._id,
        type: acc.accountType,
        number: acc.accountNumber,
        balance: acc.balance,
        limit: acc.creditLimit || null,
      })),
      transactions: transactions.map((tx) => ({
        id: tx._id,
        type: tx.type, // credit or debit
        amount: tx.amount,
        date: tx.date,
        description: tx.description,
        status: tx.status, // pending, completed
      })),
    });
  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});


// Update user profile
router.put(
  "/profile",
  authenticateToken,
  profileUpdateValidation,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { firstName, lastName, email } = req.body;
      const user = await User.findById(req.user._id);

      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (email && email !== user.email) {
        // Check if email already exists
        const existingUser = await User.findOne({
          email,
          _id: { $ne: user._id },
        });
        if (existingUser) {
          return res.status(409).json({ message: "Email already in use" });
        }
        user.email = email;
        user.isEmailVerified = false;
      }

      await user.save();

      res.json({
        message: "Profile updated successfully",
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          accountNumber: user.accountNumber,
          accountType: user.accountType,
          balance: user.balance,
          isEmailVerified: user.isEmailVerified,
        },
      });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Get account balance
router.get("/balance", authenticateToken, (req, res) => {
  res.json({
    balance: req.user.balance,
    accountNumber: req.user.accountNumber,
    accountType: req.user.accountType,
  });
});

module.exports = router;
