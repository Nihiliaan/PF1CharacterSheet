/**
 * AppHeader 子组件：云同步状态胶囊。
 * 根据同步状态渲染"同步中 / 已同步 / 离线缓存"三种指示。
 * 纯展示组件：状态由容器 AppHeader.tsx 通过 props 传入。
 */
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, CheckCircle2, CloudOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SyncStatusValue } from './shared';

interface SyncStatusCapsuleProps {
  syncStatus: SyncStatusValue;
}

export default function SyncStatusCapsule({ syncStatus }: SyncStatusCapsuleProps) {
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      {syncStatus && syncStatus !== 'idle' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, x: 5 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.9, x: 5 }}
          className="flex items-center"
        >
          {syncStatus === 'syncing' && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 text-amber-300 rounded-full text-xs font-medium backdrop-blur-sm"
              title={t('common.syncing_cloud')}
            >
              <Loader2 size={13} className="animate-spin text-amber-400" />
              <span className="hidden sm:inline">{t('common.syncing')}</span>
            </div>
          )}
          {syncStatus === 'synced' && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-full text-xs font-medium backdrop-blur-sm"
              title={t('common.synced_cloud')}
            >
              <CheckCircle2 size={13} className="text-emerald-400" />
              <span className="hidden sm:inline">{t('common.synced')}</span>
            </div>
          )}
          {syncStatus === 'offline' && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 bg-stone-700/60 border border-stone-600 text-stone-300 rounded-full text-xs font-medium"
              title={t('common.offline_cache_tip')}
            >
              <CloudOff size={13} className="text-stone-400" />
              <span className="hidden sm:inline">{t('common.cached')}</span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
