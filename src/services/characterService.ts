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
  Timestamp 
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
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
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function saveCharacter(characterData: any, id?: string, folderId?: string | null, isTemplate: boolean = false) {
  if (!auth.currentUser) throw new Error("Must be logged in to save characters");
  
  const path = 'characters';
  try {
    const payload: any = {
      name: characterData.name || (isTemplate ? "BBCode 模板" : ((characterData.basic && characterData.basic.name) || '未命名人物')),
      data: characterData,
      isPublic: true, 
      updatedAt: serverTimestamp(),
      isTemplate: isTemplate
    };

    if (!id) {
      payload.ownerId = auth.currentUser.uid;
    }

    // If it's a new character, or if folderId is explicitly provided (even as null)
    if (!id) {
       payload.folderId = folderId !== undefined ? folderId : null;
    } else if (folderId !== undefined) {
       payload.folderId = folderId;
    }

    if (id) {
      const docRef = doc(db, path, id);
      await updateDoc(docRef, payload);
      return id;
    } else {
      const docRef = await addDoc(collection(db, path), {
        ...payload,
        createdAt: serverTimestamp(),
      });
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
    const payload: any = {
      name: (targetChar.data?.basic?.name) || '未命名人物(分享)',
      data: {
         basic: {
            name: targetChar.data?.basic?.name || '未命名人物(分享)',
            avatars: targetChar.data?.basic?.avatars || []
         }
      },
      isPublic: false,
      updatedAt: serverTimestamp(),
      ownerId: auth.currentUser.uid,
      folderId: folderId,
      isLink: true,
      targetId: targetChar.id,
      createdAt: serverTimestamp()
    };
    const docRef = await addDoc(collection(db, path), payload);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function moveCharacter(id: string, folderId: string | null) {
  const path = `characters/${id}`;
  try {
    await updateDoc(doc(db, 'characters', id), { folderId, updatedAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function moveFolder(id: string, parentId: string | null) {
  const path = `folders/${id}`;
  try {
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
    return await saveCharacter(rest.data, undefined, rest.folderId);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'characters');
  }
}

export async function getFolders() {
  if (!auth.currentUser) return [];
  const path = 'folders';
  try {
    const q = query(
      collection(db, path), 
      where('ownerId', '==', auth.currentUser.uid)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function createFolder(name: string, parentId: string | null = null) {
  if (!auth.currentUser) throw new Error("Must be logged in");
  const path = 'folders';
  try {
    const docRef = await addDoc(collection(db, path), {
      name,
      ownerId: auth.currentUser.uid,
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
    await updateDoc(doc(db, type === 'folder' ? 'folders' : 'characters', id), { 
      name: newName, 
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
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
}

export async function ensureLocalFolder(name: string, parentId: string | null, userId: string): Promise<string> {
  const existing = await findFolderByName(name, parentId, userId);
  if (existing) return existing.id;
  return await createFolder(name, parentId);
}

export async function deleteFolder(id: string) {
  const path = `folders/${id}`;
  try {
    // Note: In a production app, you might want to also delete/move sub-items.
    // For now, we allow deleting the folder itself.
    await deleteDoc(doc(db, 'folders', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function getMyCharacters() {
  if (!auth.currentUser) return [];
  const path = 'characters';
  try {
    const q = query(
      collection(db, path), 
      where('ownerId', '==', auth.currentUser.uid)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getCharacterById(id: string) {
  const path = `characters/${id}`;
  try {
    const docRef = doc(db, 'characters', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function deleteCharacter(id: string) {
  const path = `characters/${id}`;
  try {
    await deleteDoc(doc(db, 'characters', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
