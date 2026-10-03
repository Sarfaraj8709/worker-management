import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const connStr = process.env.MONGODB_URI || `mongodb://localhost:27017/${process.env.MONGODB_DB_NAME || 'worker-management'}`;
    console.log('Attempting MongoDB connection...');
    const conn = await mongoose.connect(connStr);
    console.log('MongoDB Connected successfully');
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
