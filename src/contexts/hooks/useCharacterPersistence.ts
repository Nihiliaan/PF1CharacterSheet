import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CharacterData, CharacterDocument } from '../../schema/types';
import { DEFAULT_DATA } from '../../constants/index';
import { dataMigration } from '../../utils/dataMigration';
import {
  saveCharacter as saveCharacterService,
  getCharacterById,
  getCharacterFromCache,
  getCharacterFromServer,
  ensureLocalFolder as ensureLocalFolderService,
  saveLink
} from '../../services/characterService';

const KEY_LAST_CHAR = 'last_active_character_id';
const KEY_LAST_TEMP = 'last_active_template_id';

export const useCharacterPersistence = (
  user: any,
  data: CharacterData,
  setData: React.Dispatch<React.SetStateAction<CharacterData>>,
  lastSavedData: CharacterData,
  setLastSavedData: (data: CharacterData) => void,
  currentCharacterId: string | null,
  setCurrentCharacterId: (id: string | null) => void,
  currentTemplateId: string | null,
  setCurrentTemplateId: (id: string | null) => void,
  isReadOnly: boolean,
  setIsReadOnly: (val: boolean) => void,
  setIsSyncing: (val: boolean) => void,
  setToast: (toast: any) => void,
  setConfirmModal: (modal: any) => void,
  setView: (view: any) => void,
  addToRecent: (char: any) => void,
  refreshCharacterList: () => void,
  currentFolderId: string | null,
  setCurrentFolderId: (id: string | null) => void,
  isDirty: boolean,
  setBbcodeTemplate: (t: string) => void,
  setLastSavedTemplate: (t: string) => void
  ) => {
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'offline'>('idle');

  const handleSaveInternal = async (saveData: CharacterData | { content: string, name?: string }, id?: string | null, folderId?: string | null, isTemplate: boolean = false) => {
    if (!user) {
      setToast({ message: "请先登录后再保存", type: 'error' });
      return;
    }
    setIsSaving(true);
    try {
      const newId = await saveCharacterService(saveData, id || undefined, folderId, isTemplate);
      if (newId) {
        if (isTemplate) {
          setCurrentTemplateId(newId);
          localStorage.setItem(KEY_LAST_TEMP, newId);
          if ('content' in saveData) {
            setLastSavedTemplate(saveData.content);
          }
        } else {
          setCurrentCharacterId(newId);
          localStorage.setItem(KEY_LAST_CHAR, newId);
          setLastSavedData(JSON.parse(JSON.stringify(saveData)));
          const url = new URL(window.location.href);
          url.searchParams.set('id', newId);
          window.history.replaceState({}, '', url.toString());
        }

        // New files are never links, so they are editable
        setIsReadOnly(false);

        const name = isTemplate ? (('name' in saveData ? saveData.name : null) || '未命名模板') : ((saveData as CharacterData)?.basic?.name || '未命名人物');
        addToRecent({ id: newId, name, data: saveData, isTemplate });
        await refreshCharacterList();
        setToast({ message: id ? (isTemplate ? "模板保存成功！" : "人物卡保存成功！") : ("已创建并保存新项目") });
        return newId;
      }
    } catch (e: any) {
      setToast({ message: "保存失败: " + e.message, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => handleSaveInternal(data, currentCharacterId, currentFolderId);

  const handleSaveAs = async () => {
    if (!user) {
      setToast({ message: "请先登录后再保存副本", type: 'error' });
      return;
    }
    const name = window.prompt(t('editor.save_as_prompt') || "请输入新人物卡的名称", (data.basic?.name || t('editor.save_as_default_name') || '人物卡副本'));
    if (name) {
      // Reset ownership and ID for the new copy
      const newData = { 
        ...data, 
        basic: { ...data.basic, name },
        ownerId: user.uid,
        id: '' 
      };
      
      // If the current document is read-only (shared/link), 
      // default 'Save As' to the Vault root (null).
      const targetFolderId = isReadOnly ? null : currentFolderId;
      
      const newId = await handleSaveInternal(newData, null, targetFolderId);
      if (newId) {
        setData(newData);
        setIsReadOnly(false);
      }
    }
  };

  const performCreateNew = async () => {
    const newData = JSON.parse(JSON.stringify(DEFAULT_DATA));
    if (user) {
      setToast({ message: "正在创建新角色..." });
      try {
        const newId = await saveCharacterService(newData, undefined, currentFolderId);
        if (newId) {
          await refreshCharacterList();
          await selectCharacter(newId, true);
        }
      } catch (e: any) {
        setToast({ message: "创建新角色失败", type: 'error' });
      }
    } else {
      setData(newData);
      setLastSavedData(JSON.parse(JSON.stringify(newData)));
      setCurrentCharacterId(null);
      localStorage.removeItem(KEY_LAST_CHAR);
      setIsReadOnly(false);
      const url = new URL(window.location.href);
      url.searchParams.delete('id');
      window.history.replaceState({}, '', url.toString());
      setView('editor');
    }
  };

  const handleNew = async () => {
    if (isDirty) {
      setConfirmModal({
        title: "确定要新建角色吗？是否保存当前修改？",
        onConfirm: () => performCreateNew(),
        onSecondaryConfirm: async () => {
          await handleSave();
          await performCreateNew();
        }
      });
    } else {
      await performCreateNew();
    }
  };

  const selectCharacter = async (idOrChar: string | any, skipDirtyCheck: boolean = false, shouldSwitchView: boolean = true) => {
    const renderCharacterDocument = (char: CharacterDocument, shouldSwitchView: boolean = true) => {
      if (char.isTemplate) {
        const content = char.data?.content || '';
        setBbcodeTemplate(content);
        setLastSavedTemplate(content);
        if (shouldSwitchView) setView('bbcode-template');
        setCurrentTemplateId(char.id);
        localStorage.setItem(KEY_LAST_TEMP, char.id);
      } else {
        const merged = dataMigration.mergeWithDefault(char.data);
        setData(merged);
        setLastSavedData(JSON.parse(JSON.stringify(merged)));
        setCurrentCharacterId(char.id);
        localStorage.setItem(KEY_LAST_CHAR, char.id);
        if (shouldSwitchView) setView('editor');
      }
      if (char.folderId) setCurrentFolderId(char.folderId);
      addToRecent(char);
      const url = new URL(window.location.href);
      url.searchParams.set('id', char.id);
      window.history.replaceState({}, '', url.toString());
    };

    const performSelect = async () => {
      try {
        if (idOrChar?.id) {
          let char = idOrChar as any;
          setIsReadOnly(char.name?.endsWith('.lnk') || false);

          if (char.targetId) {
            const targetChar = await getCharacterById(char.targetId) as CharacterDocument | null;
            if (targetChar) {
              char = { ...targetChar, id: char.id, folderId: char.folderId };
            }
          }

          if (user && char.ownerId && char.ownerId !== user.uid && !char.targetId) {
            const sharedFolderId = await ensureLocalFolderService('来自分享', null, user.uid);
            const linkId = await saveLink(char, sharedFolderId);
            if (linkId) {
              setCurrentFolderId(sharedFolderId);
              await selectCharacter(linkId, true, shouldSwitchView);
              return;
            }
          }

          renderCharacterDocument(char, shouldSwitchView);
          setIsSyncing(false);
          return;
        }

        const id = idOrChar as string;
        if (!id) return;

        setIsSyncing(true);
        setSyncStatus('syncing');

        // 1. 优先尝试从本地 IndexedDB 缓存秒开
        let cachedDoc = await getCharacterFromCache(id) as CharacterDocument | null;
        let hasCached = false;

        if (cachedDoc && cachedDoc.data) {
          hasCached = true;
          if (cachedDoc.targetId) {
            const cachedTarget = await getCharacterFromCache(cachedDoc.targetId) as CharacterDocument | null;
            if (cachedTarget && cachedTarget.data) {
              cachedDoc = { ...cachedTarget, id: cachedDoc.id, folderId: cachedDoc.folderId };
            }
          }
          // 立即呈现本地缓存内容，并置为只读浏览保护
          renderCharacterDocument(cachedDoc, shouldSwitchView);
          setIsReadOnly(true);
        }

        // 2. 后台与云端对齐最新版本
        try {
          let serverDoc = await getCharacterFromServer(id) as CharacterDocument | null;
          if (serverDoc && serverDoc.data) {
            if (serverDoc.targetId) {
              const targetDoc = await getCharacterFromServer(serverDoc.targetId) as CharacterDocument | null;
              if (targetDoc && targetDoc.data) {
                serverDoc = { ...targetDoc, id: serverDoc.id, folderId: serverDoc.folderId };
              }
            }

            if (user && serverDoc.ownerId && serverDoc.ownerId !== user.uid && !serverDoc.targetId) {
              const sharedFolderId = await ensureLocalFolderService('来自分享', null, user.uid);
              const linkId = await saveLink(serverDoc, sharedFolderId);
              if (linkId) {
                setCurrentFolderId(sharedFolderId);
                await selectCharacter(linkId, true, shouldSwitchView);
                return;
              }
            }

            let shouldApply = !hasCached;
            if (hasCached && cachedDoc) {
              const cachedTime = cachedDoc.updatedAt?.toMillis?.() || cachedDoc.createdAt?.toMillis?.() || 0;
              const serverTime = serverDoc.updatedAt?.toMillis?.() || serverDoc.createdAt?.toMillis?.() || 0;
              if (serverTime > cachedTime) {
                shouldApply = true;
              }
            }

            if (shouldApply) {
              renderCharacterDocument(serverDoc, shouldSwitchView);
            }

            setSyncStatus('synced');
            setTimeout(() => setSyncStatus('idle'), 2000);
            setIsReadOnly(serverDoc.name?.endsWith('.lnk') || false);
          } else if (hasCached) {
            setSyncStatus('offline');
            setTimeout(() => setSyncStatus('idle'), 3000);
            setIsReadOnly(cachedDoc?.name?.endsWith('.lnk') || false);
          } else {
            throw new Error("Document not found");
          }
        } catch (e: any) {
          if (hasCached) {
            setSyncStatus('offline');
            setTimeout(() => setSyncStatus('idle'), 3000);
            setIsReadOnly(cachedDoc?.name?.endsWith('.lnk') || false);
          } else {
            setSyncStatus('idle');
            setToast({ message: "加载失败: " + (e.message || "无法连接云端"), type: 'error' });
          }
        } finally {
          setIsSyncing(false);
        }
      } catch (e: any) {
        setToast({ message: "加载失败", type: 'error' });
        setIsSyncing(false);
        setSyncStatus('idle');
      }
    };

    if (isDirty && !skipDirtyCheck) {
      setConfirmModal({
        title: "是否保存当前修改后再打开新项目？",
        onConfirm: () => performSelect(),
        onSecondaryConfirm: async () => {
          await handleSave();
          await performSelect();
        }
      });
    } else {
      await performSelect();
    }
  };

  const loadSharedCharacter = async (id: string) => {
    await selectCharacter(id, true, true);
  };

  // Initial Load
  useEffect(() => {
    const loadInitial = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        let charId = urlParams.get('id');
        
        // Restore both types from localStorage if not explicitly requested via URL
        const lastCharId = localStorage.getItem(KEY_LAST_CHAR);
        const lastTempId = localStorage.getItem(KEY_LAST_TEMP);

        if (charId) {
          // If URL has an ID, we determine its type and load it as the primary
          await selectCharacter(charId, true, true);
          
          // Then try to restore the "other" type in the background if it's different
          if (lastCharId && lastCharId !== charId) {
             try {
               const c = await getCharacterById(lastCharId);
               if (c && !c.isTemplate) {
                  const merged = dataMigration.mergeWithDefault(c.data);
                  setData(merged);
                  setLastSavedData(JSON.parse(JSON.stringify(merged)));
                  setCurrentCharacterId(c.id);
               }
             } catch (e: any) {
               if (e.message?.includes('permission')) {
                 localStorage.removeItem(KEY_LAST_CHAR);
               }
             }
          }
          if (lastTempId && lastTempId !== charId) {
             try {
               const t = await getCharacterById(lastTempId);
               if (t && t.isTemplate) {
                  const content = t.data.content || '';
                  setBbcodeTemplate(content);
                  setLastSavedTemplate(content);
                  setCurrentTemplateId(t.id);
               }
             } catch (e: any) {
               if (e.message?.includes('permission')) {
                 localStorage.removeItem(KEY_LAST_TEMP);
               }
             }
          }
        } else {
          // No ID in URL, restore both
          if (lastCharId) {
            try {
              await selectCharacter(lastCharId, true, false);
            } catch (e: any) {
              if (e.message?.includes('permission')) {
                localStorage.removeItem(KEY_LAST_CHAR);
              }
            }
          }
          if (lastTempId) {
            try {
              await selectCharacter(lastTempId, true, false);
            } catch (e: any) {
              if (e.message?.includes('permission')) {
                localStorage.removeItem(KEY_LAST_TEMP);
              }
            }
          }
        }
      } catch (error) {
        console.error("[useCharacterPersistence] Initial load failed:", error);
      } finally {
        setIsSyncing(false);
      }
    };
    loadInitial();
  }, [user]);

  return {
    isSaving,
    syncStatus,
    handleSave,
    handleSaveAs,
    handleSaveInternal,
    handleNew,
    selectCharacter,
    loadSharedCharacter
  };
};
