/**
 * AppHeader 子组件：顶部路径 / 面包屑显示。
 * 保险库视图下渲染可点击的文件夹面包屑，其余视图渲染当前文件的路径文本。
 * 纯展示组件：状态与回调由容器 AppHeader.tsx 通过 props 传入。
 */
import React from 'react';
import { User, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ViewType } from '../../../contexts/UIContext';
import type { BreadcrumbFolder } from './shared';

interface HeaderBreadcrumbProps {
  view: ViewType;
  breadcrumbs: BreadcrumbFolder[];
  /** 当前文件的完整路径（用于 title 提示） */
  currentPath: string;
  /** 含脏标记 / 只读后缀的展示路径 */
  displayPath: string;
  /** 进入某个文件夹（传 null 表示回到根目录） */
  onSelectFolder: (id: string | null) => void;
}

export default function HeaderBreadcrumb({
  view,
  breadcrumbs,
  currentPath,
  displayPath,
  onSelectFolder
}: HeaderBreadcrumbProps) {
  const { t } = useTranslation();
  return (
    <>
      <div className="h-6 w-px bg-stone-600 hidden md:block"></div>
      {view === 'vault' ? (
        <div className="hidden md:flex items-center gap-2 text-stone-400 text-xs font-medium">
           <button
              onClick={() => onSelectFolder(null)}
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              <User size={14} /> {t('common.vault')}
            </button>
            {breadcrumbs.map(f => (
              <React.Fragment key={f.id}>
                <ChevronRight size={12} className="text-stone-600" />
                <button
                  onClick={() => onSelectFolder(f.id)}
                  className="hover:text-white transition-colors"
                >
                  {f.name}
                </button>
              </React.Fragment>
            ))}
        </div>
      ) : (
        <div className="hidden md:flex items-center gap-2 text-stone-400 text-xs font-medium max-w-[300px] truncate">
          <span className="truncate" title={currentPath}>{displayPath}</span>
        </div>
      )}
    </>
  );
}
