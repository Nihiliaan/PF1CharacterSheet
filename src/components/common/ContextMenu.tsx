import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';

/**
 * 全局单例互斥：任意时刻只允许一个右键菜单实例存在。
 * 档案库视图、侧栏文件树等多个组件都能打开右键菜单，
 * 若不做互斥，右键另一处时旧菜单不会关闭，会出现两个菜单同时显示。
 */
let activeContextMenuClose: (() => void) | null = null;

const ContextMenu = ({ x, y, items, onClose }: { x: number; y: number; items: { label: string; icon: any; onClick: () => void; danger?: boolean }[]; onClose: () => void }) => {
  // onClose 每次渲染都是新函数引用，用 ref 转发，effect 只在挂载/卸载时注册一次
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const close = () => onCloseRef.current();
    // 打开本菜单前，先关闭其它已打开的右键菜单（跨组件互斥）
    if (activeContextMenuClose && activeContextMenuClose !== close) {
      activeContextMenuClose();
    }
    activeContextMenuClose = close;
    const handleClick = () => close();
    window.addEventListener('click', handleClick);
    return () => {
      window.removeEventListener('click', handleClick);
      if (activeContextMenuClose === close) {
        activeContextMenuClose = null;
      }
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed z-[150] min-w-[160px] bg-white border border-stone-200 shadow-xl rounded-lg py-1 flex flex-col"
      style={{ left: x, top: y }}
      onClick={e => e.stopPropagation()}
      onContextMenu={e => e.stopPropagation()}
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
