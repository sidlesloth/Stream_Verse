require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '..', '.env') });
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const WatchProgress = require('./models/WatchProgress');

const app = express();
const PORT = process.env.STREAM_SERVICE_PORT || 3004;
const HLS_DIR = path.resolve(process.env.HLS_OUTPUT_DIR || './hls-output');

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Connect to DB
mongoose.connect(`${process.env.MONGO_URI}/streamverse_stream`, { authSource: 'admin' })
  .then(() => console.log('Stream DB connected'))
  .catch(err => { console.error('Stream DB error:', err.message); process.exit(1); });

// Serve HLS files (m3u8 playlists and .ts segments)
app.get('/api/v1/stream/:videoId/:filename', (req, res) => {
  const { videoId, filename } = req.params;
  const filePath = path.join(HLS_DIR, videoId, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Set correct content type
  const ext = path.extname(filename).toLowerCase();
  const contentTypes = {
    '.m3u8': 'application/vnd.apple.mpegurl',
    '.ts': 'video/MP2T',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
  };
  res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
  res.setHeader('Cache-Control', ext === '.m3u8' ? 'no-cache' : 'public, max-age=31536000');

  fs.createReadStream(filePath).pipe(res);
});

// Get watch progress
app.get('/api/v1/stream/progress/:videoId', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.json({ progress: 0 });

    const wp = await WatchProgress.findOne({ userId, videoId: req.params.videoId });
    res.json(wp || { progress: 0, duration: 0, completed: false });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update watch progress
app.put('/api/v1/stream/progress/:videoId', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'Auth required' });

    const { progress, duration } = req.body;
    const completed = duration > 0 && progress / duration > 0.9;

    const wp = await WatchProgress.findOneAndUpdate(
      { userId, videoId: req.params.videoId },
      { progress, duration, completed },
      { upsert: true, new: true }
    );
    res.json(wp);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'stream-service', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => console.log(`Stream Service running on port ${PORT}`));
module.exports = app;
