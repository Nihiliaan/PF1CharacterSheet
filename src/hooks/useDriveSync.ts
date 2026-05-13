import { useState } from 'react';
import { driveSyncService } from '../services/driveSyncService';
import { useUI } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';
import { useVault } from '../contexts/VaultContext';

export const useDriveSync = () => {
  const { setToast } = useUI();
  const { user } = useAuth();
  const { refreshCharacterList, myCharacters, folders, currentFolderId } = useVault();

  const [driveModal, setDriveModal] = useState<{ isOpen: boolean, currentPath: { id: string, name: string }[], items: any[] } | null>(null);
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);

  const handleBrowseDrive = async () => {
    setToast({ message: "正在连接 Google 云端硬盘..." });
    try {
      const result = await driveSyncService.browseDrive(user);
      if (result.needsFolder) {
        setToast({ message: "未找到备份文件夹 (PF1CharacterSheet)", type: 'info' });
        return;
      }
      setDriveModal({ isOpen: true, currentPath: result.currentPath!, items: result.items! });
    } catch (e: any) {
      setToast({ message: "连接失败: " + e.message, type: 'error' });
    }
  };

  const navigateDrive = async (folderId: string, folderName: string) => {
    if (!driveModal) return;
    try {
      const result = await driveSyncService.navigate(folderId, folderName, driveModal.currentPath);
      setDriveModal({ ...driveModal, currentPath: result.currentPath, items: result.items });
    } catch (e: any) {
      setToast({ message: "跳转失败: " + e.message, type: 'error' });
    }
  };

  const navigateToPathIndex = async (index: number) => {
    if (!driveModal) return;
    try {
      const target = driveModal.currentPath[index];
      const result = await driveSyncService.navigate(target.id, target.name, driveModal.currentPath.slice(0, index));
      setDriveModal({ ...driveModal, currentPath: result.currentPath, items: result.items });
    } catch (e: any) {
      setToast({ message: "跳转失败: " + e.message, type: 'error' });
    }
  };

  const importFromDrive = async (item: any) => {
    if (!item || !driveModal || !user) return;
    setToast({ message: `正在从云端读取: ${item.name}...` });
    try {
      const count = await driveSyncService.importItems(item, user, currentFolderId);
      await refreshCharacterList();
      setToast({ message: `导入成功！共导入 ${count} 个人物卡` });
      setDriveModal(null);
    } catch (e: any) {
      setToast({ message: "导入失败: " + e.message, type: 'error' });
    }
  };

  const handleCloudBackup = async () => {
    if (!user) return;
    setIsSyncingDrive(true);
    setToast({ message: "正在备份到 Google 云端硬盘..." });
    try {
      await driveSyncService.backupToCloud(user, myCharacters, folders);
      setToast({ message: "备份成功！所有数据已同步至 PF1CharacterSheet 文件夹" });
    } catch (e: any) {
      console.error(e);
      setToast({ message: `备份失败: ${e.message}`, type: 'error' });
    } finally {
      setIsSyncingDrive(false);
    }
  };

  const handleCloudRestore = async () => {
    if (!user) return;
    setToast({ message: "正在从云端备份还原数据..." });
    try {
      const count = await driveSyncService.restoreFromCloud(user, currentFolderId);
      await refreshCharacterList();
      setToast({ message: `还原成功！共恢复 ${count} 个人物卡` });
    } catch (e: any) {
      setToast({ message: "还原失败: " + e.message, type: 'error' });
    }
  };

  return {
    driveModal, setDriveModal,
    isSyncingDrive,
    handleBrowseDrive, navigateDrive, navigateToPathIndex, importFromDrive, handleCloudBackup, handleCloudRestore
  };
};
