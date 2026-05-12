require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '..', '.env') });
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const Channel = require('./models/Channel');
const Subscription = require('./models/Subscription');

const app = express();
const PORT = process.env.CHANNEL_SERVICE_PORT || 3005;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

mongoose.connect(`${process.env.MONGO_URI}/streamverse_channels`, { authSource: 'admin' })
  .then(() => console.log('Channel DB connected'))
  .catch(err => { console.error('Channel DB error:', err.message); process.exit(1); });

// Create channel
app.post('/api/v1/channels', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'Auth required' });

    const existing = await Channel.findOne({ owner: userId });
    if (existing) return res.status(409).json({ error: 'Channel already exists', channel: existing });

    const { name, description } = req.body;
    const channel = await Channel.create({ owner: userId, name: name || 'My Channel', description });
    res.status(201).json({ channel });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get channel by ID
app.get('/api/v1/channels/:id', async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    const userId = req.headers['x-user-id'];
    let isSubscribed = false;
    if (userId) {
      const sub = await Subscription.findOne({ subscriber: userId, channel: channel._id });
      isSubscribed = !!sub;
    }
    res.json({ channel, isSubscribed });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get channel by owner ID
app.get('/api/v1/channels/user/:userId', async (req, res) => {
  try {
    const channel = await Channel.findOne({ owner: req.params.userId });
    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    res.json({ channel });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get my channel
app.get('/api/v1/channels/me/channel', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'Auth required' });
    let channel = await Channel.findOne({ owner: userId });
    if (!channel) {
      channel = await Channel.create({ owner: userId, name: 'My Channel' });
    }
    res.json({ channel });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update channel
app.put('/api/v1/channels/:id', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const channel = await Channel.findById(req.params.id);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    if (channel.owner !== userId) return res.status(403).json({ error: 'Not authorized' });

    const { name, description, avatar, banner } = req.body;
    if (name) channel.name = name;
    if (description !== undefined) channel.description = description;
    if (avatar) channel.avatar = avatar;
    if (banner) channel.banner = banner;
    await channel.save();
    res.json({ channel });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Subscribe
app.post('/api/v1/channels/:id/subscribe', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'Auth required' });

    const channel = await Channel.findById(req.params.id);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    if (channel.owner === userId) return res.status(400).json({ error: 'Cannot subscribe to own channel' });

    const existing = await Subscription.findOne({ subscriber: userId, channel: channel._id });
    if (existing) return res.status(409).json({ error: 'Already subscribed' });

    await Subscription.create({ subscriber: userId, channel: channel._id });
    channel.subscriberCount += 1;
    await channel.save();
    res.json({ message: 'Subscribed', subscriberCount: channel.subscriberCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unsubscribe
app.delete('/api/v1/channels/:id/subscribe', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'Auth required' });

    const result = await Subscription.findOneAndDelete({ subscriber: userId, channel: req.params.id });
    if (!result) return res.status(404).json({ error: 'Not subscribed' });

    await Channel.findByIdAndUpdate(req.params.id, { $inc: { subscriberCount: -1 } });
    res.json({ message: 'Unsubscribed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get subscriptions for a user
app.get('/api/v1/channels/subscriptions/list', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'Auth required' });
    const subs = await Subscription.find({ subscriber: userId }).populate('channel');
    res.json({ subscriptions: subs.map(s => s.channel) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'channel-service', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => console.log(`Channel Service running on port ${PORT}`));
module.exports = app;
