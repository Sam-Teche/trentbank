const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Admin = require("../models/Admin");

mongoose.connect("YOUR_MONGODB_URI_HERE", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function createAdmin() {
  const hashedPassword = await bcrypt.hash("AdminPass123", 10);
  const admin = new Admin({
    username: "superadmin",
    email: "admin@trentbank.com",
    password: hashedPassword,
    role: "superadmin",
  });

  await admin.save();
  console.log("Admin created!");
  mongoose.disconnect();
}

createAdmin().catch((err) => {
  console.error("Error creating admin:", err);
  mongoose.disconnect();
});
