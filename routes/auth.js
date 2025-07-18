const express = require("express");
const { validationResult } = require("express-validator");
const User = require("../models/User");
const ResetToken = require("../models/ResetToken");
const { authenticateToken } = require("../middleware/auth");
const {
  loginValidation,
  signupValidation,
  simpleSignupValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation,
} = require("../middleware/validation");
const { generateToken, generateResetToken } = require("../utils/auth");
const { sendPasswordResetEmail } = require("../services/emailService");

const router = express.Router();

// Enhanced signup endpoint for complete form
router.post("/signup", signupValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const {
      // Account Type
      accountType,
      
      // Personal Information
      firstName,
      lastName,
      email,
      dateOfBirth,
      phone,
      ssn,
      
      // Address Information
      address1,
      address2,
      city,
      state,
      zip,
      
      // Employment/Financial Information
      employmentStatus,
      employer,
      occupation,
      annualIncome,
      sourceOfFunds,
      
      // Account Setup
      username,
      password,
      
      // Terms (already validated)
      termsAgreement,
      electronicConsent,
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }, { ssn }],
    });

    if (existingUser) {
      let message = "User already exists";
      if (existingUser.email === email) message = "Email already registered";
      if (existingUser.username === username) message = "Username already taken";
      if (existingUser.ssn === ssn) message = "SSN already registered";
      
      return res.status(409).json({ message });
    }

    // Generate account number
    const accountNumber = await User.generateAccountNumber();

    // Create new user with all form data
    const user = new User({
      // Account Type
      accountType,
      
      // Personal Information
      firstName,
      lastName,
      email,
      dateOfBirth: new Date(dateOfBirth),
      phone,
      ssn,
      
      // Address Information
      address: {
        street1: address1,
        street2: address2 || "",
        city,
        state: state.toUpperCase(),
        zipCode: zip,
      },
      
      // Employment/Financial Information
      employment: {
        status: employmentStatus,
        employer: employer || "",
        occupation: occupation || "",
        annualIncome,
        sourceOfFunds,
      },
      
      // Account Setup
      username,
      password,
      accountNumber,
      
      // Initial balance based on account type
      balance: accountType === "premium" ? 5000 : 1000,
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Return success response
    res.status(201).json({
      message: "Account created successfully",
      token,
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
        age: user.age,
        fullAddress: user.fullAddress,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
      }));
      return res.status(400).json({
        message: "Validation failed",
        errors,
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      const value = error.keyValue[field];
      return res.status(409).json({
        message: `${field} '${value}' already exists`,
      });
    }
    
    res.status(500).json({ message: "Internal server error" });
  }
});

// Simple signup endpoint (for backward compatibility)
router.post("/signup/simple", simpleSignupValidation, async (req, res) => {
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

    // Create new user with minimal data
    const user = new User({
      username,
      email,
      password,
      firstName,
      lastName,
      accountNumber,
      accountType: "checking",
      balance: 1000,
      // These would need to be filled later
      dateOfBirth: new Date("1990-01-01"),
      phone: "000-000-0000",
      ssn: "000-00-0000",
      address: {
        street1: "Not provided",
        city: "Not provided",
        state: "CA",
        zipCode: "00000",
      },
      employment: {
        status: "employed",
        annualIncome: "under-25k",
        sourceOfFunds: "employment",
      },
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
    console.error("Simple signup error:", error);
    if (error.code === 11000) {
      return res.status(409).json({
        message: "User with this email or username already exists",
      });
    }
    res.status(500).json({ message: "Internal server error" });
  }
});

// Login endpoint (unchanged)
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
        message: "Account temporarily locked due to too many failed login attempts",
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
    await user.updateOne({ lastLogin: new Date() });

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
        fullName: user.fullName,
        accountNumber: user.accountNumber,
        accountType: user.accountType,
        balance: user.balance,
        age: user.age,
        fullAddress: user.fullAddress,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Token verification endpoint (updated to include new fields)
router.get("/verify", authenticateToken, (req, res) => {
  res.json({
    message: "Token is valid",
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
      age: req.user.age,
      fullAddress: req.user.fullAddress,
      phone: req.user.phone,
      employment: req.user.employment,
      createdAt: req.user.createdAt,
      lastLogin: req.user.lastLogin,
    },
  });
});

// Forgot password endpoint (unchanged)
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

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({
        message: "If the email exists, a reset link has been sent",
      });
    }

    const resetToken = generateResetToken();
    await ResetToken.deleteMany({ userId: user._id });
    await ResetToken.create({
      userId: user._id,
      token: resetToken,
    });

    await sendPasswordResetEmail(user.email, user.firstName, resetToken);

    res.json({ message: "If the email exists, a reset link has been sent" });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Reset password endpoint (unchanged)
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

    const resetToken = await ResetToken.findOne({ token }).populate("userId");
    if (!resetToken) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    const user = await User.findById(resetToken.userId);
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    await ResetToken.deleteOne({ _id: resetToken._id });

    res.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Change password endpoint
router.post("/change-password", authenticateToken, changePasswordValidation, async (req, res) => {
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
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res
        .status(400)
        .json({ message: "Current password is incorrect" });
    }

    // Update password (this should run when password IS valid)
    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Logout endpoint
router.post("/logout", authenticateToken, (req, res) => {
  res.json({ message: "Logout successful" });
});


// Admin unlock endpoint
router.post("/admin/unlock-account", async (req, res) => {
  try {
    const { identifier } = req.body; // username or email
    
    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }]
    });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    await user.resetLoginAttempts();
    
    res.json({ message: "Account unlocked successfully" });
  } catch (error) {
    console.error("Unlock error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/check-lock-status/:identifier", async (req, res) => {
  try {
    const user = await User.findOne({
      $or: [
        { username: req.params.identifier },
        { email: req.params.identifier },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      isLocked: user.isLocked,
      loginAttempts: user.loginAttempts,
      lockUntil: user.lockUntil,
      remainingTime: user.lockUntil
        ? Math.max(0, user.lockUntil - Date.now())
        : 0,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});




module.exports = router;