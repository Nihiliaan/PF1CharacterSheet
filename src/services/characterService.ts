import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
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

    const payload: any = {
      name: filename,
      data: {
        ...characterData,
        id: id || '', // Will be updated after creation if new
        folderId: folderId !== undefined ? folderId : (characterData.folderId || null),
        ownerId: finalOwnerId,
        targetId: characterData.targetId || ''
      },
      isPublic: true,
      updatedAt: serverTimestamp(),
      isTemplate: isTemplate,
      ownerId: finalOwnerId,
      folderId: folderId !== undefined ? folderId : (characterData.folderId || null),
      targetId: characterData.targetId || ''
    };


    if (id) {
      const docRef = doc(db, path, id);
      await updateDoc(docRef, payload);
      return id;
    } else {
      const docRef = await addDoc(collection(db, path), {
        ...payload,
        createdAt: serverTimestamp(),
      });
      // 创建后反向更新 ID
      await updateDoc(docRef, { "data.id": docRef.id });
      return docRef.id;
    }
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
         id: '', // Will be updated
         targetId: targetId,
         folderId: folderId,
         ownerId: auth.currentUser.uid,
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
    const docRef = await addDoc(collection(db, path), payload);
    await updateDoc(docRef, { "data.id": docRef.id });
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

export async function getCharacterList(uid: string, folderId?: string | null) {
  const path = 'characters';
  try {
    let q;
    if (folderId !== undefined) {
      q = query(
        collection(db, path),
        where('ownerId', '==', uid),
        where('folderId', '==', folderId)
      );
    } else {
      q = query(
        collection(db, path),
        where('ownerId', '==', uid)
      );
    }
    const snapshot = await getDocs(q);
    const items = snapshot.docs.map(doc => {
      const d = doc.data() as any;
      return {
        ...d,
        id: doc.id,
        isLink: !!d.targetId,
        isTemplate: !!d.isTemplate,
        data: {
          ...d.data,
          id: doc.id,
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

export async function getMyCharacters() {
  if (!auth.currentUser) return [];
  return getCharacterList(auth.currentUser.uid);
}

export async function getCharacterById(id: string) {
  const path = `characters/${id}`;
  try {
    const docRef = doc(db, 'characters', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
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
    return null;
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
