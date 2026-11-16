import {
  collection,
  doc,
  getDoc,
  getDocFromCache,
  getDocFromServer,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { CharacterData } from '../schema/types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
  CREATE_FOLDER = 'create_folder'
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  // 权限错误通常是由于文档不存在或已停止分享，不需要在控制台报 error
  if (errInfo.error.includes('permissions')) {
    console.warn('Firestore Permission Access Denied:', path);
  } else {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  }
  throw new Error(JSON.stringify(errInfo));
}

export const EXT_CHAR = '.pf1';
export const EXT_LINK = '.lnk';

export interface Character {
  id: string;
  isLink: boolean;
  isTemplate: boolean;
  data: any;
  name?: string;
  folderId?: string | null;
  updatedAt?: any;
  createdAt?: any;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  ownerId: string;
  createdAt?: any;
  updatedAt?: any;
}

async function checkUniqueName(name: string, folderId: string | null, userId: string, excludeId?: string, isFolder: boolean = false) {
  const folderQuery = query(
    collection(db, 'folders'),
    where('ownerId', '==', userId),
    where('parentId', '==', folderId),
    where('name', '==', name)
  );
  const charQuery = query(
    collection(db, 'characters'),
    where('ownerId', '==', userId),
    where('folderId', '==', folderId),
    where('name', '==', name)
  );

  const [fSnap, cSnap] = await Promise.all([getDocs(folderQuery), getDocs(charQuery)]);

  const fDocs = fSnap.docs.filter(d => !excludeId || d.id !== excludeId);
  const cDocs = cSnap.docs.filter(d => !excludeId || d.id !== excludeId);

  return fDocs.length === 0 && cDocs.length === 0;
}

function ensureExtension(name: string, ext: string) {
  if (name.endsWith(ext)) return name;
  return name + ext;
}

/** 防御 EncodedSelect 嵌套数组：编码列中的空数组 `[]` 会被强转为 `0` */
function sanitizeCharacterData(characterData: any) {
  const sanitizedData = { ...characterData };
  if (sanitizedData.feats && Array.isArray(sanitizedData.feats.type)) {
    sanitizedData.feats = {
      ...sanitizedData.feats,
      type: sanitizedData.feats.type.map((t: any) => Array.isArray(t) ? 0 : t)
    };
  }
  if (sanitizedData.attacks) {
    const sanitizedAttacks = { ...sanitizedData.attacks };
    let attacksChanged = false;
    if (sanitizedAttacks.melee && Array.isArray(sanitizedAttacks.melee.damageType)) {
      sanitizedAttacks.melee = {
        ...sanitizedAttacks.melee,
        damageType: sanitizedAttacks.melee.damageType.map((t: any) => Array.isArray(t) ? 0 : t)
      };
      attacksChanged = true;
    }
    if (sanitizedAttacks.ranged && Array.isArray(sanitizedAttacks.ranged.damageType)) {
      sanitizedAttacks.ranged = {
        ...sanitizedAttacks.ranged,
        damageType: sanitizedAttacks.ranged.damageType.map((t: any) => Array.isArray(t) ? 0 : t)
      };
      attacksChanged = true;
    }
    if (attacksChanged) {
      sanitizedData.attacks = sanitizedAttacks;
    }
  }
  return sanitizedData;
}

/** 统一提取文件名（含扩展名），saveCharacter 与 createCharacterDoc 共用 */
function getCharacterFilename(characterData: any): string {
  const filename = characterData.basic?.name || characterData.filename || characterData.name || '新角色';
  return ensureExtension(filename, EXT_CHAR);
}

/** 构造 characters 集合的写入 payload（saveCharacter 与 createCharacterDoc 共用） */
function buildCharacterPayload(characterData: any, filename: string, finalFolderId: string | null, finalOwnerId: string) {
  // Clean business data tree: eliminate metadata stirring
  const cleanData: any = { ...sanitizeCharacterData(characterData) };
  cleanData.schemaVersion = cleanData.schemaVersion || 1;
  delete cleanData.id;
  delete cleanData.ownerId;
  delete cleanData.folderId;
  delete cleanData.targetId;
  delete cleanData.isLink;
  delete cleanData.isTemplate;

  return {
    name: filename,
    data: cleanData,
    isPublic: true,
    updatedAt: serverTimestamp(),
    isTemplate: false,
    ownerId: finalOwnerId,
    folderId: finalFolderId,
    targetId: characterData.targetId || ''
  };
}

/**
 * 保存人物卡（新建 + 更新统一入口）。
 * 文件名与角色名解耦：
 *  - 更新已有文档（id 提供）：保留服务器上的现有文件名，不随编辑器里的角色名变化；
 *  - 新建文档：文件名默认取角色名（filenameOverride 优先，供复制等需沿用源文件名的流程使用），
 *    同目录自动追加 " (n)" 计数保证唯一。
 */
export async function saveCharacter(characterData: any, id?: string | null, folderId?: string | null, filenameOverride?: string) {
  if (!auth.currentUser) throw new Error("Must be logged in to save characters");

  const path = 'characters';
  try {
    const ext = EXT_CHAR;
    let filename: string;
    if (id) {
      // 更新路径：沿用现有文件名（文档不存在时兜底为角色名推导）
      const existing = await getDoc(doc(db, path, id));
      filename = existing.exists()
        ? (existing.data().name as string)
        : getCharacterFilename(characterData);
    } else {
      filename = ensureExtension(filenameOverride || getCharacterFilename(characterData), ext);
      let baseName = filename.substring(0, filename.length - ext.length);
      let counter = 1;
      while (!(await checkUniqueName(filename, folderId || null, auth.currentUser.uid))) {
        filename = `${baseName} (${counter++})${ext}`;
      }
    }

    const currentUid = auth.currentUser.uid;
    const finalOwnerId = id ? (characterData.ownerId || currentUid) : currentUid;
    const finalFolderId = folderId !== undefined ? folderId : (characterData.folderId || null);

    const payload: any = buildCharacterPayload(characterData, filename, finalFolderId, finalOwnerId);

    const docRef = id ? doc(db, path, id) : doc(collection(db, path));
    const finalId = docRef.id;

    if (id) {
      await updateDoc(docRef, payload);
    } else {
      await setDoc(docRef, {
        ...payload,
        createdAt: serverTimestamp(),
      });
    }
    return finalId;
  } catch (error) {
    handleFirestoreError(error, id ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

/**
 * 以指定 id 创建 characters 文档（setDoc 全量写入）。
 * 本地优先队列的 flush 入口：新建/复制文档的 id 由本地生成，保证本地引用与服务器一致。
 * filenameOverride：本地队列已做过唯一化处理的最终文件名（缺省时从 characterData 提取）。
 */
export async function createCharacterDoc(
  characterData: any,
  id: string,
  folderId: string | null,
  filenameOverride?: string
) {
  if (!auth.currentUser) throw new Error("Must be logged in to save characters");
  const path = 'characters';
  try {
    const filename = filenameOverride || getCharacterFilename(characterData);
    const payload: any = buildCharacterPayload(characterData, filename, folderId, auth.currentUser.uid);
    await setDoc(doc(db, path, id), { ...payload, createdAt: serverTimestamp() });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function saveLink(targetChar: any, folderId: string | null) {
  if (!auth.currentUser) throw new Error("Must be logged in to save links");
  const path = 'characters';
  try {
    const targetId = targetChar.id;
    const sourceName = targetChar.name || '未命名文件';
    const linkName = sourceName + EXT_LINK;

    // Check if link already exists in this folder
    const q = query(
      collection(db, 'characters'),
      where('ownerId', '==', auth.currentUser.uid),
      where('folderId', '==', folderId),
      where('targetId', '==', targetId)
    );
    const snap = await getDocs(q);
    if (!snap.empty) return snap.docs[0].id;

    // Ensure unique name for the link file
    let finalName = linkName;
    let counter = 1;
    while (!(await checkUniqueName(finalName, folderId, auth.currentUser.uid))) {
      finalName = `${sourceName} (${counter++})${EXT_LINK}`;
    }

    const payload: any = {
      name: finalName,
      data: {
         targetId: targetId,
         basic: {
            name: targetChar.data?.basic?.name || '未命名人物(分享)',
            avatars: targetChar.data?.basic?.avatars || { url: [], note: [] },
            race: targetChar.data?.basic?.race || '',
            classes: targetChar.data?.basic?.classes || ''
         }
      },
      isPublic: false,
      updatedAt: serverTimestamp(),
      ownerId: auth.currentUser.uid,
      folderId: folderId,
      targetId: targetId,
      createdAt: serverTimestamp()
    };
    const docRef = doc(collection(db, path));
    await setDoc(docRef, payload);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function moveCharacter(id: string, folderId: string | null) {
  const path = `characters/${id}`;
  folderId = folderId ?? null;
  try {
    const char = await getCharacterById(id);
    if (char && !(await checkUniqueName(char.name!, folderId, auth.currentUser!.uid, id))) {
      throw new Error(`目标文件夹已存在名为 "${char.name}" 的文件`);
    }
    await updateDoc(doc(db, 'characters', id), { folderId, updatedAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function moveFolder(id: string, parentId: string | null) {
  const path = `folders/${id}`;
  parentId = parentId ?? null;
  try {
    const folders = await getFolders();
    const folder = folders?.find(f => f.id === id);
    if (folder && !(await checkUniqueName(folder.name, parentId, auth.currentUser!.uid, id, true))) {
      throw new Error(`目标位置已存在名为 "${folder.name}" 的文件夹`);
    }
    await updateDoc(doc(db, 'folders', id), {
      parentId,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * 复制人物卡：副本文件名沿用源文件名（与角色名解耦），同目录唯一性由保存流程处理。
 * nameOverride：本地优先队列已做过唯一化处理的最终副本名（缺省时直接沿用源文件名）。
 */
export async function copyCharacter(id: string, newId?: string, nameOverride?: string) {
  try {
    const char = await getCharacterById(id);
    if (!char) return;
    const { id: _, ...rest } = char as any;
    const filename = nameOverride || rest.name;
    if (newId) {
      // 本地优先队列：副本 id 由本地生成，setDoc 全量写入
      return await createCharacterDoc(rest.data, newId, rest.folderId ?? null, filename);
    }
    // saveCharacter will handle unique name
    return await saveCharacter(rest.data, undefined, rest.folderId, filename);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'characters');
  }
}

export async function getFolders(uid?: string) {
  const userId = uid || auth.currentUser?.uid;
  if (!userId) return [];
  const path = 'folders';
  try {
    const q = query(
      collection(db, path),
      where('ownerId', '==', userId),
      orderBy('name', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Folder[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function createFolder(name: string, parentId: string | null = null, uid?: string) {
  const userId = uid || auth.currentUser?.uid;
  if (!userId) throw new Error("Must be logged in");
  const path = 'folders';
  try {
    if (!(await checkUniqueName(name, parentId, userId, undefined, true))) {
      throw new Error(`当前文件夹已存在名为 "${name}" 的文件夹`);
    }
    const docRef = await addDoc(collection(db, path), {
      name,
      ownerId: userId,
      parentId,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * 以指定 id 创建文件夹（setDoc 全量写入）。
 * 本地优先队列的 flush 入口：id 由本地生成，保证本地引用与服务器一致。
 */
export async function createFolderWithId(name: string, parentId: string | null, id: string, uid?: string) {
  const userId = uid || auth.currentUser?.uid;
  if (!userId) throw new Error("Must be logged in");
  try {
    await setDoc(doc(db, 'folders', id), {
      name,
      ownerId: userId,
      parentId: parentId ?? null,
      createdAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'folders');
  }
}

export async function renameItem(id: string, type: 'character' | 'folder', newName: string) {
  const path = `${type === 'folder' ? 'folders' : 'characters'}/${id}`;
  try {
    // For characters, ensure extension is preserved
    let finalName = newName;
    if (type === 'character') {
      const char = await getCharacterById(id);
      if (char) {
        if (char.isLink) {
           if (!finalName.endsWith(EXT_LINK)) finalName += EXT_LINK;
        } else {
           finalName = ensureExtension(finalName, EXT_CHAR);
        }
      }
    }

    // Get parent context for uniqueness check
    let parentId: string | null = null;
    if (type === 'folder') {
        const folders = await getFolders();
        parentId = folders?.find(f => f.id === id)?.parentId || null;
    } else {
        const char = await getCharacterById(id);
        parentId = char?.folderId || null;
    }

    if (!(await checkUniqueName(finalName, parentId, auth.currentUser!.uid, id, type === 'folder'))) {
        throw new Error(`该目录下已存在名为 "${finalName}" 的项目`);
    }

    await updateDoc(doc(db, type === 'folder' ? 'folders' : 'characters', id), {
      name: finalName,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function findFolderByName(name: string, parentId: string | null, userId: string) {
  const q = query(
    collection(db, 'folders'),
    where('ownerId', '==', userId),
    where('name', '==', name),
    where('parentId', '==', parentId)
  );
  const snap = await getDocs(q);
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() } as Folder;
}

export async function ensureLocalFolder(name: string, parentId: string | null, userId: string): Promise<string> {
  const existing = await findFolderByName(name, parentId, userId);
  if (existing) return existing.id;
  const newId = await createFolder(name, parentId, userId);
  return newId!;
}

export async function deleteFolder(id: string) {
  const path = `folders/${id}`;
  try {
    await deleteDoc(doc(db, 'folders', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * 人物卡列表（全量文档，含完整 data）。
 * 档案库的数据主源已切换为 onSnapshot 实时订阅（useVaultSync），全量文档经 SDK
 * 持久化进 IndexedDB 本地缓存；本函数仅作为同步兜底（op 目标核实等）保留。
 */
export async function getMyCharacters(uid?: string) {
  const userId = uid || auth.currentUser?.uid;
  if (!userId) return [];
  const snapshot = await getDocs(query(collection(db, 'characters'), where('ownerId', '==', userId)));
  return snapshot.docs
    .map(formatCharacterDoc)
    .filter((c): c is Character => c !== null)
    .sort((a, b) => {
      const timeA = a.updatedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
      const timeB = b.updatedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
      return timeB - timeA;
    });
}

/** 将 Firestore 文档快照规范化为 Character 形状（onSnapshot 订阅与单条读取共用） */
export function formatCharacterDoc(docSnap: any): Character | null {
  if (!docSnap.exists()) return null;
  const d = docSnap.data() as any;
  return {
    ...d,
    id: docSnap.id,
    isLink: !!d.targetId,
    data: {
      ...d.data,
      id: docSnap.id,
      ownerId: d.ownerId,
      folderId: d.folderId,
      targetId: d.targetId || '',
      isLink: !!d.targetId,
      isTemplate: false
    }
  } as Character;
}

export async function getCharacterFromCache(id: string): Promise<Character | null> {
  try {
    const docRef = doc(db, 'characters', id);
    const docSnap = await getDocFromCache(docRef);
    return formatCharacterDoc(docSnap);
  } catch (e) {
    return null;
  }
}

export async function getCharacterFromServer(id: string): Promise<Character | null> {
  try {
    const docRef = doc(db, 'characters', id);
    const docSnap = await getDocFromServer(docRef);
    return formatCharacterDoc(docSnap);
  } catch (e) {
    return null;
  }
}

export async function getCharacterById(id: string) {
  const path = `characters/${id}`;
  try {
    const docRef = doc(db, 'characters', id);
    const docSnap = await getDoc(docRef);
    return formatCharacterDoc(docSnap);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

// Alias for compatibility
export const getCharacter = getCharacterById;

export async function deleteCharacter(id: string) {
  const path = `characters/${id}`;
  try {
    await deleteDoc(doc(db, 'characters', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
