require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '..', '.env') });
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.SEARCH_SERVICE_PORT || 3007;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Connect to the videos database (read-only access for search)
mongoose.connect(`${process.env.MONGO_URI}/streamverse_videos`, { authSource: 'admin' })
  .then(() => console.log('Search DB connected (videos)'))
  .catch(err => { console.error('Search DB error:', err.message); process.exit(1); });

// Use the same Video schema
const videoSchema = new mongoose.Schema({
  title: String,
  description: String,
  tags: [String],
  category: String,
  thumbnail: String,
  status: String,
  uploader: mongoose.Schema.Types.ObjectId,
  uploaderName: String,
  views: Number,
  duration: Number,
  createdAt: Date,
}, { strict: false, collection: 'videos' });
videoSchema.index({ title: 'text', description: 'text', tags: 'text' });
const Video = mongoose.model('Video', videoSchema);

// Full-text search
app.get('/', async (req, res) => {
  try {
    const { q, category, sort = 'relevance', page = 1, limit = 20, duration } = req.query;
    const query = { status: 'ready' };

    if (q) {
      query.$text = { $search: q };
    }
    if (category) query.category = category;
    if (duration) {
      if (duration === 'short') query.duration = { $lt: 240 };
      else if (duration === 'medium') query.duration = { $gte: 240, $lt: 1200 };
      else if (duration === 'long') query.duration = { $gte: 1200 };
    }

    let sortOption = {};
    if (sort === 'views') sortOption = { views: -1 };
    else if (sort === 'date') sortOption = { createdAt: -1 };
    else if (sort === 'relevance' && q) sortOption = { score: { $meta: 'textScore' } };
    else sortOption = { createdAt: -1 };

    let queryBuilder = Video.find(query);
    if (q && sort === 'relevance') {
      queryBuilder = queryBuilder.select({ score: { $meta: 'textScore' } });
    }

    const videos = await queryBuilder
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Video.countDocuments(query);
    res.json({ videos, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Trending (top viewed in last 7 days, falling back to all time)
app.get('/trending', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const videos = await Video.find({ status: 'ready' })
      .sort({ views: -1, createdAt: -1 })
      .limit(parseInt(limit));
    res.json({ videos });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Basic recommendations (just recent + popular for now)
app.get('/recommendations', async (req, res) => {
  try {
    const { limit = 20, exclude } = req.query;
    const query = { status: 'ready' };
    if (exclude) query._id = { $ne: exclude };

    const videos = await Video.find(query)
      .sort({ views: -1, createdAt: -1 })
      .limit(parseInt(limit));
    res.json({ videos });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'search-service', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => console.log(`Search Service running on port ${PORT}`));
module.exports = app;
