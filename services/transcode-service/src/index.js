require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '..', '.env') });
const amqplib = require('amqplib');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const { transcodeVideo } = require('./transcoder');

// Import Video model from video-service's schema (shared DB)
const videoSchema = new mongoose.Schema({}, { strict: false, collection: 'videos' });
const Video = mongoose.model('Video', videoSchema);

const PORT = process.env.TRANSCODE_SERVICE_PORT || 3003;

async function startConsumer() {
  await connectDB();

  let connection, channel;
  try {
    connection = await amqplib.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertQueue('video.transcode', { durable: true });
    await channel.assertQueue('notification.send', { durable: true });
    channel.prefetch(1); // Process one video at a time

    console.log(`Transcode Service listening on queue 'video.transcode'`);

    channel.consume('video.transcode', async (msg) => {
      if (!msg) return;

      const job = JSON.parse(msg.content.toString());
      console.log(`\nReceived transcode job:`, job);

      try {
        const { qualities, duration, thumbnailPath } = await transcodeVideo(
          job.videoId,
          job.filePath,
          job.outputDir
        );

        // Update video in database
        await Video.findByIdAndUpdate(job.videoId, {
          status: 'ready',
          hlsPath: job.outputDir,
          qualities,
          duration,
          ...(thumbnailPath ? { thumbnail: `/api/v1/stream/${job.videoId}/thumbnail.jpg` } : {}),
        });

        // 1. Notify uploader
        channel.sendToQueue('notification.send', Buffer.from(JSON.stringify({
          userId: job.userId,
          type: 'video_ready',
          videoId: job.videoId,
          message: 'Your video has been processed and is now ready to watch!',
        })), { persistent: true });

        // 2. Notify subscribers (async)
        try {
          // Get creator's channel
          const chanRes = await fetch(`http://localhost:${process.env.CHANNEL_SERVICE_PORT || 3005}/user/${job.userId}`);
          if (chanRes.ok) {
            const { channel: creatorChannel } = await chanRes.json();
            
            // Get subscribers
            const subsRes = await fetch(`http://localhost:${process.env.CHANNEL_SERVICE_PORT || 3005}/${creatorChannel._id}/subscribers`);
            if (subsRes.ok) {
              const { subscriberIds } = await subsRes.json();
              subscriberIds.forEach(subId => {
                if (subId !== job.userId) { // Don't notify yourself
                  channel.sendToQueue('notification.send', Buffer.from(JSON.stringify({
                    userId: subId,
                    type: 'new_video',
                    videoId: job.videoId,
                    message: `${creatorChannel.name} just uploaded a new video!`,
                  })), { persistent: true });
                }
              });
            }
          }
        } catch (subErr) {
          console.error('Failed to notify subscribers:', subErr.message);
        }

        console.log(`✓ Video ${job.videoId} transcoded successfully`);
        channel.ack(msg);
      } catch (error) {
        console.error(`✗ Transcode failed for ${job.videoId}:`, error.message);

        await Video.findByIdAndUpdate(job.videoId, { status: 'failed' });
        channel.ack(msg); // Don't requeue — mark as failed
      }
    });
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error.message);
    console.log('Retrying in 5 seconds...');
    setTimeout(startConsumer, 5000);
  }
}

// Also run a basic HTTP server for health checks
const express = require('express');
const app = express();
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'transcode-service', timestamp: new Date().toISOString() });
});
app.listen(PORT, () => console.log(`Transcode Service health endpoint on port ${PORT}`));

startConsumer();
