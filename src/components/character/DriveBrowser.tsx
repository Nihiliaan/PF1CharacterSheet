import React from 'react';
import { motion } from 'motion/react';
import { Cloud, ChevronRight, X, Folder, FilePlus, Download } from 'lucide-react';

const DriveBrowser = ({ 
  modal, 
  onClose, 
  onNavigate, 
  onImport,
  onJumpToPath
}: { 
  modal: { currentPath: {id: string, name: string}[], items: any[] }, 
  onClose: () => void, 
  onNavigate: (id: string, name: string) => void,
  onImport: (item: any) => void,
  onJumpToPath: (index: number) => void
}) => {
  // Deduplicate items by ID to prevent duplicate key errors
  const uniqueItems = Array.from(new Map(modal.items.map(item => [item.id, item])).values());
  // Deduplicate path segments by ID to prevent duplicate key errors in breadcrumbs
  const uniquePath = modal.currentPath.reduce((acc, current, index) => {
    if (!acc.some(p => p.id === current.id)) {
      acc.push({ ...current, originalIndex: index });
    }
    return acc;
  }, [] as ({id: string, name: string, originalIndex: number}[]));

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden"
      >
        <div className="p-6 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2">
              <Cloud className="text-primary" /> 浏览 Google 云端硬盘
            </h3>
            <div className="flex items-center gap-1 mt-1 overflow-x-auto no-scrollbar py-1">
              {uniquePath.map((p, i) => (
                <React.Fragment key={p.id}>
                  {i > 0 && <ChevronRight size={14} className="text-stone-300 shrink-0" />}
                  <button 
                    onClick={() => p.originalIndex < modal.currentPath.length - 1 && onJumpToPath(p.originalIndex)}
                    className={`text-xs whitespace-nowrap transition-colors items-center flex gap-1 ${
                      p.originalIndex === modal.currentPath.length - 1 
                        ? 'text-primary font-bold cursor-default' 
                        : 'text-stone-400 hover:text-primary'
                    }`}
                  >
                    {p.name}
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-400">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-stone-50/30">
          <div className="grid grid-cols-1 gap-1">
            {uniqueItems.length === 0 && (
              <div className="py-12 text-center text-stone-400 italic text-sm">
                此文件夹为空
              </div>
            )}
            {uniqueItems.map(item => (
              <div 
                key={item.id}
                className="flex items-center justify-between p-3 hover:bg-white hover:shadow-sm border border-transparent hover:border-stone-100 rounded-xl transition-all group"
              >
                <div 
                  className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                  onClick={() => item.mimeType === 'application/vnd.google-apps.folder' ? onNavigate(item.id, item.name) : onImport(item)}
                >
                  <div className={`p-2 rounded-lg ${item.mimeType === 'application/vnd.google-apps.folder' ? 'bg-amber-50 text-amber-500' : 'bg-blue-50 text-blue-500'}`}>
                    {item.mimeType === 'application/vnd.google-apps.folder' ? <Folder size={18} /> : <FilePlus size={18} />}
                  </div>
                  <div className="min-w-0 overflow-hidden">
                    <p className="text-sm font-medium text-stone-700 truncate">{item.name}</p>
                    <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                      {item.mimeType === 'application/vnd.google-apps.folder' ? '文件夹' : 'JSON 文件'}
                    </p>
                  </div>
                </div>
                
                <button 
                  onClick={() => onImport(item)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold opacity-0 group-hover:opacity-100 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
                >
                  <Download size={14} /> 导入
                </button>
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-4 bg-stone-50 border-t border-stone-100 text-center">
          <p className="text-[10px] text-stone-400 font-medium italic">
            * 仅支持导入 .json 格式的人物卡文件
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default DriveBrowser;
