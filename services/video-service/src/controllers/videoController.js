const path = require('path');
const fs = require('fs');
const Video = require('../models/Video');
const { publishToQueue } = require('../config/rabbitmq');

exports.uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }
    const userId = req.headers['x-user-id'] || req.userId;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { title, description, tags, category } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    // 5. SAVE TO DATABASE
    // IMPORTANT: We only store the "Metadata" (title, path, uploader ID) in MongoDB.
    // We DO NOT store the actual video file in the database because:
    // a) It would make the database extremely slow.
    // b) Filesystems are much better at handling large binary data.
    // c) It allows us to use tools like FFmpeg directly on the file.
    const video = await Video.create({
      title,
      description: description || '',
      tags: tags ? (typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags) : [],
      category: category || 'uncategorized',
      filePath: req.file.path, // We just store the "map" to where the file is on the disk
      uploader: userId,
      uploaderName: req.headers['x-user-name'] || req.body.uploaderName || 'Unknown',
      status: 'processing',
    });

    publishToQueue('video.transcode', {
      videoId: video._id.toString(),
      userId, // Add this so transcoder knows who to notify
      filePath: req.file.path,
      outputDir: path.resolve(process.env.HLS_OUTPUT_DIR || './hls-output', video._id.toString()),
    });

    res.status(201).json({ video });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ error: 'Video not found' });
    res.json({ video });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getVideos = async (req, res) => {
  try {
    const { page = 1, limit = 20, category, uploader, status } = req.query;
    const query = {};
    if (category) query.category = category;
    if (uploader) query.uploader = uploader;
    if (status) query.status = status;
    else query.status = 'ready';

    const videos = await Video.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await Video.countDocuments(query);
    res.json({ videos, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateVideo = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.userId;
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ error: 'Video not found' });
    if (video.uploader.toString() !== userId) return res.status(403).json({ error: 'Not authorized' });

    const { title, description, tags, category } = req.body;
    if (title) video.title = title;
    if (description !== undefined) video.description = description;
    if (tags) video.tags = typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags;
    if (category) video.category = category;
    await video.save();
    res.json({ video });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteVideo = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.userId;
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ error: 'Video not found' });
    if (video.uploader.toString() !== userId) return res.status(403).json({ error: 'Not authorized' });

    if (video.filePath && fs.existsSync(video.filePath)) fs.unlinkSync(video.filePath);
    const hlsDir = path.resolve(process.env.HLS_OUTPUT_DIR || './hls-output', video._id.toString());
    if (fs.existsSync(hlsDir)) fs.rmSync(hlsDir, { recursive: true, force: true });

    await Video.findByIdAndDelete(req.params.id);
    res.json({ message: 'Video deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.incrementViews = async (req, res) => {
  try {
    const video = await Video.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }, { new: true });
    if (!video) return res.status(404).json({ error: 'Video not found' });
    res.json({ views: video.views });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Internal: get uploader ID for notifications
exports.getUploaderId = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id).select('uploader');
    if (!video) return res.status(404).json({ error: 'Video not found' });
    res.json({ uploaderId: video.uploader });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// [DASHBOARD FIX] This function fetches all videos for a specific user
exports.getVideosByUser = async (req, res) => {
  try {
    const userId = req.params.id;
    // We filter by 'uploader' and sort by newest first
    const videos = await Video.find({ uploader: userId }).sort({ createdAt: -1 });
    res.json({ videos });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
