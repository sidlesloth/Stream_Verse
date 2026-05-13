import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const socket = io('http://localhost:3000'); // Replace with your backend URL

    socket.on('notification', (data) => {
      setNotifications(prev => [data, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    return () => socket.disconnect();
  }, []);

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
    if (!showDropdown) setUnreadCount(0);
  };

  return (
    <div className="relative">
      <motion.button 
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleDropdown}
        className="p-2 hover:bg-white/10 rounded-full text-gray-300 hover:text-white transition-colors relative"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-[10px] font-bold text-white flex items-center justify-center rounded-full border-2 border-black">
            {unreadCount}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-80 bg-[#16171d] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
          >
            <div className="p-4 border-b border-white/5 bg-white/5">
              <h3 className="text-white font-bold">Notifications</h3>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No new notifications</p>
                </div>
              ) : (
                notifications.map((notif, index) => (
                  <div key={index} className="p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer">
                    <p className="text-white text-sm font-medium">{notif.title}</p>
                    <p className="text-gray-400 text-xs mt-1">{notif.message}</p>
                    <p className="text-gray-500 text-[10px] mt-2">{notif.time || 'Just now'}</p>
                  </div>
                ))
              )}
            </div>
            <div className="p-3 text-center border-t border-white/5 bg-white/5">
              <button className="text-brand-primary text-xs font-bold hover:underline">
                View all notifications
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
