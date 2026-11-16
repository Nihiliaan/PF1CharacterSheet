import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { CharacterData, CharacterDocument } from '../../schema/types';
import { DEFAULT_DATA } from '../../constants/index';
import {
  saveCharacter as saveCharacterService,
  getCharacterById,
  getCharacterFromCache,
  getCharacterFromServer,
  ensureLocalFolder as ensureLocalFolderService,
  saveLink
} from '../../services/characterService';
import { auth } from '../../lib/firebase';
import { getStoredSettings } from '../SettingsContext';
import { triggerForumSync } from '../../utils/forumSyncHelper';
import { saveTemplate, getTemplateById, templateToCharacterDoc } from '../../services/templateService';
import { useAuth } from '../AuthContext';
import { useUI } from '../UIContext';
import { useVault } from '../VaultContext';

const KEY_LAST_CHAR = 'last_active_character_id';

/**
 * 持久化 hook 的选项对象
 *
 * 仅包含 CharacterProvider 自身的 state（Context 不能消费自身，必须由 Provider 透传）；
 * 其余依赖（user / setToast / setConfirmModal / setView / addToRecent /
 * getFullDoc / currentFolderId / setCurrentFolderId）
 * 已改为 hook 内部直接消费对应 Context，不再作为参数传入。
 */
export interface UseCharacterPersistenceOptions {
  // ===== 角色数据 =====
  data: CharacterData;
  setData: React.Dispatch<React.SetStateAction<CharacterData>>;
  lastSavedData: CharacterData;
  setLastSavedData: (data: CharacterData) => void;
  // ===== 当前打开的文档标识 =====
  currentCharacterId: string | null;
  setCurrentCharacterId: (id: string | null) => void;
  currentTemplateId: string | null;
  setCurrentTemplateId: (id: string | null) => void;
  // ===== 只读 / 同步状态 =====
  isReadOnly: boolean;
  setIsReadOnly: (val: boolean) => void;
  setIsSyncing: (val: boolean) => void;
  isDirty: boolean;
  // ===== 模板 =====
  setBbcodeTemplate: (t: string) => void;
  setLastSavedTemplate: (t: string) => void;
  /** 当前模板编辑器内容（模板标签的保存分流用） */
  bbcodeTemplate: string;
  // ===== 计算层（供论坛同步导出 BBCode 使用）=====
  computed?: any;
  // ===== 选项卡系统集成点（由 CharacterContext 提供）=====
  /** 活动标签的类型：handleSave 据此分流人物卡/模板保存；chooser/preview 无可保存文档 */
  activeTabKind?: 'character' | 'template' | 'chooser' | 'preview' | null;
  /** 文档被渲染进 live 状态（即"打开了一个文档"）：创建或激活对应选项卡 */
  onOpenDocument?: (docId: string, kind: 'character' | 'template', title?: string) => void;
  /** 文档保存后 id 变化（另存为 / 首次保存）：就地更新活动选项卡的 docId */
  onSaveDocument?: (docId: string, kind: 'character' | 'template') => void;
  /** 启动时无 ?id= 参数：呈现新建标签页（由 CharacterContext 打开 chooser） */
  onBootWithoutId?: () => void;
}

export const useCharacterPersistence = ({
  data,
  setData,
  lastSavedData,
  setLastSavedData,
  currentCharacterId,
  setCurrentCharacterId,
  currentTemplateId,
  setCurrentTemplateId,
  isReadOnly,
  setIsReadOnly,
  setIsSyncing,
  isDirty,
  setBbcodeTemplate,
  setLastSavedTemplate,
  bbcodeTemplate,
  computed,
  activeTabKind,
  onOpenDocument,
  onSaveDocument,
  onBootWithoutId
}: UseCharacterPersistenceOptions) => {
  const { t } = useTranslation();
  // 内部直接消费各 Context（CharacterProvider 的祖先节点已挂载对应 Provider）
  const { user } = useAuth();
  const { setToast, setConfirmModal, setView, addToRecent } = useUI();
  const { getFullDoc, currentFolderId, setCurrentFolderId } = useVault();

  const [isSaving, setIsSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'offline'>('idle');
  const activeDocRef = React.useRef<CharacterDocument | any>(null);
  // isDirty 实时引用：云端对账应用新版本前检查，防止覆盖用户已开始的编辑
  const isDirtyRef = React.useRef(isDirty);
  isDirtyRef.current = isDirty;

  /**
   * persist：纯保存层 —— 只负责把数据写入 Firestore，返回新文档 ID（失败/无返回时为 undefined）
   */
  const persist = async (
    saveData: CharacterData | { content: string, name?: string },
    id?: string | null,
    folderId?: string | null,
    isTemplate: boolean = false
  ): Promise<string | undefined> => {
    // 模板走独立的 templates 集合
    if (isTemplate) {
      return await saveTemplate(saveData as { content: string, name?: string }, id, folderId);
    }
    const newId = await saveCharacterService(saveData, id || undefined, folderId);
    return newId || undefined;
  };

  /**
   * afterSave：保存成功后的后续副作用管线
   * （本地状态回写、URL 更新、localStorage、最近列表、草稿清理、论坛同步、toast、档案库刷新）
   * 注意：副作用顺序必须与拆分前完全一致，勿随意调整
   */
  const afterSave = (
    newId: string,
    saveData: CharacterData | { content: string, name?: string },
    id?: string | null,
    isTemplate: boolean = false,
    folderId?: string | null
  ) => {
    // 保存导致活动文档的 id 变化（另存为 / 未保存新卡首次保存）：就地更新活动选项卡
    onSaveDocument?.(newId, isTemplate ? 'template' : 'character');
    if (isTemplate) {
      setCurrentTemplateId(newId);
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

    // 回写活动文档元数据：首次保存/另存为会改变 id 与目录，后续保存需以文档自身目录为准
    //（否则档案库浏览位置变动后再次保存会把文档移到别处）
    const prevDoc = activeDocRef.current;
    activeDocRef.current = {
      ...(prevDoc || {}),
      id: newId,
      folderId: folderId !== undefined ? folderId : (prevDoc?.folderId ?? null),
      ...(isTemplate ? { isTemplate: true } : {}),
      ...(!isTemplate && (saveData as any)?.ownerId ? { ownerId: (saveData as any).ownerId } : {})
    };

    const name = isTemplate
      ? (('name' in saveData ? saveData.name : null)
        || (typeof prevDoc?.name === 'string' ? prevDoc.name.replace(/\.bbc$/i, '') : '')
        || '未命名模板')
      : ((saveData as CharacterData)?.basic?.name || '未命名人物');
    addToRecent({ id: newId, name, data: saveData, isTemplate });
    // 保存成功后清除本地草稿缓存（人物卡与模板两种 key 都清理）
    const draftId = newId || id || 'default';
    localStorage.removeItem(`pf1_char_draft_${draftId}`);
    localStorage.removeItem(`pf1_tpl_draft_${draftId}`);

    const settings = getStoredSettings();
    let toastMsg = id ? (isTemplate ? "模板保存成功！" : "人物卡保存成功！") : ("已创建并保存新项目");

    // 若开启自动同步果园，尝试同步
    if (!isTemplate && settings.storage.autoSyncToForumOnSave) {
      const synced = triggerForumSync(saveData as CharacterData, computed, t);
      if (synced) {
        toastMsg += "，已自动同步到纯美苹果园";
      }
    }

    setToast({ message: toastMsg, type: 'success' });
    // 档案库列表由 onSnapshot 实时订阅自动推送本次保存，无需手动刷新
  };

  const handleSaveInternal = async (saveData: CharacterData | { content: string, name?: string }, id?: string | null, folderId?: string | null, isTemplate: boolean = false) => {
    if (!user) {
      setToast({ message: "请先登录后再保存", type: 'error' });
      return;
    }
    setIsSaving(true);
    try {
      const newId = await persist(saveData, id, folderId, isTemplate);
      if (newId) {
        afterSave(newId, saveData, id, isTemplate, folderId);
        return newId;
      }
    } catch (e: any) {
      setToast({ message: "保存失败: " + e.message, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * 保存当前活动标签的文档（Ctrl+S 与各确认弹窗的统一入口）。
   * 按活动标签类型分流：
   *  - 模板标签 → 写入 templates 集合；未落库的新模板落入「模板」文件夹（与右键菜单"保存"一致）。
   *    此前模板标签一律走人物卡保存，是"保存模板却生成人物卡/模板红点不消失"的根源。
   *  - 人物卡标签 → 更新已有文档时沿用文档自身目录（activeDocRef.folderId），
   *    仅新建文档跟随档案库当前浏览目录；否则浏览位置变动后一保存就会把卡片移走。
   *  - 新建标签页/预览标签 → 无可保存文档，直接忽略。
   */
  const handleSave = async () => {
    if (activeTabKind !== 'character' && activeTabKind !== 'template') return undefined;
    if (activeTabKind === 'template') {
      if (currentTemplateId) {
        // 更新已有模板：folderId 传 undefined，saveTemplate 沿用模板原目录
        const saveData: { content: string, name?: string } = { content: bbcodeTemplate };
        const docName = activeDocRef.current?.name;
        if (typeof docName === 'string' && docName) saveData.name = docName;
        return handleSaveInternal(saveData, currentTemplateId, undefined, true);
      }
      // 未落库的新模板：存入「模板」文件夹
      if (!user) {
        setToast({ message: "请先登录后再保存", type: 'error' });
        return undefined;
      }
      const templateFolderId = await ensureLocalFolderService('模板', null, user.uid);
      return handleSaveInternal(
        { content: bbcodeTemplate, name: t('editor.bbcode.default_name') },
        null,
        templateFolderId,
        true
      );
    }
    // 人物卡：更新已有文档沿用其自身目录；新建文档（id 为空）跟随当前浏览目录
    const docFolderId = activeDocRef.current?.folderId;
    const folderId = currentCharacterId && docFolderId !== undefined ? docFolderId : currentFolderId;
    return handleSaveInternal(data, currentCharacterId, folderId);
  };

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
          await selectCharacter(newId);
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
    await performCreateNew();
  };

  const checkIsReadOnly = (charDoc: any, currentUser?: any) => {
    if (!charDoc) return true;
    if (charDoc.targetId || charDoc.data?.targetId || charDoc.name?.endsWith('.lnk')) return true;
    const activeUser = auth.currentUser || currentUser;
    if (!activeUser) return true;
    const ownerId = charDoc.ownerId || charDoc.data?.ownerId;
    if (ownerId && activeUser.uid !== ownerId) return true;
    return false;
  };

  const selectCharacter = async (idOrChar: string | any, shouldSwitchView: boolean = true) => {
    const renderCharacterDocument = (char: CharacterDocument, shouldSwitchView: boolean = true) => {
      activeDocRef.current = char;
      if (char.isTemplate) {
        const serverContent = char.data?.content || '';
        let content = serverContent;
        // 模板本地草稿恢复：上次会话有未保存修改时自动载入（lastSaved 仍用服务器内容，
        // 保证脏标记正确反映"有未保存修改"）
        try {
          const tplDraftRaw = localStorage.getItem(`pf1_tpl_draft_${char.id}`);
          if (tplDraftRaw) {
            const tplDraft = JSON.parse(tplDraftRaw);
            if (typeof tplDraft?.content === 'string' && tplDraft.content !== serverContent) {
              content = tplDraft.content;
              setToast({ message: "已自动恢复该模板未保存的修改", type: 'info' });
            }
          }
        } catch (err) {
          console.error("Failed to parse template draft", err);
        }
        setBbcodeTemplate(content);
        setLastSavedTemplate(serverContent);
        if (shouldSwitchView) setView('editor');
        setCurrentTemplateId(char.id);
        // live 状态同时只承载一个文档：清掉对侧 id，避免保存/草稿误写到残留的旧文档
        setCurrentCharacterId(null);
      } else {
        // 数据结构迁移已由开发者工具一次性完成并回写，加载期不再做迁移/默认值合并
        setData(char.data);
        setLastSavedData(JSON.parse(JSON.stringify(char.data)));
        setCurrentCharacterId(char.id);
        // live 状态同时只承载一个文档：清掉对侧 id，避免保存/草稿误写到残留的旧文档
        setCurrentTemplateId(null);
        localStorage.setItem(KEY_LAST_CHAR, char.id);

        {
          const draftKey = `pf1_char_draft_${char.id}`;
          const localDraft = localStorage.getItem(draftKey);
          if (localDraft) {
            try {
              const parsed = JSON.parse(localDraft);
              const draftData = parsed.data || parsed;
              const baseUpdatedAt = typeof parsed.baseUpdatedAt === 'number' ? parsed.baseUpdatedAt : 0;
              const cloudUpdatedAt = char.updatedAt?.toMillis?.() || (typeof char.updatedAt === 'number' ? char.updatedAt : 0);

              // 冲突检测：若云端更新时间晚于草稿基准时间，弹窗让用户选择，防止旧数据静默覆盖
              if (baseUpdatedAt > 0 && cloudUpdatedAt > baseUpdatedAt) {
                setConfirmModal({
                  title: "检测到版本冲突：该角色在云端已有更新版本。是否仍要载入此设备上的本地未保存草稿？",
                  onConfirm: () => {
                    setData(draftData);
                    setToast({ message: "已载入本地未保存草稿", type: 'info' });
                  },
                  onCancel: () => {
                    localStorage.removeItem(draftKey);
                    setToast({ message: "已丢弃旧草稿，加载云端最新版本", type: 'info' });
                  }
                });
              } else {
                setData(draftData);
                setToast({ message: "已自动载入本地保留的未保存修改", type: 'info' });
              }
            } catch (err) {
              console.error("Failed to parse local draft", err);
            }
          }
        }

        if (shouldSwitchView) setView('editor');
      }
      if (char.folderId) setCurrentFolderId(char.folderId);
      addToRecent(char);
      const url = new URL(window.location.href);
      url.searchParams.set('id', char.id);
      window.history.replaceState({}, '', url.toString());
      // 选项卡系统：文档渲染进 live 状态即视为"打开"，登记/激活对应选项卡
      const openTitle = char.isTemplate
        ? (char.name || '').replace(/\.bbc$/i, '')
        : (char.data?.basic?.name || char.name || '');
      onOpenDocument?.(char.id, char.isTemplate ? 'template' : 'character', openTitle);
    };

    const performSelect = async () => {
      try {
        if (idOrChar?.id) {
          let char = idOrChar as any;

          if (char.targetId) {
            const targetChar = await getCharacterById(char.targetId) as CharacterDocument | null;
            if (targetChar) {
              char = { ...targetChar, id: char.id, folderId: char.folderId };
            }
          }

          const activeUser = auth.currentUser || user;
          if (activeUser && char.ownerId && char.ownerId !== activeUser.uid && !char.targetId) {
            const sharedFolderId = await ensureLocalFolderService('来自分享', null, activeUser.uid);
            const linkId = await saveLink(char, sharedFolderId);
            if (linkId) {
              setCurrentFolderId(sharedFolderId);
              await selectCharacter(linkId, shouldSwitchView);
              return;
            }
          }

          renderCharacterDocument(char, shouldSwitchView);
          setIsReadOnly(checkIsReadOnly(char, activeUser));
          setIsSyncing(false);
          return;
        }

        const id = idOrChar as string;
        if (!id) return;

        // 1. 内存全量快照秒开：实时订阅条目含完整 data（零网络），按所有权即时解锁编辑。
        //    快照条目均为本人文档（订阅按 ownerId 过滤），分享链接/瘦身条目自然走不到此分支。
        const memDoc = getFullDoc(id) as CharacterDocument | null;
        if (memDoc && memDoc.data) {
          renderCharacterDocument(memDoc, shouldSwitchView);
          setIsReadOnly(checkIsReadOnly(memDoc, auth.currentUser || user));
          setSyncStatus('synced');
          setTimeout(() => setSyncStatus('idle'), 2000);
          setIsSyncing(false);
          return;
        }

        setIsSyncing(true);
        setSyncStatus('syncing');
        setIsReadOnly(true); // 无任何本地数据可呈现时，在后台同步对齐期间严格保持只读保护

        // 2. SDK 持久缓存秒开（跨会话遗留；快照订阅会持续预热该缓存）
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
          // 立即呈现本地缓存内容：只读状态按文档所有权本地判定，不再锁到云端确认
          renderCharacterDocument(cachedDoc, shouldSwitchView);
          setIsReadOnly(checkIsReadOnly(cachedDoc, auth.currentUser || user));
          setIsSyncing(false);
        }

        // 3. 后台与云端对齐最新版本（内存命中路径无需此步：实时订阅即服务器权威状态）
        try {
          let serverDoc = await getCharacterFromServer(id) as CharacterDocument | null;
          if (serverDoc && serverDoc.data) {
            if (serverDoc.targetId) {
              const targetDoc = await getCharacterFromServer(serverDoc.targetId) as CharacterDocument | null;
              if (targetDoc && targetDoc.data) {
                serverDoc = { ...targetDoc, id: serverDoc.id, folderId: serverDoc.folderId };
              }
            }

            const activeUser = auth.currentUser || user;
            if (activeUser && serverDoc.ownerId && serverDoc.ownerId !== activeUser.uid && !serverDoc.targetId) {
              const sharedFolderId = await ensureLocalFolderService('来自分享', null, activeUser.uid);
              const linkId = await saveLink(serverDoc, sharedFolderId);
              if (linkId) {
                setCurrentFolderId(sharedFolderId);
                await selectCharacter(linkId, shouldSwitchView);
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

            // 缓存呈现后用户已开始编辑：保持本地内容，避免云端对账覆盖未保存输入
            if (hasCached && isDirtyRef.current) {
              shouldApply = false;
            }

            if (shouldApply) {
              renderCharacterDocument(serverDoc, shouldSwitchView);
            }

            setSyncStatus('synced');
            setTimeout(() => setSyncStatus('idle'), 2000);
            setIsReadOnly(checkIsReadOnly(serverDoc, activeUser));
          } else if (hasCached) {
            setSyncStatus('offline');
            setTimeout(() => setSyncStatus('idle'), 3000);
            setIsReadOnly(checkIsReadOnly(cachedDoc, auth.currentUser || user));
          } else {
            // 集合路由：characters 未命中 → 该 id 可能是模板（templates 集合）
            const tpl = await getTemplateById(id).catch(() => null);
            if (tpl) {
              renderCharacterDocument(templateToCharacterDoc(tpl), shouldSwitchView);
              setIsReadOnly(false);
              setSyncStatus('synced');
              setTimeout(() => setSyncStatus('idle'), 2000);
              setIsSyncing(false);
              return;
            }
            throw new Error("Document not found");
          }
        } catch (e: any) {
          if (hasCached) {
            setSyncStatus('offline');
            setTimeout(() => setSyncStatus('idle'), 3000);
            setIsReadOnly(checkIsReadOnly(cachedDoc, auth.currentUser || user));
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

    await performSelect();
  };

  const loadSharedCharacter = async (id: string) => {
    await selectCharacter(id, true);
  };

  // Initial Load: 有 ?id= 时打开对应文档；否则直接呈现"新建标签页"（不恢复上次的标签）
  // bootGuardRef：StrictMode 开发模式会双挂载（effect 跑两次），无 id 时会创建出两个 chooser 标签——此守卫保证只执行一次
  const bootGuardRef = useRef(false);
  useEffect(() => {
    if (bootGuardRef.current) return;
    bootGuardRef.current = true;
    const loadInitial = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlId = urlParams.get('id');
        if (urlId) {
          await selectCharacter(urlId, true);
        } else {
          // 无 id 访问：默认进入新建标签页（最近打开的文件在该页面的列表里）
          onBootWithoutId?.();
        }
      } catch (error) {
        console.error("[useCharacterPersistence] Initial load failed:", error);
      } finally {
        setIsSyncing(false);
      }
    };
    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 当 Firebase Auth 异步鉴权完成后，核验当前已打开卡片的所有权并动态解锁只读
  useEffect(() => {
    const activeUser = auth.currentUser || user;
    if (!activeUser) return;

    const currentDoc = activeDocRef.current;
    if (currentDoc) {
      setIsReadOnly(checkIsReadOnly(currentDoc, activeUser));
      const ownerId = currentDoc.ownerId || currentDoc.data?.ownerId;
      if (ownerId && ownerId !== activeUser.uid && !currentDoc.targetId && !currentDoc.name?.endsWith('.lnk')) {
        ensureLocalFolderService('来自分享', null, activeUser.uid).then(async (sharedFolderId) => {
          const linkId = await saveLink(currentDoc, sharedFolderId);
          if (linkId) {
            setCurrentFolderId(sharedFolderId);
          }
        }).catch(console.error);
      }
    } else if (currentCharacterId || currentTemplateId) {
      const targetId = (currentCharacterId || currentTemplateId)!;
      getCharacterFromCache(targetId).then(async (doc) => {
        if (!doc) {
          doc = await getCharacterById(targetId);
        }
        if (!doc && targetId === currentTemplateId) {
          // 集合路由：当前文档是模板 → 直接查 templates 集合
          const tpl = await getTemplateById(targetId).catch(() => null);
          if (tpl) doc = templateToCharacterDoc(tpl);
        }
        if (doc) {
          activeDocRef.current = doc;
          setIsReadOnly(checkIsReadOnly(doc, activeUser));
        }
      }).catch(console.error);
    }
  }, [user, currentCharacterId, currentTemplateId]);

  return {
    isSaving,
    syncStatus,
    handleSave,
    handleSaveAs,
    handleSaveInternal,
    handleNew,
    selectCharacter,
    loadSharedCharacter,
    activeDocRef
  };
};
