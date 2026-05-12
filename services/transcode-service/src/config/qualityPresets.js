// Quality presets: 3 resolutions × 3 quality levels = 9 variants (the novelty feature!)
const QUALITY_PRESETS = [
  // 360p variants
  { resolution: '360p', quality: 'low', width: 640, height: 360, videoBitrate: '400k', audioBitrate: '64k' },
  { resolution: '360p', quality: 'medium', width: 640, height: 360, videoBitrate: '700k', audioBitrate: '96k' },
  { resolution: '360p', quality: 'high', width: 640, height: 360, videoBitrate: '1000k', audioBitrate: '128k' },
  // 720p variants
  { resolution: '720p', quality: 'low', width: 1280, height: 720, videoBitrate: '1500k', audioBitrate: '96k' },
  { resolution: '720p', quality: 'medium', width: 1280, height: 720, videoBitrate: '2500k', audioBitrate: '128k' },
  { resolution: '720p', quality: 'high', width: 1280, height: 720, videoBitrate: '4000k', audioBitrate: '192k' },
  // 1080p variants
  { resolution: '1080p', quality: 'low', width: 1920, height: 1080, videoBitrate: '3000k', audioBitrate: '128k' },
  { resolution: '1080p', quality: 'medium', width: 1920, height: 1080, videoBitrate: '5000k', audioBitrate: '192k' },
  { resolution: '1080p', quality: 'high', width: 1920, height: 1080, videoBitrate: '8000k', audioBitrate: '256k' },
];

module.exports = QUALITY_PRESETS;
