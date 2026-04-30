import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, X } from 'lucide-react';

const Toast = ({ message, type = 'success', onClose }: { message: string; type?: 'success' | 'error' | 'info'; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
    initial={{ opacity: 0, y: 50 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.9 }}
    className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-full shadow-lg flex items-center gap-3 font-medium text-sm ${
      type === 'success' ? 'bg-stone-800 text-white' : 'bg-rose-600 text-white'
    }`}
  >
    {type === 'success' ? <ShieldCheck size={18} className="text-green-400" /> : <X size={18} />}
    {message}
    <div className="w-px h-4 bg-white/20 mx-1"></div>
    <button onClick={onClose} className="hover:opacity-70 transition-opacity">
      <X size={14} />
    </button>
  </motion.div>
  );
};

export default Toast;
