import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Save } from 'lucide-react';

const Dialog = ({ type, title, defaultValue = '', onConfirm, onCancel, onSecondaryConfirm, secondaryLabel }: { 
  type: 'prompt' | 'confirm', 
  title: string, 
  defaultValue?: string,
  onConfirm: (val: string) => void, 
  onCancel: () => void,
  onSecondaryConfirm?: () => void,
  secondaryLabel?: string
}) => {
  const [val, setVal] = useState(defaultValue);
  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <h3 className="text-lg font-bold text-stone-800 mb-2">{title}</h3>
          {type === 'prompt' && (
            <input 
              type="text" 
              autoFocus
              value={val} 
              onChange={e => setVal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onConfirm(val)}
              className="w-full px-4 py-3 bg-stone-100 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 border border-transparent focus:border-stone-300 transition-all"
            />
          )}
        </div>
        <div className="flex flex-col border-t border-stone-100 bg-stone-50/50">
          <div className="flex">
            <button onClick={onCancel} className="flex-1 px-6 py-4 text-stone-500 hover:bg-stone-100 transition-colors font-medium border-r border-stone-100 text-sm">取消</button>
            <button onClick={() => onConfirm(val)} className={`flex-1 px-6 py-4 text-rose-600 hover:bg-stone-100 transition-colors font-bold text-sm ${onSecondaryConfirm ? '' : 'text-primary'}`}>
              {type === 'confirm' ? '丢弃更改' : '确定'}
            </button>
          </div>
          {onSecondaryConfirm && (
            <button 
              onClick={() => onSecondaryConfirm()} 
              className="px-6 py-4 bg-primary text-white hover:brightness-110 transition-all font-bold flex items-center justify-center gap-2 text-sm shadow-[0_-1px_0_rgba(0,0,0,0.1)]"
            >
              <Save size={16} />
              {secondaryLabel || '保存并继续'}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Dialog;
