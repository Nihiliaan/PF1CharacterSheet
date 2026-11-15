/**
 * 档案库目录结构本地缓存（localStorage）。
 *
 * 缓存内容 = 服务器列表投影（folders / characters / templates 原始形状）
 *          + 待同步操作队列（pendingOps）。
 * UI 显示状态由 useVaultSync 派生：服务器列表 ⊕ pendingOps 重放。
 * 同步失败时更改仅保留在本缓存中，等待自动重试（登录/联网/定时/手动刷新）。
 */

/** 待同步操作（FIFO 队列，按序重放到 Firestore） */
export type PendingOp = {
  opId: string;
  kind:
    | 'create-folder'      // { id, name, parentId }
    | 'create-document'    // { id, name, folderId, isTemplate, avatarUrl?, content? }
    | 'move-character'     // { id, folderId, isTemplate }
    | 'move-folder'        // { id, parentId }
    | 'rename-character'   // { id, name, isTemplate }
    | 'rename-folder'      // { id, name }
    | 'delete-character'   // { id, isTemplate }
    | 'delete-folder'      // { id }
    | 'copy-character';    // { id, newId, name, folderId, isTemplate, avatarUrl? }
  /** 目标文档/文件夹 id（新建操作为本地生成 id，保证本地 id == 服务器 id） */
  id: string;
  name?: string;
  parentId?: string | null;
  folderId?: string | null;
  isTemplate?: boolean;
  /** create-document / copy-character 的列表展示头像（仅投影需要，内容在 content） */
  avatarUrl?: string;
  /** create-document 携带的完整文档内容（人物卡 data 或模板 content） */
  content?: any;
  /** copy-character 的副本 id */
  newId?: string;
  createdAt: number;
  attempts: number;
  lastError?: string;
};

export interface VaultCacheData {
  /** v2：characters 集合不再含模板文档（遗留模板已一次性迁入 templates 集合），op 路由改按 op.isTemplate */
  version: 2;
  uid: string;
  /** 服务器拉取的文件夹列表（原始形状） */
  folders: any[];
  /** 服务器拉取的人物列表投影（原始形状，不含 templates 集合文档） */
  characters: any[];
  /** templates 集合原始文档（水合时经 templateToCharacterDoc 归一化） */
  templates: any[];
  ops: PendingOp[];
  savedAt: number;
}

const KEY = 'pf1_vault_cache';

export function loadVaultCache(uid: string): VaultCacheData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as VaultCacheData;
    if (data?.version !== 2 || data.uid !== uid) return null;
    return {
      version: 2,
      uid: data.uid,
      folders: Array.isArray(data.folders) ? data.folders : [],
      characters: Array.isArray(data.characters) ? data.characters : [],
      templates: Array.isArray(data.templates) ? data.templates : [],
      ops: Array.isArray(data.ops) ? data.ops : [],
      savedAt: data.savedAt || 0,
    };
  } catch (e) {
    console.warn('[vaultCache] 缓存读取失败，忽略:', e);
    return null;
  }
}

export function saveVaultCache(data: Omit<VaultCacheData, 'version' | 'savedAt'>) {
  try {
    const payload: VaultCacheData = { ...data, version: 2, savedAt: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch (e) {
    // QuotaExceededError 等：缓存写入失败不影响内存状态，仅告警
    console.warn('[vaultCache] 缓存写入失败:', e);
  }
}

export function clearVaultCache() {
  try { localStorage.removeItem(KEY); } catch { /* 忽略 */ }
}

/**
 * 将 handleFirestoreError 抛出的 JSON 错误（{error, operationType, path}）
 * 解析为用户可读的故障描述。
 */
export function describeFirestoreError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  let inner = raw;
  // handleFirestoreError 包装：message 为 JSON 字符串
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && typeof parsed.error === 'string') {
      inner = parsed.error;
    }
  } catch { /* 非 JSON：按原始 message 处理 */ }

  const msg = inner.toLowerCase();
  if (msg.includes('permission')) return '权限不足（Firestore 规则拒绝了该操作）';
  if (msg.includes('offline') || msg.includes('unavailable') || msg.includes('network')
    || msg.includes('failed to fetch') || msg.includes('getdocuments')) return '网络连接失败';
  if (msg.includes('quota')) return 'Firestore 配额超限';
  if (msg.includes('deadline') || msg.includes('timeout')) return '请求超时';
  return inner || '未知错误';
}
