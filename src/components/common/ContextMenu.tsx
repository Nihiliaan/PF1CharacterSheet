import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

/**
 * 全局单例互斥：任意时刻只允许一个右键菜单实例存在。
 * 档案库视图、侧栏文件树等多个组件都能打开右键菜单，
 * 若不做互斥，右键另一处时旧菜单不会关闭，会出现两个菜单同时显示。
 */
let activeContextMenuClose: (() => void) | null = null;

const ContextMenu = ({ x, y, items, onClose }: { x: number; y: number; items: { label: string; icon?: React.ComponentType<{ size?: number }>; shortcut?: string; disabled?: boolean; onClick: () => void; danger?: boolean }[]; onClose: () => void }) => {
  // onClose 每次渲染都是新函数引用，用 ref 转发，effect 只在挂载/卸载时注册一次
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // 视口钳制：菜单渲染后测量尺寸，超出窗口则收进可视区域（优先向上/向左翻转）
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });
  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const margin = 8;
    const left = x + rect.width > window.innerWidth - margin
      ? Math.max(margin, window.innerWidth - rect.width - margin)
      : Math.max(margin, x);
    const top = y + rect.height > window.innerHeight - margin
      ? Math.max(margin, window.innerHeight - rect.height - margin)
      : Math.max(margin, y);
    setPos({ left, top });
  }, [x, y, items]);

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
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed z-[150] min-w-[160px] bg-white border border-stone-200 shadow-xl rounded-lg py-1 flex flex-col"
      style={{ left: pos.left, top: pos.top }}
      onClick={e => e.stopPropagation()}
      onContextMenu={e => e.stopPropagation()}
    >
      {items.map((item, i) => {
        const disabled = item.disabled;
        return (
          <button
            key={i}
            disabled={disabled}
            onClick={() => { if (disabled) return; item.onClick(); onClose(); }}
            className={`flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors ${
              disabled
                ? 'text-stone-300 cursor-default'
                : `hover:bg-stone-50 ${item.danger ? 'text-rose-600' : 'text-stone-700'}`
            }`}
          >
            {item.icon ? <item.icon size={16} /> : <span className="w-4" />}
            <span className="flex-1 text-left">{item.label}</span>
            {item.shortcut && <span className="text-xs text-stone-400 pl-4">{item.shortcut}</span>}
          </button>
        );
      })}
    </motion.div>
  );
};

export default ContextMenu;
