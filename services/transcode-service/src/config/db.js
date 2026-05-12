const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(`${process.env.MONGO_URI}/streamverse_videos`, {
      authSource: 'admin',
    });
    console.log(`Transcode DB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Transcode DB Connection Error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
