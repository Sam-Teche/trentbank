const { body } = require("express-validator");

// Login validation
const loginValidation = [
  body("username").notEmpty().withMessage("Username or email is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];

// Signup validation
const signupValidation = [
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
    .notEmpty()
    .withMessage("First name cannot be empty"),
  body("lastName")
    .optional()
    .notEmpty()
    .withMessage("Last name cannot be empty"),
  body("email").optional().isEmail().withMessage("Valid email is required"),
];

module.exports = {
  loginValidation,
  signupValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation,
  profileUpdateValidation,
};
