import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, LayoutGrid, RotateCcw, ChevronRight, X, Settings, FilePlus, LogOut } from 'lucide-react';

const AccountMenu = ({ user, view, setView, recentCharacters, currentDocumentId, onSelect, onRemoveRecent, onLogout, confirmNavigation }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimeout.current = setTimeout(() => {
      setIsOpen(false);
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (closeTimeout.current) clearTimeout(closeTimeout.current);
    };
  }, []);

  // Show recently opened characters, including the current one, sorted to the top
  const displayRecent = recentCharacters.slice(0, 5);

  const handleViewChange = (newView: string) => {
    setView(newView);
    setIsOpen(false);
  };

  return (
    <div 
      className="relative" 
      ref={menuRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button 
        className={`flex items-center gap-2 group px-2 py-1 rounded-full transition-all ${isOpen || view === 'vault' || view === 'settings' ? 'bg-stone-700 text-white shadow-inner' : 'hover:bg-stone-700'}`}
      >
        <div className={`w-8 h-8 rounded-full overflow-hidden border transition-colors ${view === 'vault' || view === 'settings' ? 'border-primary' : 'border-stone-600 group-hover:border-primary'}`}>
          <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        </div>
        <ChevronDown size={14} className={`transition-transform duration-200 text-stone-400 group-hover:text-white ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-56 bg-white border border-stone-200 rounded-xl shadow-xl z-[200] py-1"
          >
            <button 
              onClick={() => handleViewChange('vault')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors border-b border-stone-50 ${view === 'vault' ? 'bg-primary/5 text-primary font-bold' : 'text-stone-700 hover:bg-stone-50'}`}
            >
              <LayoutGrid size={16} className={view === 'vault' ? 'text-primary' : 'text-stone-400'} />
              <span>我的档案库</span>
            </button>

            <div 
              className="relative"
              onMouseEnter={() => setShowRecent(true)}
              onMouseLeave={() => setShowRecent(false)}
            >
              <button 
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <RotateCcw size={16} className="text-stone-400" />
                  <span>最近打开的人物卡</span>
                </div>
                <ChevronRight size={14} className="text-stone-300 group-hover:text-stone-500" />
              </button>

              <AnimatePresence>
                {showRecent && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="absolute right-full top-0 mr-1 w-72 bg-white border border-stone-200 rounded-xl shadow-xl py-1"
                  >
                    {displayRecent.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-stone-400 italic text-center">暂无最近记录</div>
                    ) : (
                      displayRecent.map((char: any) => (
                        <div key={char.id} className="relative group/item">
                          <button
                            onClick={() => {
                              onSelect(char, () => setIsOpen(false));
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors text-left pr-10"
                          >
                            <img 
                              src={char.avatar || `https://ui-avatars.com/api/?name=${char.name}`} 
                              className="w-9 h-9 rounded-lg object-cover bg-stone-100 border border-stone-200" 
                              referrerPolicy="no-referrer"
                            />
                            <div className="flex-1 min-w-0">
                               <p className="font-bold truncate text-stone-800">{char.name}</p>
                               <p className="text-[10px] text-stone-400 truncate tracking-tight">{char.classes || '未定义职业'}</p>
                            </div>
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); onRemoveRecent(char.id); }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-stone-300 hover:text-rose-500 opacity-0 group-hover/item:opacity-100 transition-all rounded-md hover:bg-rose-50"
                            title="删除记录"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          <div className="h-px bg-stone-100 my-1 mx-2" />

            <button 
              onClick={() => handleViewChange('settings')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${view === 'settings' ? 'bg-primary/5 text-primary font-bold' : 'text-stone-700 hover:bg-stone-50'}`}
            >
              <Settings size={16} className={view === 'settings' ? 'text-primary' : 'text-stone-400'} />
              <span>账户设置</span>
            </button>

            <button
               onClick={() => handleViewChange('bbcode-template')}
               className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors border-b border-stone-50 ${view === 'bbcode-template' ? 'bg-primary/5 text-primary font-bold' : 'text-stone-700 hover:bg-stone-50'}`}
             >
               <FilePlus size={16} className={view === 'bbcode-template' ? 'text-primary' : 'text-stone-400'} />
               <span>修改转BBCode代码模板</span>
            </button>

            <div className="h-px bg-stone-100 my-1 mx-2" />

            <button 
              onClick={() => { 
                confirmNavigation(() => {
                  onLogout(); 
                  setIsOpen(false); 
                });
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut size={16} />
              <span>登出</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AccountMenu;
