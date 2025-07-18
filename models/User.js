const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

// User Schema - Extended with all form fields
const userSchema = new mongoose.Schema(
  {
    // Basic Authentication Fields
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    // Personal Information
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    dateOfBirth: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          const today = new Date();
          const age = today.getFullYear() - value.getFullYear();
          const monthDiff = today.getMonth() - value.getMonth();
          const adjustedAge =
            monthDiff < 0 ||
            (monthDiff === 0 && today.getDate() < value.getDate())
              ? age - 1
              : age;
          return adjustedAge >= 18;
        },
        message: "You must be at least 18 years old to open an account",
      },
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [
        /^\(\d{3}\) \d{3}-\d{4}$/,
        "Please enter a valid phone number in format (123) 456-7890",
      ],
    },
    ssn: {
      type: String,
      required: true,
      unique: true,
      match: [
        /^\d{3}-\d{2}-\d{4}$/,
        "Please enter a valid SSN in format 123-45-6789",
      ],
    },

    // Address Information
    address: {
      street1: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
      },
      street2: {
        type: String,
        trim: true,
        maxlength: 100,
      },
      city: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50,
      },
      state: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2,
      },
      zipCode: {
        type: String,
        required: true,
        trim: true,
        match: [/^\d{5}(-\d{4})?$/, "Please enter a valid ZIP code"],
      },
    },

    // Employment/Financial Information
    employment: {
      status: {
        type: String,
        required: true,
        enum: ["employed", "self-employed", "unemployed", "retired", "student"],
      },
      employer: {
        type: String,
        trim: true,
        maxlength: 100,
        required: function () {
          return (
            this.employment.status === "employed" ||
            this.employment.status === "self-employed"
          );
        },
      },
      occupation: {
        type: String,
        trim: true,
        maxlength: 100,
        required: function () {
          return (
            this.employment.status === "employed" ||
            this.employment.status === "self-employed"
          );
        },
      },
      annualIncome: {
        type: String,
        required: true,
        enum: [
          "under-25k",
          "25k-50k",
          "50k-75k",
          "75k-100k",
          "100k-150k",
          "over-150k",
        ],
      },
      sourceOfFunds: {
        type: String,
        required: true,
        enum: ["employment", "business", "investments", "inheritance", "other"],
      },
    },

    // Account Information
    accountNumber: {
      type: String,
      required: true,
      unique: true,
      length: 10,
    },
    accountType: {
      type: String,
      enum: ["checking", "savings", "premium"],
      required: true,
    },
    balance: {
      type: Number,
      default: 1000, // Welcome bonus
      min: 0,
    },

    // Account Status
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
    },
    passwordChangedAt: {
      type: Date,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ accountNumber: 1 });
userSchema.index({ ssn: 1 });

// Virtual for full name
userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for age
userSchema.virtual("age").get(function () {
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return age;
});

// Virtual for full address
userSchema.virtual("fullAddress").get(function () {
  let address = this.address.street1;
  if (this.address.street2) address += `, ${this.address.street2}`;
  address += `, ${this.address.city}, ${this.address.state} ${this.address.zipCode}`;
  return address;
});

// Check if account is locked
userSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    this.password = await bcrypt.hash(this.password, BCRYPT_ROUNDS);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to handle login attempts
userSchema.methods.incLoginAttempts = async function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }

  return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = async function () {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
  });
};




// Method to generate account number
userSchema.statics.generateAccountNumber = async function () {
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

const User = mongoose.model("User", userSchema);

module.exports = User;
