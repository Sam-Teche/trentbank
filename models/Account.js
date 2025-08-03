const mongoose = require("mongoose");
const User = require("./User");

// Account Schema
const accountSchema = new mongoose.Schema(
  {
    // Reference to the user who owns this account
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Account identification
    accountNumber: {
      type: String,
      required: true,
      unique: true,
      length: 10,
    },

    // Account type
    type: {
      type: String,
      required: true,
      enum: ["checking", "savings", "credit_card"],
      index: true,
    },

    // Account balance
    balance: {
      type: Number,
      required: true,
      default: 0,
      // For checking/savings: positive numbers
      // For credit cards: negative numbers (debt)
    },

    // Credit card specific fields
    creditLimit: {
      type: Number,
      required: function () {
        return this.type === "credit_card";
      },
      default: 0,
    },

    availableCredit: {
      type: Number,
      default: function () {
        if (this.type === "credit_card") {
          return this.creditLimit + this.balance; // balance is negative for credit cards
        }
        return 0;
      },
    },

    // Account status
    isActive: {
      type: Boolean,
      default: true,
    },

    isPrimary: {
      type: Boolean,
      default: false,
    },

    // Account settings
    overdraftProtection: {
      type: Boolean,
      default: false,
    },

    minimumBalance: {
      type: Number,
      default: 0,
    },

    // Interest rate (for savings accounts)
    interestRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100, // percentage
    },

    // Account creation and updates
    openedDate: {
      type: Date,
      default: Date.now,
    },

    lastTransactionDate: {
      type: Date,
    },

    // Account metadata
    nickname: {
      type: String,
      trim: true,
      maxlength: 50,
    },

    // Monthly statement date
    statementDate: {
      type: Number,
      min: 1,
      max: 31,
      default: 1,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better performance
accountSchema.index({ userId: 1, type: 1 });
accountSchema.index({ accountNumber: 1 });
accountSchema.index({ userId: 1, isPrimary: 1 });

// Virtual for formatted account number (for display)
accountSchema.virtual("formattedAccountNumber").get(function () {
  return `****${this.accountNumber.slice(-4)}`;
});

// Virtual for account display name
accountSchema.virtual("displayName").get(function () {
  if (this.nickname) {
    return this.nickname;
  }

  const typeNames = {
    checking: "Checking Account",
    savings: "Savings Account",
    credit_card: "Credit Card",
  };

  return typeNames[this.type] || "Account";
});

// Virtual for formatted balance
accountSchema.virtual("formattedBalance").get(function () {
  const absBalance = Math.abs(this.balance);
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(absBalance);

  return this.balance < 0 ? `-${formatted}` : formatted;
});

// Virtual for credit card available credit
accountSchema.virtual("formattedAvailableCredit").get(function () {
  if (this.type !== "credit_card") return null;

  const available = this.creditLimit + this.balance; // balance is negative
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(available);
});

// Virtual for credit card utilization percentage
accountSchema.virtual("creditUtilization").get(function () {
  if (this.type !== "credit_card" || this.creditLimit === 0) return 0;

  const usedCredit = Math.abs(this.balance);
  return Math.round((usedCredit / this.creditLimit) * 100);
});

// Pre-save middleware to ensure only one primary account per user
accountSchema.pre("save", async function (next) {
  if (this.isPrimary && this.isModified("isPrimary")) {
    // If this account is being set as primary, remove primary flag from other accounts
    await this.constructor.updateMany(
      { userId: this.userId, _id: { $ne: this._id } },
      { isPrimary: false }
    );
  }
  next();
});

// Static method to generate unique account number
accountSchema.statics.generateAccountNumber = async function () {
  let accountNumber;
  let exists = true;

  while (exists) {
    accountNumber = Math.floor(
      1000000000 + Math.random() * 9000000000
    ).toString();
    exists = await this.findOne({ accountNumber });
  }

  return accountNumber;
};

// Static method to create default accounts for a user
accountSchema.statics.createDefaultAccounts = async function (userId) {
  const defaultAccountsData = [
    {
      userId,
      type: "checking",
      balance: 0.0, // Start checking account at 0.00
      isPrimary: true,
      overdraftProtection: true,
      minimumBalance: 25.0,
    },
    {
      userId,
      type: "savings",
      balance: 0.0, // Start savings account at 0.00
      isPrimary: false,
      interestRate: 0.5,
      minimumBalance: 100.0,
    },
    {
      userId,
      type: "credit_card",
      balance: 0.0, // Start credit card at 0.00 (no debt)
      creditLimit: 5000.0,
      isPrimary: false,
      interestRate: 18.99,
    },
  ];

  const accounts = [];

  for (const accountData of defaultAccountsData) {
    accountData.accountNumber = await this.generateAccountNumber();
    const account = new this(accountData);
    await account.save();
    accounts.push(account);
  }

  return accounts;
};

// Static method to get user's accounts summary
accountSchema.statics.getUserAccountsSummary = async function (userId) {
  const accounts = await this.find({ userId, isActive: true }).sort({
    isPrimary: -1,
    type: 1,
  });

  const summary = {
    totalAccounts: accounts.length,
    totalBalance: 0,
    totalDebt: 0,
    accounts: accounts.map((account) => ({
      id: account._id,
      type: account.type,
      accountNumber: account.formattedAccountNumber,
      balance: account.formattedBalance,
      displayName: account.displayName,
      isPrimary: account.isPrimary,
      isActive: account.isActive,
      ...(account.type === "credit_card" && {
        creditLimit: account.creditLimit,
        availableCredit: account.formattedAvailableCredit,
        utilization: account.creditUtilization,
      }),
    })),
  };

  // Calculate totals
  accounts.forEach((account) => {
    if (account.type === "credit_card") {
      summary.totalDebt += Math.abs(account.balance);
    } else {
      summary.totalBalance += account.balance;
    }
  });

  return summary;
};

// Instance method to update balance
accountSchema.methods.updateBalance = async function (
  amount,
  description = ""
) {
  const oldBalance = this.balance;
  this.balance += amount;
  this.lastTransactionDate = new Date();

  await this.save();

  return {
    oldBalance,
    newBalance: this.balance,
    change: amount,
    description,
  };
};

// Instance method to check if transaction is allowed
accountSchema.methods.canProcessTransaction = function (amount) {
  if (this.type === "credit_card") {
    // For credit cards, check if we have available credit
    const availableCredit = this.creditLimit + this.balance;
    return amount <= availableCredit;
  } else {
    // For checking/savings, check if we have sufficient balance
    const newBalance = this.balance + amount;
    return newBalance >= this.minimumBalance;
  }
};

const Account = mongoose.model("Account", accountSchema);

module.exports = Account;
