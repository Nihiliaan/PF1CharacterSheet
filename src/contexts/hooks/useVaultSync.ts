/**
 * 档案库目录结构本地优先同步（local-first）核心 hook。
 *
 * 数据模型：显示状态 = 服务器列表 ⊕ pendingOps 重放（useMemo 派生）。
 *  - 登录后先从 localStorage 缓存水合（秒开），再后台静默拉取服务器列表替换；
 *  - 所有目录结构操作（新建/移动/重命名/删除/复制/导入）先做本地同名查重，
 *    立即更新派生状态并入队（PendingOp），随后由 flush 队列按 FIFO 顺序同步到 Firestore；
 *  - flush 成功：移除 op 并把效果直接套到服务器列表（避免刷新前的闪烁），随后后台刷新对账；
 *  - flush 失败：op 保留在本地缓存中持续重试（登录/联网/60s 定时/手动刷新），
 *    仅首次失败 toast 具体故障原因，之后静默重试（持续状态由 pendingCount 呈现）；
 *  - 编辑器内容保存不经过本 hook（用户明确排除）。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { doc, collection } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../AuthContext';
import { useUI } from '../UIContext';
import {
  loadVaultCache, saveVaultCache, describeFirestoreError,
  type PendingOp,
} from '../../services/vaultCacheService';
import {
  getMyCharacters,
  getFolders,
  createFolderWithId,
  createCharacterDoc,
  moveCharacter as moveCharacterService,
  moveFolder as moveFolderService,
  renameItem as renameItemService,
  deleteCharacter as deleteCharacterService,
  deleteFolder as deleteFolderService,
  copyCharacter as copyCharacterService,
} from '../../services/characterService';
import {
  listTemplates,
  templateToCharacterDoc,
  createTemplateWithId,
  deleteTemplate as deleteTemplateService,
  renameTemplate,
  moveTemplate,
  copyTemplate as copyTemplateService,
  TemplateDocument,
} from '../../services/templateService';

const RETRY_INTERVAL_MS = 60_000;

/** 本地生成文档 id（Firestore autoid，纯本地计算无需网络） */
function generateId(): string {
  return doc(collection(db, 'characters')).id;
}

/** 去掉已知扩展名 */
function stripExt(name: string): string {
  return name.replace(/\.(pf1|bbc|lnk)$/i, '');
}

/** 按类型补扩展名（与 renameItemService/saveCharacter 的规则一致） */
function withExt(name: string, opts: { isTemplate?: boolean; isLink?: boolean }): string {
  const ext = opts.isLink ? '.lnk' : (opts.isTemplate ? '.bbc' : '.pf1');
  return name.toLowerCase().endsWith(ext) ? name : name + ext;
}

/** 切分基础名与扩展名，供复制时追加 " (n)" 计数 */
function splitNameExt(name: string): { base: string; ext: string } {
  const m = name.match(/\.(pf1|bbc|lnk)$/i);
  return m ? { base: name.slice(0, -m[0].length), ext: m[0] } : { base: name, ext: '' };
}

/** 生成 op 的用户可读描述（失败提示定位具体操作用） */
function describeOp(op: PendingOp): string {
  const n = op.name ? `「${op.name}」` : '';
  switch (op.kind) {
    case 'create-folder': return `新建文件夹${n}`;
    case 'create-document': return op.isTemplate ? `新建模板${n}` : `新建文档${n}`;
    case 'move-character': return `移动文档${n}`;
    case 'move-folder': return `移动文件夹${n}`;
    case 'rename-character': return `重命名文档${n}`;
    case 'rename-folder': return `重命名文件夹${n}`;
    case 'delete-character': return `删除文档${n}`;
    case 'delete-folder': return `删除文件夹${n}`;
    case 'copy-character': return `复制${n}`;
    default: return String(op.kind);
  }
}

export function useVaultSync() {
  const { user } = useAuth();
  const { setToast } = useUI();
  const uid = user?.uid ?? null;
  const uidRef = useRef(uid);
  uidRef.current = uid;

  // ===== 服务器投影状态（缓存水合 / 后台刷新写入）=====
  const [serverFolders, setServerFolders] = useState<any[]>([]);
  const [serverChars, setServerChars] = useState<any[]>([]);
  const [serverTemplates, setServerTemplates] = useState<TemplateDocument[]>([]);
  // 待同步操作队列（持久化到 localStorage，跨重启保留）
  const [pendingOps, setPendingOps] = useState<PendingOp[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);

  const opsRef = useRef(pendingOps);
  opsRef.current = pendingOps;
  // 当前 uid 是否有本地缓存可显示（决定刷新失败时是否 toast）
  const hasCacheRef = useRef(false);

  // ===== 派生显示状态：服务器列表 ⊕ pendingOps 重放 =====

  /** 从 op 构造本地文档投影条目（create-document / copy-character 共用） */
  const buildLocalCharEntry = useCallback((op: PendingOp, allChars: any[]): any => {
    const id = op.kind === 'copy-character' ? op.newId! : op.id;
    if (op.isTemplate) {
      const source = allChars.find(c => c.id === op.id);
      return templateToCharacterDoc({
        id,
        name: op.name!,
        content: op.content?.content ?? source?.data?.content ?? '',
        folderId: op.folderId ?? null,
        ownerId: uidRef.current || '',
        isTemplate: true,
      });
    }
    const source = allChars.find(c => c.id === op.id);
    const displayName = op.name || source?.name || '未命名';
    const avatar = op.avatarUrl || source?.data?.basic?.avatars?.url?.[0] || '';
    return {
      id,
      name: displayName,
      folderId: op.folderId ?? null,
      ownerId: uidRef.current || '',
      isTemplate: false,
      isLink: false,
      targetId: '',
      updatedAt: null,
      createdAt: null,
      data: {
        id,
        ownerId: uidRef.current || '',
        folderId: op.folderId ?? null,
        targetId: '',
        isLink: false,
        isTemplate: false,
        basic: {
          name: source?.data?.basic?.name || stripExt(displayName),
          race: source?.data?.basic?.race || '',
          classes: source?.data?.basic?.classes || '',
          avatars: { url: [avatar], note: [''] },
        },
      },
    };
  }, []);

  const folders = useMemo(() => {
    let out = serverFolders;
    for (const op of pendingOps) {
      switch (op.kind) {
        case 'create-folder':
          if (!out.some(f => f.id === op.id)) {
            out = [...out, {
              id: op.id, name: op.name!, ownerId: uidRef.current || '',
              parentId: op.parentId ?? null, createdAt: null, updatedAt: null,
            }];
          }
          break;
        case 'move-folder':
          out = out.map(f => f.id === op.id ? { ...f, parentId: op.parentId ?? null } : f);
          break;
        case 'rename-folder':
          out = out.map(f => f.id === op.id ? { ...f, name: op.name! } : f);
          break;
        case 'delete-folder':
          out = out.filter(f => f.id !== op.id);
          break;
        default:
          break;
      }
    }
    return out;
  }, [serverFolders, pendingOps]);

  const myCharacters = useMemo(() => {
    // 模板先归一化为人物卡兼容形状再与人物合并（与原 VaultContext 逻辑一致）
    let out: any[] = [...serverChars, ...serverTemplates.map(templateToCharacterDoc)];
    for (const op of pendingOps) {
      switch (op.kind) {
        case 'create-document':
        case 'copy-character':
          out = out.filter(c => c.id !== (op.kind === 'copy-character' ? op.newId : op.id));
          out = [...out, buildLocalCharEntry(op, out)];
          break;
        case 'move-character':
          out = out.map(c => c.id === op.id
            ? { ...c, folderId: op.folderId ?? null, data: c.data ? { ...c.data, folderId: op.folderId ?? null } : c.data }
            : c);
          break;
        case 'rename-character':
          // 文件名与角色名解耦：重命名文件只改文档名，不回写 data.basic.name
          out = out.map(c => c.id === op.id ? { ...c, name: op.name! } : c);
          break;
        case 'delete-character':
          out = out.filter(c => c.id !== op.id);
          break;
        default:
          break;
      }
    }
    return out;
  }, [serverChars, serverTemplates, pendingOps, buildLocalCharEntry]);

  // ===== 本地同名查重（与服务器 checkUniqueName 语义一致：文件夹与文档同目录同名均冲突）=====
  const checkUniqueNameLocal = useCallback((name: string, folderId: string | null, excludeId?: string) => {
    const folderConflict = folders.some(f => f.id !== excludeId && (f.parentId ?? null) === folderId && f.name === name);
    const charConflict = myCharacters.some(c => c.id !== excludeId && (c.folderId ?? null) === folderId && c.name === name);
    return !folderConflict && !charConflict;
  }, [folders, myCharacters]);

  /** 复制时本地生成不重复副本名（与服务器 copy 流程的 " (n)" 计数一致） */
  const uniquifyNameLocal = useCallback((name: string, folderId: string | null) => {
    const { base, ext } = splitNameExt(name);
    let candidate = name;
    let counter = 1;
    while (!checkUniqueNameLocal(candidate, folderId)) {
      candidate = `${base} (${counter++})${ext}`;
    }
    return candidate;
  }, [checkUniqueNameLocal]);

  // ===== 缓存持久化（防抖）=====
  useEffect(() => {
    if (!uid) return;
    const t = setTimeout(() => {
      saveVaultCache({
        uid,
        folders: serverFolders,
        characters: serverChars,
        templates: serverTemplates,
        ops: pendingOps,
      });
    }, 300);
    return () => clearTimeout(t);
  }, [uid, serverFolders, serverChars, serverTemplates, pendingOps]);

  // ===== flush：按 FIFO 顺序把 pendingOps 同步到 Firestore =====

  /** 单条 op 的服务器调用映射（人物卡 / 模板按 op.isTemplate 类型标记路由到各自集合） */
  const execOp = useCallback((op: PendingOp): Promise<any> => {
    switch (op.kind) {
      case 'create-folder':
        return createFolderWithId(op.name!, op.parentId ?? null, op.id);
      case 'create-document':
        return op.isTemplate
          ? createTemplateWithId({ content: op.content?.content ?? '', name: op.name }, op.id, op.folderId ?? null)
          : createCharacterDoc(op.content, op.id, op.folderId ?? null, op.name);
      case 'move-character':
        return op.isTemplate
          ? moveTemplate(op.id, op.folderId ?? null)
          : moveCharacterService(op.id, op.folderId ?? null);
      case 'move-folder':
        return moveFolderService(op.id, op.parentId ?? null);
      case 'rename-character':
        return op.isTemplate
          ? renameTemplate(op.id, op.name!)
          : renameItemService(op.id, 'character', op.name!);
      case 'rename-folder':
        return renameItemService(op.id, 'folder', op.name!);
      case 'delete-character':
        return op.isTemplate
          ? deleteTemplateService(op.id)
          : deleteCharacterService(op.id);
      case 'delete-folder':
        return deleteFolderService(op.id);
      case 'copy-character':
        return op.isTemplate
          ? copyTemplateService(op.id, op.newId!)
          : copyCharacterService(op.id, op.newId!, op.name);
      default:
        return Promise.resolve();
    }
  }, []);

  /** op 成功后立即把效果套到服务器列表（对账刷新前的防闪烁补丁） */
  const applyOpToServer = useCallback((op: PendingOp) => {
    const id = op.kind === 'copy-character' ? op.newId! : op.id;
    switch (op.kind) {
      case 'create-folder':
        setServerFolders(prev => prev.some(f => f.id === op.id) ? prev : [...prev, {
          id: op.id, name: op.name!, ownerId: uidRef.current || '',
          parentId: op.parentId ?? null, createdAt: null, updatedAt: null,
        }]);
        break;
      case 'create-document':
        if (op.isTemplate) {
          setServerTemplates(prev => prev.some(t => t.id === op.id) ? prev : [...prev, {
            id: op.id, name: op.name!, content: op.content?.content ?? '',
            folderId: op.folderId ?? null, ownerId: uidRef.current || '', isTemplate: true,
          } as TemplateDocument]);
        } else {
          setServerChars(prev => prev.some(c => c.id === op.id) ? prev : [...prev, buildLocalCharEntry(op, prev)]);
        }
        break;
      case 'move-character':
        if (op.isTemplate) {
          setServerTemplates(prev => prev.map(t => t.id === op.id ? { ...t, folderId: op.folderId ?? null } : t));
        } else {
          setServerChars(prev => prev.map(c => c.id === op.id ? { ...c, folderId: op.folderId ?? null } : c));
        }
        break;
      case 'move-folder':
        setServerFolders(prev => prev.map(f => f.id === op.id ? { ...f, parentId: op.parentId ?? null } : f));
        break;
      case 'rename-character':
        if (op.isTemplate) {
          setServerTemplates(prev => prev.map(t => t.id === op.id ? { ...t, name: op.name! } : t));
        } else {
          setServerChars(prev => prev.map(c => c.id === op.id ? { ...c, name: op.name! } : c));
        }
        break;
      case 'rename-folder':
        setServerFolders(prev => prev.map(f => f.id === op.id ? { ...f, name: op.name! } : f));
        break;
      case 'delete-character':
        if (op.isTemplate) {
          setServerTemplates(prev => prev.filter(t => t.id !== op.id));
        } else {
          setServerChars(prev => prev.filter(c => c.id !== op.id));
        }
        break;
      case 'delete-folder':
        setServerFolders(prev => prev.filter(f => f.id !== op.id));
        break;
      case 'copy-character': {
        if (op.isTemplate) {
          const src = serverTemplates.find(t => t.id === op.id);
          setServerTemplates(prev => prev.some(t => t.id === id) ? prev : [...prev, {
            id, name: op.name!, content: src?.content ?? '',
            folderId: op.folderId ?? null, ownerId: uidRef.current || '', isTemplate: true,
          } as TemplateDocument]);
        } else {
          setServerChars(prev => {
            if (prev.some(c => c.id === id)) return prev;
            const src = prev.find(c => c.id === op.id);
            const entry = src
              ? { ...src, id, name: op.name!, folderId: op.folderId ?? null,
                  data: src.data ? { ...src.data, id, folderId: op.folderId ?? null } : src.data }
              : buildLocalCharEntry(op, prev);
            return [...prev, entry];
          });
        }
        break;
      }
      default:
        break;
    }
  }, [serverTemplates, buildLocalCharEntry]);

/** 判断错误是否意味着目标文档在服务器上不存在（本地 op 已无意义，丢弃） */
const isNotFoundLike = (e: any) => {
  const msg = String(e?.message || e || '');
  return msg.includes('No document to update') || msg.includes('not-found');
};

/** 单 op 超时：Firestore 写请求可能因网络/浏览器扩展拦截而永久悬死（Promise 永不落定），
 *  不加超时会让 flush 卡在队首、整个队列冻结（flushingRef 常驻 true）。 */
const OP_TIMEOUT_MS = 30_000;
function withOpTimeout<T>(p: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('同步请求超时（网络不可达或被浏览器扩展拦截）')), OP_TIMEOUT_MS);
    p.then(
      v => { clearTimeout(timer); resolve(v); },
      e => { clearTimeout(timer); reject(e); },
    );
  });
}

  /**
   * 核实删除类 op 的目标在服务器上是否真实存在。
   * 返回 null = 无法确认（读取失败）；false = 各集合都不存在。
   * 注意必须用 LIST 查询核实而非 getDoc：rules 的 get 条件引用 existing().ownerId，
   * 对不存在的文档 get 同样会被拒（实测 403），而 list 对不存在的文档只是不返回结果。
   * 背景：rules 的 delete 条件引用 existing().ownerId，对不存在的文档必然拒绝，
   * 而对"从未同步成功的本地条目"的删除在语义上已是空操作，应丢弃而非无限重试。
   */
  const opTargetExists = async (op: PendingOp): Promise<boolean | null> => {
    try {
      const currentUid = uidRef.current;
      if (!currentUid) return null;
      if (op.kind === 'delete-folder') {
        const list = await getFolders(currentUid);
        return list.some(f => f.id === op.id);
      }
      if (op.kind === 'delete-character') {
        // 按 op 类型路由到对应集合核实（list 查询，见上注释）
        const list = op.isTemplate
          ? await listTemplates(currentUid)
          : await getMyCharacters(currentUid);
        return list.some(c => c.id === op.id);
      }
      return null;
    } catch {
      return null;
    }
  };

  const flushingRef = useRef(false);
  // refreshCharacterList 定义在 flush 之后（且 refresh 会先调 flush），经 ref 解耦
  const refreshRef = useRef<(() => Promise<void>) | null>(null);
  const flushPendingOps = useCallback(async (opts?: { notify?: boolean }) => {
    if (flushingRef.current || !uidRef.current) return;
    flushingRef.current = true;
    setIsSyncing(true);
    let syncedAny = false;
    try {
      let ops = opsRef.current;
      while (ops.length) {
        const op = ops[0];
        try {
          await withOpTimeout(execOp(op));
          // 成功：立即套用到服务器列表 + 移除队首 op（后台刷新随后对账）。
          // 队列可能在 await 期间被追加新 op（enqueueOp）：总是基于 opsRef 现值摘除队首
          applyOpToServer(op);
          syncedAny = true;
          ops = opsRef.current.slice(1);
          opsRef.current = ops;
          setPendingOps(ops);
          setLastSyncError(null);
        } catch (e) {
          const reason = describeFirestoreError(e);
          // 服务器上找不到目标文档（已在别处删除）：该 op 已无意义，丢弃并继续处理后续
          if (isNotFoundLike(e)) {
            console.warn('[vaultSync] 目标不存在，丢弃 op:', op.kind, op.id);
            ops = opsRef.current.slice(1);
            opsRef.current = ops;
            setPendingOps(ops);
            continue;
          }
          // 删除类 op 被规则拒绝：先核实目标是否真的不存在——
          // "从未同步成功的本地条目"的删除在服务器上是空操作（rules 对不存在文档的 delete 必然拒绝），
          // 丢弃即可；文档确实存在却被拒才是真正的权限问题（保留 op 等修复）
          if (op.kind === 'delete-folder' || op.kind === 'delete-character') {
            const exists = await opTargetExists(op);
            if (exists === false) {
              console.warn('[vaultSync] 删除目标不存在于服务器，视为已同步并丢弃 op:', op.kind, op.id);
              ops = opsRef.current.slice(1);
              opsRef.current = ops;
              setPendingOps(ops);
              continue;
            }
          }
          const firstFailure = !op.attempts;
          const updated = opsRef.current.map(p => p.opId === op.opId
            ? { ...p, attempts: p.attempts + 1, lastError: reason } : p);
          ops = updated;
          opsRef.current = updated;
          setPendingOps(updated);
          setLastSyncError(reason);
          // 仅首次失败提示具体故障（带 op 描述便于定位）；之后静默重试，手动"立即重试"时再次提示
          if (firstFailure || opts?.notify) {
            setToast({ message: `同步失败：${describeOp(op)} — ${reason}。更改已保存在本地，将自动重试。`, type: 'error' });
          } else {
            console.warn(`[vaultSync] 重试仍失败(${op.kind} ${op.id}):`, reason);
          }
          break; // 保序：剩余操作等下一轮
        }
      }
    } finally {
      flushingRef.current = false;
      setIsSyncing(false);
    }
    // 队列全部同步成功：后台拉取服务器列表对账（修正 updatedAt 等服务器字段）
    if (syncedAny && opsRef.current.length === 0) {
      void refreshRef.current?.();
    }
  }, [execOp, applyOpToServer, setToast]);

  // ===== 后台静默刷新（拉取服务器列表替换投影；失败时保留旧状态）=====
  const refreshCharacterList = useCallback(async () => {
    const currentUid = uidRef.current;
    if (!currentUid) {
      setServerFolders([]);
      setServerChars([]);
      setServerTemplates([]);
      return;
    }
    // 先冲积压队列：保证拉取到的列表已包含本地更改
    await flushPendingOps();
    setIsRefreshing(true);
    try {
      // 三个数据源独立容错：模板列表失败降级为空列表，不拖垮角色/文件夹列表
      const [listR, folderR, templateR] = await Promise.allSettled([
        getMyCharacters(currentUid),
        getFolders(currentUid),
        listTemplates(currentUid),
      ]);

      let hardFail = false;
      if (listR.status === 'fulfilled') setServerChars(listR.value || []);
      else { console.error('[vaultSync] 角色列表加载失败:', listR.reason); hardFail = true; }
      if (folderR.status === 'fulfilled') setServerFolders(folderR.value || []);
      else { console.error('[vaultSync] 文件夹列表加载失败:', folderR.reason); hardFail = true; }
      if (templateR.status === 'fulfilled') setServerTemplates(templateR.value || []);
      else console.warn('[vaultSync] 模板列表加载失败（若为 permission-denied，请部署最新的 firestore.rules）:', templateR.reason);

      if (hardFail) {
        // 有本地缓存可显示：静默保留旧状态；仅首次（无任何数据显示）才提示
        if (!hasCacheRef.current) {
          setToast({ message: '刷新数据失败，请检查连接', type: 'error' });
        }
      } else {
        hasCacheRef.current = true;
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [flushPendingOps, setToast]);
  refreshRef.current = refreshCharacterList;

  // ===== op 入队（本地校验 → 立即生效于派生状态 → 入队 → 触发 flush）=====
  const enqueueOp = useCallback((op: PendingOp) => {
    const next = [...opsRef.current, op];
    opsRef.current = next;
    setPendingOps(next);
    // 后台静默同步：不阻塞操作本身
    void flushPendingOps();
  }, [flushPendingOps]);

  // ===== 登录态变化：缓存水合（秒开）→ 后台刷新 =====
  useEffect(() => {
    if (!uid) {
      hasCacheRef.current = false;
      setServerFolders([]);
      setServerChars([]);
      setServerTemplates([]);
      setPendingOps([]);
      return;
    }
    const cache = loadVaultCache(uid);
    if (cache) {
      hasCacheRef.current = true;
      setServerFolders(cache.folders);
      setServerChars(cache.characters);
      setServerTemplates(cache.templates);
      setPendingOps(cache.ops);
    } else {
      hasCacheRef.current = false;
      setServerFolders([]);
      setServerChars([]);
      setServerTemplates([]);
      setPendingOps([]);
    }
    void refreshCharacterList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // 联网恢复时立即重试积压操作
  useEffect(() => {
    const onOnline = () => { void flushPendingOps(); };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [flushPendingOps]);

  // 有积压操作时定时静默重试
  useEffect(() => {
    if (!uid || pendingOps.length === 0) return;
    const timer = setInterval(() => {
      if (navigator.onLine) void flushPendingOps();
    }, RETRY_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [uid, pendingOps.length, flushPendingOps]);

  // ===== 目录结构操作入口（本地即时生效 + 队列同步）=====

  const createFolder = useCallback(async (name: string, parentId: string | null) => {
    if (!uidRef.current) return;
    const finalName = name.trim();
    if (!finalName) return;
    if (!checkUniqueNameLocal(finalName, parentId ?? null)) {
      throw new Error(`当前文件夹已存在名为 "${finalName}" 的文件夹`);
    }
    enqueueOp({
      opId: generateId(), kind: 'create-folder', id: generateId(),
      name: finalName, parentId: parentId ?? null,
      createdAt: Date.now(), attempts: 0,
    });
  }, [checkUniqueNameLocal, enqueueOp]);

  /** 新建文档（人物卡 / 模板导入共用）：内容随 op 携带，flush 时全量写入 */
  const createDocumentFromData = useCallback(async (
    finalData: any,
    folderId: string | null,
    isTemplate: boolean,
    fallbackName: string
  ) => {
    if (!uidRef.current) return;
    const rawName = (isTemplate ? finalData?.name : finalData?.basic?.name) || fallbackName;
    const displayName = withExt(String(rawName).trim(), { isTemplate });
    // 与服务器保存流程一致：同目录自动追加 " (n)" 计数
    const uniqueName = uniquifyNameLocal(displayName, folderId ?? null);
    const id = generateId();
    enqueueOp({
      opId: generateId(), kind: 'create-document', id,
      name: uniqueName, folderId: folderId ?? null, isTemplate,
      avatarUrl: !isTemplate ? finalData?.basic?.avatars?.url?.[0] || '' : undefined,
      content: isTemplate ? { content: finalData?.content ?? '' } : finalData,
      createdAt: Date.now(), attempts: 0,
    });
  }, [uniquifyNameLocal, enqueueOp]);

  const moveCharacter = useCallback(async (id: string, folderId: string | null) => {
    const target = folderId ?? null;
    const char = myCharacters.find(c => c.id === id);
    if (!char) return; // 目标不存在（已删除）：忽略
    if ((char.folderId ?? null) === target) return; // 同目录移动：无操作
    if (!checkUniqueNameLocal(char.name, target, id)) {
      throw new Error(`目标文件夹已存在名为 "${char.name}" 的文件`);
    }
    enqueueOp({
      opId: generateId(), kind: 'move-character', id, folderId: target,
      name: char.name,
      isTemplate: !!char.isTemplate,
      createdAt: Date.now(), attempts: 0,
    });
  }, [myCharacters, checkUniqueNameLocal, enqueueOp]);

  const moveFolder = useCallback(async (id: string, parentId: string | null) => {
    const target = parentId ?? null;
    const folder = folders.find(f => f.id === id);
    if (!folder) return;
    if ((folder.parentId ?? null) === target) return;
    // 防环：不能移入自身或其子树（否则 getItemPath 等树遍历会死循环）
    let cursor = target;
    let guard = 0;
    while (cursor && guard++ < 100) {
      if (cursor === id) throw new Error('不能将文件夹移动到其自身的子目录内');
      cursor = folders.find(f => f.id === cursor)?.parentId ?? null;
    }
    if (!checkUniqueNameLocal(folder.name, target, id)) {
      throw new Error(`目标位置已存在名为 "${folder.name}" 的文件夹`);
    }
    enqueueOp({
      opId: generateId(), kind: 'move-folder', id, parentId: target,
      name: folder.name,
      createdAt: Date.now(), attempts: 0,
    });
  }, [folders, checkUniqueNameLocal, enqueueOp]);

  const renameItem = useCallback(async (id: string, type: 'character' | 'folder', newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    let finalName = trimmed;
    let isTemplate = false;
    if (type === 'folder') {
      const folder = folders.find(f => f.id === id);
      if (!folder) return;
      finalName = trimmed; // 文件夹无扩展名
      if (folder.name === finalName) return;
      if (!checkUniqueNameLocal(finalName, (folder.parentId ?? null), id)) {
        throw new Error(`该目录下已存在名为 "${finalName}" 的项目`);
      }
    } else {
      const char = myCharacters.find(c => c.id === id);
      if (!char) return;
      isTemplate = !!char.isTemplate;
      finalName = withExt(trimmed, { isTemplate, isLink: !!char.isLink });
      if (char.name === finalName) return;
      if (!checkUniqueNameLocal(finalName, (char.folderId ?? null), id)) {
        throw new Error(`该目录下已存在名为 "${finalName}" 的项目`);
      }
    }
    enqueueOp({
      opId: generateId(), kind: type === 'folder' ? 'rename-folder' : 'rename-character',
      id, name: finalName, isTemplate: type === 'character' ? isTemplate : undefined,
      createdAt: Date.now(), attempts: 0,
    });
  }, [folders, myCharacters, checkUniqueNameLocal, enqueueOp]);

  /** 本地新建（或复制）尚未同步就被删除：直接抵消队列，不产生服务端写入 */
  const purgeOpsForId = useCallback((id: string) => {
    const hasPendingCreate = opsRef.current.some(op =>
      (op.kind === 'create-folder' || op.kind === 'create-document' || op.kind === 'copy-character')
      && (op.id === id || op.newId === id));
    if (!hasPendingCreate) return false;
    // 创建未落地时，针对同一 id 的后续移动/重命名 op 一并抵消（净效果为零）
    const next = opsRef.current.filter(op => op.id !== id && op.newId !== id);
    opsRef.current = next;
    setPendingOps(next);
    return true;
  }, []);

  const deleteCharacter = useCallback(async (id: string) => {
    if (purgeOpsForId(id)) return;
    const char = myCharacters.find(c => c.id === id);
    enqueueOp({
      opId: generateId(), kind: 'delete-character', id,
      name: char?.name,
      isTemplate: !!char?.isTemplate,
      createdAt: Date.now(), attempts: 0,
    });
  }, [myCharacters, enqueueOp, purgeOpsForId]);

  const deleteFolder = useCallback(async (id: string) => {
    if (purgeOpsForId(id)) return;
    const folder = folders.find(f => f.id === id);
    enqueueOp({
      opId: generateId(), kind: 'delete-folder', id,
      name: folder?.name,
      createdAt: Date.now(), attempts: 0,
    });
  }, [folders, enqueueOp, purgeOpsForId]);

  const copyCharacter = useCallback(async (id: string) => {
    const char = myCharacters.find(c => c.id === id);
    if (!char) return;
    const isTemplate = !!char.isTemplate;
    const folderId = (char.folderId ?? null);
    // 与服务器 copy 流程一致：同目录追加 " (n)" 计数
    const uniqueName = uniquifyNameLocal(char.name, folderId);
    enqueueOp({
      opId: generateId(), kind: 'copy-character', id,
      newId: generateId(), name: uniqueName, folderId, isTemplate,
      createdAt: Date.now(), attempts: 0,
    });
  }, [myCharacters, uniquifyNameLocal, enqueueOp]);

  /** 查找或本地创建文件夹（Drive 导入用）；本地命中即返回，未命中走创建队列 */
  const ensureLocalFolder = useCallback(async (name: string, parentId: string | null, _userId: string): Promise<string> => {
    const existing = folders.find(f => f.name === name && (f.parentId ?? null) === (parentId ?? null));
    if (existing) return existing.id;
    const id = generateId();
    enqueueOp({
      opId: generateId(), kind: 'create-folder', id,
      name, parentId: parentId ?? null,
      createdAt: Date.now(), attempts: 0,
    });
    return id;
  }, [folders, enqueueOp]);

  return {
    // 派生显示状态（即时反映本地操作）
    folders,
    myCharacters,
    templates: serverTemplates,
    // 同步状态
    isSyncing,
    isRefreshing,
    pendingCount: pendingOps.length,
    lastSyncError,
    // 操作
    refreshCharacterList,
    flushPendingOps,
    createFolder,
    createDocumentFromData,
    moveCharacter,
    moveFolder,
    renameItem,
    deleteCharacter,
    deleteFolder,
    copyCharacter,
    ensureLocalFolder,
  };
}
