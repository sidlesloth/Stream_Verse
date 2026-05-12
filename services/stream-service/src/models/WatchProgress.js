const mongoose = require('mongoose');

const watchProgressSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  videoId: { type: String, required: true },
  progress: { type: Number, default: 0 },
  duration: { type: Number, default: 0 },
  completed: { type: Boolean, default: false },
}, { timestamps: true });

watchProgressSchema.index({ userId: 1, videoId: 1 }, { unique: true });

module.exports = mongoose.model('WatchProgress', watchProgressSchema);
