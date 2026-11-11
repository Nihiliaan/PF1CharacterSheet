/**
 * 路径条（PathBar）：标签栏下方的只读信息条。
 * 仅显示面包屑路径（含脏标记/只读标记）与云同步状态胶囊——
 * 原工具条的全部操作已迁移至标签与文件的右键菜单。
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUI } from '../../contexts/UIContext';
import { useCharacter } from '../../contexts/CharacterContext';
import { useVault } from '../../contexts/VaultContext';
import HeaderBreadcrumb from './AppHeader/HeaderBreadcrumb';
import SyncStatusCapsule from './AppHeader/SyncStatusCapsule';

export default function PathBar() {
  const { t } = useTranslation();
  const { view } = useUI();
  const {
    data,
    syncStatus,
    isDirty,
    isTemplateDirty,
    isReadOnly,
    currentCharacterId,
    currentTemplateId,
    getItemPath,
  } = useCharacter();
  const {
    currentFolderId,
    setCurrentFolderId,
    folders,
  } = useVault();

  const currentPath = useMemo(() => {
    if (view === 'svg-template') return 'SVG 模板工坊 (.svgt)';
    if (view === 'new-tab') return '新建标签页';
    if (view === 'bbcode-template') {
      if (!currentTemplateId) return t('common.new_template');
      const path = getItemPath(currentTemplateId);
      if (path) return path;
      if (syncStatus === 'syncing') return t('common.loading');
      return t('common.bbcode_editor');
    }
    if (!currentCharacterId) return t('common.new_character');
    const path = getItemPath(currentCharacterId);
    if (path) return path;
    const charName = data.basic?.name?.trim();
    if (charName) return charName;
    if (syncStatus === 'syncing') return t('common.loading');
    return t('common.unnamed_character');
  }, [view, currentTemplateId, currentCharacterId, getItemPath, syncStatus, data.basic?.name, t]);

  const isCurrentDirty = view === 'bbcode-template' ? isTemplateDirty : isDirty;
  const displayPath = currentPath + (isCurrentDirty ? '*' : '') + (isReadOnly ? ` (${t('common.read_only')})` : '');

  const breadcrumbs = (() => {
    const p: any[] = [];
    let curId = currentFolderId;
    while (curId) {
      const f: any = folders.find((folder: any) => folder.id === curId);
      if (f) { p.unshift(f); curId = f.parentId; } else break;
    }
    return p;
  })();

  return (
    <div className="shrink-0 bg-stone-50 border-b border-stone-200 text-stone-800">
      <div className="flex items-center justify-between gap-4 px-4 py-1.5">
        <div className="flex items-center min-w-0">
          <HeaderBreadcrumb
            view={view}
            breadcrumbs={breadcrumbs}
            currentPath={currentPath}
            displayPath={displayPath}
            onSelectFolder={setCurrentFolderId}
          />
        </div>
        <div className="flex items-center shrink-0">
          <SyncStatusCapsule syncStatus={syncStatus} />
        </div>
      </div>
    </div>
  );
}
