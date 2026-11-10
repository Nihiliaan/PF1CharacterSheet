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
  Timestamp,
  orderBy
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { CharacterData } from '../schema/types';
import firebaseAppletConfig from '../../firebase-applet-config.json';

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
export const EXT_TEMPLATE = '.bbc';
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

export async function saveCharacter(characterData: any, id?: string | null, folderId?: string | null, isTemplate: boolean = false) {
  if (!auth.currentUser) throw new Error("Must be logged in to save characters");

  const path = 'characters';
  try {
    const ext = isTemplate ? EXT_TEMPLATE : EXT_CHAR;
    
    // Improved filename extraction
    let filename = '';
    if (isTemplate) {
      filename = characterData.name || characterData.filename || "新模板";
    } else {
      filename = characterData.basic?.name || characterData.filename || characterData.name || '新角色';
    }
    filename = ensureExtension(filename, ext);

    // If new or renaming, ensure unique
    if (!id) {
      let baseName = filename.substring(0, filename.length - ext.length);
      let counter = 1;
      while (!(await checkUniqueName(filename, folderId || null, auth.currentUser.uid))) {
        filename = `${baseName} (${counter++})${ext}`;
      }
    }

    const currentUid = auth.currentUser.uid;
    const finalOwnerId = id ? (characterData.ownerId || currentUid) : currentUid;

    // Defense against nested arrays from EncodedSelect fields:
    // Any empty arrays `[]` in encoded columns will be coerced to `0`
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

    // Clean business data tree: eliminate metadata stirring
    const cleanData: any = { ...sanitizedData };
    cleanData.schemaVersion = cleanData.schemaVersion || 1;
    delete cleanData.id;
    delete cleanData.ownerId;
    delete cleanData.folderId;
    delete cleanData.targetId;
    delete cleanData.isLink;
    delete cleanData.isTemplate;

    const finalFolderId = folderId !== undefined ? folderId : (characterData.folderId || null);

    const payload: any = {
      name: filename,
      data: cleanData,
      isPublic: true,
      updatedAt: serverTimestamp(),
      isTemplate: isTemplate,
      ownerId: finalOwnerId,
      folderId: finalFolderId,
      targetId: characterData.targetId || ''
    };

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

export async function copyCharacter(id: string) {
  try {
    const char = await getCharacterById(id);
    if (!char) return;
    const { id: _, ...rest } = char as any;
    // saveCharacter will handle unique name
    return await saveCharacter(rest.data, undefined, rest.folderId);
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

export async function renameItem(id: string, type: 'character' | 'folder', newName: string) {
  const path = `${type === 'folder' ? 'folders' : 'characters'}/${id}`;
  try {
    // For characters, ensure extension is preserved
    let finalName = newName;
    if (type === 'character') {
      const char = await getCharacterById(id);
      if (char) {
        const ext = char.isTemplate ? EXT_TEMPLATE : EXT_CHAR;
        if (char.isLink) {
           if (!finalName.endsWith(EXT_LINK)) finalName += EXT_LINK;
        } else {
           finalName = ensureExtension(finalName, ext);
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

// 档案库列表的投影字段：只拉列表消费者实际用到的元数据，
// 避免把每个角色的完整 data（技能/装备/法术等）全量下载。
// data 内嵌字段用点路径投影；注意旧格式文档的 basic.avatars 是数组，
// 此时 'data.basic.avatars.url' 不存在，消费方有可选链兜底，渲染不受影响。
const LIST_PROJECTION_FIELDS = [
  // 文档顶层元数据（排序、目录过滤、路径展示、打开角色）
  'name',
  'folderId',
  'ownerId',
  'targetId',
  'isTemplate',
  'updatedAt',
  'createdAt',
  // data 内嵌字段（列表项缩略图与副标题、最近打开列表）
  'data.basic.name',
  'data.basic.race',
  'data.basic.classes',
  'data.basic.avatars.url'
] as const;

// 将 Firestore REST 返回的强类型字段值转换为普通 JS 值。
// timestampValue 需转回 Firestore Timestamp，保证 updatedAt.toMillis() 等调用方兼容
function convertRestValue(value: any): any {
  if (!value) return null;
  const type = Object.keys(value)[0];
  switch (type) {
    case 'nullValue': return null;
    case 'booleanValue': return value.booleanValue;
    case 'integerValue': return Number(value.integerValue);
    case 'doubleValue': return Number(value.doubleValue);
    case 'timestampValue': return Timestamp.fromMillis(Date.parse(value.timestampValue));
    case 'stringValue': return value.stringValue;
    case 'bytesValue': return value.bytesValue;
    case 'referenceValue': return value.referenceValue;
    case 'arrayValue': return (value.arrayValue.values || []).map(convertRestValue);
    case 'mapValue': return convertRestFields(value.mapValue.fields || {});
    default: return null;
  }
}

function convertRestFields(fields: any): any {
  const out: any = {};
  for (const key of Object.keys(fields)) {
    out[key] = convertRestValue(fields[key]);
  }
  return out;
}

// 通过 Firestore REST runQuery 的 fieldMask 实现投影查询。
// 说明：浏览器版 Firebase JS SDK 不提供 select() 投影（QueryConstraintType 只有
// where/orderBy/limit/startAt/endAt 等，select 仅存在于服务端 Admin SDK），
// 因此这里直接调用官方 REST 接口。安全规则照常在服务端按完整文档评估，
// fieldMask 只限制返回的字段，不影响权限判定。
async function runProjectedCharactersQuery(uid: string, folderId?: string | null) {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || (firebaseAppletConfig as any).projectId;
  const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID || (firebaseAppletConfig as any).firestoreDatabaseId || '(default)';
  if (!auth.currentUser) throw new Error('Must be logged in to list characters');
  const token = await auth.currentUser.getIdToken();

  const filters: any[] = [
    { fieldFilter: { field: { fieldPath: 'ownerId' }, op: 'EQUAL', value: { stringValue: uid } } }
  ];
  if (folderId !== undefined) {
    filters.push({
      fieldFilter: {
        field: { fieldPath: 'folderId' },
        op: 'EQUAL',
        value: folderId === null ? { nullValue: null } : { stringValue: folderId }
      }
    });
  }

  const body = {
    structuredQuery: {
      from: [{ collectionId: 'characters', allDescendants: false }],
      where: filters.length === 1 ? filters[0] : { compositeFilter: { op: 'AND', filters } },
      // 投影语法是 structuredQuery.select（Projection.fields），不是 mask——
      // mask 只存在于 Documents.get / Write 等接口，runQuery 会报 400 Unknown name "mask"
      select: {
        fields: [...LIST_PROJECTION_FIELDS].map(fieldPath => ({ fieldPath }))
      }
    }
  };

  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents:runQuery`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body)
    }
  );
  if (!response.ok) {
    throw new Error(`Firestore runQuery failed: ${response.status} ${await response.text()}`);
  }

  const rows = await response.json();
  return rows
    .filter((row: any) => row.document)
    .map((row: any) => {
      // document.name 形如 projects/{p}/databases/{db}/documents/characters/{id}
      const docName: string = row.document.name;
      return {
        id: docName.substring(docName.lastIndexOf('/') + 1),
        fields: convertRestFields(row.document.fields || {})
      };
    });
}

export async function getCharacterList(uid: string, folderId?: string | null) {
  const path = 'characters';
  try {
    const rows = await runProjectedCharactersQuery(uid, folderId);
    const items = rows.map(({ id, fields: d }) => {
      return {
        ...d,
        id,
        isLink: !!d.targetId,
        isTemplate: !!d.isTemplate,
        data: {
          ...d.data,
          id,
          ownerId: d.ownerId,
          folderId: d.folderId,
          targetId: d.targetId || '',
          isLink: !!d.targetId,
          isTemplate: !!d.isTemplate
        }
      };
    }) as Character[];

    // Manual sort to avoid query failures if updatedAt is missing or for complex mixed queries
    return items.sort((a, b) => {
      const timeA = a.updatedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
      const timeB = b.updatedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
      return timeB - timeA;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function getMyCharacters(uid?: string) {
  const userId = uid || auth.currentUser?.uid;
  if (!userId) return [];
  return getCharacterList(userId);
}

function formatCharacterDoc(docSnap: any): Character | null {
  if (!docSnap.exists()) return null;
  const d = docSnap.data() as any;
  return {
    ...d,
    id: docSnap.id,
    isLink: !!d.targetId,
    isTemplate: !!d.isTemplate,
    data: {
      ...d.data,
      id: docSnap.id,
      ownerId: d.ownerId,
      folderId: d.folderId,
      targetId: d.targetId || '',
      isLink: !!d.targetId,
      isTemplate: !!d.isTemplate
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
