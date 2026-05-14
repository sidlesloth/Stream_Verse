const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const QUALITY_PRESETS = require('./config/qualityPresets');

const FFMPEG_PATH = process.env.FFMPEG_PATH || 'ffmpeg';

/**
 * Transcode a single variant using FFmpeg
 */
function transcodeVariant(inputPath, outputDir, preset) {
  return new Promise((resolve, reject) => {
    const variantName = preset.name; // Use the unique name from our matrix
    const segmentPattern = path.join(outputDir, `${variantName}_%03d.ts`);
    const playlistPath = path.join(outputDir, `${variantName}.m3u8`);
 
    const args = [
      '-i', inputPath,
      '-vf', `scale=${preset.width}:${preset.height}:force_original_aspect_ratio=decrease,pad=${preset.width}:${preset.height}:(ow-iw)/2:(oh-ih)/2,setsar=1`,
      '-c:v', 'libx264',
      '-b:v', preset.videoBitrate,
      '-maxrate', preset.videoBitrate,
      '-bufsize', `${parseInt(preset.videoBitrate) * 2}k`,
      '-c:a', 'aac',
      '-b:a', preset.audioBitrate, // Set audio bitrate correctly!
      '-ar', '44100',
      '-hls_time', '6',
      '-hls_playlist_type', 'vod',
      '-hls_segment_filename', segmentPattern,
      '-f', 'hls',
      '-y',
      playlistPath,
    ];
 
    console.log(`  Transcoding ${variantName}...`);
    const proc = spawn(FFMPEG_PATH, args);
 
    let stderr = '';
    proc.stderr.on('data', (data) => { stderr += data.toString(); });
    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`  ✓ ${variantName} complete`);
        resolve({
          ...preset,
          path: `${variantName}.m3u8`,
        });
      } else {
        reject(new Error(`FFmpeg failed for ${variantName} (code ${code}): ${stderr.slice(-500)}`));
      }
    });
    proc.on('error', (err) => reject(err));
  });
}

/**
 * Generate HLS master playlist pointing to all variant playlists
 */
function generateMasterPlaylist(outputDir, qualities) {
  let manifest = '#EXTM3U\n#EXT-X-VERSION:3\n\n';

  for (const q of qualities) {
    const bandwidth = parseInt(q.videoBitrate) * 1000 + parseInt(q.audioBitrate) * 1000;
    const resolution = `${q.width}x${q.height}`;
    // Store extra info in the NAME tag for parsing in the frontend
    manifest += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${resolution},NAME="${q.resolution}|${q.videoQuality}|${q.audioQuality}"\n`;
    manifest += `${q.path}\n`;
  }

  const masterPath = path.join(outputDir, 'master.m3u8');
  fs.writeFileSync(masterPath, manifest);
  console.log('  ✓ Master playlist generated');
  return masterPath;
}

/**
 * Get video duration using FFmpeg
 */
function getVideoDuration(inputPath) {
  return new Promise((resolve) => {
    const args = ['-i', inputPath, '-f', 'null', '-'];
    const proc = spawn(FFMPEG_PATH, ['-i', inputPath]);
    let stderr = '';
    proc.stderr.on('data', (data) => { stderr += data.toString(); });
    proc.on('close', () => {
      const match = stderr.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
      if (match) {
        const hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const seconds = parseFloat(match[3]);
        resolve(Math.round(hours * 3600 + minutes * 60 + seconds));
      } else {
        resolve(0);
      }
    });
    proc.on('error', () => resolve(0));
  });
}

/**
 * Generate thumbnail from video
 */
function generateThumbnail(inputPath, outputDir) {
  return new Promise((resolve) => {
    const thumbnailPath = path.join(outputDir, 'thumbnail.jpg');
    const args = [
      '-i', inputPath,
      '-ss', '00:00:02',
      '-vframes', '1',
      '-vf', 'scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2',
      '-y',
      thumbnailPath,
    ];
    const proc = spawn(FFMPEG_PATH, args);
    proc.on('close', (code) => {
      if (code === 0) resolve(thumbnailPath);
      else resolve(null);
    });
    proc.on('error', () => resolve(null));
  });
}

/**
 * Full transcoding pipeline for a video
 */
async function transcodeVideo(videoId, inputPath, outputDir) {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`\n▶ Starting transcode for video ${videoId}`);
  console.log(`  Input: ${inputPath}`);
  console.log(`  Output: ${outputDir}`);

  // Get duration
  const duration = await getVideoDuration(inputPath);
  console.log(`  Duration: ${duration}s`);

  // Generate thumbnail
  const thumbnailPath = await generateThumbnail(inputPath, outputDir);

  // Transcode all quality variants sequentially to avoid overloading CPU
  const qualities = [];
  for (const preset of QUALITY_PRESETS) {
    try {
      const result = await transcodeVariant(inputPath, outputDir, preset);
      qualities.push(result);
    } catch (error) {
      console.error(`  ✗ Failed: ${preset.resolution}_${preset.quality}: ${error.message}`);
      // Continue with other variants even if one fails
    }
  }

  if (qualities.length === 0) {
    throw new Error('All transcode variants failed');
  }

  // Generate master playlist
  generateMasterPlaylist(outputDir, qualities);

  console.log(`\n✅ SUCCESSFULLY COMPLETED ALL TRANSCODING FOR VIDEO ${videoId}`);
  console.log(`   You can now watch the video at: http://localhost:3000/api/v1/stream/${videoId}/master.m3u8\n`);

  return { qualities, duration, thumbnailPath };
}

module.exports = { transcodeVideo };
