import mongoose from "mongoose";

const connectDB = async () => {
  try {
    // MongoDB Atlas connection string from environment variable
    const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/rovoxa-chatbot";
    
    if (!mongoURI) {
      throw new Error("MONGODB_URI is not defined in environment variables");
    }

    // Connect using Mongoose with MongoDB Atlas optimized settings
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000, // 10 second timeout for Atlas
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 5, // Maintain at least 5 socket connections
    });

    console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    return true;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    console.log("⚠️ Running in fallback mode without database");
    console.log("💡 Check your MONGODB_URI in .env file");
    return false;
  }
};

export default connectDB;