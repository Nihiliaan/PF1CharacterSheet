export interface StorageItem {
  id: string;
  name: string;
  data: any;
  mimeType?: string;
  parentId: string | null;
  updatedAt?: any;
}

export interface IStorageProvider {
  name: string;
  save(item: Partial<StorageItem>): Promise<string>;
  load(id: string): Promise<StorageItem>;
  list(parentId: string | null): Promise<StorageItem[]>;
  ensureFolder(name: string, parentId: string | null): Promise<string>;
}
