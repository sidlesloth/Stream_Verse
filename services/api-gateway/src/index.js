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
  auth: `http://localhost:${process.env.AUTH_SERVICE_PORT || 3001}`,
  video: `http://localhost:${process.env.VIDEO_SERVICE_PORT || 3002}`,
  transcode: `http://localhost:${process.env.TRANSCODE_SERVICE_PORT || 3003}`,
  stream: `http://localhost:${process.env.STREAM_SERVICE_PORT || 3004}`,
  channel: `http://localhost:${process.env.CHANNEL_SERVICE_PORT || 3005}`,
  interaction: `http://localhost:${process.env.INTERACTION_SERVICE_PORT || 3006}`,
  search: `http://localhost:${process.env.SEARCH_SERVICE_PORT || 3007}`,
  notification: `http://localhost:${process.env.NOTIFICATION_SERVICE_PORT || 3008}`,
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

// ─── Notification Service ───
app.use('/api/v1/notifications', requireAuth, createProxy(SERVICES.notification));

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {//starts http server
  console.log(`API Gateway running on port ${PORT}`);
  console.log('Proxying to services:', SERVICES);
});

module.exports = app;
