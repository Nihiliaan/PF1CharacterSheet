import { IStorageProvider, StorageItem } from './types';
import * as characterService from '../characterService';
import { saveTemplate } from '../templateService';
import { auth } from '../../lib/firebase';
import { Character, Folder } from '../characterService';

/**
 * Firebase/Firestore 存储适配器
 */
export class FirestoreStorageProvider implements IStorageProvider {
  name = 'Firestore';

  async save(item: Partial<StorageItem>): Promise<string> {
    // 模板文件（.bbc）写入独立的 templates 集合，人物卡写入 characters 集合
    if (item.name?.endsWith('.bbc')) {
      const content = item.data?.content;
      if (typeof content !== 'string') throw new Error('无效的模板文件：缺少 content');
      return await saveTemplate({ content, name: item.name }, item.id, item.parentId || undefined);
    }
    return await characterService.saveCharacter(item.data, item.id, item.parentId || undefined) || '';
  }

  async load(id: string): Promise<StorageItem> {
    const doc = await characterService.getCharacterById(id);
    if (!doc) throw new Error('Document not found');
    return {
      id: doc.id,
      name: doc.name,
      data: doc.data,
      parentId: doc.folderId,
      updatedAt: doc.updatedAt
    };
  }

  async list(parentId: string | null): Promise<StorageItem[]> {
    const characters = await characterService.getMyCharacters();
    const folders = await characterService.getFolders();
    
    const items: StorageItem[] = [
      ...folders.map((f: Folder) => ({
        id: f.id,
        name: f.name,
        data: null,
        parentId: f.parentId,
        mimeType: 'application/vnd.google-apps.folder'
      })),
      ...characters.map((c: Character) => ({
        id: c.id,
        name: c.name,
        data: c.data,
        parentId: c.folderId,
        updatedAt: c.updatedAt
      }))
    ];

    return items.filter(item => item.parentId === parentId);
  }

  async ensureFolder(name: string, parentId: string | null): Promise<string> {
    if (!auth.currentUser) throw new Error('Not logged in');
    return await characterService.ensureLocalFolder(name, parentId, auth.currentUser.uid);
  }
}

