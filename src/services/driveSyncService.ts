import { IStorageProvider, StorageItem } from './storage/types';
import { FirestoreStorageProvider } from './storage/FirestoreProvider';
import { GoogleDriveProvider } from './storage/GoogleDriveProvider';
import { User as FirebaseUser } from 'firebase/auth';

/**
 * 核心同步服务：负责在不同的存储提供商之间同步数据
 * 这是一个“深层”模块，它只关心 IStorageProvider 接口，不关心具体的存储实现。
 */
export class SyncService {
  /**
   * 将源提供商的数据递归同步到目标提供商
   */
  static async sync(
    source: IStorageProvider,
    target: IStorageProvider,
    sourceParentId: string | null = null,
    targetParentId: string | null = null,
    onProgress?: (msg: string) => void
  ) {
    const items = await source.list(sourceParentId);
    
    for (const item of items) {
      if (item.mimeType === 'application/vnd.google-apps.folder') {
        onProgress?.(`正在同步文件夹: ${item.name}`);
        const newTargetFolderId = await target.ensureFolder(item.name, targetParentId);
        await this.sync(source, target, item.id, newTargetFolderId, onProgress);
      } else {
        onProgress?.(`正在同步文件: ${item.name}`);
        const fullItem = await source.load(item.id);
        await target.save({
          name: fullItem.name,
          data: fullItem.data,
          parentId: targetParentId
        });
      }
    }
  }
}

/**
 * 业务同步服务 (旧服务的重构版本，保持 API 兼容)
 */
export const driveSyncService = {
  async backupToCloud(user: FirebaseUser) {
    const firestore = new FirestoreStorageProvider();
    const drive = new GoogleDriveProvider();
    
    const rootDriveId = await drive.ensureFolder('PF1CharacterSheet', null);
    await SyncService.sync(firestore, drive, null, rootDriveId);
  },

  async restoreFromCloud(user: FirebaseUser, currentFolderId: string | null) {
    const firestore = new FirestoreStorageProvider();
    const drive = new GoogleDriveProvider();
    
    const token = await drive.getToken();
    const pf1RootId = await (new GoogleDriveProvider()).list(null).then(items => items.find(i => i.name === 'PF1CharacterSheet')?.id);
    
    if (pf1RootId) {
      await SyncService.sync(drive, firestore, pf1RootId, currentFolderId);
    }
  },

  // 保持浏览和导航的兼容性
  async browseDrive(user: FirebaseUser | null) {
    const drive = new GoogleDriveProvider();
    const items = await drive.list(null);
    const root = items.find(i => i.name === 'PF1CharacterSheet');
    
    if (!root) return { needsFolder: true };
    
    const rootItems = await drive.list(root.id);
    return {
      currentPath: [{ id: root.id, name: 'PF1CharacterSheet' }],
      items: rootItems
    };
  },

  async navigate(folderId: string, folderName: string, currentPath: any[]) {
    const drive = new GoogleDriveProvider();
    const items = await drive.list(folderId);
    return {
      currentPath: [...currentPath, { id: folderId, name: folderName }],
      items
    };
  },

  async importItems(item: any, user: FirebaseUser, currentFolderId: string | null) {
    const firestore = new FirestoreStorageProvider();
    const drive = new GoogleDriveProvider();

    if (item.mimeType === 'application/vnd.google-apps.folder') {
      const newLocalId = await firestore.ensureFolder(item.name, currentFolderId);
      await SyncService.sync(drive, firestore, item.id, newLocalId);
    } else {
      const fullItem = await drive.load(item.id);
      await firestore.save({
        name: item.name,
        data: fullItem.data,
        parentId: currentFolderId
      });
    }
  }
};
