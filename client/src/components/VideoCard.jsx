import React from 'react';
import { motion } from 'framer-motion';
import { MoreVertical, Play } from 'lucide-react';
import { Link } from 'react-router-dom';

const VideoCard = ({ video }) => {
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="group cursor-pointer"
    >
      <Link to={`/watch/${video._id}`}>
        <div className="relative aspect-video rounded-2xl overflow-hidden bg-white/5 border border-white/10 mb-3 shadow-lg">
          <img 
            src={`http://localhost:3000/api/v1/stream/${video._id}/thumbnail.jpg`} 
            alt={video.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-brand-primary flex items-center justify-center transform scale-90 group-hover:scale-100 transition-transform">
              <Play className="w-6 h-6 text-white fill-current ml-1" />
            </div>
          </div>
        </div>
      </Link>

      <div className="flex gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 border border-white/10" />
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold line-clamp-2 group-hover:text-brand-primary transition-colors">
            {video.title}
          </h3>
          <p className="text-gray-400 text-sm mt-1 hover:text-white transition-colors">
            {video.creatorId?.name || 'Anonymous'}
          </p>
          <p className="text-gray-500 text-xs mt-0.5">
            {video.views} views • {new Date(video.createdAt).toLocaleDateString()}
          </p>
        </div>
        <button className="flex-shrink-0 p-1 h-fit hover:bg-white/10 rounded-full transition-colors opacity-0 group-hover:opacity-100">
          <MoreVertical className="w-5 h-5 text-gray-400" />
        </button>
      </div>
    </motion.div>
  );
};


export default VideoCard;
