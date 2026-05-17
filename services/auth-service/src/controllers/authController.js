const jwt = require('jsonwebtoken');
const User = require('../models/User');
const crypto = require('crypto'); // Added for generating secure temporary passwords
const bcrypt = require('bcryptjs'); // Added for hashing the temporary password

const generateTokens = (userId, name) => {
  const accessToken = jwt.sign({ userId, name }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
  const refreshToken = jwt.sign({ userId, name }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
  return { accessToken, refreshToken };
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const user = await User.create({ name, email, password, role: role || 'user' });

    const tokens = generateTokens(user._id, user.name);
    res.status(201).json({ user, ...tokens });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const tokens = generateTokens(user._id, user.name);
    res.json({ user, ...tokens });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const tokens = generateTokens(user._id, user.name);
    res.json({ user, ...tokens });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, bio, avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { name, bio, avatar },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── NEW: FORGOT PASSWORD CONTROLLER FOR MICROSERVICES ARCHITECTURE ───
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    // 1. Verify user exists in MongoDB
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'No account registered with this email address' });
    }

    // 2. Generate a secure, temporary plain-text password
    const tempPassword = crypto.randomBytes(6).toString('hex'); // e.g., 'f3a291b8c7d6'

    // 3. Hash the temporary password and save it to MongoDB
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(tempPassword, salt);
    await user.save();

    // 4. Construct the notification payload for RabbitMQ
    const notificationPayload = {
      email: user.email,
      subject: 'StreamVerse - Temporary Password Reset',
      body: `Hello ${user.name || 'User'},\n\nYou requested a password reset. Your new temporary password is:\n\n${tempPassword}\n\nPlease use this to sign in and immediately update your password inside your profile settings.`
    };

    // 5. Publish to RabbitMQ channel (checks common setup variants on req.app or global scope)
    const channel = req.app.get('rabbitmqChannel') || global.rabbitmqChannel;
    
    if (channel) {
      await channel.assertQueue('email_notifications', { durable: true });
      channel.sendToQueue(
        'email_notifications',
        Buffer.from(JSON.stringify(notificationPayload)),
        { persistent: true }
      );
      console.log(`Password reset event published to RabbitMQ for: ${email}`);
    } else {
      // Backup log so you don't lose the token if your notification broker service isn't turned on yet
      console.warn('RabbitMQ channel uninitialized in auth-service! Temporary Password:', tempPassword);
    }

    return res.status(200).json({ message: 'A temporary password has been sent to your email.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};