import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Image as ImageIcon, ChevronDown, Settings, X, Plus, Trash2 } from 'lucide-react';

const AvatarGallery = ({ avatars, onUpdate }: { avatars: { url: string; note: string }[], onUpdate: (a: { url: string; note: string }[]) => void }) => {
  const [index, setIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const total = avatars.length;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (total <= 1) return;
      e.preventDefault();
      if (e.deltaY > 0) {
        setIndex((p) => (p + 1) % total);
      } else {
        setIndex((p) => (p - 1 + total) % total);
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [total]);

  const current = avatars[index] || { url: '', note: '' };

  return (
    <div className="w-full flex flex-col gap-2 shrink-0 relative">
       <div 
         ref={containerRef}
         className="w-full aspect-square border-2 border-stone-300 rounded bg-stone-50 flex items-center justify-center overflow-hidden relative group cursor-ns-resize shadow-inner"
       >
         <AnimatePresence mode="wait">
           <motion.img
             key={index}
             src={current.url || 'https://via.placeholder.com/400?text=No+Avatar'}
             initial={{ opacity: 0, scale: 1.05 }}
             animate={{ opacity: 1, scale: 1 }}
             exit={{ opacity: 0, scale: 0.95 }}
             transition={{ duration: 0.25 }}
             className="w-full h-full object-cover absolute inset-0"
             draggable={false}
           />
         </AnimatePresence>
         
         {/* Index indicator */}
         {total > 1 && (
           <div className="absolute top-2 left-2 bg-black/40 text-white text-[9px] px-1.5 py-0.5 rounded backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity font-bold uppercase tracking-tighter">
             {index + 1} / {total}
           </div>
         )}

         {/* Edit Button */}
         <button 
           onClick={() => setIsEditing(!isEditing)}
           className={`absolute top-2 right-2 p-1.5 rounded-full shadow-sm border transition-all ${isEditing ? 'bg-primary border-primary text-white scale-110' : 'bg-white/80 hover:bg-white border-stone-200 opacity-0 group-hover:opacity-100 text-stone-600'}`}
           title="管理头像"
         >
           <Settings size={14} />
         </button>

         {/* Note Overlay */}
         {current.note && (
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-10 pointer-events-none transition-all duration-300 translate-y-1 group-hover:translate-y-0 opacity-0 group-hover:opacity-100">
              <p className="text-white text-xs font-medium drop-shadow-md leading-relaxed">{current.note}</p>
            </div>
         )}
         
         {/* Hint for scrolling */}
         {total > 1 && (
           <div className="absolute bottom-2 right-2 p-1 bg-white/20 rounded backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
             <ChevronDown size={10} className="text-white animate-bounce" />
           </div>
         )}
       </div>

       {isEditing && (
         <motion.div 
           initial={{ opacity: 0, y: 10, scale: 0.95 }}
           animate={{ opacity: 1, y: 0, scale: 1 }}
           className="absolute top-full left-0 right-0 mt-2 p-3 bg-white rounded-lg border border-stone-200 flex flex-col gap-3 shadow-xl z-[100] origin-top"
         >
           <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">管理头像库</span>
              <button onClick={() => setIsEditing(false)} className="text-stone-400 hover:text-stone-600 transition-colors">
                <X size={14}/>
              </button>
           </div>
           
           <div className="max-h-[280px] overflow-y-auto pr-1 flex flex-col gap-3 custom-scrollbar">
             {avatars.map((a, i) => (
               <div key={i} className="flex flex-col gap-2 p-2 bg-white rounded border border-stone-200 group/item relative">
                 <div className="flex gap-2">
                   <div className="flex-1 flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <ImageIcon size={12} className="text-stone-400" />
                        <input 
                          className="flex-1 text-[11px] p-1 border-b border-stone-100 focus:border-primary outline-none transition-colors" 
                          value={a.url} 
                          onChange={(e) => {
                            const next = [...avatars];
                            next[i] = { ...a, url: e.target.value };
                            onUpdate(next);
                          }}
                          placeholder="图片 URL"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Plus size={12} className="text-stone-400" />
                        <input 
                          className="flex-1 text-[11px] p-1 border-b border-stone-100 focus:border-primary outline-none transition-colors" 
                          value={a.note} 
                          onChange={(e) => {
                            const next = [...avatars];
                            next[i] = { ...a, note: e.target.value };
                            onUpdate(next);
                          }}
                          placeholder="添加注释..."
                        />
                      </div>
                   </div>
                   <button 
                     onClick={() => {
                       const next = avatars.filter((_, idx) => idx !== i);
                       onUpdate(next);
                       if (index >= next.length && next.length > 0) setIndex(Math.max(0, next.length - 1));
                     }}
                     className="p-2 text-stone-300 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-all self-start"
                   >
                     <Trash2 size={16}/>
                   </button>
                 </div>
               </div>
             ))}
           </div>

           <button 
             onClick={() => onUpdate([...avatars, { url: '', note: '' }])}
             className="w-full py-2 border border-dashed border-stone-300 rounded-md text-[10px] font-bold text-stone-500 hover:bg-white hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2"
           >
             <Plus size={14}/> 新增图片
           </button>
         </motion.div>
       )}
    </div>
  );
};

export default AvatarGallery;
