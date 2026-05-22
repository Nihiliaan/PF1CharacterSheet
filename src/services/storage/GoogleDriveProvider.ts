import { IStorageProvider, StorageItem } from './types';
import * as driveService from '../googleDriveService';

/**
 * Google Drive 存储适配器
 */
export class GoogleDriveProvider implements IStorageProvider {
  name = 'GoogleDrive';
  private token: string | null = null;

  async getToken() {
    if (!this.token) {
      this.token = await driveService.getDriveAccessToken();
    }
    return this.token;
  }

  async save(item: Partial<StorageItem>): Promise<string> {
    const token = await this.getToken();
    if (!item.parentId) throw new Error('Parent ID required for Drive save');
    const result = await driveService.uploadOrUpdateFile(token, item.name!, item.data, item.parentId);
    return result.id;
  }

  async load(id: string): Promise<StorageItem> {
    const token = await this.getToken();
    const content = await driveService.getFileContent(token, id);
    return {
      id,
      name: '', // Drive metadata list would be needed to get name if id only
      data: content,
      parentId: null
    };
  }

  async list(parentId: string | null): Promise<StorageItem[]> {
    const token = await this.getToken();
    const driveParentId = parentId || 'root';
    const files = await driveService.listDriveFiles(token, driveParentId);
    return files.map((f: any) => ({
      id: f.id,
      name: f.name,
      data: null,
      parentId: driveParentId,
      mimeType: f.mimeType
    }));
  }

  async ensureFolder(name: string, parentId: string | null): Promise<string> {
    const token = await this.getToken();
    return await driveService.ensureFolder(token, name, parentId);
  }
}
