const amqplib = require('amqplib');

let channel = null;
let connection = null;

const connectRabbitMQ = async () => {
  try {
    connection = await amqplib.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertQueue('video.transcode', { durable: true });
    await channel.assertQueue('video.transcoded', { durable: true });
    await channel.assertQueue('notification.send', { durable: true });
    console.log('RabbitMQ connected (video-service)');

    connection.on('error', (err) => {
      console.error('RabbitMQ connection error:', err.message);
      channel = null;
    });
    connection.on('close', () => {
      console.log('RabbitMQ connection closed, reconnecting...');
      channel = null;
      setTimeout(connectRabbitMQ, 5000);
    });
  } catch (error) {
    console.error('RabbitMQ connection failed:', error.message);
    console.log('Retrying in 5 seconds...');
    setTimeout(connectRabbitMQ, 5000);
  }
};

const publishToQueue = (queue, message) => {
  if (!channel) {
    console.error('RabbitMQ channel not available');
    return false;
  }
  channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });
  return true;
};

module.exports = { connectRabbitMQ, publishToQueue };
