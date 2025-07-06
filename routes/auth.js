const express = require("express");
const { validationResult } = require("express-validator");
const User = require("../models/User");
const ResetToken = require("../models/ResetToken");
const { authenticateToken } = require("../middleware/auth");
const {
  loginValidation,
  signupValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation,
} = require("../middleware/validation");
const { generateToken, generateResetToken } = require("../utils/auth");
const { sendPasswordResetEmail } = require("../services/emailService");

const router = express.Router();

// Signup endpoint
router.post("/signup", signupValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { username, email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(409).json({
        message: "User with this email or username already exists",
      });
    }

    // Generate account number
    const accountNumber = await User.generateAccountNumber();

    // Create new user
    const user = new User({
      username,
      email,
      password,
      firstName,
      lastName,
      accountNumber,
      balance: 1000, // Welcome bonus
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      message: "Account created successfully",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        accountNumber: user.accountNumber,
        balance: user.balance,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    if (error.code === 11000) {
      return res.status(409).json({
        message: "User with this email or username already exists",
      });
    }
    res.status(500).json({ message: "Internal server error" });
  }
});

// Login endpoint
router.post("/login", loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { username, password } = req.body;

    // Find user
    const user = await User.findOne({
      $or: [{ username }, { email: username }],
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        message:
          "Account temporarily locked due to too many failed login attempts",
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ message: "Account is deactivated" });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incLoginAttempts();
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts();
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Return success response
    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        accountNumber: user.accountNumber,
        balance: user.balance,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Token verification endpoint
router.get("/verify", authenticateToken, (req, res) => {
  res.json({
    message: "Token is valid",
    user: {
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      accountNumber: req.user.accountNumber,
      balance: req.user.balance,
    },
  });
});

// Forgot password endpoint
router.post("/forgot-password", forgotPasswordValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists or not for security
      return res.json({
        message: "If the email exists, a reset link has been sent",
      });
    }

    // Generate reset token
    const resetToken = generateResetToken();

    // Delete any existing reset tokens for this user
    await ResetToken.deleteMany({ userId: user._id });

    // Create new reset token
    await ResetToken.create({
      userId: user._id,
      token: resetToken,
    });

    // Send email
    await sendPasswordResetEmail(user.email, user.firstName, resetToken);

    res.json({ message: "If the email exists, a reset link has been sent" });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Reset password endpoint
router.post("/reset-password", resetPasswordValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { token, newPassword } = req.body;

    // Find reset token
    const resetToken = await ResetToken.findOne({ token }).populate("userId");
    if (!resetToken) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token" });
    }

    // Find user
    const user = await User.findById(resetToken.userId);
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Update user password
    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    // Delete reset token
    await ResetToken.deleteOne({ _id: resetToken._id });

    res.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Change password endpoint
router.post(
  "/change-password",
  authenticateToken,
  changePasswordValidation,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(req.user._id);

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(
        currentPassword
      );
      if (!isCurrentPasswordValid) {
        return res
          .status(400)
          .json({ message: "Current password is incorrect" });
      }

      // Update password
      user.password = newPassword;
      user.passwordChangedAt = new Date();
      await user.save();

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Logout endpoint
router.post("/logout", authenticateToken, (req, res) => {
  res.json({ message: "Logout successful" });
});

module.exports = router;
