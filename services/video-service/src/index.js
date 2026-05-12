require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '..', '.env') });
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');
const { connectRabbitMQ } = require('./config/rabbitmq');
const videoRoutes = require('./routes/videoRoutes');

const app = express();
const PORT = process.env.VIDEO_SERVICE_PORT || 3002;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/v1/videos', videoRoutes);
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'video-service', timestamp: new Date().toISOString() });
});

const start = async () => {
  await connectDB();
  await connectRabbitMQ();
  app.listen(PORT, () => console.log(`Video Service running on port ${PORT}`));
};
start();

module.exports = app;
