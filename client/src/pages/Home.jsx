





import React, { useState, useEffect } from 'react';
import VideoCard from '../components/VideoCard';
import { PlayCircle } from 'lucide-react';

const Home = () => {
  const [videos, setVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/v1/videos');
        const data = await response.json();
        if (response.ok) {
          setVideos(data.videos || []);
        }
      } catch (err) {
        console.error('Failed to fetch videos:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideos();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (videos.length === 0) {

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
          <PlayCircle className="w-10 h-10 text-gray-600" />
        </div>
        <h2 className="text-2xl font-bold text-white">No videos yet</h2>
        <p className="text-gray-400 mt-2">Be the first one to upload a video!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {videos.map(video => (
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  );
};

export default Home;

