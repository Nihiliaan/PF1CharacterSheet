import React, { useEffect } from 'react';
import { motion } from 'motion/react';

const ContextMenu = ({ x, y, items, onClose }: { x: number; y: number; items: { label: string; icon: any; onClick: () => void; danger?: boolean }[]; onClose: () => void }) => {
  useEffect(() => {
    const handleClick = () => onClose();
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed z-[150] min-w-[160px] bg-white border border-stone-200 shadow-xl rounded-lg py-1 flex flex-col"
      style={{ left: x, top: y }}
      onClick={e => e.stopPropagation()}
    >
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => { item.onClick(); onClose(); }}
          className={`flex items-center gap-3 px-4 py-2 text-sm text-left hover:bg-stone-50 transition-colors ${item.danger ? 'text-rose-600' : 'text-stone-700'}`}
        >
          <item.icon size={16} />
          {item.label}
        </button>
      ))}
    </motion.div>
  );
};

export default ContextMenu;
