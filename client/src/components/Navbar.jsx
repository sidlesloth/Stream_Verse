import React, { useState } from 'react';
import { Search, Bell, Video, User, Menu, Plus, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import UploadModal from './UploadModal';

const Navbar = ({ onMenuClick }) => {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { isLoggedIn, isCreator, user, logout } = useAuth();

  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/50 backdrop-blur-md px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onMenuClick}
            className="p-2 hover:bg-white/10 rounded-full transition-colors lg:hidden"
          >
            <Menu className="w-6 h-6 text-white" />
          </button>
          <Link to="/" className="flex items-center gap-2 cursor-pointer">
            <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center">
              <Video className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white hidden sm:block">
              StreamVerse
            </span>
          </Link>
        </div>

        <div className="flex-1 max-w-2xl px-8 hidden md:block">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-brand-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Search videos..."
              className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all shadow-inner"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLoggedIn && isCreator && (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white text-sm font-bold rounded-full transition-all shadow-lg shadow-brand-primary/20 mr-2"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden lg:block">Create</span>
            </motion.button>
          )}
          
          {isLoggedIn ? (
            <>
              <NotificationBell />
              <div className="relative">
                <button 
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="ml-2 w-8 h-8 rounded-full bg-gradient-to-tr from-brand-primary to-brand-secondary p-[2px]"
                >
                  <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center overflow-hidden">
                    <User className="w-5 h-5 text-gray-400" />
                  </div>
                </button>

                <AnimatePresence>
                  {isUserMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-48 bg-[#16171d] border border-white/10 rounded-2xl shadow-2xl py-2 z-50"
                    >
                      <div className="px-4 py-2 border-b border-white/5">
                        <p className="text-white text-sm font-bold">{user?.name}</p>
                        <p className="text-gray-400 text-xs">{user?.role}</p>
                      </div>
                      <button 
                        onClick={() => {
                          logout();
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-white/5 transition-colors text-sm font-medium"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <Link 
              to="/login"
              className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-bold rounded-full transition-all border border-white/10"
            >
              Sign In
            </Link>
          )}
        </div>
      </nav>

      <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
    </>
  );
};

export default Navbar;


