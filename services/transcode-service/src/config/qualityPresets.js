// The "Novelty Matrix" Quality System
// 2 Resolutions x 3 Video Bitrates x 3 Audio Bitrates = 18 total variants!

const resolutions = [
  { label: '720p', width: 1280, height: 720 },
  { label: '1080p', width: 1920, height: 1080 }
];

const videoLevels = [
  { label: 'Low', bitrate: '1500k' },
  { label: 'Medium', bitrate: '2500k' },
  { label: 'High', bitrate: '6000k' }
];

const audioLevels = [
  { label: 'Low', bitrate: '64k' },
  { label: 'Medium', bitrate: '192k' },
  { label: 'High', bitrate: '320k' }
];

const QUALITY_PRESETS = [];

resolutions.forEach(res => {
  videoLevels.forEach(v => {
    audioLevels.forEach(a => {
      QUALITY_PRESETS.push({
        resolution: res.label,
        width: res.width,
        height: res.height,
        videoQuality: v.label,
        videoBitrate: v.bitrate,
        audioQuality: a.label,
        audioBitrate: a.bitrate,
        // Unique identifier for HLS manifest
        name: `${res.label}_V-${v.label}_A-${a.label}`
      });
    });
  });
});

module.exports = QUALITY_PRESETS;
