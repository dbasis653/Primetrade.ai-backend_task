import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MONGODB IS CONNECTED");
  } catch (error) {
    console.error("MongoDB connection Error");
    process.exit(1);
  }
};

export default connectDB;
