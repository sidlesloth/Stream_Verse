//require function to import modules
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '..', '.env') });// for centralized env instead of individual env in each service
const express = require('express');//main web framework
const cors = require('cors');//for cross origin resource sharing
const morgan = require('morgan');//for logging requests
console.log('API Gateway JWT Secret length:', process.env.JWT_SECRET?.length || 0);
const rateLimit = require('express-rate-limit');//for limiting requests and avoiding DoS attacks
const { createProxyMiddleware } = require('http-proxy-middleware');//for proxying requests to services
const { optionalAuth, requireAuth } = require('./middleware/auth');//for authentication and authorization

const app = express();
const PORT = process.env.API_GATEWAY_PORT || 3000;

// Service URLs for ease in use later
const SERVICES = {
  auth: `http://127.0.0.1:${process.env.AUTH_SERVICE_PORT || 3001}`,
  video: `http://127.0.0.1:${process.env.VIDEO_SERVICE_PORT || 3002}`,
  transcode: `http://127.0.0.1:${process.env.TRANSCODE_SERVICE_PORT || 3003}`,
  stream: `http://127.0.0.1:${process.env.STREAM_SERVICE_PORT || 3004}`,
  channel: `http://127.0.0.1:${process.env.CHANNEL_SERVICE_PORT || 3005}`,
  interaction: `http://127.0.0.1:${process.env.INTERACTION_SERVICE_PORT || 3006}`,
  search: `http://127.0.0.1:${process.env.SEARCH_SERVICE_PORT || 3007}`,
  notification: `http://127.0.0.1:${process.env.NOTIFICATION_SERVICE_PORT || 3008}`,
};

// Global middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: { error: 'Too many requests, please try again later' },
});
app.use(limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'api-gateway', timestamp: new Date().toISOString() });
});

// Helper: create proxy with user header forwarding
const createProxy = (target) =>
  createProxyMiddleware({
    target,
    changeOrigin: true,
    onProxyReq: (proxyReq, req) => {
      // Ensure headers are preserved during proxying
      if (req.headers['x-user-id']) {
        proxyReq.setHeader('x-user-id', req.headers['x-user-id']);
      }
      if (req.headers['x-user-name']) {
        proxyReq.setHeader('x-user-name', req.headers['x-user-name']);
      }
    },
    onError: (err, req, res) => {
      console.error(`Proxy error to ${target}:`, err.message);
      res.status(503).json({ error: 'Service unavailable' });
    },
  });

// ─── Auth Service (public) ───
app.use('/api/v1/auth', createProxy(SERVICES.auth));

// ─── Video Service ───
// Upload requires auth; browsing is public
app.use('/api/v1/videos', optionalAuth, createProxy(SERVICES.video));

// ─── Stream Service (public — serves HLS content) ───
app.use('/api/v1/stream', optionalAuth, createProxy(SERVICES.stream));

// ─── Channel Service ───
app.use('/api/v1/channels', optionalAuth, createProxy(SERVICES.channel));

// ─── Interaction Service ───
app.use('/api/v1/interactions', optionalAuth, createProxy(SERVICES.interaction));

// ─── Search Service (public) ───
app.use('/api/v1/search', createProxy(SERVICES.search));

const notificationProxy = createProxyMiddleware({
  target: SERVICES.notification,
  changeOrigin: true,
  ws: true,
  pathRewrite: {
    '^/api/v1/notifications': '', // Remove the prefix!
  },
  onProxyReq: (proxyReq, req) => {
    if (req.headers['x-user-id']) {
      proxyReq.setHeader('x-user-id', req.headers['x-user-id']);
    }
  }
});
app.use('/api/v1/notifications', optionalAuth, notificationProxy);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const server = app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});

// Handle WebSocket upgrades
server.on('upgrade', (req, socket, head) => {
  if (req.url.startsWith('/api/v1/notifications') || req.url.includes('socket.io')) {
    notificationProxy.upgrade(req, socket, head);
  } else {
    socket.destroy();
  }
});

module.exports = app;
