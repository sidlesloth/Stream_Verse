import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Users, Eye, PlayCircle, DollarSign, ArrowUpRight } from 'lucide-react';

const data = [
  { name: 'Mon', views: 4000, watchTime: 2400 },
  { name: 'Tue', views: 3000, watchTime: 1398 },
  { name: 'Wed', views: 2000, watchTime: 9800 },
  { name: 'Thu', views: 2780, watchTime: 3908 },
  { name: 'Fri', views: 1890, watchTime: 4800 },
  { name: 'Sat', views: 2390, watchTime: 3800 },
  { name: 'Sun', views: 3490, watchTime: 4300 },
];

const StatCard = ({ icon: Icon, label, value, change }) => (
  <div className="bg-white/5 border border-white/10 p-6 rounded-2xl shadow-xl">
    <div className="flex justify-between items-start">
      <div className="p-3 bg-brand-primary/10 rounded-xl">
        <Icon className="w-6 h-6 text-brand-primary" />
      </div>
      <div className="flex items-center gap-1 text-green-400 text-sm font-medium bg-green-400/10 px-2 py-1 rounded-full">
        <ArrowUpRight className="w-4 h-4" />
        {change}
      </div>
    </div>
    <div className="mt-4">
      <p className="text-gray-400 text-sm font-medium">{label}</p>
      <h3 className="text-2xl font-bold text-white mt-1">{value}</h3>
    </div>
  </div>
);

const Dashboard = () => {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Creator Dashboard</h1>
        <p className="text-gray-400 mt-1">Welcome back! Here's how your channel is performing.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Eye} label="Total Views" value="124.5K" change="+12.5%" />
        <StatCard icon={Users} label="Subscribers" value="12,432" change="+3.2%" />
        <StatCard icon={PlayCircle} label="Watch Time (hrs)" value="8,240" change="+8.1%" />
        <StatCard icon={DollarSign} label="Estimated Revenue" value="$2,450" change="+15.4%" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl shadow-xl">
          <h3 className="text-lg font-semibold text-white mb-6">Views Overview</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#aa3bff" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#aa3bff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#16171d', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="views" stroke="#aa3bff" fillOpacity={1} fill="url(#colorViews)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl shadow-xl">
          <h3 className="text-lg font-semibold text-white mb-6">Watch Time Analysis</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#16171d', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="watchTime" fill="#c084fc" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
