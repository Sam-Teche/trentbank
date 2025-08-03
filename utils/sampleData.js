const User = require("../models/User");


// Initialize sample data
const initializeSampleData = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      const sampleUsers = [
        {
          username: "john_doe",
          email: "john@example.com",
          password: "password123",
          firstName: "John",
          lastName: "Doe",
          accountNumber: await User.generateAccountNumber(),
          accountType: "checking",
          balance: 5000,
          isEmailVerified: true,
        },
        {
          username: "jane_smith",
          email: "jane@example.com",
          password: "password123",
          firstName: "Jane",
          lastName: "Smith",
          accountNumber: await User.generateAccountNumber(),
          accountType: "savings",
          balance: 10000,
          isEmailVerified: true,
        },
      ];

      // Use create() instead of insertMany() to trigger pre('save') middleware
      for (const userData of sampleUsers) {
        await User.create(userData);
      }
      console.log("✅ Sample users created");
    }
  } catch (error) {
    console.error("Error initializing sample data:", error);
  }
};




module.exports = {
  initializeSampleData,
};
