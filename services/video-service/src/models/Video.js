const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  tags: [{ type: String, trim: true }],
  category: { type: String, default: 'uncategorized' },
  thumbnail: { type: String, default: '' },
  filePath: { type: String },
  hlsPath: { type: String, default: '' },
  status: {
    type: String,
    enum: ['uploading', 'processing', 'ready', 'failed'],
    default: 'uploading',
  },
  uploader: { type: mongoose.Schema.Types.ObjectId, required: true },
  uploaderName: { type: String, default: 'Unknown' },
  views: { type: Number, default: 0 },
  duration: { type: Number, default: 0 },
  qualities: [{
    resolution: String,
    quality: String,
    videoBitrate: String,
    audioBitrate: String,
    path: String,
  }],
}, { timestamps: true });

videoSchema.index({ title: 'text', description: 'text', tags: 'text' });
videoSchema.index({ uploader: 1 });
videoSchema.index({ category: 1 });
videoSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Video', videoSchema);
