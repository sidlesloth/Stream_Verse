import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, FileVideo, CheckCircle, AlertCircle, Type, AlignLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const UploadModal = ({ isOpen, onClose }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('video/')) {
      setFile(droppedFile);
      setTitle(droppedFile.name.split('.').slice(0, -1).join('.'));
    }
  };

  const startUpload = async () => {
    if (!file || !title) return;
    
    setUploading(true);
    setError('');
    setProgress(0);

    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', title);
    formData.append('description', description);

    console.log('Starting upload for:', title, file.name);

    try {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setProgress(percent);
          console.log(`Upload progress: ${percent}%`);
        }
      };

      xhr.onload = () => {
        const response = JSON.parse(xhr.responseText);
        console.log('Upload response:', response);
        if (xhr.status >= 200 && xhr.status < 300) {
          console.log('Upload successful');
          setUploading(false);
          setTimeout(() => {
            onClose();
            setFile(null);
            setTitle('');
            setDescription('');
            setProgress(0);
          }, 1500);
        } else {
          console.error('Upload failure:', response.error || xhr.statusText);
          setError(response.error || 'Upload failed');
          setUploading(false);
        }
      };

      xhr.onerror = () => {
        console.error('Upload network error');
        setError('Network error occurred');
        setUploading(false);
      };

      xhr.open('POST', 'http://localhost:3000/api/v1/videos/upload');
      if (user?.token) {
        console.log('Attaching auth token');
        xhr.setRequestHeader('Authorization', `Bearer ${user.token}`);
      }
      xhr.send(formData);


    } catch (err) {
      setError(err.message);
      setUploading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-2xl bg-[#16171d] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Upload Video</h2>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="p-8 max-h-[70vh] overflow-y-auto">
              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm">
                  {error}
                </div>
              )}

              {!file ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`
                    aspect-video border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all duration-300
                    ${isDragging ? 'border-brand-primary bg-brand-primary/5 scale-[1.02]' : 'border-white/10 hover:border-white/20 bg-white/5'}
                  `}
                >
                  <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mb-4">
                    <Upload className="w-8 h-8 text-brand-primary" />
                  </div>
                  <p className="text-white font-semibold text-lg">Drag and drop video files</p>
                  <p className="text-gray-400 mt-2">Your videos will be private until you publish them.</p>
                  <label className="mt-6 px-6 py-2.5 bg-brand-primary hover:bg-brand-secondary text-white font-bold rounded-full transition-all shadow-lg shadow-brand-primary/20 cursor-pointer">
                    Select Files
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="video/*" 
                      onChange={(e) => {
                        const selectedFile = e.target.files[0];
                        if (selectedFile) {
                          setFile(selectedFile);
                          setTitle(selectedFile.name.split('.').slice(0, -1).join('.'));
                        }
                      }}
                    />
                  </label>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                    <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                      <FileVideo className="w-6 h-6 text-brand-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{file.name}</p>
                      <p className="text-gray-400 text-sm">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                    {progress === 100 && !uploading && <CheckCircle className="w-6 h-6 text-green-400" />}
                  </div>

                  <div className="space-y-4">
                    <div className="relative">
                      <Type className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input 
                        type="text" 
                        placeholder="Video Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all"
                        required
                      />
                    </div>
                    <div className="relative">
                      <AlignLeft className="absolute left-4 top-6 w-5 h-5 text-gray-400" />
                      <textarea 
                        placeholder="Description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows="4"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all resize-none"
                      />
                    </div>
                  </div>

                  {uploading || progress > 0 ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">{progress < 100 ? 'Uploading...' : 'Finalizing...'}</span>
                        <span className="text-white font-medium">{progress}%</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          className="h-full bg-brand-primary"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-4">
                      <button 
                        onClick={() => setFile(null)}
                        className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={startUpload}
                        className="flex-1 px-6 py-3 bg-brand-primary hover:bg-brand-secondary text-white font-bold rounded-xl transition-all shadow-lg shadow-brand-primary/20"
                      >
                        Upload Video
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-8 pb-8 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-gray-500 mt-0.5" />
              <p className="text-xs text-gray-500 leading-relaxed">
                By submitting your videos to StreamVerse, you acknowledge that you agree to StreamVerse's Terms of Service and Community Guidelines.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};


export default UploadModal;
