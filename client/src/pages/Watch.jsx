import React from 'react';
import { useParams } from 'react-router-dom';
import VideoPlayer from '../components/VideoPlayer';
import { ThumbsUp, ThumbsDown, Share2, Download, MoreHorizontal } from 'lucide-react';

const Watch = () => {
  const { id } = useParams();
  const [video, setVideo] = React.useState(null);
  const [relatedVideos, setRelatedVideos] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch current video
        const videoRes = await fetch(`http://localhost:3000/api/v1/videos/${id}`);
        const videoData = await videoRes.json();
        if (videoRes.ok) {
          setVideo(videoData.video || null);
        }

        // Fetch related videos (we'll just fetch the top ones for now)
        const relatedRes = await fetch(`http://localhost:3000/api/v1/videos`);
        const relatedData = await relatedRes.json();
        if (relatedRes.ok) {
          // Filter out the current video
          const filtered = (relatedData.videos || []).filter(v => v._id !== id);
          setRelatedVideos(filtered);
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!video) {
    return <div className="text-center py-20 text-white">Video not found</div>;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 lg:max-w-[70%]">
        <VideoPlayer 
          src={`http://localhost:3000/api/v1/stream/${id}/master.m3u8`} 
          poster={`http://localhost:3000/api/v1/stream/${id}/thumbnail.jpg`} 
        />
        
        <div className="mt-6">
          <h1 className="text-2xl font-bold text-white">{video.title}</h1>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary border border-white/10" />
              <div>
                <h3 className="text-white font-bold">{video.uploaderName || 'Anonymous'}</h3>
                <p className="text-gray-400 text-sm">Creator</p>
              </div>
              <button className="ml-4 px-6 py-2 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-colors">
                Subscribe
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-white/5 rounded-full overflow-hidden border border-white/10">
                <button className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 text-white transition-colors border-r border-white/5">
                  <ThumbsUp className="w-5 h-5" />
                  <span className="text-sm font-bold">{video.likes || 0}</span>
                </button>
                <button className="px-4 py-2 hover:bg-white/10 text-white transition-colors">
                  <ThumbsDown className="w-5 h-5" />
                </button>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-full transition-colors border border-white/10">
                <Share2 className="w-5 h-5" />
                <span className="text-sm font-bold">Share</span>
              </button>
            </div>
          </div>

          <div className="mt-6 p-4 bg-white/5 rounded-2xl border border-white/10">
            <div className="flex gap-3 text-sm font-bold text-white">
              <span>{video.views} views</span>
              <span>{new Date(video.createdAt).toLocaleDateString()}</span>
            </div>
            <p className="text-white text-sm mt-2 leading-relaxed whitespace-pre-wrap">
              {video.description || 'No description provided.'}
            </p>
          </div>
        </div>
      </div>


      <div className="flex-1 space-y-4">
        <h3 className="text-lg font-bold text-white mb-4">Related Videos</h3>
        {relatedVideos.length > 0 ? (
          relatedVideos.map((rv) => (
            <a key={rv._id} href={`/watch/${rv._id}`} className="flex gap-3 group">
              <div className="relative w-40 aspect-video rounded-xl overflow-hidden bg-white/5 flex-shrink-0">
                <img 
                  src={`http://localhost:3000/api/v1/stream/${rv._id}/thumbnail.jpg`} 
                  alt={rv.title} 
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-white text-sm font-bold line-clamp-2 group-hover:text-brand-primary transition-colors">
                  {rv.title}
                </h4>
                <p className="text-gray-400 text-xs mt-1">{rv.uploaderName || 'Anonymous'}</p>
                <p className="text-gray-500 text-xs">{rv.views} views • {new Date(rv.createdAt).toLocaleDateString()}</p>
              </div>
            </a>
          ))
        ) : (
          <p className="text-gray-500 text-sm italic">No related videos found</p>
        )}
      </div>
    </div>
  );
};

export default Watch;
