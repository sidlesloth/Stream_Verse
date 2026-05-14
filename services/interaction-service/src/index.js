require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '..', '.env') });
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.INTERACTION_SERVICE_PORT || 3006;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

mongoose.connect(`${process.env.MONGO_URI}/streamverse_interactions`, { authSource: 'admin' })
  .then(() => console.log('Interaction DB connected'))
  .catch(err => { console.error('Interaction DB error:', err.message); process.exit(1); });

// --- RabbitMQ for Notifications ---
let rabbitChannel;
async function connectRabbit() {
  try {
    const conn = await require('amqplib').connect(process.env.RABBITMQ_URL);
    rabbitChannel = await conn.createChannel();
    await rabbitChannel.assertQueue('notification.send', { durable: true });
    console.log('RabbitMQ connected (interaction-service)');
  } catch (err) {
    console.error('RabbitMQ error:', err.message);
    setTimeout(connectRabbit, 5000);
  }
}
connectRabbit();

function sendNotification(userId, type, message, data = {}) {
  if (!rabbitChannel) {
    console.error('RabbitMQ channel not ready for notification');
    return;
  }
  const payload = JSON.stringify({ userId, type, message, ...data });
  console.log(`[Notification] Emitting ${type} to user ${userId}`);
  rabbitChannel.sendToQueue('notification.send', Buffer.from(payload), { persistent: true });
}

// --- Models ---
const likeSchema = new mongoose.Schema({
  user: { type: String, required: true },
  video: { type: String, required: true },
  type: { type: String, enum: ['like', 'dislike'], required: true },
}, { timestamps: true });
likeSchema.index({ user: 1, video: 1 }, { unique: true });
const Like = mongoose.model('Like', likeSchema);

const commentSchema = new mongoose.Schema({
  user: { type: String, required: true },
  userName: { type: String, default: 'Anonymous' },
  video: { type: String, required: true },
  text: { type: String, required: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
}, { timestamps: true });
commentSchema.index({ video: 1, createdAt: -1 });
const Comment = mongoose.model('Comment', commentSchema);

// --- Like / Dislike ---
app.post('/like/:videoId', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'Auth required' });

    const { type } = req.body; // 'like' or 'dislike'
    if (!['like', 'dislike'].includes(type)) return res.status(400).json({ error: 'Type must be like or dislike' });

    const existing = await Like.findOne({ user: userId, video: req.params.videoId });
    if (existing) {
      if (existing.type === type) {
        await Like.findByIdAndDelete(existing._id); // Toggle off
        const counts = await getCounts(req.params.videoId);
        return res.json({ message: 'Removed', userAction: null, ...counts });
      }
      existing.type = type;
      await existing.save();
      const counts = await getCounts(req.params.videoId);
      return res.json({ message: 'Updated', userAction: type, ...counts });
    }

    await Like.create({ user: userId, video: req.params.videoId, type });
    const counts = await getCounts(req.params.videoId);
    
    // Notify uploader (async)
    if (type === 'like') {
      try {
        const videoRes = await fetch(`http://localhost:${process.env.VIDEO_SERVICE_PORT || 3002}/user-id/${req.params.videoId}`);
        if (videoRes.ok) {
          const { uploaderId } = await videoRes.json();
          if (uploaderId && uploaderId !== userId) {
            sendNotification(uploaderId, 'like', `Someone liked your video!`, { videoId: req.params.videoId });
          }
        }
      } catch (err) {
        console.error('Notification trigger failed:', err.message);
      }
    }

    res.json({ message: 'Added', userAction: type, ...counts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get like status for a user
app.get('/like/:videoId', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const counts = await getCounts(req.params.videoId);
    let userAction = null;
    if (userId) {
      const existing = await Like.findOne({ user: userId, video: req.params.videoId });
      if (existing) userAction = existing.type;
    }
    res.json({ userAction, ...counts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function getCounts(videoId) {
  const likes = await Like.countDocuments({ video: videoId, type: 'like' });
  const dislikes = await Like.countDocuments({ video: videoId, type: 'dislike' });
  return { likes, dislikes };
}

// --- Comments ---
app.post('/comments/:videoId', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'Auth required' });

    const { text, parent, userName } = req.body;
    if (!text) return res.status(400).json({ error: 'Comment text required' });

    const comment = await Comment.create({
      user: userId,
      userName: userName || req.headers['x-user-name'] || 'Anonymous',
      video: req.params.videoId,
      text,
      parent: parent || null,
    });
    res.status(201).json({ comment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/comments/:videoId', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const comments = await Comment.find({ video: req.params.videoId, parent: null })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Get replies for each comment
    const commentsWithReplies = await Promise.all(
      comments.map(async (c) => {
        const replies = await Comment.find({ parent: c._id }).sort({ createdAt: 1 });
        return { ...c.toObject(), replies };
      })
    );

    const total = await Comment.countDocuments({ video: req.params.videoId, parent: null });
    res.json({ comments: commentsWithReplies, total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/comments/:commentId', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.user !== userId) return res.status(403).json({ error: 'Not authorized' });

    comment.text = req.body.text || comment.text;
    await comment.save();
    res.json({ comment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/comments/:commentId', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.user !== userId) return res.status(403).json({ error: 'Not authorized' });

    await Comment.deleteMany({ parent: comment._id }); // Delete replies too
    await Comment.findByIdAndDelete(req.params.commentId);
    res.json({ message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'interaction-service', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => console.log(`Interaction Service running on port ${PORT}`));
module.exports = app;
