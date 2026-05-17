require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '..', '.env') });
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const amqplib = require('amqplib');
const nodemailer = require('nodemailer'); // Added for email sending capabilities

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true },
});

const PORT = process.env.NOTIFICATION_SERVICE_PORT || 3008;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// DB
mongoose.connect(`${process.env.MONGO_URI}/streamverse_notifications`, { authSource: 'admin' })
  .then(() => console.log('Notification DB connected'))
  .catch(err => { console.error('Notification DB error:', err.message); process.exit(1); });

// Notification model
const notificationSchema = new mongoose.Schema({
  user: { type: String, required: true },
  type: { type: String, required: true },
  message: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  read: { type: Boolean, default: false },
}, { timestamps: true });
notificationSchema.index({ user: 1, createdAt: -1 });
const Notification = mongoose.model('Notification', notificationSchema);

// Socket.io — track connected users
const connectedUsers = new Map(); // userId -> Set of socketIds

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('register', (userId) => {
    if (!connectedUsers.has(userId)) connectedUsers.set(userId, new Set());
    connectedUsers.get(userId).add(socket.id);
    socket.userId = userId;
    console.log(`User ${userId} registered on socket ${socket.id}`);
  });

  socket.on('disconnect', () => {
    if (socket.userId && connectedUsers.has(socket.userId)) {
      connectedUsers.get(socket.userId).delete(socket.id);
      if (connectedUsers.get(socket.userId).size === 0) connectedUsers.delete(socket.userId);
    }
  });
});

// Send notification to user via Socket.io
function sendToUser(userId, notification) {
  const sockets = connectedUsers.get(userId);
  if (sockets) {
    sockets.forEach(socketId => {
      io.to(socketId).emit('notification', notification);
    });
  }
}

// REST endpoints
app.get('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'Auth required' });

    const { page = 1, limit = 20 } = req.query;
    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const unread = await Notification.countDocuments({ user: userId, read: false });
    res.json({ notifications, unread });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/read', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'Auth required' });
    await Notification.updateMany({ user: userId, read: false }, { read: true });
    res.json({ message: 'All marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'notification-service', timestamp: new Date().toISOString() });
});

// Setup Nodemailer Transporter using centralized environmental variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'sandbox.smtp.mailtrap.io',
  port: process.env.SMTP_PORT || 2525,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// RabbitMQ consumer
async function startRabbitMQ() {
  try {
    const connection = await amqplib.connect(process.env.RABBITMQ_URL);
    const channel = await connection.createChannel();
    
    // Existing Web UI Notification queue logic
    await channel.assertQueue('notification.send', { durable: true });

    channel.consume('notification.send', async (msg) => {
      if (!msg) return;
      try {
        const data = JSON.parse(msg.content.toString());
        console.log('Notification event:', data);

        if (data.userId) {
          const notif = await Notification.create({
            user: data.userId,
            type: data.type || 'info',
            message: data.message || 'New notification',
            data: data,
          });
          sendToUser(data.userId, notif);
        }

        channel.ack(msg);
      } catch (error) {
        console.error('Failed to process notification:', error.message);
        channel.ack(msg);
      }
    });

    // ─── NEW: EMAIL NOTIFICATION CONSUMER BLOCK ───
    await channel.assertQueue('email_notifications', { durable: true });
    
    channel.consume('email_notifications', async (msg) => {
      if (!msg) return;
      try {
        const emailData = JSON.parse(msg.content.toString());
        console.log('Processing outgoing email delivery request for:', emailData.email);

        await transporter.sendMail({
          from: '"StreamVerse Security" <security@streamverse.com>',
          to: emailData.email,
          subject: emailData.subject,
          text: emailData.body,
        });

        console.log(`Email notification successfully dispatched to ${emailData.email}`);
        channel.ack(msg);
      } catch (error) {
        console.error('Failed to process or send email notification:', error.message);
        // Acknowledge the message anyway to clear a corrupted payload, or utilize an error dead-letter setup
        channel.ack(msg); 
      }
    });

    console.log('RabbitMQ connected (notification-service with Email support)');
  } catch (error) {
    console.error('RabbitMQ connection failed:', error.message);
    setTimeout(startRabbitMQ, 5000);
  }
}

server.listen(PORT, () => console.log(`Notification Service running on port ${PORT}`));
startRabbitMQ();

module.exports = app;