const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(`${process.env.MONGO_URI}/streamverse_auth`, {
      authSource: 'admin',
    });
    console.log(`Auth DB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Auth DB Connection Error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
