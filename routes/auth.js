const express = require("express");
const { validationResult } = require("express-validator");
const User = require("../models/User");
const Account = require("../models/Account");
const ResetToken = require("../models/ResetToken");
const { authenticateToken } = require("../middleware/auth");
const {
  loginValidation,
  signupValidation,
  //simpleSignupValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation,
} = require("../middleware/validation");
const { generateToken, generateResetToken } = require("../utils/auth");
const { sendPasswordResetEmail } = require("../services/emailService");

const router = express.Router();





const jwt = require("jsonwebtoken");

// Enhanced token generation with both access and refresh tokens
function generateSecureTokens(user) {
  const payload = {
    id: user._id,
    username: user.username,
    email: user.email,
  };

  // Short-lived access token (1 hour)
  const accessToken = jwt.sign(
    payload,
    process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  // Long-lived refresh token (7 days)
  const refreshToken = jwt.sign(
    payload,
    process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET + "_refresh",
    { expiresIn: "7d" }
  );

  return { accessToken, refreshToken };
}

// ============ EXISTING ROUTES (KEEP ALL YOUR CURRENT LOGIC) ============

// Login route - ENHANCED with secure token handling
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

    // Find user by username or email
    const user = await User.findOne({
      $or: [{ username }, { email: username }],
    });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ message: "Account is deactivated" });
    }

    // ✅ NEW: Generate both access and refresh tokens
    const { accessToken, refreshToken } = generateSecureTokens(user);

    // ✅ NEW: Set HTTP-only cookie for refresh token
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/",
    });


    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Return access token and user data (same format as before)
    res.json({
      message: "Login successful",
      token: accessToken, // ← This is now the short-lived access token
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        age: user.age,
        fullAddress: user.fullAddress,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
});

// ✅ NEW: Token refresh endpoint
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token provided" });
    }

    // Verify refresh token
    jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET + "_refresh",
      async (err, decoded) => {
        if (err) {
          // Clear invalid cookie
          res.clearCookie("refreshToken");
          return res.status(403).json({ message: "Invalid refresh token" });
        }

        // Get user from database
        const user = await User.findById(decoded.id);
        if (!user || !user.isActive) {
          res.clearCookie("refreshToken");
          return res
            .status(404)
            .json({ message: "User not found or inactive" });
        }

        // Generate new access token only
        const { accessToken } = generateSecureTokens(user);

        res.json({ token: accessToken });
      }
    );
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(500).json({ message: "Server error during token refresh" });
  }
});

// ✅ NEW: Session check endpoint
router.get("/session", async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({ message: "No session found" });
    }

    // Verify refresh token
    jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET + "_refresh",
      async (err, decoded) => {
        if (err) {
          res.clearCookie("refreshToken");
          return res.status(403).json({ message: "Invalid session" });
        }

        // Get user from database
        const user = await User.findById(decoded.id);
        if (!user || !user.isActive) {
          res.clearCookie("refreshToken");
          return res
            .status(404)
            .json({ message: "User not found or inactive" });
        }

        // Generate new access token for the session
        const { accessToken } = generateSecureTokens(user);

        res.json({
          token: accessToken,
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: user.fullName,
            age: user.age,
            fullAddress: user.fullAddress,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt,
          },
        });
      }
    );
  } catch (error) {
    console.error("Session check error:", error);
    res.status(500).json({ message: "Server error during session check" });
  }
});

// ✅ NEW: Secure logout endpoint
router.post("/logout", (req, res) => {
  // Clear the refresh token cookie
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "none",
    path: "/",
  });

  res.json({ message: "Logged out successfully" });
});



















// Enhanced signup endpoint for complete form
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
      
      firstName,
      lastName,
      email,
      dateOfBirth,
      phone,
      ssn,
      address1,
      address2,
      city,
      state,
      zip,
      employmentStatus,
      employer,
      occupation,
      annualIncome,
      sourceOfFunds,
      username,
      password,
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
    

    // Create new user WITHOUT balance field
    const user = new User({
      firstName,
      lastName,
      email,
      dateOfBirth: new Date(dateOfBirth),
      phone,
      ssn,
      address: {
        street1: address1,
        street2: address2 || "",
        city,
        state: state.toUpperCase(),
        zipCode: zip,
      },
      employment: {
        status: employmentStatus,
        employer: employer || "",
        occupation: occupation || "",
        annualIncome,
        sourceOfFunds,
      },
      username,
      password,
      
    });

    await user.save();
    
    // Create default accounts (balance comes from here)
    const accounts = await Account.createDefaultAccounts(user._id);

    // Generate token
    const token = generateToken(user._id);

    // Return success response WITHOUT user.balance
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
        createdAt: user.createdAt,
        age: user.age,
        fullAddress: user.fullAddress,
      },
      accounts: accounts.map(acc => ({
        id: acc._id,
        type: acc.type,
        accountNumber: acc.accountNumber,
        balance: acc.balance,
        isPrimary: acc.isPrimary,
        createdAt: acc.createdAt,
      })),
    });
  } catch (error) {
    console.error("Signup error:", error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
      }));
      return res.status(400).json({ message: "Validation failed", errors });
    }
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

/*// Simple signup endpoint (for backward compatibility)
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
    // Create new user (no account fields)
    const user = new User({
      firstName,
      lastName,
      email,
      username,
      password,
      dateOfBirth: new Date(dateOfBirth),
      phone,
      ssn,
      address: {
        street1: address1,
        street2: address2 || "",
        city,
        state: state.toUpperCase(),
        zipCode: zip,
      },
      employment: {
        status: employmentStatus,
        employer: employer || "",
        occupation: occupation || "",
        annualIncome,
        sourceOfFunds,
      },
    });
    await user.save();

    // Create default accounts
    

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

// Login endpoint (unchanged)*/


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