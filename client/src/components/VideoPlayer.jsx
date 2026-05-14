import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Settings, Maximize, SkipBack, SkipForward } from 'lucide-react';

const VideoPlayer = ({ src, poster, onPlay }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [qualities, setQualities] = useState([]);
  const [currentSelection, setCurrentSelection] = useState({ res: '720p', video: 'Medium', audio: 'Medium' });
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const hlsRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current;

      if (Hls.isSupported()) {
        const hls = new Hls();
        hlsRef.current = hls;
        hls.loadSource(src);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          const levels = hls.levels.map((level, index) => {
            const [res, video, audio] = (level.name || '').split('|');
            return { index, res, video, audio };
          });
          setQualities(levels);

          // Try to find a default match
          const defaultLevel = levels.find(l => l.res === '720p' && l.video === 'Medium' && l.audio === 'Medium') || levels[0];
          if (defaultLevel) {
            hls.currentLevel = defaultLevel.index;
            setCurrentSelection({ res: defaultLevel.res, video: defaultLevel.video, audio: defaultLevel.audio });
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src;
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [src]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.volume = volume;
    }
  }, [isMuted, volume]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
      
      // Increment views only once per session
      const videoId = src.split('/').slice(-2, -1)[0];
      if (videoId && !window[`viewed_${videoId}`]) {
        fetch(`http://localhost:3000/api/v1/videos/${videoId}/views`, { method: 'POST' })
          .then(() => {
            window[`viewed_${videoId}`] = true;
            if (onPlay) onPlay();
          })
          .catch(err => console.error('Failed to increment views:', err));
      }
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const total = videoRef.current.duration;
    const progress = (current / total) * 100;
    setProgress(progress || 0);
    setCurrentTime(current);
    setDuration(total);
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e) => {
    if (!videoRef.current) return;
    const seekTime = (e.target.value / 100) * videoRef.current.duration;
    videoRef.current.currentTime = seekTime;
    setProgress(e.target.value);
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    const container = videoRef.current.parentElement;
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleQualityChange = (type, value) => {
    const newSelection = { ...currentSelection, [type]: value };
    setCurrentSelection(newSelection);

    if (hlsRef.current) {
      const match = qualities.find(q =>
        q.res === newSelection.res &&
        q.video === newSelection.video &&
        q.audio === newSelection.audio
      );

      if (match) {
        console.log(`Switching to: ${match.res} V:${match.video} A:${match.audio}`);
        hlsRef.current.currentLevel = match.index;
      }
    }
  };

  return (
    <div
      className="relative aspect-video bg-black rounded-2xl overflow-hidden group shadow-2xl border border-white/5"
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="w-full h-full cursor-pointer"
        poster={poster}
        onTimeUpdate={handleTimeUpdate}
        onClick={togglePlay}
      />

      {/* Overlay Controls */}
      <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-4">
          {/* Progress Bar */}
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={handleSeek}
            className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-brand-primary"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={togglePlay} className="text-white hover:text-brand-primary transition-colors">
                {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
              </button>
              <div className="flex items-center gap-2 group/volume">
                <button onClick={() => setIsMuted(!isMuted)} className="text-white hover:text-brand-primary transition-colors">
                  {isMuted || volume === 0 ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                </button>
                <div className="w-0 group-hover/volume:w-24 overflow-hidden transition-all duration-300">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      const newVol = parseFloat(e.target.value);
                      setVolume(newVol);
                      if (newVol > 0) setIsMuted(false);
                    }}
                    className="w-20 h-1 accent-brand-primary cursor-pointer"
                  />
                </div>
              </div>
              <span className="text-white text-sm font-medium">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-4 relative">
              <div className="relative">
                <button
                  onClick={() => setShowQualityMenu(!showQualityMenu)}
                  className="text-white hover:text-brand-primary transition-colors"
                >
                  <Settings className="w-6 h-6" />
                </button>

                {showQualityMenu && (
                  <div className="absolute bottom-full right-0 mb-4 w-64 bg-[#16171d]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 z-50">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                      <Settings className="w-4 h-4 text-brand-primary" />
                      Stream Quality
                    </h3>

                    <div className="space-y-4">
                      {/* Resolution */}
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Resolution</p>
                        <div className="flex gap-2">
                          {['720p', '1080p'].map(r => (
                            <button
                              key={r}
                              onClick={() => handleQualityChange('res', r)}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${currentSelection.res === r ? 'bg-brand-primary text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                }`}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Video Quality */}
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Video Bitrate</p>
                        <div className="flex gap-2">
                          {['Low', 'Medium', 'High'].map(q => (
                            <button
                              key={q}
                              onClick={() => handleQualityChange('video', q)}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${currentSelection.video === q ? 'bg-brand-primary text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                }`}
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Audio Quality */}
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Audio Bitrate</p>
                        <div className="flex gap-2">
                          {['Low', 'Medium', 'High'].map(q => (
                            <button
                              key={q}
                              onClick={() => handleQualityChange('audio', q)}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${currentSelection.audio === q ? 'bg-brand-primary text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                }`}
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={toggleFullscreen}
                className="text-white hover:text-brand-primary transition-colors"
              >
                <Maximize className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
