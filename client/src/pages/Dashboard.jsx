import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Users, Eye, PlayCircle, Video, ArrowUpRight, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const StatCard = ({ icon: Icon, label, value, change, color = "brand-primary" }) => (
  <div className="bg-white/5 border border-white/10 p-6 rounded-2xl shadow-xl hover:border-white/20 transition-all">
    <div className="flex justify-between items-start">
      <div className={`p-3 bg-${color}/10 rounded-xl`}>
        <Icon className={`w-6 h-6 text-${color}`} />
      </div>
      {change && (
        <div className="flex items-center gap-1 text-green-400 text-sm font-medium bg-green-400/10 px-2 py-1 rounded-full">
          <ArrowUpRight className="w-4 h-4" />
          {change}
        </div>
      )}
    </div>
    <div className="mt-4">
      <p className="text-gray-400 text-sm font-medium">{label}</p>
      <h3 className="text-2xl font-bold text-white mt-1">{value}</h3>
    </div>
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ views: 0, subscribers: 0, videos: 0, watchTime: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // [PROCESS] This function runs whenever the component loads or the 'user' changes
    const fetchStats = async () => {
      if (!user) return; // Wait until we have a logged-in user
      
      try {
        // [1] Fetch all videos belonging to this user
        // This hits the new route we just added in video-service
        const videoRes = await fetch(`http://localhost:3000/api/v1/videos/user/${user._id || user.id}`);
        const videoData = await videoRes.json();
        
        // [2] Fetch the channel details (specifically for the subscriber count)
        const channelRes = await fetch(`http://localhost:3000/api/v1/channels/user/${user._id || user.id}`);
        const channelData = await channelRes.json();

        if (videoRes.ok && channelRes.ok) {
          const videos = videoData.videos || [];
          
          // [3] Calculate total views by summing up the 'views' field of every video
          const totalViews = videos.reduce((acc, v) => acc + (v.views || 0), 0);
          
          // [4] Update our state so the UI re-renders with the new numbers
          setStats({
            views: totalViews,
            videos: videos.length,
            subscribers: channelData.channel?.subscriberCount || 0,
            watchTime: Math.round(totalViews * 0.15) // Rough estimation: 9 mins per view
          });
        }
      } catch (err) {
        // [ERROR] If a service is down, we log it but keep the UI safe
        console.error('Failed to fetch dashboard stats:', err);
      } finally {
        setIsLoading(false); // Stop showing the loading spinner
      }
    };

    fetchStats();
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-12 h-12 text-brand-primary animate-spin" />
        <p className="text-gray-400 animate-pulse">Analyzing your growth...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Creator Dashboard</h1>
          <p className="text-gray-400 mt-1">
            Welcome back, <span className="text-brand-primary font-semibold">{user?.name}</span>!
          </p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition-colors text-sm font-bold">
            Download Report
          </button>
          <button className="px-4 py-2 bg-brand-primary text-white rounded-xl hover:bg-brand-primary/80 transition-colors shadow-lg shadow-brand-primary/20 text-sm font-bold">
            Customize
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Eye} label="Total Views" value={stats.views.toLocaleString()} />
        <StatCard icon={Users} label="Subscribers" value={stats.subscribers.toLocaleString()} color="purple-400" />
        <StatCard icon={Video} label="Videos Uploaded" value={stats.videos} color="blue-400" />
        <StatCard icon={PlayCircle} label="Est. Watch Time (hrs)" value={stats.watchTime.toLocaleString()} color="green-400" />
      </div>

      <div className="bg-white/5 border border-white/10 p-8 rounded-3xl shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 rounded-full blur-3xl -mr-32 -mt-32 transition-colors group-hover:bg-brand-primary/10" />
        
        <h3 className="text-xl font-bold text-white mb-8">Performance Overview</h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={[
              { name: 'Last Week', views: Math.round(stats.views * 0.7) },
              { name: 'This Week', views: stats.views }
            ]}>
              <defs>
                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#aa3bff" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#aa3bff" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1a1b23', border: '1px solid #ffffff10', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)' }}
                itemStyle={{ color: '#aa3bff', fontWeight: 'bold' }}
              />
              <Area type="monotone" dataKey="views" stroke="#aa3bff" strokeWidth={4} fillOpacity={1} fill="url(#colorViews)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
