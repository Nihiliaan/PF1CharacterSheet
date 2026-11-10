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
import { getCharacterById, deleteCharacter as deleteCharacterService } from './characterService';

/**
 * BBCode 模板专用服务
 *
 * 模板不再作为特殊"人物卡"塞进 characters 集合（data.content 包裹），
 * 而是存入独立的 templates 集合，文档即模板本身（扁平结构、无 schema 合并、无 dataMigration）：
 *   { name, content, folderId, ownerId, isTemplate: true, createdAt, updatedAt }
 *
 * 兼容策略（迁移即搬）：
 * characters 集合里遗留的 isTemplate 文档继续通过现有 characters 列表读取显示；
 * 当用户编辑并保存一个旧模板时，saveTemplateMigrating 会写入新集合，
 * 成功后 best-effort 删除旧的 characters 文档（删除失败只告警不阻塞）。
 * 新建的模板一律只进新集合。
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

// 同目录下模板名唯一性检查（仅针对新 templates 集合；旧 characters 里的
// 遗留模板会在首次保存时搬走，不再参与查重）
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

/**
 * 带旧模板迁移的保存入口：
 * - id 不存在或属于新 templates 集合 → 直接保存
 * - id 属于 characters 集合的遗留模板 → 写入新集合，成功后 best-effort 删除旧文档
 */
export async function saveTemplateMigrating(
  payload: { content: string, name?: string },
  id?: string | null,
  folderId?: string | null
): Promise<string> {
  if (!id) return saveTemplate(payload, null, folderId);

  const existing = await getTemplateById(id);
  if (existing) {
    return saveTemplate(payload, id, folderId);
  }

  // 旧模板迁移路径：从 characters 集合读取旧元数据（名称/目录）
  let legacy: any = null;
  try {
    legacy = await getCharacterById(id);
  } catch (e) {
    console.warn('[templateService] 读取旧模板元数据失败，按新建处理:', e);
  }

  const legacyName = legacy?.isTemplate ? legacy.name : undefined;
  const legacyFolderId = legacy?.folderId ?? null;

  const newId = await saveTemplate(
    { ...payload, name: payload.name || legacyName },
    null,
    folderId !== undefined ? folderId : legacyFolderId
  );

  // best-effort 清理旧文档：失败只告警，不阻塞保存
  try {
    await deleteCharacterService(id);
  } catch (e) {
    console.warn('[templateService] 旧模板（characters 集合）清理失败，已忽略:', e);
  }

  return newId;
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
  // 与 getCharacterList 保持一致的排序：最近更新在前
  return items.sort((a, b) => {
    const timeA = a.updatedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
    const timeB = b.updatedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
    return timeB - timeA;
  });
}

export async function getTemplateById(id: string): Promise<TemplateDocument | null> {
  try {
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

/** 复制模板（同目录自动生成不重复的副本名） */
export async function copyTemplate(id: string): Promise<string | undefined> {
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
  return saveTemplate({ content: tpl.content, name }, null, tpl.folderId ?? null);
}
