const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
  owner: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  avatar: { type: String, default: '' },
  banner: { type: String, default: '' },
  subscriberCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Channel', channelSchema);
