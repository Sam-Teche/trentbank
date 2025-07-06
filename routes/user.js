const express = require("express");
const { validationResult } = require("express-validator");
const User = require("../models/User");
const { authenticateToken } = require("../middleware/auth");
const { profileUpdateValidation } = require("../middleware/validation");

const router = express.Router();

// Get user profile
router.get("/profile", authenticateToken, (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      fullName: req.user.fullName,
      accountNumber: req.user.accountNumber,
      accountType: req.user.accountType,
      balance: req.user.balance,
      isEmailVerified: req.user.isEmailVerified,
      createdAt: req.user.createdAt,
      lastLogin: req.user.lastLogin,
    },
  });
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
