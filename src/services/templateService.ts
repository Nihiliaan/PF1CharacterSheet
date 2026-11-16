import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

/**
 * BBCode 模板专用服务
 *
 * 模板存入独立的 templates 集合，文档即模板本身
 * （扁平结构、无 schema 合并、无 dataMigration）：
 *   { name, content, folderId, ownerId, isTemplate: true, createdAt, updatedAt }
 * characters 集合只存人物卡，两者互不混放（遗留文档已由一次性迁移脚本搬空）。
 */

export const TEMPLATE_COLLECTION = 'templates';

export interface TemplateDocument {
  id?: string;
  name: string;
  content: string;
  folderId: string | null;
  ownerId: string;
  isTemplate: boolean;
  createdAt?: any;
  updatedAt?: any;
}

/** 与 characterService 保持一致的模板文件扩展名 */
export const EXT_TEMPLATE = '.bbc';

function ensureExtension(name: string, ext: string) {
  if (name.endsWith(ext)) return name;
  return name + ext;
}

// 同目录下模板名唯一性检查（仅针对 templates 集合；人物卡查重走 characterService）
async function isTemplateNameTaken(name: string, folderId: string | null, userId: string, excludeId?: string) {
  const q = query(
    collection(db, TEMPLATE_COLLECTION),
    where('ownerId', '==', userId),
    where('folderId', '==', folderId),
    where('name', '==', name)
  );
  const snap = await getDocs(q);
  return snap.docs.some(d => d.id !== excludeId);
}

/**
 * 将 templates 集合的扁平文档规范化为与人物卡条目兼容的形状，
 * 供档案库列表 / 最近列表 / selectCharacter 等既有消费方直接使用
 */
export function templateToCharacterDoc(tpl: TemplateDocument): any {
  const id = tpl.id!;
  return {
    id,
    name: tpl.name,
    folderId: tpl.folderId ?? null,
    ownerId: tpl.ownerId,
    isTemplate: true,
    isLink: false,
    targetId: '',
    updatedAt: tpl.updatedAt,
    createdAt: tpl.createdAt,
    data: {
      content: tpl.content,
      id,
      ownerId: tpl.ownerId,
      folderId: tpl.folderId ?? null,
      targetId: '',
      isLink: false,
      isTemplate: true
    }
  };
}

/**
 * 保存模板（新建 + 更新统一入口，setDoc 一次写入）
 * @param payload { content, name? } —— name 缺省时更新沿用旧名，新建用默认名
 * @returns 文档 ID
 */
export async function saveTemplate(
  payload: { content: string, name?: string },
  id?: string | null,
  folderId?: string | null
): Promise<string> {
  if (!auth.currentUser) throw new Error('Must be logged in to save templates');
  const uid = auth.currentUser.uid;

  const existing = id ? await getTemplateById(id) : null;

  // 名称：显式传入 > 沿用旧名 > 默认名；统一补 .bbc 扩展名
  let name = payload.name?.trim() || existing?.name || '新模板';
  name = ensureExtension(name, EXT_TEMPLATE);

  const finalFolderId = folderId !== undefined ? folderId : (existing?.folderId ?? null);

  // 新建或改名时确保同目录唯一
  if (!id || name !== existing?.name) {
    const baseName = name.substring(0, name.length - EXT_TEMPLATE.length);
    let counter = 1;
    while (await isTemplateNameTaken(name, finalFolderId, uid, id || undefined)) {
      name = `${baseName} (${counter++})${EXT_TEMPLATE}`;
    }
  }

  const docRef = id ? doc(db, TEMPLATE_COLLECTION, id) : doc(collection(db, TEMPLATE_COLLECTION));

  // setDoc + merge：新建写入完整字段，更新时保留原 createdAt
  await setDoc(docRef, {
    name,
    content: payload.content,
    folderId: finalFolderId,
    ownerId: uid,
    isTemplate: true,
    updatedAt: serverTimestamp(),
    ...(id ? {} : { createdAt: serverTimestamp() })
  }, { merge: true });

  return docRef.id;
}

export async function listTemplates(uid: string, folderId?: string | null): Promise<TemplateDocument[]> {
  if (!uid) return [];
  const filters: any[] = [where('ownerId', '==', uid)];
  if (folderId !== undefined) {
    filters.push(where('folderId', '==', folderId));
  }
  const q = query(collection(db, TEMPLATE_COLLECTION), ...filters);
  const snapshot = await getDocs(q);
  const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as TemplateDocument[];
  // 与 getMyCharacters 保持一致的排序：最近更新在前
  return items.sort((a, b) => {
    const timeA = a.updatedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
    const timeB = b.updatedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
    return timeB - timeA;
  });
}

/**
 * 以指定 id 创建模板（setDoc 全量写入，含 createdAt/updatedAt）。
 * 本地优先队列的 flush 入口：saveTemplate 带 id 走的是"更新"分支（不写 createdAt），
 * 在目标文档不存在时会被 rules 的 create 校验拒绝（isValidTemplate 要求 createdAt）。
 */
export async function createTemplateWithId(
  payload: { content: string, name?: string },
  id: string,
  folderId: string | null,
  uid?: string
): Promise<string> {
  const ownerId = uid || auth.currentUser?.uid;
  if (!ownerId) throw new Error('Must be logged in to save templates');
  const name = ensureExtension(payload.name?.trim() || '新模板', EXT_TEMPLATE);
  await setDoc(doc(db, TEMPLATE_COLLECTION, id), {
    name,
    content: payload.content,
    folderId: folderId ?? null,
    ownerId,
    isTemplate: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return id;
}

export async function getTemplateById(id: string): Promise<TemplateDocument | null> {  try {
    const docSnap = await getDoc(doc(db, TEMPLATE_COLLECTION, id));
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() } as TemplateDocument;
  } catch (e) {
    console.warn('[templateService] getTemplateById failed:', id, e);
    return null;
  }
}

export async function deleteTemplate(id: string): Promise<void> {
  await deleteDoc(doc(db, TEMPLATE_COLLECTION, id));
}

/** 重命名模板（自动补 .bbc 扩展名并查重） */
export async function renameTemplate(id: string, newName: string): Promise<void> {
  const tpl = await getTemplateById(id);
  if (!tpl) throw new Error('模板不存在');
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Must be logged in');

  let name = ensureExtension(newName.trim(), EXT_TEMPLATE);
  if (name !== tpl.name) {
    const folderId = tpl.folderId ?? null;
    const baseName = name.substring(0, name.length - EXT_TEMPLATE.length);
    let counter = 1;
    while (await isTemplateNameTaken(name, folderId, uid, id)) {
      name = `${baseName} (${counter++})${EXT_TEMPLATE}`;
    }
  }
  await setDoc(doc(db, TEMPLATE_COLLECTION, id), { name, updatedAt: serverTimestamp() }, { merge: true });
}

/** 移动模板到其他目录（与 moveCharacter 一致：目标目录同名则报错） */
export async function moveTemplate(id: string, folderId: string | null): Promise<void> {
  const tpl = await getTemplateById(id);
  if (!tpl) throw new Error('模板不存在');
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Must be logged in');

  if (tpl.folderId !== folderId && (await isTemplateNameTaken(tpl.name, folderId, uid, id))) {
    throw new Error(`目标文件夹已存在名为 "${tpl.name}" 的文件`);
  }
  await setDoc(doc(db, TEMPLATE_COLLECTION, id), { folderId, updatedAt: serverTimestamp() }, { merge: true });
}

/** 复制模板（同目录自动生成不重复的副本名；newId 提供时以本地生成的副本 id 全量写入） */
export async function copyTemplate(id: string, newId?: string): Promise<string | undefined> {
  const tpl = await getTemplateById(id);
  if (!tpl) return undefined;
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Must be logged in');

  const baseName = tpl.name.endsWith(EXT_TEMPLATE)
    ? tpl.name.substring(0, tpl.name.length - EXT_TEMPLATE.length)
    : tpl.name;
  let name = tpl.name;
  let counter = 1;
  while (await isTemplateNameTaken(name, tpl.folderId ?? null, uid)) {
    name = `${baseName} (${counter++})${EXT_TEMPLATE}`;
  }
  if (newId) {
    await setDoc(doc(db, TEMPLATE_COLLECTION, newId), {
      name,
      content: tpl.content,
      folderId: tpl.folderId ?? null,
      ownerId: uid,
      isTemplate: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return newId;
  }
  return saveTemplate({ content: tpl.content, name }, null, tpl.folderId ?? null);
}
