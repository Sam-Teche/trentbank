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

    // Find the checking account specifically for user object
    const checkingAccount = await Account.findOne({
      userId: user._id,
      type: "checking",
    });

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        accountNumber: checkingAccount ? checkingAccount.accountNumber : null,
        accountType: "checking",
        balance: checkingAccount ? checkingAccount.balance : 0,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
      accounts: accounts.map((acc) => ({
        id: acc._id,
        type: acc.type,
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
          balance: account.balance,
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
    balance: req.account.balance,
    accountNumber: req.user.accountNumber,
    accountType: req.user.accountType,
  });
});


// Create new transfer transaction
router.post("/transfer", authenticateToken, async (req, res) => {
  try {
    const {
      recipientName,
      email,
      bankName,
      accountType,
      accountNumber,
      routingNumber,
      transferAmount,
      transferPurpose,
      transferFee,
    } = req.body;

    // Validate required fields
    if (!recipientName || !transferAmount || !accountNumber) {
      return res.status(400).json({
        message:
          "Missing required fields: recipientName, transferAmount, accountNumber",
      });
    }

    const amount = parseFloat(transferAmount);
    const fee = transferFee || amount * 0.006;
    const totalAmount = amount + fee;

    // Check if user has sufficient balance (optional validation)
    // Check if checking account has sufficient balance
    const checkingAccount = await Account.findOne({
      userId: req.user._id,
      type: "checking",
    });

    if (!checkingAccount) {
      return res.status(404).json({
        message: "Checking account not found",
      });
    }

    if (checkingAccount.balance < totalAmount) {
      return res.status(400).json({
        message: "Insufficient balance for this transfer",
      });
    }

    // Generate reference number
    const now = new Date();
    const reference =
      "TXN-" +
      now.getFullYear().toString().slice(-2) +
      (now.getMonth() + 1).toString().padStart(2, "0") +
      now.getDate().toString().padStart(2, "0") +
      "-" +
      Math.random().toString(36).substr(2, 4).toUpperCase();

    // Create transaction description
    const description = `Transfer to ${recipientName} - ${bankName}`;

    // Create new transaction
    const transaction = new Transaction({
      userId: req.user._id,
      type: "debit",
      amount: totalAmount,
      description: description,
      status: "pending",
      reference: reference,
      // Store additional transfer details in a metadata object
      metadata: {
        recipientName,
        recipientEmail: email,
        bankName,
        accountType,
        accountNumber: accountNumber.slice(-4), // Store only last 4 digits for security
        routingNumber,
        transferAmount: amount,
        transferFee: fee,
        transferPurpose,
        totalAmount,
      },
    });

    await transaction.save();

    res.status(201).json({
      message: "Transfer initiated successfully",
      transaction: {
        id: transaction._id,
        reference: transaction.reference,
        amount: transaction.amount,
        description: transaction.description,
        status: transaction.status,
        date: transaction.date,
      },
    });
  } catch (error) {
    console.error("Transfer creation error:", error);
    res.status(500).json({
      message: "Failed to initiate transfer",
      error: error.message
    });
  }
});

// Update transaction status (for manual completion)
router.patch("/transaction/:transactionId/status", authenticateToken, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { status } = req.body;

    // Validate status
    if (!["pending", "completed", "failed"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status. Must be: pending, completed, or failed",
      });
    }

    // Find the transaction
    const transaction = await Transaction.findOne({
      _id: transactionId,
      userId: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({
        message: "Transaction not found",
      });
    }

    const oldStatus = transaction.status;
    transaction.status = status;

    // If completing a transaction, update checking account balance
    if (status === "completed" && oldStatus === "pending") {
      const checkingAccount = await Account.findOne({
        userId: req.user._id,
        type: "checking",
      });

      if (!checkingAccount) {
        return res.status(404).json({ message: "Checking account not found" });
      }

      if (transaction.type === "debit") {
        checkingAccount.balance -= transaction.amount;
      } else {
        checkingAccount.balance += transaction.amount;
      }

      await checkingAccount.save();
    }

    // If failing a transaction that was completed, reverse the balance
    // If failing a transaction that was completed, reverse the balance
    if (status === "failed" && oldStatus === "completed") {
      const checkingAccount = await Account.findOne({
        userId: req.user._id,
        type: "checking",
      });

      if (!checkingAccount) {
        return res.status(404).json({ message: "Checking account not found" });
      }

      if (transaction.type === "debit") {
        checkingAccount.balance += transaction.amount;
      } else {
        checkingAccount.balance -= transaction.amount;
      }

      await checkingAccount.save();
    }

    await transaction.save(); 

    res.json({
      message: `Transaction ${status} successfully`,
      transaction: {
        id: transaction._id,
        status: transaction.status,
        reference: transaction.reference,
        amount: transaction.amount,
        description: transaction.description,
        date: transaction.date,
      },
    });
  } catch (error) {
    console.error("Transaction status update error:", error);
    res.status(500).json({
      message: "Failed to update transaction status",
      error: error.message
    });
  }
});

// Get single transaction details
router.get("/transaction/:transactionId", authenticateToken, async (req, res) => {
  try {
    const { transactionId } = req.params;

    const transaction = await Transaction.findOne({
      _id: transactionId,
      userId: req.user._id
    }).lean();

    if (!transaction) {
      return res.status(404).json({
        message: "Transaction not found"
      });
    }

    res.json({
      transaction: {
        id: transaction._id,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        status: transaction.status,
        date: transaction.date,
        reference: transaction.reference,
        metadata: transaction.metadata || {}
      }
    });

  } catch (error) {
    console.error("Transaction fetch error:", error);
    res.status(500).json({
      message: "Failed to fetch transaction",
      error: error.message
    });
  }
});

module.exports = router;
