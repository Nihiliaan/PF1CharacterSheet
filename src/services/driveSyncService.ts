import { getDriveAccessToken, ensureFolder as ensureFolderDrive, uploadOrUpdateFile, listDriveFiles, getFileContent, findPF1Root } from './googleDriveService';
import { ensureLocalFolder as ensureLocalFolderService, saveLink, getMyCharacters, getFolders, saveCharacter as saveCharacterService } from './characterService';
import { CharacterData } from '../types';
import { User as FirebaseUser } from 'firebase/auth';

/**
 * 处理 Google Drive 同步、备份和恢复的逻辑服务
 */
export const driveSyncService = {
  /**
   * 浏览 Google Drive 根目录
   */
  async browseDrive(user: FirebaseUser | null) {
    if (!user) throw new Error("User not logged in");
    const isGoogleUser = user.providerData.some(p => p.providerId === 'google.com');
    if (!isGoogleUser) throw new Error("Not a Google user");

    const token = await getDriveAccessToken();
    if (!token) throw new Error("No token");

    const pf1RootId = await findPF1Root(token);
    if (!pf1RootId) return { needsFolder: true };

    const items = await listDriveFiles(token, pf1RootId);
    return {
      currentPath: [{ id: pf1RootId, name: 'PF1CharacterSheet' }],
      items
    };
  },

  /**
   * 导航到 Drive 文件夹
   */
  async navigate(folderId: string, folderName: string, currentPath: any[]) {
    const token = await getDriveAccessToken();
    const items = await listDriveFiles(token, folderId);
    return {
      currentPath: [...currentPath, { id: folderId, name: folderName }],
      items
    };
  },

  /**
   * 从 Drive 导入项目
   */
  async importItems(item: any, user: FirebaseUser, currentFolderId: string | null, onProgress?: (msg: string) => void) {
    const token = await getDriveAccessToken();
    let count = 0;

    const processItem = async (driveItem: any, targetId: string | null) => {
      if (driveItem.mimeType === 'application/vnd.google-apps.folder') {
        const newLocalId = await ensureLocalFolderService(driveItem.name, targetId, user.uid);
        const children = await listDriveFiles(token, driveItem.id);
        for (const child of children) {
          await processItem(child, newLocalId);
        }
      } else if (driveItem.name.endsWith('.json')) {
        const content = await getFileContent(token, driveItem.id);
        if (content._isLink && content._targetId) {
          const fakeTargetChar = { id: content._targetId, data: content };
          await saveLink(fakeTargetChar, targetId);
          count++;
        } else if (content.basic && content.attributes) {
          const finalData = { ...content, basic: { ...content.basic, name: content.basic.name || driveItem.name.replace('.json', '') } };
          // Note: Context will need to handle the actual save call or we pass a save function
          await saveCharacterService(finalData, undefined, targetId || undefined);
          count++;
        }
      }
    };

    await processItem(item, currentFolderId);
    return count;
  },

  /**
   * 备份所有数据到云端
   */
  async backupToCloud(user: FirebaseUser, characters: any[], folders: any[]) {
    const token = await getDriveAccessToken();
    if (!token) throw new Error("No token");

    const rootFolderId = await ensureFolderDrive(token, "PF1CharacterSheet");
    const driveFolderMap: Record<string, string> = { 'root': rootFolderId };

    const sortedFoldersList = [...folders].sort((a, b) => {
      const getDepth = (id: string | null): number => {
        if (!id) return 0;
        const f = folders.find(f => f.id === id);
        return 1 + getDepth(f?.parentId || null);
      };
      return getDepth(a.parentId) - getDepth(b.parentId);
    });

    for (const folder of sortedFoldersList) {
      const parentDriveId = driveFolderMap[folder.parentId || 'root'];
      const driveId = await ensureFolderDrive(token, folder.name, parentDriveId);
      driveFolderMap[folder.id] = driveId;
    }

    await Promise.all(characters.map(async char => {
      const parentDriveId = driveFolderMap[char.folderId || 'root'] || rootFolderId;
      const rawName = char.name || '未命名角色';
      const rawClasses = char.data?.basic?.classes || '人物卡';
      const fileName = `${rawName.replace(/[\\/:*?"<>|]/g, '_')}_${String(rawClasses).replace(/[\\/:*?"<>|]/g, '_').slice(0, 30)}_${char.id.slice(-6)}.json`;

      let dataToSave = char.data;
      if (char.isLink) {
        dataToSave = { ...char.data, _isLink: true, _targetId: char.targetId };
      }
      await uploadOrUpdateFile(token, fileName, dataToSave, parentDriveId);
    }));
  },

  /**
   * 从云端还原数据
   */
  async restoreFromCloud(user: FirebaseUser, currentFolderId: string | null) {
    const token = await getDriveAccessToken();
    if (!token) throw new Error("No token");

    const pf1RootId = await findPF1Root(token);
    if (!pf1RootId) return 0;

    let importCount = 0;
    const processDriveFolder = async (driveFolderId: string, localParentId: string | null) => {
      const items = await listDriveFiles(token, driveFolderId);
      for (const item of items) {
        if (item.mimeType === 'application/vnd.google-apps.folder') {
          const newLocalFolderId = await ensureLocalFolderService(item.name, localParentId, user.uid);
          await processDriveFolder(item.id, newLocalFolderId);
        } else if (item.name.endsWith('.json')) {
          try {
            const content = await getFileContent(token, item.id);
            if (content._isLink && content._targetId) {
              const fakeTargetChar = { id: content._targetId, data: content };
              await saveLink(fakeTargetChar, localParentId);
              importCount++;
            } else if (content.basic && content.attributes) {
              const finalData = { ...content, basic: { ...content.basic, name: content.basic.name || item.name.split('_')[0].replace('.json', '') } };
              await saveCharacterService(finalData, undefined, localParentId || undefined);
              importCount++;
            }
          } catch (e) {
            console.warn(`Failed to restore file ${item.name}`, e);
          }
        }
      }
    };

    await processDriveFolder(pf1RootId, currentFolderId);
    return importCount;
  }
};
