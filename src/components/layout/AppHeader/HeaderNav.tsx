/**
 * AppHeader 子组件：顶部导航下拉菜单。
 * 渲染左侧导航触发按钮及展开面板（编辑器 / GM 视图 / SVG 模板工坊 / BBCode 编辑器 / 保险库 / 关于）。
 * 纯展示组件：所有状态与回调均由容器 AppHeader.tsx 通过 props 传入。
 */
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import type { ViewType } from '../../../contexts/UIContext';
import type { NavItem } from './shared';

interface HeaderNavProps {
  /** 挂在外层 relative 容器上的 ref，用于容器内点击外部关闭逻辑 */
  navRef: React.RefObject<HTMLDivElement | null>;
  isNavOpen: boolean;
  onToggle: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  navItems: NavItem[];
  currentNavItem: NavItem;
  view: ViewType;
  /** 选中某个导航项（容器内会 setView 并关闭菜单） */
  onSelectView: (id: string) => void;
}

export default function HeaderNav({
  navRef,
  isNavOpen,
  onToggle,
  onMouseEnter,
  onMouseLeave,
  navItems,
  currentNavItem,
  view,
  onSelectView
}: HeaderNavProps) {
  return (
    <div
      className="relative"
      ref={navRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-3 py-1.5 bg-stone-700 hover:bg-stone-600 rounded-lg transition-colors group"
      >
        <div className="bg-primary p-1 rounded">
          {React.cloneElement(currentNavItem.icon as React.ReactElement, { size: 16, className: "text-white" })}
        </div>
        <span className="font-bold text-sm hidden sm:inline">{currentNavItem.label}</span>
        <ChevronDown size={14} className={`text-stone-400 group-hover:text-white transition-transform ${isNavOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isNavOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute left-0 mt-2 w-56 bg-white border border-stone-200 rounded-xl shadow-xl z-[70] py-1"
          >
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => onSelectView(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${view === item.id ? 'bg-primary/5 text-primary font-bold' : 'text-stone-700 hover:bg-stone-50'}`}
              >
                <div className={view === item.id ? 'text-primary' : 'text-stone-400'}>
                  {item.icon}
                </div>
                <span>{item.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
