/**
 * AppHeader 拆分出的子组件共用的类型定义。
 * 仅存放类型，不包含任何逻辑。
 */
import type React from 'react';

/** 顶部导航菜单项 */
export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  hidden?: boolean;
}

/** 保险库面包屑中的文件夹条目 */
export interface BreadcrumbFolder {
  id: string;
  name: string;
}

/** 最近打开的角色条目 */
export interface RecentCharacterItem {
  id: string;
  name: string;
  avatar: string;
  classes: string;
}

/** 云同步状态 */
export type SyncStatusValue = 'idle' | 'syncing' | 'synced' | 'offline';
