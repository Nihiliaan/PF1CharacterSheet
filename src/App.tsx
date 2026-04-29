import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Image as ImageIcon, ChevronDown, ChevronRight, GripVertical, Settings, X, ChevronLeft, LogIn, LogOut, Save, Share2, FilePlus, Download, LayoutGrid, User, Link as LinkIcon, ExternalLink, ShieldCheck, Copy, Move, FolderPlus, Folder, RotateCcw, MoreVertical, Search, Grid, List as ListIcon, Check, Cloud, CloudUpload, HardDrive, Pin, Sparkles, Loader2 } from 'lucide-react';
import { getDriveAccessToken, ensureFolder, uploadOrUpdateFile, listDriveFiles, getFileContent, findPF1Root } from './services/googleDriveService';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, googleProvider, githubProvider, discordProvider } from './lib/firebase';
import { loginWithProvider, logout, linkAccount, unlinkProvider } from './services/authService';
import { saveCharacter, getMyCharacters, getCharacterById, deleteCharacter, getFolders, createFolder, deleteFolder, moveCharacter, copyCharacter, renameItem, moveFolder, ensureLocalFolder } from './services/characterService';
import BBCodeTemplateEditor, { DEFAULT_BBCODE_TEMPLATE } from './components/BBCodeTemplateEditor';
import { generateBBCode } from './utils/bbcodeExporter';
import { extractCharacterFromText } from './services/aiService';

type Column = {
  key: string;
  label: string;
  width?: string;
  hideRightBorder?: boolean;
  type?: 'text' | 'float' | 'quantity' | 'select';
  options?: string[];
};

interface DynamicTableProps {
  columns: Column[];
  data: Record<string, string>[];
  originalData?: Record<string, string>[];
  onChange: (data: Record<string, string>[]) => void;
  newItemGenerator?: () => Record<string, string>;
  fixedRows?: boolean;
  readonlyColumns?: string[];
  footerRow?: Record<string, string>;
  onFooterChange?: (data: Record<string, string>) => void;
  footerReadonlyColumns?: string[];
  onColumnLabelChange?: (index: number, newLabel: string) => void;
  onRemoveColumn?: (index: number) => void;
  onAddColumn?: () => void;
  rowDraggable?: boolean;
  rowActionMode?: 'drag' | 'delete';
  onRowActionModeToggle?: () => void;
  onRowDragStart?: (index: number, e: React.DragEvent) => void;
  onRowDragOver?: (index: number, e: React.DragEvent) => void;
  onRowDrop?: (index: number, e: React.DragEvent) => void;
  readOnly?: boolean;
}

const DynamicCellInput = ({ value, originalValue, onChange, className = '', readOnly = false, type = 'text', options }: { value: string; originalValue?: string; onChange: (v: string) => void; className?: string; readOnly?: boolean; type?: 'text' | 'float' | 'quantity' | 'select'; options?: string[] }) => {
  const [isFocused, setIsFocused] = useState(false);
  const isChanged = !readOnly && originalValue !== undefined && value !== originalValue;

  const displayValue = () => {
    if (type === 'quantity' && !isFocused) {
      if (!value || value === '1') return '';
      return `×${value}`;
    }
    return value;
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLSelectElement>) => {
    let val = e.target.value;
    if (type === 'float') {
      if (val !== '' && !/^-?\d*\.?\d{0,2}$/.test(val)) return;
    }
    if (type === 'quantity') {
      if (val !== '' && !/^\d*$/.test(val)) return;
      if (val === '0') return; 
    }
    onChange(val);
  };

  if (readOnly) {
    return (
      <div className={`px-2 py-1 min-h-[32px] whitespace-pre-wrap break-words flex items-center h-full ${className}`}>
        {displayValue()}
      </div>
    );
  }

  return (
    <div className={`grid h-full w-full relative group transition-colors ${isChanged ? 'bg-amber-100/40' : ''}`}>
      {type === 'select' && options ? (
        <select
          value={value}
          onChange={handleChange as any}
          className={`w-full h-full outline-none bg-transparent transition-colors px-2 py-1 cursor-pointer ${className} ${isChanged ? 'text-amber-700 font-bold' : ''}`}
        >
          {options.map(opt => (
            <option key={opt} value={opt}>{opt || '—'}</option>
          ))}
        </select>
      ) : (
        <>
          <div className="col-start-1 row-start-1 invisible whitespace-pre-wrap break-words px-2 py-1 min-w-[60px] min-h-[32px] font-medium pointer-events-none">
            {displayValue() + '\n'}
          </div>
          <textarea
            value={isFocused && type === 'quantity' ? value : displayValue()}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`col-start-1 row-start-1 w-full h-full resize-none overflow-hidden outline-none bg-transparent transition-colors px-2 py-1 ${className} ${type === 'quantity' ? 'text-stone-500 font-medium' : ''} ${isChanged ? 'text-amber-800' : ''}`}
            rows={1}
          />
        </>
      )}
      {isChanged && (
        <div className="absolute right-0.5 top-0.5 w-1 h-1 bg-amber-500 rounded-full animate-pulse shadow-sm" />
      )}
    </div>
  );
};

function DynamicTable(props: DynamicTableProps) {
  const { columns, data, originalData, onChange, newItemGenerator, fixedRows, readonlyColumns, footerRow, onFooterChange, footerReadonlyColumns, onColumnLabelChange, onRemoveColumn, onAddColumn, rowDraggable, rowActionMode = 'drag', onRowActionModeToggle, onRowDragStart, onRowDragOver, onRowDrop, readOnly = false } = props;
  const updateData = (index: number, key: string, value: string) => {
    if (readOnly) return;
    const newData = [...data];
    newData[index] = { ...newData[index], [key]: value };
    onChange(newData);
  };
  const addRow = () => {
    if (readOnly) return;
    if (newItemGenerator && !fixedRows) {
      onChange([...data, newItemGenerator()]);
    }
  };
  const removeRow = (index: number) => {
    if (readOnly) return;
    if (!fixedRows) {
      onChange(data.filter((_, i) => i !== index));
    }
  };

  const isTableDirty = React.useMemo(() => {
    return JSON.stringify(data) !== JSON.stringify(originalData);
  }, [data, originalData]);

  return (
    <div className={`w-full overflow-x-auto rounded border transition-colors ${isTableDirty ? 'bg-amber-100/50 border-amber-500 shadow-sm' : 'border-stone-300 bg-white'}`}>
      <table className="w-full border-collapse text-sm table-auto min-w-[600px]">
        <thead>
          <tr className="bg-stone-200 text-stone-700">
            {columns.map((c, index) => (
              <th key={c.key} style={{ width: c.width }} className={`border-stone-300 px-2 py-1.5 text-left font-semibold group/th relative whitespace-nowrap min-w-[60px] ${c.hideRightBorder ? '' : 'border-r last:border-r-0'}`}>
                {onColumnLabelChange ? (
                  <input
                    value={c.label}
                    onChange={(e) => onColumnLabelChange(index, e.target.value)}
                    className="bg-transparent outline-none w-full font-semibold focus:bg-white focus:text-stone-900 border-b border-transparent focus:border-stone-400 transition-colors"
                  />
                ) : (
                  c.label
                )}
                {onRemoveColumn && columns.length > 1 && (
                  <button 
                    type="button"
                    onClick={() => onRemoveColumn(index)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 text-stone-400 hover:text-red-500 rounded opacity-0 group-hover/th:opacity-100 transition-opacity bg-stone-200"
                    title="删除列"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </th>
            ))}
            {!fixedRows && (
              <th className="w-8 p-0 align-middle border-stone-300">
                {rowDraggable && onRowActionModeToggle ? (
                  <button
                    type="button"
                    onClick={onRowActionModeToggle}
                    className="p-1.5 w-full h-full min-h-[36px] flex items-center justify-center text-stone-400 hover:text-stone-900 transition-colors cursor-pointer"
                    title={rowActionMode === 'drag' ? "切换到删除模式" : "切换到拖拽模式"}
                  >
                    {rowActionMode === 'drag' ? <GripVertical size={16} /> : <Trash2 size={16} className="text-red-400 hover:text-red-500" />}
                  </button>
                ) : onAddColumn && (
                  <button
                    type="button"
                    onClick={onAddColumn}
                    className="p-1.5 w-full h-full min-h-[36px] flex items-center justify-center text-stone-400 hover:text-stone-900 transition-colors cursor-pointer"
                    title="添加列"
                  >
                    <Plus size={16} />
                  </button>
                )}
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-300">
          {data.map((row, i) => (
            <tr 
              key={i} 
              className={`transition-colors group ${JSON.stringify(row) !== JSON.stringify(originalData?.[i]) ? 'bg-amber-100/30' : 'hover:bg-stone-50'}`}
              draggable={rowDraggable && rowActionMode === 'drag'}
              onDragStart={(e) => onRowDragStart?.(i, e)}
              onDragOver={(e) => onRowDragOver?.(i, e)}
              onDrop={(e) => onRowDrop?.(i, e)}
            >
              {columns.map((c) => (
                <td key={c.key} className={`p-0 relative border-stone-300 align-top ${c.hideRightBorder ? '' : 'border-r last:border-r-0'}`}>
                  <DynamicCellInput
                    value={row[c.key] || ''}
                    originalValue={originalData?.[i]?.[c.key]}
                    onChange={(val) => updateData(i, c.key, val)}
                    readOnly={readonlyColumns?.includes(c.key)}
                    type={c.type}
                    options={c.options}
                    className={readonlyColumns?.includes(c.key) ? "font-medium bg-stone-100/50 text-stone-700" : "hover:bg-stone-100 focus:bg-white"}
                  />
                </td>
              ))}
              {!fixedRows && (
                <td className="p-0 text-center align-middle w-8 border-stone-300 relative group-hover:bg-stone-100 transition-colors">
                  <div className="flex items-center justify-center w-full h-[32px] opacity-0 group-hover:opacity-100 transition-opacity">
                    {rowDraggable && rowActionMode === 'drag' ? (
                      <GripVertical size={16} className="text-stone-300 cursor-grab hover:text-stone-500" />
                    ) : (
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        className="text-stone-300 hover:text-red-500 rounded p-1"
                        title="删除行"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
          {!fixedRows && (
            <tr>
              <td colSpan={columns.length + 1} className="p-0 bg-stone-50 hover:bg-stone-100 transition-colors cursor-pointer">
                <button
                  type="button"
                  onClick={addRow}
                  className="flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900 px-3 py-2 w-full justify-center font-medium uppercase tracking-wider"
                >
                  <Plus size={14} /> 添加行 Add Row
                </button>
              </td>
            </tr>
          )}
          {footerRow && onFooterChange && (
            <tr className="bg-stone-100 text-stone-800 border-t-2 border-stone-300">
              {columns.map((c) => (
                <td key={`footer-${c.key}`} className="p-0 relative border-r border-stone-300 last:border-r-0 align-top">
                  <DynamicCellInput
                    value={footerRow[c.key] || ''}
                    onChange={(val) => onFooterChange({ ...footerRow, [c.key]: val })}
                    readOnly={footerReadonlyColumns?.includes(c.key)}
                    className={footerReadonlyColumns?.includes(c.key) ? "font-bold bg-stone-200/50 text-stone-800" : "font-bold hover:bg-stone-50 focus:bg-white"}
                  />
                </td>
              ))}
              {!fixedRows && <td className="p-0 border-t-2 border-stone-300"></td>}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const InlineInput = ({ label, value, originalValue, onChange, placeholder = '', className = '', readOnly = false }: { label: string; value: string; originalValue?: string; onChange: (v: string) => void; placeholder?: string; className?: string; readOnly?: boolean }) => {
  const isChanged = originalValue !== undefined && value !== originalValue;
  return (
    <div className={`flex flex-col gap-0.5 focus-within:ring-1 focus-within:ring-primary rounded p-1 transition-all ${isChanged ? 'bg-amber-100/70 border-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.2)]' : 'bg-white/50 border-transparent hover:border-stone-200'} border ${className}`}>
      <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider flex justify-between">
        {label}
        {isChanged && <span className="text-amber-600 font-black animate-pulse">●</span>}
      </label>
      <input
        value={value}
        onChange={(e) => !readOnly && onChange(e.target.value)}
        readOnly={readOnly}
        placeholder={placeholder}
        className={`bg-transparent border-b border-stone-300 focus:border-stone-800 transition-colors outline-none pb-0.5 w-full text-sm font-medium text-ink ${readOnly ? 'cursor-default' : ''}`}
      />
    </div>
  );
};

const AutoResizeTextarea = ({ value, originalValue, onChange, className = '', placeholder = '', readOnly = false }: { value: string; originalValue?: string; onChange: (v: string) => void; className?: string; placeholder?: string; readOnly?: boolean }) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const isChanged = originalValue !== undefined && value !== originalValue;

  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [value]);

  return (
    <div className={`relative w-full ${isChanged ? 'bg-amber-100/40' : ''} transition-colors rounded`}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => !readOnly && onChange(e.target.value)}
        readOnly={readOnly}
        className={`w-full bg-stone-50 border border-stone-200 rounded px-3 py-2 text-sm outline-none focus:border-stone-400 overflow-hidden resize-none ${className} ${readOnly ? 'cursor-default border-transparent bg-transparent' : ''} ${isChanged ? '!bg-transparent border-amber-300 ring-1 ring-amber-300/30' : ''}`}
        placeholder={placeholder}
        rows={1}
      />
      {isChanged && (
        <div className="absolute right-2 top-2 w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse shadow-sm" />
      )}
    </div>
  );
};

const SECTIONS = [
  { id: 'basic-info', label: '基本信息' },
  { id: 'story', label: '背景故事' },
  { id: 'attributes', label: '属性与战技' },
  { id: 'attacks', label: '攻击' },
  { id: 'defenses', label: '防御' },
  { id: 'racial-traits', label: '种族特性' },
  { id: 'traits', label: '背景特性' },
  { id: 'class-features', label: '职业特性' },
  { id: 'feats', label: '专长' },
  { id: 'spells', label: '法术与类法术能力' },
  { id: 'skills', label: '技能加点' },
  { id: 'equipment', label: '装备与物品' },
  { id: 'additional-data', label: '附加数据' }
];

function TableOfContents() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="fixed left-0 top-1/2 -translate-y-1/2 z-50 py-8 hidden md:block group w-[2.5rem] hover:w-[12rem] transition-all duration-300 overflow-hidden">
      <div className="relative flex flex-col justify-between h-[70vh] min-h-[400px] pl-3">
        {/* The vertical line */}
        <div className="absolute left-[18px] top-1.5 bottom-1.5 w-0.5 bg-stone-300 drop-shadow-sm transition-colors pointer-events-none rounded-full" />
        
        {SECTIONS.map((sec) => (
          <button
            key={sec.id}
            onClick={() => scrollTo(sec.id)}
            className="flex items-center gap-3 relative group/item"
          >
            <div className="w-3.5 h-3.5 rounded-full bg-stone-300 border-[3px] border-paper group-hover/item:border-white group-hover/item:bg-primary group-hover/item:scale-125 transition-all shadow-sm z-10 shrink-0" />
            <span className="opacity-0 group-hover:opacity-100 transition-all font-sans whitespace-nowrap text-sm font-bold text-stone-500 drop-shadow-sm group-hover/item:text-primary -translate-x-2 group-hover:translate-x-0 duration-200 px-2 py-0.5 rounded cursor-pointer pointer-events-none group-hover:pointer-events-auto">
              {sec.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

const Section = ({ id, title, children, className = '' }: { id?: string; title: string; children: React.ReactNode; className?: string }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <section id={id} className={`scroll-mt-12 mb-8 ${className}`}>
      <div 
        className="flex items-center mb-4 cursor-pointer select-none group" 
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="text-stone-400 group-hover:text-primary transition-colors mr-2 flex-shrink-0">
          {isOpen ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
        </div>
        <h2 className="text-xl font-serif font-bold text-ink flex-shrink-0 pr-4 group-hover:text-primary transition-colors">{title}</h2>
        <div className="h-px bg-stone-300 flex-1"></div>
      </div>
      {isOpen && (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-stone-200">
          {children}
        </div>
      )}
    </section>
  );
};

const AvatarGallery = ({ avatars, onUpdate }: { avatars: { url: string; note: string }[], onUpdate: (a: { url: string; note: string }[]) => void }) => {
  const [index, setIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const total = avatars.length;

  React.useEffect(() => {
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

const VaultContent = ({ 
  user, 
  characters, 
  folders, 
  currentFolderId, 
  setCurrentFolderId,
  onSelect, 
  onRefresh, 
  toast,
  setToast,
  onAdd,
  driveModal,
  setDriveModal,
  handleBrowseDrive,
  navigateDrive,
  importFromDrive,
  handleCloudBackup,
  handleCloudRestore,
  isSyncingDrive,
  navigateToPathIndex,
  confirmNavigation,
  setShowAIModal
}: { 
  user: FirebaseUser; 
  characters: any[]; 
  folders: any[]; 
  currentFolderId: string | null; 
  setCurrentFolderId: (id: string | null) => void; 
  onSelect: (char: any) => void; 
  onRefresh: () => void;
  toast: { message: string; type?: 'success' | 'error' | 'info' } | null;
  setToast: (t: any) => void;
  onAdd: () => void;
  driveModal: any;
  setDriveModal: (m: any) => void;
  handleBrowseDrive: () => void;
  navigateDrive: (id: string, name: string) => void;
  importFromDrive: (item: any) => void;
  handleCloudBackup: () => void;
  handleCloudRestore: () => void;
  isSyncingDrive: boolean;
  navigateToPathIndex: (index: number) => void;
  confirmNavigation: (action: () => void) => void;
  setShowAIModal: (v: boolean) => void;
}) => {
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: any; isFolder: boolean } | null>(null);
  const [draggedItem, setDraggedItem] = useState<{ id: string; type: 'character' | 'folder' } | null>(null);

  const filteredFolders = folders.filter(f => (f.parentId || null) === currentFolderId && (search ? f.name.toLowerCase().includes(search.toLowerCase()) : true));
  const filteredChars = characters.filter(c => (c.folderId || null) === currentFolderId && (search ? c.name.toLowerCase().includes(search.toLowerCase()) : true));

  const getDeepAvatars = (folderId: string): string[] => {
    const directChars = characters.filter(c => c.folderId === folderId);
    let avatars = directChars.map(c => c.data.basic.avatars?.[0]?.url || 'https://ui-avatars.com/api/?name=' + c.name);
    
    if (avatars.length < 4) {
      const subFolders = folders.filter(f => f.parentId === folderId);
      for (const sub of subFolders) {
        const subAvatars = getDeepAvatars(sub.id);
        avatars = [...avatars, ...subAvatars];
        if (avatars.length >= 4) break;
      }
    }
    return avatars.slice(0, 4);
  };

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [selectionBox, setSelectionBox] = useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);
  const explorerRef = useRef<HTMLDivElement>(null);

  const allItems = [...filteredFolders.map(f => ({ ...f, type: 'folder' })), ...filteredChars.map(c => ({ ...c, type: 'character' }))];

  const handleDragStart = (e: React.DragEvent, id: string, type: 'folder' | 'character') => {
    if (selectedIds.includes(id)) {
      setDraggedItem({ id: 'multiple', type: 'character' }); // Special case for multiple
      e.dataTransfer.setData('text/plain', JSON.stringify({ ids: selectedIds, type: 'multiple' }));
    } else {
      setDraggedItem({ id, type });
      e.dataTransfer.setData('text/plain', JSON.stringify({ id, type }));
    }
  };

  const handleDropOnFolder = async (targetId: string | null) => {
    if (!draggedItem) return;
    try {
      if (draggedItem.id === 'multiple') {
        const itemsToMove = selectedIds.filter(id => id !== targetId);
        await Promise.all(itemsToMove.map(async id => {
          const isFolder = folders.some(f => f.id === id);
          if (isFolder) await moveFolder(id, targetId);
          else await moveCharacter(id, targetId);
        }));
        setToast({ message: `已移动 ${itemsToMove.length} 个项目` });
      } else {
        if (draggedItem.id === targetId) return;
        if (draggedItem.type === 'character') await moveCharacter(draggedItem.id, targetId);
        else await moveFolder(draggedItem.id, targetId);
        setToast({ message: "已移动项目" });
      }
      setSelectedIds([]);
      onRefresh();
    } catch (e) {
      setToast({ message: "移动失败", type: 'error' });
    }
    setDraggedItem(null);
  };

  const handleItemClick = (e: React.MouseEvent, id: string, index: number) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    } else if (e.shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(index, lastSelectedIndex);
      const end = Math.max(index, lastSelectedIndex);
      const rangeIds = allItems.slice(start, end + 1).map(item => item.id);
      setSelectedIds(Array.from(new Set([...selectedIds, ...rangeIds])));
    } else {
      setSelectedIds([id]);
    }
    setLastSelectedIndex(index);
  };

  const toggleSelection = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    if (e.ctrlKey || e.shiftKey) return; // Don't start box if modifying selection
    
    // Check if clicked on space or item
    const target = e.target as HTMLElement;
    if (target.closest('.selectable-item')) return;

    setSelectedIds([]);
    const rect = explorerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left + (explorerRef.current?.scrollLeft || 0);
    const y = e.clientY - rect.top + (explorerRef.current?.scrollTop || 0);
    setSelectionBox({ x1: x, y1: y, x2: x, y2: y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!selectionBox || !explorerRef.current) return;
    const rect = explorerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + (explorerRef.current.scrollLeft || 0);
    const y = e.clientY - rect.top + (explorerRef.current.scrollTop || 0);
    setSelectionBox(prev => prev ? { ...prev, x2: x, y2: y } : null);

    // Calc selection
    const boxX = Math.min(selectionBox.x1, x);
    const boxY = Math.min(selectionBox.y1, y);
    const boxW = Math.abs(selectionBox.x1 - x);
    const boxH = Math.abs(selectionBox.y1 - y);

    const items = explorerRef.current.querySelectorAll('.selectable-item');
    const newSelected: string[] = [];
    items.forEach(el => {
      const itemRect = (el as HTMLElement).getBoundingClientRect();
      const relativeX = itemRect.left - rect.left + explorerRef.current!.scrollLeft;
      const relativeY = itemRect.top - rect.top + explorerRef.current!.scrollTop;
      
      if (
        relativeX < boxX + boxW &&
        relativeX + itemRect.width > boxX &&
        relativeY < boxY + boxH &&
        relativeY + itemRect.height > boxY
      ) {
        newSelected.push(el.getAttribute('data-id')!);
      }
    });
    setSelectedIds(newSelected);
  };

  const handleMouseUp = () => {
    setSelectionBox(null);
  };

  const path = (() => {
    let p = [];
    let curId = currentFolderId;
    while (curId) {
      const f = folders.find(folder => folder.id === curId);
      if (f) {
        p.unshift(f);
        curId = f.parentId;
      } else break;
    }
    return p;
  })();

  const [modal, setModal] = useState<{ 
    type: 'prompt' | 'confirm', 
    title: string, 
    defaultValue?: string,
    onConfirm: (val: string) => void 
  } | null>(null);

  const handleImportLocal = async (files: FileList | null) => {
    if (!files || !user) return;
    let importCount = 0;
    setToast({ message: "正在导入本地文件..." });

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.name.endsWith('.json')) continue;

      try {
        const text = await file.text();
        const content = JSON.parse(text);
        
        let folderId = currentFolderId;
        if ((file as any).webkitRelativePath) {
          const parts = (file as any).webkitRelativePath.split('/');
          for (let j = 1; j < parts.length - 1; j++) {
            folderId = await ensureLocalFolder(parts[j], folderId, user.uid);
          }
        }

        const finalData = {
          ...content,
          basic: { ...content.basic, name: content.basic?.name || file.name.replace('.json', '') }
        };

        await saveCharacter(finalData, undefined, folderId);
        importCount++;
      } catch (e) {
        console.error("Failed to parse local file", e);
      }
    }
    onRefresh();
    setToast({ message: `本地导入成功！共导入 ${importCount} 个人物卡` });
  };

  const handleImportClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const content = JSON.parse(text);
      if (!content.basic || !content.attributes) throw new Error("无效的人物卡格式");
      
      const finalData = {
        ...content,
        basic: { ...content.basic, name: content.basic?.name || "剪贴板导入" }
      };
      
      await saveCharacter(finalData, undefined, currentFolderId);
      onRefresh();
      setToast({ message: "剪贴板导入成功！" });
    } catch (e: any) {
      setToast({ message: "剪贴板导入失败: " + e.message, type: 'error' });
    }
  };

  const handleCreateFolder = async () => {
    setModal({
      type: 'prompt',
      title: '新建文件夹',
      defaultValue: '新文件夹',
      onConfirm: async (name) => {
        if (name && name.trim()) {
          const trimmedName = name.trim();
          // Unique folder name check
          if (folders.some(f => f.parentId === currentFolderId && f.name.toLowerCase() === trimmedName.toLowerCase())) {
            setToast({ message: "该目录下已存在同名文件夹", type: 'error' });
            return;
          }
          try {
            await createFolder(trimmedName, currentFolderId);
            onRefresh();
            setToast({ message: "文件夹创建成功" });
          } catch (e) {
            setToast({ message: "创建文件夹失败", type: 'error' });
          }
        }
      }
    });
  };

  const handleAction = async (action: string, item: any, isFolder: boolean) => {
    try {
      if (action === 'delete') {
        const idsToDelete = selectedIds.includes(item.id) ? selectedIds : [item.id];
        setModal({
          type: 'confirm',
          title: `确定要删除这 ${idsToDelete.length} 个项目吗？`,
          onConfirm: async () => {
            await Promise.all(idsToDelete.map(async id => {
              const isF = folders.some(f => f.id === id);
              if (isF) await deleteFolder(id);
              else await deleteCharacter(id);
            }));
            setToast({ message: "已删除所选项目" });
            setSelectedIds([]);
            onRefresh();
          }
        });
        return; 
      } else if (action === 'rename' && isFolder) {
          setModal({
            type: 'prompt',
            title: '重命名文件夹',
            defaultValue: item.name,
            onConfirm: async (newName) => {
              const trimmed = newName.trim();
              if (!trimmed || trimmed === item.name) return;
              if (folders.some(f => f.parentId === item.parentId && f.name.toLowerCase() === trimmed.toLowerCase() && f.id !== item.id)) {
                setToast({ message: "该目录下已存在同名文件夹", type: 'error' });
                return;
              }
              await renameItem(item.id, 'folder', trimmed);
              setToast({ message: "重命名成功" });
              onRefresh();
            }
          });
          return;
      } else if (action === 'copy') {
        if (selectedIds.includes(item.id)) {
          await Promise.all(selectedIds.map(id => folders.some(f => f.id === id) ? null : copyCharacter(id)));
        } else {
          await copyCharacter(item.id);
        }
        setToast({ message: "已创建副本" });
      } else if (action === 'share') {
        const shareUrl = `${window.location.origin}${window.location.pathname}?id=${item.id}`;
        navigator.clipboard.writeText(shareUrl);
        setToast({ message: "分享链接已复制！" });
      } else if (action === 'rename') {
          setModal({
            type: 'prompt',
            title: '重命名',
            defaultValue: item.name,
            onConfirm: async (newName) => {
              if (newName && newName !== item.name) {
                await renameItem(item.id, isFolder ? 'folder' : 'character', newName);
                setToast({ message: "重命名成功" });
                onRefresh();
              }
            }
          });
          return;
      }
      onRefresh();
    } catch (e) {
      setToast({ message: "操作失败", type: 'error' });
    }
  };

  return (
    <div 
      className="flex-1 flex flex-col h-full bg-stone-50 overflow-hidden" 
      onContextMenu={e => {
        e.preventDefault();
        const target = e.target as HTMLElement;
        // Show background context menu if clicking anywhere that isn't an item 
        // OR is explicitly marked as background
        if (!target.closest('.selectable-item')) {
          setContextMenu({ x: e.clientX, y: e.clientY, item: null, isFolder: false });
        }
      }}
    >
      {/* Hidden inputs for imports */}
      <input 
        id="local-import-input"
        type="file" 
        multiple 
        accept=".json"
        className="hidden"
        onChange={(e) => handleImportLocal(e.target.files)}
      />
      <input 
        id="local-folder-import-input"
        type="file" 
        /* @ts-ignore */
        webkitdirectory=""
        className="hidden"
        onChange={(e) => handleImportLocal(e.target.files)}
      />
      {modal && (
        <Dialog 
          type={modal.type} 
          title={modal.title} 
          defaultValue={modal.defaultValue}
          onConfirm={(val) => { modal.onConfirm(val); setModal(null); }} 
          onCancel={() => setModal(null)} 
        />
      )}
      {/* Vault Toolbar */}
      <div className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between shadow-sm flex-wrap gap-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <button 
            onClick={() => setCurrentFolderId(null)}
            onDragOver={e => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleDropOnFolder(null); }}
            className="flex items-center gap-1.5 text-stone-500 hover:text-primary transition-colors p-1 rounded hover:bg-stone-100"
          >
            <User size={16} /> 根目录
          </button>
          {path.map(f => (
            <React.Fragment key={f.id}>
              <ChevronRight size={14} className="text-stone-300" />
              <button 
                onClick={() => setCurrentFolderId(f.id)}
                onDragOver={e => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleDropOnFolder(f.id); }}
                className="hover:text-primary transition-colors p-1 rounded hover:bg-stone-100"
              >
                {f.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        <div className="flex items-center gap-4 flex-1 max-w-md mx-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
            <input 
              type="text" 
              placeholder="搜索我的收藏..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-stone-100 rounded-full text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all border border-transparent focus:border-stone-300"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
            <div className="relative group">
              <button 
                className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 text-stone-600 hover:bg-stone-200 rounded-lg transition-all text-xs font-bold"
              >
                <Download size={16} /> 导入
              </button>
              <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-stone-200 shadow-xl rounded-xl py-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <button 
                  onClick={() => document.getElementById('local-import-input')?.click()}
                  className="w-full text-left px-4 py-2 text-xs hover:bg-stone-50 flex items-center gap-2"
                >
                  <HardDrive size={14} /> 本地文件
                </button>
                <button 
                  onClick={() => document.getElementById('local-folder-import-input')?.click()}
                  className="w-full text-left px-4 py-2 text-xs hover:bg-stone-50 flex items-center gap-2"
                >
                  <Folder size={14} /> 本地文件夹
                </button>
                <button 
                  onClick={handleImportClipboard}
                  className="w-full text-left px-4 py-2 text-xs hover:bg-stone-50 flex items-center gap-2"
                >
                  <Check size={14} /> 剪贴板导入
                </button>
                <div className="h-px bg-stone-100 my-1"></div>
                <button 
                  onClick={handleBrowseDrive}
                  className="w-full text-left px-4 py-2 text-xs hover:bg-stone-50 flex items-center gap-2 font-bold text-primary"
                >
                  <Search size={14} /> 浏览云端导入...
                </button>
                <button 
                  onClick={() => setShowAIModal(true)}
                  className="w-full text-left px-4 py-2 text-xs hover:bg-stone-50 flex items-center gap-2 font-bold text-indigo-600"
                >
                  <Sparkles size={14} /> AI 识别导入...
                </button>
                <button 
                  onClick={handleCloudRestore}
                  className="w-full text-left px-4 py-2 text-xs hover:bg-stone-50 flex items-center gap-2"
                >
                  <RotateCcw size={14} /> 从云端备份还原
                </button>
                <button 
                  onClick={handleCloudBackup}
                  className="w-full text-left px-4 py-2 text-xs hover:bg-stone-50 flex items-center gap-2"
                >
                  <CloudUpload size={14} /> 云端备份当前数据
                </button>
              </div>
            </div>
            {selectedIds.length > 0 && (
              <button 
                onClick={() => handleAction('delete', { id: 'multiple', name: '所选项目' }, false)}
                className="flex items-center gap-2 px-3 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors text-xs font-bold"
              >
                <Trash2 size={16} /> 删除 ({selectedIds.length})
              </button>
            )}
            <button 
              onClick={handleCloudBackup}
              disabled={isSyncingDrive}
              className={`p-2 rounded-lg transition-all ${
                isSyncingDrive 
                ? 'text-blue-400 animate-pulse' 
                : 'text-stone-500 hover:bg-stone-100 hover:text-blue-600'
              }`}
              title="云端快速备份"
            >
              <CloudUpload size={20} />
            </button>
            <button 
              onClick={handleCreateFolder}
              className="p-2 text-stone-500 hover:bg-stone-100 rounded-lg transition-colors"
              title="新建文件夹"
            >
              <FolderPlus size={20} />
            </button>
            <div className="w-px h-6 bg-stone-200 mx-1"></div>
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'text-primary bg-primary/10' : 'text-stone-500 hover:bg-stone-100'}`}
            >
              <Grid size={20} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'text-primary bg-primary/10' : 'text-stone-500 hover:bg-stone-100'}`}
            >
              <ListIcon size={20} />
            </button>
        </div>
      </div>

      {/* Explorer Content */}
      <div 
        ref={explorerRef}
        className="flex-1 overflow-y-auto p-6 scroll-smooth custom-scrollbar relative select-none"
        data-context-bg="true"
        onDragOver={e => e.preventDefault()}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDrop={async (e) => {
            e.preventDefault();
            handleDropOnFolder(currentFolderId);
        }}
      >
        {selectionBox && (
          <div 
            className="absolute z-50 border border-primary/50 bg-primary/10 pointer-events-none"
            style={{
              left: Math.min(selectionBox.x1, selectionBox.x2),
              top: Math.min(selectionBox.y1, selectionBox.y2),
              width: Math.abs(selectionBox.x1 - selectionBox.x2),
              height: Math.abs(selectionBox.y1 - selectionBox.y2)
            }}
          />
        )}
        {(filteredFolders.length === 0 && filteredChars.length === 0) ? (
          <div 
            className="h-full flex flex-col items-center justify-center text-stone-400 opacity-50"
            data-context-bg="true"
          >
            <RotateCcw size={64} className="mb-4 animate-reverse-spin-slow" />
            <p className="font-serif italic">这里空空如也...</p>
          </div>
        ) : (
          <div 
            data-context-bg="true"
            className={viewMode === 'grid' 
            ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6" 
            : "flex flex-col gap-1"
          }>
            {/* Folders */}
            {filteredFolders.map((folder, idx) => {
              const previewAvatars = getDeepAvatars(folder.id);
              const isSelected = selectedIds.includes(folder.id);
              return (
                <div 
                  key={folder.id}
                  data-id={folder.id}
                  className={viewMode === 'grid'
                    ? `group relative flex flex-col p-2 rounded-2xl transition-all cursor-pointer select-none border-2 selectable-item ${isSelected ? 'bg-primary/5 border-primary shadow-md' : 'hover:bg-white hover:shadow-xl border-transparent hover:border-stone-100'}`
                    : `group relative flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-all selectable-item ${isSelected ? 'bg-primary/5 border-primary shadow-sm' : 'hover:bg-white border-transparent'}`
                  }
                  onClick={(e) => handleItemClick(e, folder.id, idx)}
                  onDoubleClick={() => setCurrentFolderId(folder.id)}
                  onContextMenu={e => {
                    e.preventDefault();
                    setContextMenu({ x: e.clientX, y: e.clientY, item: folder, isFolder: true });
                  }}
                  draggable
                  onDragStart={(e) => handleDragStart(e, folder.id, 'folder')}
                  onDragOver={e => e.preventDefault()}
                  onDrop={async (e) => {
                      e.stopPropagation();
                      handleDropOnFolder(folder.id);
                  }}
                >
                  {/* Windows-style Selection Checkbox */}
                  <div 
                    onClick={(e) => toggleSelection(e, folder.id)}
                    className={`${viewMode === 'grid' ? 'absolute top-2 left-2' : 'relative'} z-20 w-5 h-5 rounded border shadow-sm flex-shrink-0 flex items-center justify-center transition-all ${
                        isSelected 
                        ? 'bg-blue-500 border-blue-600 text-white opacity-100 scale-100' 
                        : 'bg-white/80 border-stone-300 opacity-0 group-hover:opacity-100 scale-90 hover:scale-100'
                    }`}
                  >
                    {isSelected && <Check size={14} strokeWidth={3} />}
                  </div>

                  <div className={viewMode === 'grid' ? "mb-3" : ""}>
                    {viewMode === 'grid' ? (
                      <div className="aspect-square w-full bg-stone-100/80 rounded-xl overflow-hidden grid grid-cols-2 gap-1 p-1 group-hover:bg-amber-100/50 transition-colors relative">
                        {[0, 1, 2, 3].map(i => (
                          <div key={i} className="bg-white/60 rounded-md overflow-hidden relative border border-stone-200/50 aspect-square">
                            {previewAvatars[i] ? (
                              <img 
                                src={previewAvatars[i]} 
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center opacity-10">
                                <User size={12} className="text-stone-400" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Folder size={24} className="text-amber-400 fill-amber-400/20 group-hover:fill-amber-400 transition-colors" />
                    )}
                  </div>
                  <div className={viewMode === 'grid' ? "flex-1 text-center truncate w-full px-1" : "flex-1 text-left"}>
                      <p className={`text-xs font-bold line-clamp-1 ${isSelected ? 'text-primary' : 'text-stone-800'}`}>{folder.name}</p>
                      <p className="text-[9px] text-stone-400 font-medium">
                        {folders.filter(f => f.parentId === folder.id).length} 文件夹 · {characters.filter(c => c.folderId === folder.id).length} 人物
                      </p>
                  </div>
                </div>
              );
            })}

            {/* Characters */}
            {filteredChars.map((char, charIdx) => {
              const idx = filteredFolders.length + charIdx;
              const isSelected = selectedIds.includes(char.id);
              return (
                <div 
                  key={char.id}
                  data-id={char.id}
                  className={viewMode === 'grid'
                    ? `group relative flex flex-col p-2 rounded-2xl bg-white border-2 transition-all cursor-pointer select-none selectable-item ${isSelected ? 'border-primary bg-primary/5 shadow-lg scale-[1.02]' : 'border-stone-100 hover:border-primary hover:shadow-2xl'}`
                    : `group relative flex items-center gap-4 p-3 bg-white border-2 rounded-lg cursor-pointer transition-all selectable-item ${isSelected ? 'border-primary bg-primary/5' : 'border-stone-100 hover:border-primary'}`
                  }
                  onClick={(e) => handleItemClick(e, char.id, idx)}
                  onDoubleClick={() => {
                    onSelect(char);
                  }}
                  onContextMenu={e => {
                    e.preventDefault();
                    setContextMenu({ x: e.clientX, y: e.clientY, item: char, isFolder: false });
                  }}
                  draggable
                  onDragStart={(e) => handleDragStart(e, char.id, 'character')}
                >
                  {/* Windows-style Selection Checkbox */}
                  <div 
                    onClick={(e) => toggleSelection(e, char.id)}
                    className={`${viewMode === 'grid' ? 'absolute top-2 left-2' : 'relative'} z-20 w-5 h-5 rounded border shadow-sm flex-shrink-0 flex items-center justify-center transition-all ${
                        isSelected 
                        ? 'bg-blue-500 border-blue-600 text-white opacity-100 scale-100' 
                        : 'bg-white/80 border-stone-300 opacity-0 group-hover:opacity-100 scale-90 hover:scale-100'
                    }`}
                  >
                    {isSelected && <Check size={14} strokeWidth={3} />}
                  </div>

                  <div className={viewMode === 'grid' ? "aspect-square rounded-xl overflow-hidden mb-2 relative bg-stone-100 shadow-inner" : "w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-stone-100"}>
                      <img 
                        src={char.data.basic.avatars?.[0]?.url || 'https://ui-avatars.com/api/?name=' + char.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        referrerPolicy="no-referrer"
                        draggable={false}
                      />
                  </div>
                  <div className={viewMode === 'grid' ? "text-center min-w-0" : "flex-1 min-w-0"}>
                      <p className={`text-xs font-bold line-clamp-1 ${isSelected ? 'text-primary' : 'text-stone-800'}`}>{char.name}</p>
                      <p className="text-[9px] text-stone-400 font-medium truncate mt-0.5">
                        {char.data.basic.race} · {char.data.basic.classes}
                      </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {contextMenu && (
        <ContextMenu 
          x={contextMenu.x} 
          y={contextMenu.y} 
          onClose={() => setContextMenu(null)}
          items={
            contextMenu.item 
            ? [
                { 
                  label: contextMenu.isFolder ? '打开' : '打开人物卡', 
                  icon: contextMenu.isFolder ? Folder : User, 
                  onClick: () => {
                    if (contextMenu.isFolder) {
                      setCurrentFolderId(contextMenu.item.id);
                    } else {
                      onSelect(contextMenu.item);
                    }
                  } 
                },
                { label: '重命名', icon: Settings, onClick: () => handleAction('rename', contextMenu.item, contextMenu.isFolder) },
                { label: '复制', icon: Copy, onClick: () => handleAction('copy', contextMenu.item, contextMenu.isFolder) },
                { label: '移动', icon: Move, onClick: () => handleAction('move', contextMenu.item, contextMenu.isFolder) },
                { label: '删除', icon: Trash2, onClick: () => handleAction('delete', contextMenu.item, contextMenu.isFolder), danger: true },
              ]
            : [
                { label: '新建角色', icon: FilePlus, onClick: onAdd },
                { label: '新建文件夹', icon: FolderPlus, onClick: handleCreateFolder },
                { label: '从本地导入', icon: Download, onClick: () => document.getElementById('local-import-input')?.click() },
                { label: '从剪贴板导入', icon: Check, onClick: handleImportClipboard },
                { label: '浏览云端导入', icon: Search, onClick: handleBrowseDrive },
              ]
          } 
        />
      )}

      <AnimatePresence>
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}
      </AnimatePresence>

      {driveModal && (
        <DriveBrowser 
          modal={driveModal}
          onClose={() => setDriveModal(null)}
          onNavigate={navigateDrive}
          onImport={importFromDrive}
          onJumpToPath={navigateToPathIndex}
        />
      )}
    </div>
  );
};

const AccountMenu = ({ user, view, setView, recentCharacters, currentCharacterId, onSelect, onRemoveRecent, onLogout, confirmNavigation }: any) => {
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

  // Filter out the current character and take only the first 5
  const displayRecent = recentCharacters
    .filter((c: any) => c.id !== currentCharacterId)
    .slice(0, 5);

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

const AccountSettings = ({ user, setToast }: { user: FirebaseUser, setToast: (t: any) => void }) => {
  const providers = [
    { id: 'google.com', name: 'Google', icon: User, provider: googleProvider },
    { id: 'github.com', name: 'GitHub', icon: User, provider: githubProvider },
    { id: 'discord.com', name: 'Discord', icon: User, provider: discordProvider }
  ];

  const linkedProviders = user.providerData.map(p => p.providerId);

  const handleLink = async (provider: any) => {
    try {
      await linkAccount(provider);
      setToast({ message: "账号绑定成功" });
    } catch (e: any) {
      if (e.code === 'auth/credential-already-in-use') {
        setToast({ message: "该账号已被其他用户绑定", type: 'error' });
      } else {
        setToast({ message: "绑定失败: " + e.message, type: 'error' });
      }
    }
  };

  const handleUnlink = async (providerId: string) => {
    if (linkedProviders.length <= 1) {
      setToast({ message: "至少需要保留一个登录方式", type: 'error' });
      return;
    }
    try {
      await unlinkProvider(providerId);
      setToast({ message: "账号解绑成功" });
    } catch (e: any) {
      setToast({ message: "解绑失败: " + e.message, type: 'error' });
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 h-full overflow-y-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-serif font-bold text-ink flex items-center gap-3 uppercase tracking-tight">
          <Settings className="text-primary animate-spin-slow" size={32} />
          账户设置
        </h2>
        <p className="text-stone-500 mt-2 font-medium">管理您的个人资料和账号连接</p>
      </div>

      <div className="flex flex-col gap-6 pb-20">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 hover:shadow-md transition-shadow">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group">
              <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} className="w-24 h-24 rounded-full border-4 border-stone-50 shadow-lg object-cover group-hover:scale-105 transition-transform" referrerPolicy="no-referrer" />
              <div className="absolute bottom-0 right-0 p-1.5 bg-primary text-white rounded-full border-2 border-white">
                <ShieldCheck size={14} />
              </div>
            </div>
            <div className="text-center sm:text-left">
              <h3 className="text-2xl font-bold text-stone-800">{user.displayName || '未命名用户'}</h3>
              <p className="text-stone-500 font-mono text-sm">{user.email}</p>
              <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-2">
                {linkedProviders.map(id => (
                  <span key={id} className="px-2.5 py-1 bg-stone-100 text-stone-600 rounded-md text-[10px] font-bold uppercase tracking-wider border border-stone-200">
                    {id.split('.')[0]} 已验证
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Connections */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="p-6 bg-stone-50 border-b border-stone-200">
            <h4 className="flex items-center gap-2 text-sm font-bold text-stone-700">
              <LinkIcon size={16} className="text-stone-400" /> 第三方账号绑定
            </h4>
          </div>
          <div className="p-6 space-y-4">
            {providers.map(p => {
              const isLinked = linkedProviders.includes(p.id);
              return (
                <div key={p.id} className="group flex items-center justify-between p-4 bg-white rounded-xl border border-stone-100 hover:border-primary/20 hover:shadow-md transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl transition-colors ${isLinked ? 'bg-primary/10 text-primary' : 'bg-stone-100 text-stone-400'}`}>
                      <p.icon size={20} />
                    </div>
                    <div>
                      <span className="font-bold text-stone-800 block capitalize">{p.name} 登录方式</span>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">
                        {isLinked ? '已并入您的多元宇宙身份' : '尚未觉醒此登录路径'}
                      </span>
                    </div>
                  </div>
                  {isLinked ? (
                    <button 
                      onClick={() => handleUnlink(p.id)}
                      className="text-xs font-bold text-stone-400 hover:text-rose-600 px-4 py-2 rounded-lg hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100"
                    >
                      断开连接
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleLink(p.provider)}
                      className="text-xs font-bold text-primary hover:bg-primary text-white bg-primary/10 px-4 py-2 rounded-lg hover:text-white transition-all border border-primary/20"
                    >
                      立即绑定
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="px-6 py-4 bg-stone-50 border-t border-stone-200">
            <p className="text-[10px] text-stone-400 font-medium italic">
              * 绑定多个账号后，可以使用其中任何一个账号登录同一个系统账户。若绑定时提示冲突，请确保该账号未被其他用户占用。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [view, setView] = useState<'editor' | 'vault' | 'settings' | 'bbcode-template'>('editor');
  const [isHeaderVisible, setIsHeaderVisible] = useState(false);
  const [isHeaderPinned, setIsHeaderPinned] = useState(false);
  const [recentCharacters, setRecentCharacters] = useState<{id: string, name: string, avatar: string, classes: string, data: any}[]>([]);

  // Load recent characters from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recent_characters');
    if (saved) {
      try {
        setRecentCharacters(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load recent characters", e);
      }
    }
  }, []);

  const addToRecent = (char: any) => {
    if (!char || !char.id) return;
    setRecentCharacters(prev => {
      const filtered = prev.filter(p => p.id !== char.id);
      const name = char.name || char.data?.basic?.name || '未命名';
      const newItem = {
        id: char.id,
        name: name,
        avatar: char.avatar || char.data?.basic?.avatars?.[0]?.url || '',
        classes: char.classes || char.data?.basic?.classes || '',
        data: char.data
      };
      const next = [newItem, ...filtered].slice(0, 10);
      localStorage.setItem('recent_characters', JSON.stringify(next));
      return next;
    });
  };

  const removeFromRecent = (id: string) => {
    setRecentCharacters(prev => {
      const next = prev.filter(p => p.id !== id);
      localStorage.setItem('recent_characters', JSON.stringify(next));
      return next;
    });
  };
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);
  const [driveModal, setDriveModal] = useState<{ isOpen: boolean, currentPath: {id: string, name: string}[], items: any[] } | null>(null);
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [userApiKey, setUserApiKey] = useState(() => localStorage.getItem('user_gemini_api_key') || '');
  const [showApiKeyInput, setShowApiKeyInput] = useState(!localStorage.getItem('user_gemini_api_key'));
  const [aiInputText, setAiInputText] = useState('');
  const [isAILoading, setIsAILoading] = useState(false);

  useEffect(() => {
    localStorage.setItem('user_gemini_api_key', userApiKey);
  }, [userApiKey]);

  const handleAIExtract = async () => {
    if (!aiInputText.trim()) return;
    
    // API key priority: 1. User entered in UI (localStorage) 2. Environment Variable
    const apiKeyToUse = userApiKey.trim() || (import.meta.env.VITE_GEMINI_API_KEY as string) || "";
    
    if (!apiKeyToUse) {
      setToast({ message: "请先设置您的 Gemini API Key", type: 'error' });
      setShowApiKeyInput(true);
      return;
    }
    setIsAILoading(true);
    try {
      const extracted = await extractCharacterFromText(aiInputText, apiKeyToUse);
      
      // Merge with DEFAULT_DATA to ensure all required fields are present
      const mergedData = {
        ...DEFAULT_DATA,
        ...extracted,
        basic: {
          ...DEFAULT_DATA.basic,
          ...(extracted.basic || {})
        },
        defenses: {
          ...DEFAULT_DATA.defenses,
          ...(extracted.defenses || {})
        }
      };

      // Handle attributes specifically if they exist
      if (extracted.attributes && Array.isArray(extracted.attributes)) {
          const newAttributes = JSON.parse(JSON.stringify(DEFAULT_DATA.attributes));
          extracted.attributes.forEach((extAttr: any) => {
              const idx = newAttributes.findIndex((a: any) => a.name === extAttr.name || (extAttr.name && extAttr.name.includes(a.name)));
              if (idx !== -1) {
                  newAttributes[idx] = { ...newAttributes[idx], ...extAttr };
              }
          });
          mergedData.attributes = newAttributes;
      }

      // Ensure lists are actual arrays and items have default values if missing
      const listFields = ['meleeAttacks', 'rangedAttacks', 'skills', 'feats', 'classFeatures', 'racialTraits', 'backgroundTraits'];
      listFields.forEach(field => {
        if (extracted[field] && Array.isArray(extracted[field])) {
          mergedData[field] = extracted[field];
        } else {
          mergedData[field] = DEFAULT_DATA[field] || [];
        }
      });

      // Handle magicBlocks with IDs
      if (extracted.magicBlocks && Array.isArray(extracted.magicBlocks)) {
        mergedData.magicBlocks = extracted.magicBlocks.map((block: any) => ({
          id: 'mb-' + Math.random().toString(36).substr(2, 9),
          title: block.title || '特殊能力',
          type: block.type || 'text',
          content: block.content || '',
          columns: block.columns || [{ key: 'col1', label: '信息' }],
          tableData: block.tableData || []
        }));
      } else {
        mergedData.magicBlocks = DEFAULT_DATA.magicBlocks;
      }

      // Handle equipment bags with IDs
      if (extracted.equipmentBags && Array.isArray(extracted.equipmentBags)) {
        mergedData.equipmentBags = extracted.equipmentBags.map((bag: any) => ({
          id: 'bag-' + Math.random().toString(36).substr(2, 9),
          name: bag.name || '身上',
          ignoreWeight: false,
          items: (bag.items || []).map((item: any) => ({
            item: item.item || '',
            quantity: item.quantity || '1',
            cost: item.cost || '',
            weight: item.weight || '',
            notes: item.notes || ''
          }))
        }));
      } else {
        mergedData.equipmentBags = DEFAULT_DATA.equipmentBags;
      }

      setData(mergedData);
      setToast({ message: "AI 识别并填写成功！" });
      setShowAIModal(false);
      setAiInputText('');
      if (view !== 'editor') {
          setView('editor');
          setCurrentCharacterId(null); // It's a new unsaved character
      }
    } catch (e) {
      setToast({ message: "AI 识别失败，请检查输入文本或网络", type: 'error' });
    } finally {
      setIsAILoading(false);
    }
  };

  const handleBrowseDrive = async () => {
    if (!user) return;
    setToast({ message: "正在连接 Google 云端硬盘..." });
    try {
      const token = await getDriveAccessToken();
      if (!token) throw new Error("No token");
      
      const items = await listDriveFiles(token, 'root');
      setDriveModal({
        isOpen: true,
        currentPath: [{ id: 'root', name: '我的云端硬盘' }],
        items
      });
    } catch (e: any) {
      setToast({ message: "连接失败: " + e.message, type: 'error' });
    }
  };

  const handleCloudBackup = async () => {
    if (!user) return;
    const isGoogleUser = user.providerData.some(p => p.providerId === 'google.com');
    if (!isGoogleUser) {
      setToast({ message: "请通过 Google 账号登录以使用同步功能", type: 'error' });
      return;
    }

    setIsSyncingDrive(true);
    setToast({ message: "正在备份到 Google 云端硬盘..." });
    try {
      const token = await getDriveAccessToken();
      if (!token) throw new Error("No token");

      // 1. Ensure Root Folder
      const rootFolderId = await ensureFolder(token, "PF1CharacterSheet");

      // 2. Map Folders Map (id -> DriveId)
      const driveFolderMap: Record<string, string> = { 'root': rootFolderId };

      const sortedFoldersList = [...folders].sort((a, b) => {
        const getDepth = (id: string | null): number => {
          if (!id) return 0;
          const f = folders.find(f => f.id === id);
          return 1 + getDepth(f?.parentId || null);
        };
        return getDepth(a.parentId) - getDepth(b.parentId);
      });

      for (const folder of sortedFoldersList) {
        const parentDriveId = driveFolderMap[folder.parentId || 'root'];
        const driveId = await ensureFolder(token, folder.name, parentDriveId);
        driveFolderMap[folder.id] = driveId;
      }

      // 3. Upload Characters
      await Promise.all(myCharacters.map(async char => {
        const parentDriveId = driveFolderMap[char.folderId || 'root'] || rootFolderId;
        const rawName = char.name || '未命名角色';
        const rawClasses = char.data?.basic?.classes || '人物卡';
        const fileName = `${rawName.replace(/[\\/:*?"<>|]/g, '_')}_${String(rawClasses).replace(/[\\/:*?"<>|]/g, '_').slice(0, 30)}_${char.id.slice(-6)}.json`;
        await uploadOrUpdateFile(token, fileName, char.data, parentDriveId);
      }));

      setToast({ message: "备份成功！所有数据已同步至 PF1CharacterSheet 文件夹" });
    } catch (e: any) {
      console.error(e);
      setToast({ message: `备份失败: ${e.message}`, type: 'error' });
    } finally {
      setIsSyncingDrive(false);
    }
  };

  const handleCloudRestore = async () => {
    if (!user) return;
    const isGoogleUser = user.providerData.some(p => p.providerId === 'google.com');
    if (!isGoogleUser) {
      setToast({ message: "请通过 Google 账号登录以使用此功能", type: 'error' });
      return;
    }

    setToast({ message: "正在从云端备份还原数据..." });
    try {
      const token = await getDriveAccessToken();
      if (!token) throw new Error("No token");

      const pf1RootId = await findPF1Root(token);
      if (!pf1RootId) {
        setToast({ message: "未找到备份文件夹 (PF1CharacterSheet)", type: 'info' });
        return;
      }

      let importCount = 0;
      const processDriveFolder = async (driveFolderId: string, localParentId: string | null) => {
        const items = await listDriveFiles(token, driveFolderId);
        for (const item of items) {
          if (item.mimeType === 'application/vnd.google-apps.folder') {
            const newLocalFolderId = await ensureLocalFolder(item.name, localParentId, user.uid);
            await processDriveFolder(item.id, newLocalFolderId);
          } else if (item.name.endsWith('.json')) {
            try {
              const content = await getFileContent(token, item.id);
              if (content.basic && content.attributes) {
                const finalData = { ...content, basic: { ...content.basic, name: content.basic.name || item.name.split('_')[0].replace('.json', '') } };
                await saveCharacter(finalData, undefined, localParentId);
                importCount++;
              }
            } catch (e) {
              console.warn(`Failed to restore file ${item.name}`, e);
            }
          }
        }
      };

      await processDriveFolder(pf1RootId, currentFolderId);
      refreshCharacterList();
      setToast({ message: `还原成功！共恢复 ${importCount} 个人物卡` });
    } catch (e: any) {
      console.error(e);
      setToast({ message: `还原失败: ${e.message}`, type: 'error' });
    }
  };

  const navigateDrive = async (folderId: string, folderName: string) => {
    if (!driveModal) return;
    try {
      const token = await getDriveAccessToken();
      const items = await listDriveFiles(token, folderId);
      setDriveModal(prev => ({
        ...prev!,
        currentPath: [...prev!.currentPath, { id: folderId, name: folderName }],
        items
      }));
    } catch (e: any) {
      setToast({ message: "打开文件夹失败", type: 'error' });
    }
  };

  const navigateToPathIndex = async (index: number) => {
    if (!driveModal) return;
    const target = driveModal.currentPath[index];
    try {
      const token = await getDriveAccessToken();
      const items = await listDriveFiles(token, target.id);
      setDriveModal(prev => ({
        ...prev!,
        currentPath: prev!.currentPath.slice(0, index + 1),
        items
      }));
    } catch (e: any) {
      setToast({ message: "跳转失败", type: 'error' });
    }
  };

  const importFromDrive = async (item: any) => {
    if (!user) return;
    setToast({ message: "正在导入..." });
    try {
      const token = await getDriveAccessToken();
      let count = 0;

      const processItem = async (driveItem: any, targetFolderId: string | null) => {
        if (driveItem.mimeType === 'application/vnd.google-apps.folder') {
          const newLocalId = await ensureLocalFolder(driveItem.name, targetFolderId, user.uid);
          const children = await listDriveFiles(token, driveItem.id);
          for (const child of children) {
            await processItem(child, newLocalId);
          }
        } else if (driveItem.name.endsWith('.json')) {
          const content = await getFileContent(token, driveItem.id);
          if (content.basic && content.attributes) {
            const finalData = { ...content, basic: { ...content.basic, name: content.basic.name || driveItem.name.replace('.json', '') } };
            await saveCharacter(finalData, undefined, targetFolderId);
            count++;
          }
        }
      };

      await processItem(item, currentFolderId);
      refreshCharacterList();
      setToast({ message: `导入成功！共导入 ${count} 个人物卡` });
      setDriveModal(null);
    } catch (e: any) {
      setToast({ message: "导入失败: " + e.message, type: 'error' });
    }
  };
  const [myCharacters, setMyCharacters] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [currentCharacterId, setCurrentCharacterId] = useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [showCharacterList, setShowCharacterList] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);

  // Initial template data for "New" characters
  const DEFAULT_DATA = {
    basic: {
      name: '新人物',
      classes: '',
      alignment: '',
      size: '',
      gender: '',
      race: '',
      age: '',
      height: '',
      weight: '',
      speed: '',
      senses: '',
      initiative: '',
      perception: '',
      languages: '',
      deity: '',
      avatars: [] as { url: string; note: string }[],
    },
    story: '',
    attributes: [
      { name: '力量', final: '10', modifier: '+0', source: '10', status: '' },
      { name: '敏捷', final: '10', modifier: '+0', source: '10', status: '' },
      { name: '体质', final: '10', modifier: '+0', source: '10', status: '' },
      { name: '智力', final: '10', modifier: '+0', source: '10', status: '' },
      { name: '感知', final: '10', modifier: '+0', source: '10', status: '' },
      { name: '魅力', final: '10', modifier: '+0', source: '10', status: '' }
    ],
    babCmbCmd: '',
    meleeAttacksOverview: '',
    meleeAttacks: [],
    rangedAttacksOverview: '',
    rangedAttacks: [],
    specialAttacks: '',
    defenses: { ac: '', hp: '', saves: '' },
    racialTraits: [],
    backgroundTraits: [],
    favoredClass: '',
    favoredClassBonus: '',
    classFeatures: [],
    feats: [],
    magicBlocks: [] as any[],
    skills: [],
    skillsTotal: { name: '总计', total: '0', source: '', special: '' },
    equipmentBags: [],
    encumbranceMultiplier: '1',
    equipmentNotes: '',
    additionalData: [] as any[]
  };

  const [data, setData] = useState(DEFAULT_DATA);
  const [lastSavedData, setLastSavedData] = useState<any>(JSON.parse(JSON.stringify(DEFAULT_DATA)));
  const [isDirty, setIsDirty] = useState(false);
  
  const isEqual = (a: any, b: any): boolean => {
      if (a === b) return true;
      if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false;
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;
      for (const key of keysA) {
        if (!keysB.includes(key) || !isEqual(a[key], b[key])) return false;
      }
      return true;
    };

  useEffect(() => {
    setIsDirty(!isEqual(data, lastSavedData));
  }, [data, lastSavedData]);

  // Handle browser's beforeunload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const confirmNavigation = (action: () => void) => {
    if (isDirty) {
      setConfirmModal({
        title: "您有未保存的更改，继续操作将导致这些修改丢失。您想先保存吗？",
        onConfirm: action,
        onSecondaryConfirm: async () => {
          await handleSave();
          action();
        }
      });
      return;
    }
    action();
  };

  const selectCharacter = (char: any, then?: () => void) => {
    if (char.id === currentCharacterId) {
      setView('editor');
      if (then) then();
      return;
    }
    confirmNavigation(() => {
      if (currentCharacterId) {
        addToRecent({
          id: currentCharacterId,
          data: data,
          name: data.basic.name,
          avatar: data.basic.avatars?.[0]?.url,
          classes: data.basic.classes
        });
      }
      setData(char.data);
      setLastSavedData(JSON.parse(JSON.stringify(char.data)));
      setCurrentCharacterId(char.id);
      setView('editor');
      setIsReadOnly(false);
      const url = new URL(window.location.href);
      url.searchParams.set('id', char.id);
      window.history.replaceState({}, '', url.toString());
      if (then) then();
    });
  };

  // Auth & URL Sync
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        refreshCharacterList();
      } else {
        setMyCharacters([]);
      }
    });

    // Check URL for shared ID
    const params = new URLSearchParams(window.location.search);
    const sharedId = params.get('id');
    if (sharedId) {
      loadSharedCharacter(sharedId);
    } else {
      setIsSyncing(false);
    }

    return () => unsubscribe();
  }, []);

  const refreshCharacterList = async () => {
    try {
      const [list, folderList] = await Promise.all([
        getMyCharacters().catch(e => { console.error("List chars fail", e); return []; }),
        getFolders().catch(e => { console.error("List folders fail", e); return []; })
      ]);
      setMyCharacters(list || []);
      setFolders(folderList || []);
    } catch (e) {
      console.error("Refresh fail", e);
      setToast({ message: "刷新数据失败，请检查连接", type: 'error' });
    }
  };

  const loadSharedCharacter = async (id: string) => {
    setIsSyncing(true);
    const char = await getCharacterById(id) as any;
    if (char) {
      if (currentCharacterId && currentCharacterId !== id) {
        addToRecent({
          id: currentCharacterId,
          data: data,
          name: data.basic.name,
          avatar: data.basic.avatars?.[0]?.url,
          classes: data.basic.classes
        });
      }
      setData(char.data);
      setLastSavedData(JSON.parse(JSON.stringify(char.data)));
      setCurrentCharacterId(id);
      // Check ownership
      if (auth.currentUser && char.ownerId === auth.currentUser.uid) {
        setIsReadOnly(false);
      } else {
        setIsReadOnly(true);
      }
    }
    setIsSyncing(false);
  };

  const handleSave = async () => {
    if (!user) {
      setToast({ message: "请先登录以保存人物卡", type: 'error' });
      return;
    }
    setIsSaving(true);
    try {
      // If it's a new character, save it to the currently browsed folder
      const targetFolder = currentCharacterId ? undefined : currentFolderId;
      const id = await saveCharacter(data, currentCharacterId || undefined, targetFolder);
      if (id) {
        setLastSavedData(JSON.parse(JSON.stringify(data)));
        if (!currentCharacterId) {
          setCurrentCharacterId(id);
          const url = new URL(window.location.href);
          url.searchParams.set('id', id);
          window.history.replaceState({}, '', url.toString());
        }
        await refreshCharacterList();
        setToast({ message: "保存成功！" });
      }
    } catch (e) {
      console.error(e);
      setToast({ message: "保存失败，请检查权限", type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const [confirmModal, setConfirmModal] = useState<{ 
    title: string, 
    onConfirm: () => void,
    onSecondaryConfirm?: () => void
  } | null>(null);

  const handleNew = () => {
    confirmNavigation(() => {
      setData(DEFAULT_DATA);
      setLastSavedData(JSON.parse(JSON.stringify(DEFAULT_DATA)));
      setCurrentCharacterId(null);
      setIsReadOnly(false);
      const url = new URL(window.location.href);
      url.searchParams.delete('id');
      window.history.replaceState({}, '', url.toString());
      setView('editor');
    });
  };

  const handleShare = () => {
    if (!currentCharacterId) {
      setToast({ message: "请先保存人物卡后再分享", type: 'error' });
      return;
    }
    const shareUrl = `${window.location.origin}${window.location.pathname}?id=${currentCharacterId}`;
    navigator.clipboard.writeText(shareUrl);
    setToast({ message: "分享链接已复制到剪贴板！他人访问此链接将只能查看无法修改。" });
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.basic.name || 'character'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportBBCode = () => {
    const tmpl = localStorage.getItem('bbcode_template') || DEFAULT_BBCODE_TEMPLATE;
    const bbcode = generateBBCode(data, tmpl);
    navigator.clipboard.writeText(bbcode);
    setToast({ message: "BBCode 已复制到剪贴板！可以直接到跑团论坛粘贴。" });
  };

  const handleLogin = async (provider: any) => {
    try {
      await loginWithProvider(provider);
    } catch (e) {
      setToast({ message: "登录失败", type: 'error' });
    }
  };

  const handleLink = async (provider: any) => {
    try {
      await linkAccount(provider);
      setToast({ message: "绑定成功" });
    } catch (e) {
      setToast({ message: "绑定失败，该账号可能已被绑定", type: 'error' });
    }
  };

  const [tableActionMode, setTableActionMode] = useState<'drag' | 'delete'>('drag');
  const toggleTableActionMode = () => setTableActionMode(p => p === 'drag' ? 'delete' : 'drag');

  const draggedTableItem = useRef<{listKey: string, itemIndex: number} | null>(null);

  const handleTableItemDragStart = (listKey: string, itemIndex: number, e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    draggedTableItem.current = { listKey, itemIndex };
    e.stopPropagation();
  };

  const handleTableItemDragOver = (listKey: string, targetItemIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const currentDrag = draggedTableItem.current;
    if (currentDrag !== null && currentDrag.listKey === listKey) {
      const sourceItemIndex = currentDrag.itemIndex;
      if (sourceItemIndex !== targetItemIndex) {
        setData(p => {
          const newList = [...(p as any)[listKey]];
          const [item] = newList.splice(sourceItemIndex, 1);
          if (item !== undefined) {
             newList.splice(targetItemIndex, 0, item);
          }
          return { ...p, [listKey]: newList };
        });
        draggedTableItem.current = { listKey, itemIndex: targetItemIndex };
      }
    }
  };

  const handleTableItemDrop = (listKey: string, targetItemIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    draggedTableItem.current = null;
  };

  const updateBasic = (key: string, val: any) => {
    if (isReadOnly) return;
    setData(p => ({ ...p, basic: { ...p.basic, [key]: val } }));
  };
  const updateDefenses = (key: string, val: string) => {
    if (isReadOnly) return;
    setData(p => ({ ...p, defenses: { ...p.defenses, [key]: val } }));
  };

  const addBag = () => {
    setData(p => ({
      ...p,
      equipmentBags: [...p.equipmentBags, { id: 'bag-' + Math.random(), name: '新背包 (New Bag)', ignoreWeight: false, items: [] }]
    }));
  };

  const removeBag = (id: string) => {
    setData(p => ({ ...p, equipmentBags: p.equipmentBags.filter(b => b.id !== id) }));
  };

  const updateBagName = (id: string, name: string) => {
    setData(p => ({
      ...p,
      equipmentBags: p.equipmentBags.map(b => b.id === id ? { ...b, name } : b)
    }));
  };

  const toggleBagWeight = (id: string, ignoreWeight: boolean) => {
    setData(p => ({
      ...p,
      equipmentBags: p.equipmentBags.map(b => b.id === id ? { ...b, ignoreWeight } : b)
    }));
  };

  const updateBagItems = (id: string, items: any[]) => {
    setData(p => ({
      ...p,
      equipmentBags: p.equipmentBags.map(b => b.id === id ? { ...b, items } : b)
    }));
  };

  const draggedBagIndex = useRef<number | null>(null);
  const draggedItem = useRef<{bagId: string, itemIndex: number} | null>(null);

  const handleBagDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    draggedBagIndex.current = index;
  };
  
  const handleBagDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const sourceIndex = draggedBagIndex.current;
    if (sourceIndex !== null && sourceIndex !== targetIndex) {
      setData(p => {
        const newBags = [...p.equipmentBags];
        const [moved] = newBags.splice(sourceIndex, 1);
        if (moved !== undefined) {
          newBags.splice(targetIndex, 0, moved);
        }
        return { ...p, equipmentBags: newBags };
      });
      draggedBagIndex.current = targetIndex;
    }
  };

  const handleBagDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedItem.current !== null) {
      const currentDrag = draggedItem.current;
      const sourceBag = data.equipmentBags.find(b => b.id === currentDrag.bagId);
      if (sourceBag) {
         const targetBag = data.equipmentBags[dropIndex];
         if (sourceBag.id !== targetBag.id) {
             const item = sourceBag.items[currentDrag.itemIndex];
             if (item !== undefined) {
               const newBags = data.equipmentBags.map(b => {
                   if (b.id === sourceBag.id) {
                       return {...b, items: b.items.filter((_, i) => i !== currentDrag.itemIndex)};
                   }
                   if (b.id === targetBag.id) {
                       return {...b, items: [...b.items, item]};
                   }
                   return b;
               });
               setData(p => ({...p, equipmentBags: newBags}));
             }
         }
      }
    }
    draggedBagIndex.current = null;
    draggedItem.current = null;
  };

  const handleItemDragStart = (bagId: string, itemIndex: number, e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    draggedItem.current = { bagId, itemIndex };
    e.stopPropagation(); // prevent bag drag
  };

  const handleItemDragOver = (targetBagId: string, targetItemIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const currentDrag = draggedItem.current;
    if (currentDrag !== null) {
      const { bagId: sourceBagId, itemIndex: sourceItemIndex } = currentDrag;
      if (sourceBagId !== targetBagId || sourceItemIndex !== targetItemIndex) {
        setData(p => {
          const newBags = [...p.equipmentBags];
          const sBagIdx = newBags.findIndex(b => b.id === sourceBagId);
          const tBagIdx = newBags.findIndex(b => b.id === targetBagId);
          
          if (sBagIdx !== -1 && tBagIdx !== -1) {
            newBags[sBagIdx] = { ...newBags[sBagIdx], items: [...newBags[sBagIdx].items] };
            if (sBagIdx !== tBagIdx) {
              newBags[tBagIdx] = { ...newBags[tBagIdx], items: [...newBags[tBagIdx].items] };
            }
            
            const [item] = newBags[sBagIdx].items.splice(sourceItemIndex, 1);
            if (item !== undefined) {
              newBags[tBagIdx].items.splice(targetItemIndex, 0, item);
            }
            return { ...p, equipmentBags: newBags };
          }
          return p;
        });
        draggedItem.current = { bagId: targetBagId, itemIndex: targetItemIndex };
      }
    }
  };

  const handleItemDrop = (targetBagId: string, targetItemIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    draggedBagIndex.current = null;
    draggedItem.current = null;
  };

  const addAdditionalBlock = (type: 'text' | 'table' | 'image') => {
    const newBlock = {
      id: 'add-' + Math.random(),
      type,
      title: type === 'text' ? '自定文本' : type === 'table' ? '自定表格' : '附加图片',
      content: '',
      url: '',
      columns: [{key: 'col0', label: '列1'}, {key: 'col1', label: '列2'}, {key: 'col2', label: '列3'}],
      tableData: []
    };
    setData(p => ({ ...p, additionalData: [...p.additionalData, newBlock] }));
  };

  const updateAdditionalBlock = (id: string, updates: any) => {
    setData(p => ({
      ...p,
      additionalData: p.additionalData.map(b => b.id === id ? { ...b, ...updates } : b)
    }));
  };

  const removeAdditionalBlock = (id: string) => {
    setData(p => ({
      ...p,
      additionalData: p.additionalData.filter(b => b.id !== id)
    }));
  };

  const addMagicBlock = (type: 'text' | 'table') => {
    const newBlock = {
      id: 'magic-' + Math.random(),
      type,
      title: type === 'text' ? '自定文本' : '类别名(e.g已知法术)',
      content: '',
      columns: [{key: 'col0', label: '列1'}, {key: 'col1', label: '列2'}, {key: 'col2', label: '列3'}],
      tableData: []
    };
    setData(p => ({ ...p, magicBlocks: [...(p.magicBlocks || []), newBlock] }));
  };

  const updateMagicBlock = (id: string, updates: any) => {
    setData(p => ({
      ...p,
      magicBlocks: p.magicBlocks.map(b => b.id === id ? { ...b, ...updates } : b)
    }));
  };

  const removeMagicBlock = (id: string) => {
    setData(p => ({
      ...p,
      magicBlocks: p.magicBlocks.filter(b => b.id !== id)
    }));
  };

  const draggedBlockId = useRef<string | null>(null);
  const [dragEnabledFor, setDragEnabledFor] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    draggedBlockId.current = id;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId: string, listName: 'additionalData' | 'magicBlocks') => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const sourceId = draggedBlockId.current;
    if (sourceId && sourceId !== targetId) {
      setData(p => {
        const arr = [...p[listName]];
        const fromIndex = arr.findIndex(b => b.id === sourceId);
        const toIndex = arr.findIndex(b => b.id === targetId);
        if (fromIndex === -1 || toIndex === -1) return p;
        const [movedBlock] = arr.splice(fromIndex, 1);
        if (movedBlock !== undefined) {
          arr.splice(toIndex, 0, movedBlock);
        }
        return { ...p, [listName]: arr };
      });
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string, listName: 'additionalData' | 'magicBlocks') => {
    e.preventDefault();
    draggedBlockId.current = null;
  };

  const calculateTotalCost = () => {
    let total = 0;
    data.equipmentBags.forEach(bag => {
      bag.items.forEach(item => {
         const cost = parseFloat(item.cost) || 0;
         const qty = parseInt(item.quantity) || 1;
         total += cost * qty;
      });
    });
    return total.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  const calculateTotalWeightNum = () => {
    let total = 0;
    data.equipmentBags.forEach(bag => {
      if (!bag.ignoreWeight) {
        bag.items.forEach(item => {
           const weight = parseFloat(item.weight) || 0;
           const qty = parseInt(item.quantity) || 1;
           total += weight * qty;
        });
      }
    });
    return total;
  };

  const getComputedEncumbrance = () => {
    const strAttr = data.attributes.find(a => a.name === '力量');
    const strValue = strAttr ? parseInt(strAttr.final) || 10 : 10;
    const mult = parseFloat(data.encumbranceMultiplier) > 0 ? parseFloat(data.encumbranceMultiplier) : 1;

    let heavy = 0;
    if (strValue <= 10) {
      heavy = strValue * 10;
    } else {
      const seq = [115, 130, 150, 175, 200, 230, 260, 300, 350];
      if (strValue >= 11 && strValue <= 19) {
        heavy = seq[strValue - 11];
      } else {
        const eff = (strValue % 10) + 10;
        const baseHeavy = eff === 10 ? 100 : seq[eff - 11];
        const power = Math.floor((strValue - eff) / 10);
        heavy = baseHeavy * Math.pow(4, power);
      }
    }

    const light = Math.floor(heavy / 3);
    const medium = Math.floor(heavy * 2 / 3);

    return {
      light: Math.floor(light * mult),
      medium: Math.floor(medium * mult),
      heavy: Math.floor(heavy * mult)
    };
  };

  const encumbrance = getComputedEncumbrance();

  return (
    <div className="min-h-screen bg-stone-100 font-sans text-ink selection:bg-primary/20 flex flex-col h-screen overflow-hidden relative">
      {/* Pure Mode Trigger Zone */}
      <div 
        className="fixed top-0 left-0 right-0 h-[36px] z-[60] pointer-events-auto"
        onMouseEnter={() => setIsHeaderVisible(true)}
      />

      {/* Header with Auth and Navigation */}
      <motion.header 
        initial={false}
        animate={{ 
          y: (isHeaderVisible || isHeaderPinned) ? 0 : -100,
          opacity: (isHeaderVisible || isHeaderPinned) ? 1 : 0.8
        }}
        transition={{ type: 'spring', damping: 20, stiffness: 120 }}
        onMouseEnter={() => setIsHeaderVisible(true)}
        onMouseLeave={() => !isHeaderPinned && setIsHeaderVisible(false)}
        className="bg-stone-800 text-stone-100 px-4 py-3 fixed top-0 left-0 right-0 z-[65] shadow-md flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setView('editor')}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="bg-primary p-1.5 rounded rotate-3">
              <LayoutGrid size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-serif font-bold leading-none tracking-tight">人物卡管理系统 <span className="text-stone-400 font-sans text-xs font-normal">Character Manager</span></h1>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {view === 'editor' ? (
            <>
              {!isReadOnly && (
                <>
                  <button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    <Save size={16} />
                    <span className="hidden sm:inline">{isSaving ? '正在保存...' : '保存'}</span>
                  </button>
                  <button 
                    onClick={handleShare}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
                  >
                    <Share2 size={16} />
                    <span className="hidden sm:inline">分享</span>
                  </button>
                </>
              )}

              <button 
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-white rounded text-sm font-medium transition-colors"
                title="导出为 JSON"
              >
                <Download size={16} />
                <span className="hidden sm:inline">导出</span>
              </button>

              <button 
                onClick={handleExportBBCode}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-white rounded text-sm font-medium transition-colors"
                title="导出为 BBCode 并复制到剪贴板"
              >
                <Copy size={16} />
                <span className="hidden sm:inline">BBCode</span>
              </button>

              <button 
                onClick={handleNew}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-white rounded text-sm font-medium transition-colors"
              >
                <FilePlus size={16} />
                <span className="hidden sm:inline">新建</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowAIModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-medium transition-colors shadow-lg shadow-indigo-200"
              >
                <Sparkles size={16} />
                <span className="hidden sm:inline">AI 识别</span>
              </button>
              <button 
                onClick={handleNew}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-white rounded text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
            >
              <Plus size={18} />
              创建新角色
            </button>
            </div>
          )}

          <div className="h-6 w-px bg-stone-600 mx-1"></div>

          {user ? (
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => setIsHeaderPinned(!isHeaderPinned)}
                className={`p-2 rounded-full transition-colors ${isHeaderPinned ? 'bg-primary text-white' : 'text-stone-400 hover:bg-stone-700 hover:text-white'}`}
                title={isHeaderPinned ? "取消固定顶部栏" : "固定顶部栏"}
              >
                <motion.div
                  animate={{ rotate: isHeaderPinned ? -90 : 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <Pin size={16} className="rotate-135" />
                </motion.div>
              </button>

              <AccountMenu 
                user={user} 
                view={view} 
                setView={setView} 
                recentCharacters={recentCharacters}
                currentCharacterId={currentCharacterId}
                confirmNavigation={confirmNavigation}
                onSelect={selectCharacter}
                onRemoveRecent={removeFromRecent}
                onLogout={logout}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsHeaderPinned(!isHeaderPinned)}
                className={`p-2 rounded-full transition-colors ${isHeaderPinned ? 'bg-primary text-white' : 'text-stone-400 hover:bg-stone-700 hover:text-white'}`}
                title={isHeaderPinned ? "取消固定顶部栏" : "固定顶部栏"}
              >
                <motion.div
                  animate={{ rotate: isHeaderPinned ? -90 : 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <Pin size={16} className="rotate-135" />
                </motion.div>
              </button>
              <button 
                onClick={() => handleLogin(googleProvider)}
                className="px-3 py-1.5 bg-white text-stone-800 rounded text-xs font-bold flex items-center gap-1.5 hover:bg-stone-100 transition-colors"
              >
                <User size={14} /> 登录
              </button>
            </div>
          )}
        </div>
      </motion.header>

      {/* Syncing Overlay */}
      {isSyncing && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-[100] flex items-center justify-center text-white flex-col gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="font-serif italic font-medium">正在连接到异世界...</p>
        </div>
      )}

      {/* Layout Spacer for Pinned Header */}
      <motion.div 
        animate={{ 
          height: isHeaderPinned ? 56 : 0,
          opacity: isHeaderPinned ? 1 : 0
        }}
        transition={{ type: 'spring', damping: 20, stiffness: 120 }}
        className="shrink-0 overflow-hidden"
      />

      {/* View Switcher */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {view === 'editor' && (
            <motion.div 
              key="editor"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full overflow-y-auto"
            >
              {/* Read-Only Notice */}
              {isReadOnly && (
                <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-center gap-3 text-amber-800 text-sm font-medium sticky top-0 z-[55]">
                  <ShieldCheck size={18} />
                  <span>您正在查看的内容为只读版本。</span>
                  {user && (
                    <button 
                      onClick={async () => {
                        const id = await saveCharacter(data);
                        if (id) {
                          window.location.href = `?id=${id}`;
                        }
                      }}
                      className="px-2 py-1 bg-amber-200 hover:bg-amber-300 rounded text-xs transition-colors"
                    >
                      复制到我的收藏
                    </button>
                  )}
                </div>
              )}

              <TableOfContents />
              <main className={`max-w-5xl mx-auto py-12 px-4 sm:px-8 pb-32 transition-all duration-300 ${isReadOnly ? 'pointer-events-none opacity-90 grayscale-[0.2]' : ''}`}>
                {isReadOnly && (
                  <div className="mb-8 p-6 bg-amber-50/50 border-2 border-dashed border-amber-200 rounded-xl text-center pointer-events-auto">
                    <ShieldCheck size={48} className="mx-auto text-amber-500 mb-2" />
                    <h2 className="text-xl font-serif font-bold text-amber-900 mb-1">正在查阅分享档案</h2>
                    <p className="text-amber-700 text-sm">这是一个只读视图。如果您想修改这份人物卡，请点击顶部的“复制到我的收藏”。</p>
                  </div>
                )}
                
                <header className="mb-8 text-center flex flex-col items-center">
                  <h1 className="text-4xl font-serif font-bold text-ink mb-2">角色卡 (Character Sheet)</h1>
                </header>

                <Section id="basic-info" title="基本信息 (Basic Info)" className="max-w-[1200px] mx-auto">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 grid grid-cols-12 gap-y-4 gap-x-4">
            <InlineInput className="col-span-12 sm:col-span-6 text-lg" label="角色名 (Name)" value={data.basic.name} originalValue={lastSavedData.basic.name} onChange={v => updateBasic('name', v)} />
            <InlineInput className="col-span-12 sm:col-span-6 text-lg" label="职业与等级 (Classes & Levels)" value={data.basic.classes} originalValue={lastSavedData.basic.classes} onChange={v => updateBasic('classes', v)} />
            
            <InlineInput className="col-span-12 sm:col-span-6" label="阵营 (Alignment)" value={data.basic.alignment} originalValue={lastSavedData.basic.alignment} onChange={v => updateBasic('alignment', v)} />
            <InlineInput className="col-span-12 sm:col-span-6" label="信仰 (Deity)" value={data.basic.deity || ''} originalValue={lastSavedData.basic.deity || ''} onChange={v => updateBasic('deity', v)} />
            
            <InlineInput className="col-span-4" label="体型 (Size)" value={data.basic.size} originalValue={lastSavedData.basic.size} onChange={v => updateBasic('size', v)} />
            <InlineInput className="col-span-4" label="性别 (Gender)" value={data.basic.gender} originalValue={lastSavedData.basic.gender} onChange={v => updateBasic('gender', v)} />
            <InlineInput className="col-span-4" label="种族 (Race)" value={data.basic.race} originalValue={lastSavedData.basic.race} onChange={v => updateBasic('race', v)} />
            
            <InlineInput className="col-span-4" label="年龄 (Age)" value={data.basic.age} originalValue={lastSavedData.basic.age} onChange={v => updateBasic('age', v)} />
            <InlineInput className="col-span-4" label="身高 (Height)" value={data.basic.height} originalValue={lastSavedData.basic.height} onChange={v => updateBasic('height', v)} />
            <InlineInput className="col-span-4" label="体重 (Weight)" value={data.basic.weight} originalValue={lastSavedData.basic.weight} onChange={v => updateBasic('weight', v)} />
            
            <InlineInput className="col-span-12 sm:col-span-6" label="移动速度 (Speed)" value={data.basic.speed} originalValue={lastSavedData.basic.speed} onChange={v => updateBasic('speed', v)} />
            <InlineInput className="col-span-12 sm:col-span-6" label="感官 (Senses)" value={data.basic.senses} originalValue={lastSavedData.basic.senses} onChange={v => updateBasic('senses', v)} />
            
            <InlineInput className="col-span-12 sm:col-span-6" label="先攻 (Initiative)" value={data.basic.initiative} originalValue={lastSavedData.basic.initiative} onChange={v => updateBasic('initiative', v)} />
            <InlineInput className="col-span-12 sm:col-span-6" label="察觉 (Perception)" value={data.basic.perception} originalValue={lastSavedData.basic.perception} onChange={v => updateBasic('perception', v)} />
            
            <div className={`col-span-12 flex flex-col gap-0.5 focus-within:ring-1 focus-within:ring-primary rounded p-1 bg-white/50 border transition-colors mt-2 ${JSON.stringify(data.basic.languages) !== JSON.stringify(lastSavedData.basic.languages) ? 'bg-amber-100/50 border-amber-300' : 'border-transparent hover:border-stone-200'}`}>
              <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider flex justify-between">
                语言 (Languages)
                {(data.basic.languages !== lastSavedData.basic.languages) && <span className="text-amber-600 animate-pulse">●</span>}
              </label>
              <AutoResizeTextarea
                className="!bg-transparent !border-b !border-stone-300 focus:!border-stone-800 transition-colors outline-none !pb-0.5 w-full text-sm font-medium text-ink !px-0 !pt-0 !rounded-none !border-x-0 !border-t-0 shadow-none"
                value={data.basic.languages}
                originalValue={lastSavedData.basic.languages}
                onChange={v => updateBasic('languages', v)}
              />
            </div>
          </div>
          
          <div className="w-full md:w-64">
            <AvatarGallery 
              avatars={data.basic.avatars} 
              onUpdate={(newAvatars) => updateBasic('avatars', newAvatars)} 
            />
          </div>
        </div>
      </Section>

      <Section id="story" title="背景故事 (Background Story)">
        <div className={`relative ${data.basic.story !== lastSavedData.basic.story ? 'ring-2 ring-amber-300 rounded-lg' : ''}`}>
          <textarea
            className={`w-full min-h-[160px] p-6 text-stone-700 font-serif leading-relaxed italic bg-white border border-stone-200 rounded-lg outline-none focus:border-primary transition-all shadow-inner ${data.basic.story !== lastSavedData.basic.story ? 'bg-amber-50/30' : ''}`}
            placeholder="在此书写角色的过往与传说..."
            value={data.basic.story}
            onChange={e => updateBasic('story', e.target.value)}
          />
          {data.basic.story !== lastSavedData.basic.story && (
            <div className="absolute right-4 top-4 w-2 h-2 bg-amber-500 rounded-full animate-pulse" title="未保存更改" />
          )}
        </div>
      </Section>

      <Section id="attributes" title="属性(Attributes)">
        <div className="mb-4">
          <DynamicTable
            columns={[
              { key: 'name', label: '属性 (Attr)', width: '10%' },
              { key: 'final', label: '最终值 (Final)', width: '10%' },
              { key: 'modifier', label: '调整值 (Mod)', width: '10%' },
              { key: 'source', label: '来源 (Source)', width: '40%' },
              { key: 'status', label: '状态 (Status)', width: '30%' }
            ]}
            data={data.attributes}
            originalData={lastSavedData.attributes}
            onChange={v => setData({ ...data, attributes: v })}
            fixedRows={true}
            readonlyColumns={['name']}
          />
        </div>
        <div className={`rounded p-1 transition-colors ${data.babCmbCmd !== lastSavedData.babCmbCmd ? 'bg-amber-50 border border-amber-300' : ''}`}>
          <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider flex justify-between">
            BAB / CMB / CMD
            {data.babCmbCmd !== lastSavedData.babCmbCmd && <span className="text-amber-600 animate-pulse">●</span>}
          </label>
          <AutoResizeTextarea
            value={data.babCmbCmd}
            originalValue={lastSavedData.babCmbCmd}
            onChange={v => setData({ ...data, babCmbCmd: v })}
          />
        </div>
      </Section>

      <Section id="attacks" title="攻击 (Attacks)">
        <div className="mb-4">
          <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">近战攻击加值 (Melee Attack Bonuses)</label>
          <input
            className="w-full bg-stone-50 border border-stone-200 rounded px-3 py-2 text-sm outline-none focus:border-stone-400"
            value={data.meleeAttacksOverview || ''}
            onChange={e => setData({ ...data, meleeAttacksOverview: e.target.value })}
          />
        </div>
        <DynamicTable
          columns={[
            { key: 'weapon', label: '武器 (Weapon)', width: '25%' },
            { key: 'hit', label: '命中 (Hit)', width: '15%' },
            { key: 'damage', label: '伤害 (Dmg)', width: '15%' },
            { key: 'crit', label: '重击范围和倍率 (Crit)', width: '10%' },
            { key: 'range', label: '触及 (Range)', width: '5%' },
            { key: 'type', label: '类型 (Type)', width: '5%' },
            { key: 'special', label: '特性 (Special)', width: '25%' }
          ]}
          data={data.meleeAttacks || []}
          originalData={lastSavedData.meleeAttacks || []}
          onChange={v => setData({ ...data, meleeAttacks: v })}
          newItemGenerator={() => ({ weapon: '', hit: '', damage: '', crit: '', range: '', type: '', special: '' })}
          rowDraggable={true}
          rowActionMode={tableActionMode}
          onRowActionModeToggle={toggleTableActionMode}
          onRowDragStart={(idx, e) => handleTableItemDragStart('meleeAttacks', idx, e)}
          onRowDragOver={(idx, e) => handleTableItemDragOver('meleeAttacks', idx, e)}
          onRowDrop={(idx, e) => handleTableItemDrop('meleeAttacks', idx, e)}
        />
        <div className="mb-4 mt-8">
          <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">远程攻击加值 (Range Attack Bonuses)</label>
          <input
            className="w-full bg-stone-50 border border-stone-200 rounded px-3 py-2 text-sm outline-none focus:border-stone-400"
            value={data.rangedAttacksOverview || ''}
            onChange={e => setData({ ...data, rangedAttacksOverview: e.target.value })}
          />
        </div>
        <DynamicTable
          columns={[
            { key: 'weapon', label: '武器 (Weapon)', width: '25%' },
            { key: 'hit', label: '命中 (Hit)', width: '15%' },
            { key: 'damage', label: '伤害 (Dmg)', width: '15%' },
            { key: 'crit', label: '重击范围和倍率 (Crit)', width: '10%' },
            { key: 'range', label: '射程 (Range)', width: '5%' },
            { key: 'type', label: '类型 (Type)', width: '5%' },
            { key: 'special', label: '特性 (Special)', width: '25%' }
          ]}
          data={data.rangedAttacks || []}
          originalData={lastSavedData.rangedAttacks || []}
          onChange={v => setData({ ...data, rangedAttacks: v })}
          newItemGenerator={() => ({ weapon: '', hit: '', damage: '', crit: '', range: '', type: '', special: '' })}
          rowDraggable={true}
          rowActionMode={tableActionMode}
          onRowActionModeToggle={toggleTableActionMode}
          onRowDragStart={(idx, e) => handleTableItemDragStart('rangedAttacks', idx, e)}
          onRowDragOver={(idx, e) => handleTableItemDragOver('rangedAttacks', idx, e)}
          onRowDrop={(idx, e) => handleTableItemDrop('rangedAttacks', idx, e)}
        />
        <div className="mt-8">
          <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider flex justify-between">
            特殊攻击 (Special Attacks)
            {data.specialAttacks !== lastSavedData.specialAttacks && <span className="text-amber-600 animate-pulse">●</span>}
          </label>
          <AutoResizeTextarea
            value={data.specialAttacks || ''}
            originalValue={lastSavedData.specialAttacks || ''}
            onChange={v => setData({ ...data, specialAttacks: v })}
          />
        </div>
      </Section>

      <Section id="defenses" title="防御 (Defenses)">
        <div className="flex flex-col gap-4">
          <div className={`rounded p-1 transition-colors ${data.defenses.ac !== lastSavedData.defenses.ac ? 'bg-amber-50 border border-amber-300' : ''}`}>
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider flex justify-between">
              防护等级 (AC & AC Details)
              {data.defenses.ac !== lastSavedData.defenses.ac && <span className="text-amber-600 animate-pulse">●</span>}
            </label>
            <AutoResizeTextarea
              value={data.defenses.ac}
              originalValue={lastSavedData.defenses.ac}
              onChange={v => updateDefenses('ac', v)}
            />
          </div>
          <div className={`rounded p-1 transition-colors ${data.defenses.hp !== lastSavedData.defenses.hp ? 'bg-amber-50 border border-amber-300' : ''}`}>
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider flex justify-between">
              生命值 (HP)
              {data.defenses.hp !== lastSavedData.defenses.hp && <span className="text-amber-600 animate-pulse">●</span>}
            </label>
            <AutoResizeTextarea
              value={data.defenses.hp}
              originalValue={lastSavedData.defenses.hp}
              onChange={v => updateDefenses('hp', v)}
            />
          </div>
          <div className={`rounded p-1 transition-colors ${data.defenses.saves !== lastSavedData.defenses.saves ? 'bg-amber-50 border border-amber-300' : ''}`}>
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider flex justify-between">
              豁免 (Saving Throws)
              {data.defenses.saves !== lastSavedData.defenses.saves && <span className="text-amber-600 animate-pulse">●</span>}
            </label>
            <AutoResizeTextarea
              value={data.defenses.saves}
              originalValue={lastSavedData.defenses.saves}
              onChange={v => updateDefenses('saves', v)}
            />
          </div>
        </div>
      </Section>

      <Section id="racial-traits" title="种族特性 (Racial Traits)">
        <DynamicTable
          columns={[
            { key: 'name', label: '特性 (Trait)', width: '25%' },
            { key: 'type', label: '类型 (Type)', width: '5%', type: 'select', options: ['', 'Sp', 'Su', 'Ex'] },
            { key: 'desc', label: '描述 (Description)', width: '70%' }
          ]}
          data={data.racialTraits}
          originalData={lastSavedData.racialTraits}
          onChange={v => setData({ ...data, racialTraits: v })}
          newItemGenerator={() => ({ name: '', type: '', desc: '' })}
          rowDraggable={true}
          rowActionMode={tableActionMode}
          onRowActionModeToggle={toggleTableActionMode}
          onRowDragStart={(idx, e) => handleTableItemDragStart('racialTraits', idx, e)}
          onRowDragOver={(idx, e) => handleTableItemDragOver('racialTraits', idx, e)}
          onRowDrop={(idx, e) => handleTableItemDrop('racialTraits', idx, e)}
        />
      </Section>

      <Section id="traits" title="背景特性与天赋职业 (Background Traits & Favored Class)">
        <div className="flex flex-col gap-6">
          <DynamicTable
            columns={[
              { key: 'name', label: '特性名称 (Trait Name)', width: '25%' },
              { key: 'type', label: '类型 (Type)', width: '5%' },
              { key: 'desc', label: '说明 (Description)', width: '70%' }
            ]}
            data={data.backgroundTraits}
          originalData={lastSavedData.backgroundTraits}
            onChange={v => setData({ ...data, backgroundTraits: v })}
            newItemGenerator={() => ({ name: '', type: '', desc: '' })}
            rowDraggable={true}
            rowActionMode={tableActionMode}
            onRowActionModeToggle={toggleTableActionMode}
            onRowDragStart={(idx, e) => handleTableItemDragStart('backgroundTraits', idx, e)}
            onRowDragOver={(idx, e) => handleTableItemDragOver('backgroundTraits', idx, e)}
            onRowDrop={(idx, e) => handleTableItemDrop('backgroundTraits', idx, e)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InlineInput 
              label="天赋职业 (Favored Class)" 
              value={data.favoredClass} 
              onChange={v => setData(p => ({ ...p, favoredClass: v }))} 
            />
            <InlineInput 
              label="天赋职业奖励 (Favored Class Bonus)" 
              value={data.favoredClassBonus} 
              onChange={v => setData(p => ({ ...p, favoredClassBonus: v }))} 
            />
          </div>
        </div>
      </Section>

      <Section id="class-features" title="职业特性 (Class Features)">
        <DynamicTable
          columns={[
            { key: 'level', label: '等级 (Level)', width: '5%' },
            { key: 'name', label: '特性 (Features)', width: '25%' },
            { key: 'type', label: '类型 (Type)', width: '5%', type: 'select', options: ['', 'Sp', 'Su', 'Ex'] },
            { key: 'desc', label: '说明 (Description)', width: '65%' }
          ]}
          data={data.classFeatures}
          originalData={lastSavedData.classFeatures}
          onChange={v => setData({ ...data, classFeatures: v })}
          newItemGenerator={() => ({ level: '', name: '', type: '', desc: '' })}
          rowDraggable={true}
          rowActionMode={tableActionMode}
          onRowActionModeToggle={toggleTableActionMode}
          onRowDragStart={(idx, e) => handleTableItemDragStart('classFeatures', idx, e)}
          onRowDragOver={(idx, e) => handleTableItemDragOver('classFeatures', idx, e)}
          onRowDrop={(idx, e) => handleTableItemDrop('classFeatures', idx, e)}
        />
      </Section>

      <Section id="feats" title="专长 (Feats)">
        <DynamicTable
          columns={[
            { key: 'level', label: '等级 (Level)', width: '5%' },
            { key: 'name', label: '专长名称 (Feat Name)', width: '20%' },
            { key: 'type', label: '类型 (Type)', width: '5%', type: 'select', options: ['', 'Sp', 'Su', 'Ex'] },
            { key: 'source', label: '来源 (Source)', width: '15%' },
            { key: 'desc', label: '说明 (Description)', width: '55%' }
          ]}
          data={data.feats}
          originalData={lastSavedData.feats}
          onChange={v => setData({ ...data, feats: v })}
          newItemGenerator={() => ({ level: '', name: '', type: '', source: '', desc: '' })}
          rowDraggable={true}
          rowActionMode={tableActionMode}
          onRowActionModeToggle={toggleTableActionMode}
          onRowDragStart={(idx, e) => handleTableItemDragStart('feats', idx, e)}
          onRowDragOver={(idx, e) => handleTableItemDragOver('feats', idx, e)}
          onRowDrop={(idx, e) => handleTableItemDrop('feats', idx, e)}
        />
      </Section>

      <Section id="spells" title="法术与类法术能力 (Spells & Sp)">
        <div className="flex flex-col gap-6 w-full">
          {data.magicBlocks.map(block => (
            <div 
              key={block.id} 
              className="relative group/magic flex flex-col gap-1 -mx-2 px-2 py-1 rounded transition-colors hover:bg-stone-50"
              draggable={dragEnabledFor === block.id}
              onDragStart={(e) => handleDragStart(e, block.id)}
              onDragOver={(e) => handleDragOver(e, block.id, 'magicBlocks')}
              onDrop={(e) => handleDrop(e, block.id, 'magicBlocks')}
            >
               <div className="flex items-center gap-2 mb-1 group/title relative">
                 <div 
                   onMouseEnter={() => setDragEnabledFor(block.id)}
                   onMouseLeave={() => setDragEnabledFor(null)}
                   className="cursor-move text-stone-300 hover:text-stone-500 transition-colors opacity-0 group-hover/magic:opacity-100 absolute -left-6"
                 >
                   <GripVertical size={16} />
                 </div>
                 <input
                   className="text-[10px] font-bold text-stone-500 uppercase tracking-wider bg-transparent border-b border-transparent focus:border-stone-400 outline-none transition-colors max-w-sm"
                   value={block.title}
                   onChange={e => updateMagicBlock(block.id, { title: e.target.value })}
                   placeholder="小字标题 (e.g. 已知法术总览)"
                 />
                 <button onClick={() => removeMagicBlock(block.id)} className="text-stone-300 hover:text-red-500 opacity-0 group-hover/title:opacity-100 transition-opacity p-0.5 rounded">
                   <Trash2 size={12} />
                 </button>
               </div>
               
               {block.type === 'text' && (
                  <AutoResizeTextarea
                    className="w-full bg-stone-50 border border-stone-200 rounded p-2 text-sm outline-none focus:border-stone-400 min-h-[60px]"
                    value={block.content || ''}
                    originalValue={lastSavedData.magicBlocks?.find((b: any) => b.id === block.id)?.content || ''}
                    onChange={v => updateMagicBlock(block.id, { content: v })}
                    placeholder="文本内容..."
                  />
               )}
               {block.type === 'table' && (
                  <DynamicTable
                     columns={block.columns || []}
                     data={block.tableData || []}
                     originalData={lastSavedData.magicBlocks?.find((b: any) => b.id === block.id)?.tableData || []}
                     onChange={v => updateMagicBlock(block.id, { tableData: v })}
                     newItemGenerator={() => {
                        const obj: any = {};
                        (block.columns || []).forEach((c: any) => obj[c.key] = '');
                        return obj;
                     }}
                     onColumnLabelChange={(index, val) => {
                       const newCols = [...(block.columns || [])];
                       newCols[index] = { ...newCols[index], label: val };
                       updateMagicBlock(block.id, { columns: newCols });
                     }}
                     onRemoveColumn={(index) => {
                       const newCols = [...(block.columns || [])];
                       newCols.splice(index, 1);
                       updateMagicBlock(block.id, { columns: newCols });
                     }}
                     onAddColumn={() => {
                        const newKey = 'col' + Math.random();
                        updateMagicBlock(block.id, {
                           columns: [...(block.columns || []), { key: newKey, label: '新列' }]
                        })
                     }}
                  />
               )}
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => addMagicBlock('text')} className="flex items-center gap-1 text-sm bg-stone-50 text-stone-600 border border-stone-200 hover:border-stone-400 hover:text-stone-900 rounded px-3 py-1.5 transition-colors">
              <Plus size={14} /> 添加段落
            </button>
            <button onClick={() => addMagicBlock('table')} className="flex items-center gap-1 text-sm bg-stone-50 text-stone-600 border border-stone-200 hover:border-stone-400 hover:text-stone-900 rounded px-3 py-1.5 transition-colors">
              <Plus size={14} /> 添加列表
            </button>
          </div>
        </div>
      </Section>

      <Section id="skills" title="技能加点 (Skills)">
        <DynamicTable
          columns={[
             { key: 'name', label: '技能 (Skill)', width: '10%' },
             { key: 'total', label: '总值 (Total)', width: '5%' },
             { key: 'source', label: '来源 (Source)', width: '40%' },
             { key: 'special', label: '特殊说明 (Special/Conditional)', width: '45%' }
          ]}
          data={data.skills}
          originalData={lastSavedData.skills}
          onChange={v => setData({ ...data, skills: v })}
          newItemGenerator={() => ({ name: '', total: '', source: '', special: '' })}
          footerRow={data.skillsTotal}
          onFooterChange={v => setData({ ...data, skillsTotal: v })}
          footerReadonlyColumns={['name']}
          rowDraggable={true}
          rowActionMode={tableActionMode}
          onRowActionModeToggle={toggleTableActionMode}
          onRowDragStart={(idx, e) => handleTableItemDragStart('skills', idx, e)}
          onRowDragOver={(idx, e) => handleTableItemDragOver('skills', idx, e)}
          onRowDrop={(idx, e) => handleTableItemDrop('skills', idx, e)}
        />
      </Section>

      <Section id="equipment" title="装备与物品 (Equipment)">
        <div className="flex flex-col gap-8">
          {data.equipmentBags.map((bag, bagIndex) => (
            <div 
              key={bag.id} 
              className={`border rounded p-4 transition-all group/bag ${JSON.stringify(bag) !== JSON.stringify(lastSavedData.equipmentBags?.find((b: any) => b.id === bag.id)) ? 'bg-amber-50/50 border-amber-300 ring-1 ring-amber-100' : 'bg-stone-50/50 border-stone-200 hover:border-stone-400'}`}
              onDragOver={(e) => handleBagDragOver(e, bagIndex)}
              onDrop={(e) => handleBagDrop(e, bagIndex)}
            >
              <div className="flex items-center justify-between gap-4 mb-3">
                 <div className="flex items-center gap-4 flex-1">
                   <div 
                     className="cursor-grab text-stone-300 hover:text-stone-600 active:cursor-grabbing p-1"
                     draggable
                     onDragStart={(e) => handleBagDragStart(e, bagIndex)}
                     title="拖拽排序容器"
                   >
                      <GripVertical size={18} />
                   </div>
                   <div className="relative flex-1">
                     <input
                       className={`text-lg font-bold font-serif bg-transparent border-b outline-none px-1 py-0.5 max-w-sm w-full transition-colors ${JSON.stringify(bag.name) !== JSON.stringify(lastSavedData.equipmentBags?.find((b: any) => b.id === bag.id)?.name) ? 'text-amber-700 border-amber-400' : 'text-primary border-transparent focus:border-primary'}`}
                       value={bag.name}
                       onChange={e => updateBagName(bag.id, e.target.value)}
                       placeholder="容器名称 (e.g. 方便背包)"
                     />
                     {JSON.stringify(bag.name) !== JSON.stringify(lastSavedData.equipmentBags?.find((b: any) => b.id === bag.id)?.name) && (
                       <span className="absolute -right-1 top-0 w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                     )}
                   </div>
                   <label className="flex items-center gap-1.5 text-sm text-stone-600 cursor-pointer select-none">
                     <input 
                       type="checkbox" 
                       checked={bag.ignoreWeight || false}
                       onChange={e => toggleBagWeight(bag.id, e.target.checked)}
                       className="rounded text-primary focus:ring-primary h-4 w-4"
                     />
                     不计重量
                   </label>
                 </div>
                 <button onClick={() => removeBag(bag.id)} className="text-stone-400 hover:text-red-500 text-sm flex items-center gap-1 transition-colors opacity-0 group-hover/bag:opacity-100">
                   <Trash2 size={14} /> 删除容器
                 </button>
              </div>
              <DynamicTable
                 columns={[
                    { key: 'item', label: '物品 (Item)', width: '35%', hideRightBorder: true },
                    { key: 'quantity', label: '', width: '5%', type: 'quantity' },
                    { key: 'cost', label: '价格 (Cost)(gp)', width: '15%', type: 'float' },
                    { key: 'weight', label: '重量 (Weight)(lbs)', width: '15%', type: 'float' },
                    { key: 'notes', label: '备注 (Notes)', width: '30%' },
                 ]}
                 data={bag.items}
                 originalData={lastSavedData.equipmentBags?.find((b: any) => b.id === bag.id)?.items || []}
                 onChange={v => updateBagItems(bag.id, v)}
                 newItemGenerator={() => ({ item: '', quantity: '1', cost: '', weight: '', notes: '' })}
                 rowDraggable={true}
                 rowActionMode={tableActionMode}
                 onRowActionModeToggle={toggleTableActionMode}
                 onRowDragStart={(idx, e) => handleItemDragStart(bag.id, idx, e)}
                 onRowDragOver={(idx, e) => handleItemDragOver(bag.id, idx, e)}
                 onRowDrop={(idx, e) => handleItemDrop(bag.id, idx, e)}
              />
            </div>
          ))}
          
          <button onClick={addBag} className="flex items-center gap-1 text-sm text-stone-600 border border-dashed border-stone-300 hover:border-stone-500 hover:text-stone-900 rounded p-3 justify-center transition-colors">
            <Plus size={16} /> 添加物品容器 (Add Container/Bag)
          </button>
          
          <div className="flex flex-col md:flex-row gap-4 mt-6 items-stretch">
            <div className="flex flex-col gap-0.5 border border-stone-200 bg-stone-50 rounded p-2 min-w-[120px] justify-center">
               <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">总资产 (Total Cost)</label>
               <div className="text-sm font-medium text-ink px-1 py-1">{calculateTotalCost()} gp</div>
            </div>
            <div className={`flex flex-col gap-0.5 border rounded p-2 focus-within:ring-1 focus-within:ring-primary focus-within:border-transparent transition-colors min-w-[120px] justify-center ${data.encumbranceMultiplier !== lastSavedData.encumbranceMultiplier ? 'bg-amber-50 border-amber-300' : 'bg-stone-50 border-stone-200'}`}>
               <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider flex justify-between">
                负重倍率 (Multiplier)
                {data.encumbranceMultiplier !== lastSavedData.encumbranceMultiplier && <span className="text-amber-600 animate-pulse">●</span>}
               </label>
               <input 
                 className="text-sm font-medium text-ink bg-transparent outline-none px-1 py-1 w-full"
                 value={data.encumbranceMultiplier}
                 onChange={e => {
                   const val = e.target.value;
                   if (val === '' || /^\d*\.?\d*$/.test(val)) {
                     setData(p => ({ ...p, encumbranceMultiplier: val }));
                   }
                 }}
               />
            </div>
            
            <div className="flex-1 flex flex-col border border-stone-200 bg-stone-50 rounded px-4 py-6 min-h-[80px] justify-center overflow-visible">
               {(() => {
                  const maxWeight = encumbrance.heavy;
                  const currentWeight = calculateTotalWeightNum();
                  const percentage = Math.min((currentWeight / Math.max(maxWeight, 1)) * 100, 100);
                  const isOverloaded = currentWeight > maxWeight;
                  const isHeavy = currentWeight > encumbrance.medium && currentWeight <= maxWeight;
                  const isMedium = currentWeight > encumbrance.light && currentWeight <= encumbrance.medium;
                  const isLight = currentWeight <= encumbrance.light;

                  let barColor = 'bg-stone-300';
                  if (isOverloaded) barColor = 'bg-red-500';
                  else if (isHeavy) barColor = 'bg-orange-500';
                  else if (isMedium) barColor = 'bg-yellow-400';
                  else if (isLight) barColor = 'bg-green-400';

                  const lightPct = (encumbrance.light / Math.max(maxWeight, 1)) * 100;
                  const medPct = (encumbrance.medium / Math.max(maxWeight, 1)) * 100;
                  const heavyPct = 100;

                  return (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-4 w-full">
                      <div className="flex flex-col sm:items-center shrink-0 w-24">
                         <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">总负重</span>
                         <span className="text-xl font-bold font-serif text-ink">{currentWeight.toLocaleString('en-US', {maximumFractionDigits: 2})} <span className="text-sm font-normal text-stone-500">lbs</span></span>
                      </div>
                      
                      <div className="flex-1 relative flex flex-col justify-center min-h-[32px] mt-2 mb-2 w-full mx-2 sm:mx-4">
                         {/* Top labels */}
                         <div className="absolute -top-5 left-0 right-0 h-4">
                            <span className="absolute text-[10px] font-bold text-stone-500 -translate-x-1/2 whitespace-nowrap" style={{left: `${lightPct}%`}}>{encumbrance.light} lbs</span>
                            <span className="absolute text-[10px] font-bold text-stone-500 -translate-x-1/2 whitespace-nowrap" style={{left: `${medPct}%`}}>{encumbrance.medium} lbs</span>
                            <span className="absolute text-[10px] font-bold text-stone-500 -translate-x-1/2 whitespace-nowrap" style={{left: `${heavyPct}%`}}>{encumbrance.heavy} lbs</span>
                         </div>
                         {/* Bar */}
                         <div className="h-3 w-full bg-stone-200 rounded-full relative overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-300 ${barColor}`} style={{width: `${percentage}%`}} />
                            
                            {/* Markers */}
                            <div className="absolute top-0 bottom-0 w-0.5 bg-stone-400/50 z-10" style={{left: `${lightPct}%`}} />
                            <div className="absolute top-0 bottom-0 w-0.5 bg-stone-400/50 z-10" style={{left: `${medPct}%`}} />
                         </div>
                         {/* Bottom labels with arrows */}
                         <div className="absolute -bottom-6 left-0 right-0 h-4">
                            <span className="absolute text-[10px] font-bold text-stone-500 flex flex-col items-center -translate-x-1/2 min-w-max" style={{left: `${lightPct/2}%`}}>
                                <span className="text-[8px] leading-none text-stone-400 mt-0.5">▲</span><span className="leading-none mt-0.5">轻载</span></span>
                            <span className="absolute text-[10px] font-bold text-stone-500 flex flex-col items-center -translate-x-1/2 min-w-max" style={{left: `${(lightPct + medPct)/2}%`}}>
                                <span className="text-[8px] leading-none text-stone-400 mt-0.5">▲</span><span className="leading-none mt-0.5">中载</span></span>
                            <span className="absolute text-[10px] font-bold text-stone-500 flex flex-col items-center -translate-x-1/2 min-w-max" style={{left: `${(medPct + heavyPct)/2}%`}}>
                                <span className="text-[8px] leading-none text-stone-400 mt-0.5">▲</span><span className="leading-none mt-0.5">重载</span></span>
                         </div>
                      </div>
                      
                      {/* Overload label */}
                      <div className="shrink-0 w-16 flex items-center justify-center">
                        {isOverloaded && <span className="text-xs font-bold text-white bg-red-600 px-2 py-0.5 rounded shadow-inner rotate-[-5deg]">超载</span>}
                      </div>
                   </div>
                  )
               })()}
            </div>
          </div>
        </div>
      </Section>
      
      <Section id="additional-data" title="附加数据 (Additional Data)">
        <div className="flex flex-col gap-8">
          {data.additionalData.map(block => (
            <div 
              key={block.id} 
              draggable={dragEnabledFor === block.id}
              onDragStart={(e) => handleDragStart(e, block.id)}
              onDragOver={(e) => handleDragOver(e, block.id, 'additionalData')}
              onDrop={(e) => handleDrop(e, block.id, 'additionalData')}
              className={`border border-stone-200 rounded p-4 bg-stone-50/50 relative overflow-hidden transition-all hover:border-stone-300`}
            >
              <div className="flex items-center gap-4 mb-3">
                 <div 
                   onMouseEnter={() => setDragEnabledFor(block.id)}
                   onMouseLeave={() => setDragEnabledFor(null)}
                   className="cursor-move text-stone-400 hover:text-stone-600 px-1 py-1 -ml-2"
                 >
                   <GripVertical size={20} />
                 </div>
                 <input
                   className="text-lg font-bold font-serif text-primary bg-transparent border-b border-transparent focus:border-primary outline-none px-1 py-0.5 flex-1"
                   value={block.title}
                   onChange={e => updateAdditionalBlock(block.id, { title: e.target.value })}
                   placeholder="区块标题"
                 />
                 <button onClick={() => removeAdditionalBlock(block.id)} className="text-stone-400 hover:text-red-500 text-sm flex items-center gap-1 transition-colors flex-shrink-0">
                   <Trash2 size={14} /> 删除
                 </button>
              </div>

              {block.type === 'text' && (
                <AutoResizeTextarea
                  className="w-full bg-white border border-stone-200 rounded p-3 text-sm outline-none focus:border-stone-400 min-h-[100px]"
                  value={block.content || ''}
                  originalValue={lastSavedData.additionalData?.find((b: any) => b.id === block.id)?.content || ''}
                  onChange={v => updateAdditionalBlock(block.id, { content: v })}
                  placeholder="在此输入文本..."
                />
              )}

              {block.type === 'image' && (
                <div className="flex flex-col gap-2">
                  <input
                    className="w-full bg-white border border-stone-200 rounded px-3 py-2 text-sm outline-none focus:border-stone-400"
                    value={block.url || ''}
                    onChange={e => updateAdditionalBlock(block.id, { url: e.target.value })}
                    placeholder="图片链接 (https://...)"
                  />
                  {block.url ? (
                    <img src={block.url} alt={block.title} className="max-w-full rounded border border-stone-200" />
                  ) : (
                    <div className="w-full h-32 border-2 border-dashed border-stone-300 rounded bg-stone-100 flex items-center justify-center text-stone-400">
                      输入图片链接以显示
                    </div>
                  )}
                </div>
              )}

              {block.type === 'table' && (
                <div className="flex flex-col gap-2">
                  <DynamicTable
                     columns={block.columns || []}
                     data={block.tableData || []}
                     originalData={lastSavedData.additionalData?.find((b: any) => b.id === block.id)?.tableData || []}
                     onChange={v => updateAdditionalBlock(block.id, { tableData: v })}
                     newItemGenerator={() => {
                        const obj: any = {};
                        (block.columns || []).forEach((c: any) => obj[c.key] = '');
                        return obj;
                     }}
                     onColumnLabelChange={(index, val) => {
                       const newCols = [...(block.columns || [])];
                       newCols[index] = { ...newCols[index], label: val };
                       updateAdditionalBlock(block.id, { columns: newCols });
                     }}
                     onRemoveColumn={(index) => {
                       const newCols = [...(block.columns || [])];
                       newCols.splice(index, 1);
                       updateAdditionalBlock(block.id, { columns: newCols });
                     }}
                     onAddColumn={() => {
                        const newKey = 'col' + Math.random();
                        updateAdditionalBlock(block.id, {
                           columns: [...(block.columns || []), { key: newKey, label: '新列' }]
                        })
                     }}
                  />
                </div>
              )}
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => addAdditionalBlock('text')} className="flex items-center gap-1 text-sm bg-white text-stone-600 border border-stone-300 hover:border-stone-500 hover:text-stone-900 rounded px-4 py-2 transition-colors">
              <Plus size={16} /> 添加文本框
            </button>
            <button onClick={() => addAdditionalBlock('table')} className="flex items-center gap-1 text-sm bg-white text-stone-600 border border-stone-300 hover:border-stone-500 hover:text-stone-900 rounded px-4 py-2 transition-colors">
              <Plus size={16} /> 添加表格
            </button>
            <button onClick={() => addAdditionalBlock('image')} className="flex items-center gap-1 text-sm bg-white text-stone-600 border border-stone-300 hover:border-stone-500 hover:text-stone-900 rounded px-4 py-2 transition-colors">
              <Plus size={16} /> 添加图片
            </button>
          </div>
        </div>
      </Section>

        </main>
            </motion.div>
          )}

          {view === 'vault' && (
            <motion.div 
              key="vault"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full overflow-hidden"
            >
              {user ? (
                <VaultContent 
                  user={user} 
                  characters={myCharacters} 
                  folders={folders}
                  currentFolderId={currentFolderId}
                  setCurrentFolderId={setCurrentFolderId}
                  toast={toast}
                  setToast={setToast}
                  onRefresh={refreshCharacterList}
                  onAdd={() => {
                    confirmNavigation(() => {
                      setData(DEFAULT_DATA);
                      setLastSavedData(JSON.parse(JSON.stringify(DEFAULT_DATA)));
                      setCurrentCharacterId(null);
                      setView('editor');
                      setIsReadOnly(false);
                      const url = new URL(window.location.href);
                      url.searchParams.delete('id');
                      window.history.replaceState({}, '', url.toString());
                    });
                  }}
                  onSelect={selectCharacter}
                  driveModal={driveModal}
                  setDriveModal={setDriveModal}
                  handleBrowseDrive={handleBrowseDrive}
                  navigateDrive={navigateDrive}
                  importFromDrive={importFromDrive}
                  handleCloudBackup={handleCloudBackup}
                  handleCloudRestore={handleCloudRestore}
                  isSyncingDrive={isSyncingDrive}
                  navigateToPathIndex={navigateToPathIndex}
                  confirmNavigation={confirmNavigation}
                  setShowAIModal={setShowAIModal}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-stone-50">
                  <User size={64} className="text-stone-300 mb-6" />
                  <h2 className="text-2xl font-serif font-bold text-stone-800 mb-2">未检测到登录状态</h2>
                  <p className="text-stone-500 max-w-xs mb-8">您需要登录后才能访问您的个人档案库、保存和分享您的人物卡。</p>
                  <button 
                    onClick={() => handleLogin(googleProvider)}
                    className="px-8 py-3 bg-stone-800 text-white rounded-lg font-bold shadow-xl hover:bg-stone-700 transition-all flex items-center gap-3"
                  >
                    使用 Google 账号登录
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {view === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="h-full overflow-hidden"
            >
              {user ? (
                <AccountSettings user={user} setToast={setToast} />
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8 bg-stone-50">
                   <ShieldCheck size={64} className="text-stone-300 mb-4" />
                   <h3 className="text-xl font-bold text-stone-800">异次元访客？</h3>
                   <p className="text-stone-500 mt-2">请先登录以管理您的多元宇宙身份</p>
                </div>
              )}
            </motion.div>
          )}

          {view === 'bbcode-template' && (
            <motion.div 
              key="bbcode-template"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="h-full overflow-hidden"
            >
              <BBCodeTemplateEditor setToast={setToast} />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {confirmModal && (
            <Dialog 
              type="confirm" 
              title={confirmModal.title} 
              onConfirm={() => { confirmModal.onConfirm(); setConfirmModal(null); }} 
              onCancel={() => setConfirmModal(null)} 
              onSecondaryConfirm={confirmModal.onSecondaryConfirm ? () => {
                confirmModal.onSecondaryConfirm!();
                setConfirmModal(null);
              } : undefined}
              secondaryLabel="立即保存并继续"
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {toast && (
            <Toast 
              message={toast.message} 
              type={toast.type} 
              onClose={() => setToast(null)} 
            />
          )}
        </AnimatePresence>
      </div>

      <footer className="text-center text-stone-500 bg-stone-200/50 text-[10px] py-4 font-mono uppercase tracking-widest border-t border-stone-200 flex-shrink-0">
         Personal Character Vault • {user ? `Signed in as ${user.displayName}` : 'Guest Mode'}
      </footer>

      {/* AI Extraction Modal */}
      <AnimatePresence>
        {showAIModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-indigo-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200">
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-stone-800">Gemini AI 角色卡识别</h3>
                    <p className="text-xs text-indigo-600 font-medium mt-0.5">粘贴一段描述文本，我们将自动为您填写角色卡</p>
                  </div>
                </div>
                <button 
                  onClick={() => !isAILoading && setShowAIModal(false)} 
                  className="p-2 hover:bg-white rounded-full transition-colors text-stone-400"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col p-6 gap-4">
                {/* API Key Section */}
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-widest flex items-center gap-2">
                      <ShieldCheck size={14} className="text-indigo-600" />
                      Gemini API Key
                    </label>
                    <button 
                      onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                      className="text-[10px] font-bold text-indigo-600 hover:underline"
                    >
                      {showApiKeyInput ? '隐藏设置' : '更换密钥'}
                    </button>
                  </div>
                  {showApiKeyInput ? (
                    <div className="space-y-2">
                      <input 
                        type="password"
                        value={userApiKey}
                        onChange={e => setUserApiKey(e.target.value)}
                        placeholder="在此输入您的 API Key (AI Studio 提供)"
                        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                      />
                      <p className="text-[10px] text-stone-400">
                        您的密钥仅保存在本地浏览器缓存中，不会上传到服务器。
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-stone-600">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="font-mono">已设置 (••••••••••••)</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-2 flex justify-between">
                    <span>角色描述文本 (Character Description)</span>
                    <span className="text-stone-400">支持 BBCode 表格与自然语言</span>
                  </label>
                  <textarea 
                    autoFocus
                    value={aiInputText}
                    onChange={e => setAiInputText(e.target.value)}
                    placeholder="在此粘贴包含 BBCode 表格或自然语言的人物描述..."
                    className="flex-1 w-full p-4 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none text-sm leading-relaxed custom-scrollbar"
                    disabled={isAILoading}
                  />
                </div>
                
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-3 items-start">
                  <ExternalLink size={16} className="text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-amber-800 leading-normal font-medium">
                    提示：识别完成后，数据将填充到编辑器中。请在保存前检查 AI 识别的准确性。某些复杂的特殊能力可能需要您进行手动调整。
                  </p>
                </div>
              </div>

              <div className="p-6 bg-stone-50 border-t border-stone-100 flex items-center justify-end gap-3">
                <button 
                  onClick={() => setShowAIModal(false)}
                  disabled={isAILoading}
                  className="px-6 py-2.5 text-sm font-bold text-stone-500 hover:bg-stone-200 rounded-xl transition-all disabled:opacity-50"
                >
                  取消
                </button>
                <button 
                  onClick={handleAIExtract}
                  disabled={isAILoading || !aiInputText.trim()}
                  className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:scale-100"
                >
                  {isAILoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      神识扫射中...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      开始识别
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
