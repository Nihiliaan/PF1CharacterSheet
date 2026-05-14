import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CharacterData, CharacterDocument } from '../types';
import { DEFAULT_DATA } from '../constants';
import {
  saveCharacter as saveCharacterService,
  getCharacterById,
  ensureLocalFolder as ensureLocalFolderService,
  saveLink,
  getMyCharacters
} from '../services/characterService';

export const useCharacterPersistence = (
  user: any,
  data: CharacterData,
  setData: React.Dispatch<React.SetStateAction<CharacterData>>,
  lastSavedData: CharacterData,
  setLastSavedData: (data: CharacterData) => void,
  currentDocumentId: string | null,
  setCurrentDocumentId: (id: string | null) => void,
  setIsReadOnly: (val: boolean) => void,
  setIsSyncing: (val: boolean) => void,
  setToast: (toast: any) => void,
  setConfirmModal: (modal: any) => void,
  setView: (view: any) => void,
  addToRecent: (char: any) => void,
  refreshCharacterList: () => void,
  currentFolderId: string | null,
  isDirty: boolean,
  setBbcodeTemplate: (t: string) => void
) => {
  const [isSaving, setIsSaving] = useState(false);

  const mergeWithDefault = (data: any, defaults: any): any => {
    if (typeof data !== 'object' || data === null) return JSON.parse(JSON.stringify(defaults));
    // Migration logic
    if (data.meleeAttacks && !data.attacks) {
      data.attacks = {
        meleeAttacks: data.meleeAttacks,
        rangedAttacks: data.rangedAttacks || [],
        specialAttacks: data.specialAttacks || ''
      };
      delete data.meleeAttacks; delete data.rangedAttacks; delete data.specialAttacks;
    }
    if (data.babTable && !data.combatTable) {
      data.combatTable = data.babTable;
      delete data.babTable;
    }

    const result = { ...data };
    for (const key in defaults) {
      if (typeof defaults[key] === 'object' && defaults[key] !== null && !Array.isArray(defaults[key])) {
        result[key] = mergeWithDefault(data[key], defaults[key]);
      } else if (result[key] === undefined) {
        result[key] = JSON.parse(JSON.stringify(defaults[key]));
      }
    }
    return result;
  };

  const handleSaveInternal = async (saveData: CharacterData, id?: string | null, folderId?: string | null) => {
    if (!user) {
      setToast({ message: "请先登录后再保存", type: 'error' });
      return;
    }
    setIsSaving(true);
    try {
      const newId = await saveCharacterService(saveData, id || undefined, folderId);
      if (newId) {
        if (!id || id === currentDocumentId) {
          setCurrentDocumentId(newId);
          setLastSavedData(JSON.parse(JSON.stringify(saveData)));
          const url = new URL(window.location.href);
          url.searchParams.set('id', newId);
          window.history.replaceState({}, '', url.toString());
        }
        addToRecent({ id: newId, name: saveData?.basic?.name || '未命名人物', data: saveData });
        await refreshCharacterList();
        setToast({ message: id ? "人物卡保存成功！" : "已创建并保存新人物卡" });
        return newId;
      }
    } catch (e: any) {
      setToast({ message: "保存失败: " + e.message, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => handleSaveInternal(data, currentDocumentId, currentFolderId);

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
      setCurrentDocumentId(null);
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

  const selectCharacter = async (idOrChar: string | any, skipDirtyCheck: boolean = false) => {
    const performSelect = async () => {
      try {
        if (typeof idOrChar === 'object' && idOrChar !== null && idOrChar.id) {
          if (idOrChar.targetId) {
            await loadSharedCharacter(idOrChar.targetId);
            return;
          }
          const char = idOrChar;
          if (char.isTemplate) {
            setBbcodeTemplate(char.data?.content || '');
            setView('bbcode-template');
            setCurrentDocumentId(char.id);
            return;
          }
          const merged = mergeWithDefault(char.data, DEFAULT_DATA);
          setData(merged);
          setLastSavedData(JSON.parse(JSON.stringify(merged)));
          setCurrentDocumentId(char.id);
          setIsReadOnly(char.ownerId !== user?.uid);
          setView('editor');
          addToRecent(char);
          const url = new URL(window.location.href);
          url.searchParams.set('id', char.id);
          window.history.replaceState({}, '', url.toString());
          return;
        }

        const id = idOrChar as string;
        setToast({ message: "正在加载人物资料..." });
        const char = await getCharacterById(id) as CharacterDocument | null;
        if (!char || !char.data) throw new Error("Character not found");
        if (char.targetId) {
          await loadSharedCharacter(char.targetId);
          return;
        }
        if (char.isTemplate) {
          setBbcodeTemplate(char.data.content || '');
          setView('bbcode-template');
          setCurrentDocumentId(char.id);
          return;
        }
        const merged = mergeWithDefault(char.data, DEFAULT_DATA);
        setData(merged);
        setLastSavedData(JSON.parse(JSON.stringify(merged)));
        setCurrentDocumentId(char.id);
        setIsReadOnly(char.ownerId !== user?.uid);
        setView('editor');
        addToRecent(char);
        const url = new URL(window.location.href);
        url.searchParams.set('id', id);
        window.history.replaceState({}, '', url.toString());
      } catch (e: any) {
        setToast({ message: "人物卡加载失败", type: 'error' });
      }
    };

    if (isDirty && !skipDirtyCheck) {
      setConfirmModal({
        title: "是否保存当前修改后再打开新角色？",
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
    setIsReadOnly(true);
    try {
      const char = await getCharacterById(id) as CharacterDocument | null;
      if (char) {
        if (char.isTemplate) {
          setBbcodeTemplate(char.data.content || '');
          setView('bbcode-template');
        } else {
          const merged = mergeWithDefault(char.data, DEFAULT_DATA);
          setData(merged);
          setLastSavedData(JSON.parse(JSON.stringify(merged)));
          setCurrentDocumentId(char.id);
          setView('editor');
        }
        const url = new URL(window.location.href);
        url.searchParams.set('id', char.id);
        window.history.replaceState({}, '', url.toString());
        addToRecent(char);
        if (user && char.ownerId === user.uid) setIsReadOnly(false);
      }
    } catch (e) {
      setToast({ message: "加载分享内容失败", type: 'error' });
    }
  };

  // Initial Load
  useEffect(() => {
    const loadInitial = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        let charId = urlParams.get('id');
        if (!charId) {
          const saved = localStorage.getItem('recent_characters');
          if (saved) {
            try {
              const recent = JSON.parse(saved);
              if (Array.isArray(recent) && recent.length > 0) charId = recent[0].id;
            } catch (e) {}
          }
        }

        if (charId) {
          await selectCharacter(charId, true);
        }
        if (user) {
          await ensureLocalFolderService('来自分享', null, user.uid);
          refreshCharacterList();
        }
      } catch (error) {} finally {
        setIsSyncing(false);
      }
    };
    loadInitial();
  }, [user]);

  return {
    isSaving,
    handleSave,
    handleSaveInternal,
    handleNew,
    selectCharacter,
    loadSharedCharacter
  };
};
