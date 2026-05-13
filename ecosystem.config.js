module.exports = {
  apps: [
    {
      name: 'api-gateway',
      script: 'src/index.js',
      cwd: './services/api-gateway',
    },
    {
      name: 'auth-service',
      script: 'src/index.js',
      cwd: './services/auth-service',
    },
    {
      name: 'video-service',
      script: 'src/index.js',
      cwd: './services/video-service',
    },
    {
      name: 'transcode-service',
      script: 'src/index.js',
      cwd: './services/transcode-service',
    },
    {
      name: 'stream-service',
      script: 'src/index.js',
      cwd: './services/stream-service',
    },
    {
      name: 'channel-service',
      script: 'src/index.js',
      cwd: './services/channel-service',
    },
    {
      name: 'interaction-service',
      script: 'src/index.js',
      cwd: './services/interaction-service',
    },
    {
      name: 'search-service',
      script: 'src/index.js',
      cwd: './services/search-service',
    },
    {
      name: 'notification-service',
      script: 'src/index.js',
      cwd: './services/notification-service',
    }
  ]
};
