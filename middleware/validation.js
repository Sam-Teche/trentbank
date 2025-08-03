const { body } = require("express-validator");

// Login validation
const loginValidation = [
  body("username").notEmpty().withMessage("Username or email is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];

// Enhanced signup validation for complete form
const signupValidation = [
  

  // Personal Information
  body("firstName")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2-50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("First name can only contain letters and spaces"),

  body("lastName")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2-50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Last name can only contain letters and spaces"),

  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please enter a valid email address"),

  body("dateOfBirth")
    .isDate()
    .withMessage("Please enter a valid date of birth")
    .custom((value) => {
      const today = new Date();
      const birthDate = new Date(value);
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const adjustedAge =
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
          ? age - 1
          : age;

      if (adjustedAge < 18) {
        throw new Error("You must be at least 18 years old to open an account");
      }
      if (birthDate > today) {
        throw new Error("Date of birth cannot be in the future");
      }
      return true;
    }),

  body("phone")
    .matches(/^\(\d{3}\) \d{3}-\d{4}$/)
    .withMessage("Please enter a valid phone number in format (123) 456-7890"),

  body("ssn")
    .matches(/^\d{3}-\d{2}-\d{4}$/)
    .withMessage("Please enter a valid SSN in format 123-45-6789"),

  // Address Information
  body("address1")
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage("Street address must be between 5-100 characters"),

  body("address2")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Address line 2 must be less than 100 characters"),

  body("city")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("City must be between 2-50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("City can only contain letters and spaces"),

  body("state")
    .trim()
    .isLength({ min: 2, max: 2 })
    .withMessage("State must be 2 characters")
    .matches(/^[A-Z]{2}$/)
    .withMessage("State must be in uppercase format (e.g., CA, NY)"),

  body("zip")
    .matches(/^\d{5}(-\d{4})?$/)
    .withMessage("Please enter a valid ZIP code"),

  // Employment/Financial Information
  body("employmentStatus")
    .isIn(["employed", "self-employed", "unemployed", "retired", "student"])
    .withMessage("Please select a valid employment status"),

  body("employer")
    .if(body("employmentStatus").isIn(["employed", "self-employed"]))
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Employer name must be between 2-100 characters"),

  body("occupation")
    .if(body("employmentStatus").isIn(["employed", "self-employed"]))
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Occupation must be between 2-100 characters"),

  body("annualIncome")
    .isIn([
      "under-25k",
      "25k-50k",
      "50k-75k",
      "75k-100k",
      "100k-150k",
      "over-150k",
    ])
    .withMessage("Please select a valid annual income range"),

  body("sourceOfFunds")
    .isIn(["employment", "business", "investments", "inheritance", "other"])
    .withMessage("Please select a valid source of funds"),

  // Account Setup
  body("username")
    .trim()
    .isLength({ min: 6, max: 20 })
    .withMessage("Username must be between 6-20 characters")
    .matches(/^[a-zA-Z0-9]+$/)
    .withMessage("Username can only contain letters and numbers"),

  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one lowercase letter, one uppercase letter, and one number"
    ),

  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error("Passwords do not match");
    }
    return true;
  }),

  // Terms and Conditions
  body("termsAgreement")
    .equals("true")
    .withMessage("You must agree to the terms and conditions"),

  body("electronicConsent")
    .equals("true")
    .withMessage("You must consent to electronic communications"),
];

// Simple signup validation (for backward compatibility)
const simpleSignupValidation = [
  body("username")
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters long"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  body("firstName").notEmpty().withMessage("First name is required"),
  body("lastName").notEmpty().withMessage("Last name is required"),
];

// Forgot password validation
const forgotPasswordValidation = [
  body("email").isEmail().withMessage("Valid email is required"),
];

// Reset password validation
const resetPasswordValidation = [
  body("token").notEmpty().withMessage("Reset token is required"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];

// Change password validation
const changePasswordValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters long"),
];

// Profile update validation
const profileUpdateValidation = [
  body("firstName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2-50 characters"),
  body("lastName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2-50 characters"),
  body("email").optional().isEmail().withMessage("Valid email is required"),
  body("phone")
    .optional()
    .matches(/^\(\d{3}\) \d{3}-\d{4}$/)
    .withMessage("Please enter a valid phone number"),
];

module.exports = {
  loginValidation,
  signupValidation,
  //simpleSignupValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation,
  profileUpdateValidation,
};
