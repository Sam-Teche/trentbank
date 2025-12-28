const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

// User Schema - Focused ONLY on identity & profile
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
      street1: { type: String, required: true, trim: true },
      street2: { type: String, trim: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true, maxlength: 2 },
      zipCode: {
        type: String,
        required: true,
        trim: true,
        match: [/^\d{5}(-\d{4})?$/, "Please enter a valid ZIP code"],
      },
    },

    // Employment/Financial Info (Profile only—not tied to accounts)
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
          return ["employed", "self-employed"].includes(this.employment.status);
        },
      },
      occupation: {
        type: String,
        trim: true,
        maxlength: 100,
        required: function () {
          return ["employed", "self-employed"].includes(this.employment.status);
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

    // User Account Status
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    lastLogin: { type: Date },
    passwordChangedAt: { type: Date },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
  },
  { timestamps: true }
);

// // Indexes
// userSchema.index({ email: 1 });
// userSchema.index({ username: 1 });
// userSchema.index({ ssn: 1 });

// Virtuals
userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});
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
userSchema.virtual("fullAddress").get(function () {
  let address = this.address.street1;
  if (this.address.street2) address += `, ${this.address.street2}`;
  address += `, ${this.address.city}, ${this.address.state} ${this.address.zipCode}`;
  return address;
});
userSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Password hashing
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, BCRYPT_ROUNDS);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Login attempts
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
userSchema.methods.resetLoginAttempts = async function () {
  return this.updateOne({ $unset: { loginAttempts: 1, lockUntil: 1 } });
};

const User = mongoose.model("User", userSchema);
module.exports = User;
