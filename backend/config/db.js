const mongoose = require("mongoose");

const connectDB = async () => {
  const MONGODB_URI = process.env.MONGODB_URI || "";
  
  if (!MONGODB_URI) {
    console.log("No MongoDB URI found, using in-memory storage");
    return null;
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");
    return true;
  } catch (error) {
    console.log("MongoDB connection failed:", error.message);
    return null;
  }
};

module.exports = connectDB;