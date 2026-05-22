import { useState, useEffect } from 'react';
import { driveSyncService } from '../../services/driveSyncService';
import { useUI } from '../UIContext';
import { useAuth } from '../AuthContext';
import { useVault } from '../VaultContext';
import * as driveService from '../../services/googleDriveService';

export const useDriveSync = () => {
  const { setToast } = useUI();
  const { user } = useAuth();
  const { refreshCharacterList, currentFolderId } = useVault();

  const [driveModal, setDriveModal] = useState<{ isOpen: boolean, currentPath: { id: string, name: string }[], items: any[] } | null>(null);
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);

  // 初始化 Google API
  useEffect(() => {
    driveService.loadGoogleApi().catch(console.error);
  }, []);

  const handleBrowseDrive = async () => {
    console.log("[useDriveSync] handleBrowseDrive triggered");
    setToast({ message: "正在连接 Google 云端硬盘..." });
    try {
      console.log("[useDriveSync] Calling driveSyncService.browseDrive with user:", user?.uid);
      const result = await driveSyncService.browseDrive(user);
      console.log("[useDriveSync] browseDrive result:", result);
      
      if (result.needsFolder) {
        console.log("[useDriveSync] PF1 folder not found");
        setToast({ message: "未找到备份文件夹 (PF1CharacterSheet)", type: 'info' });
        return;
      }
      
      console.log("[useDriveSync] Setting driveModal to open");
      setDriveModal({ isOpen: true, currentPath: result.currentPath!, items: result.items! });
    } catch (e: any) {
      console.error("[useDriveSync] Connection failed:", e);
      setToast({ message: "连接失败: " + e.message, type: 'error' });
    }
  };

  /**
   * 使用 Google Picker 浏览整个云端硬盘 (根目录)
   */
  const handleBrowseDriveRoot = async () => {
    if (!user) return;
    setToast({ message: "正在启动文件选择器..." });
    try {
      const extraScopes = ['https://www.googleapis.com/auth/drive.readonly'];
      const token = await driveService.getDriveAccessToken(extraScopes);
      
      // 获取配置
      const response = await fetch('/firebase-applet-config.json');
      const config = await response.json();
      
      console.log("[useDriveSync] Launching Picker with AppID:", config.messagingSenderId);

      const selectedDocs = await driveService.openGooglePicker(
        token, 
        config.apiKey, 
        config.messagingSenderId // Picker App ID 通常就是项目编号 (Project Number)
      );
      
      if (selectedDocs.length > 0) {
        // 先给用户反馈，并稍微延迟执行，让 Picker 的回调能干净地结束，避免阻塞 UI
        setToast({ message: `正在准备导入 ${selectedDocs.length} 个项目...` });
        
        setTimeout(async () => {
          try {
            let successCount = 0;
            for (const doc of selectedDocs) {
               if (doc.mimeType === 'application/vnd.google-apps.folder') {
                 await driveSyncService.importItems(doc, user, currentFolderId);
               } else {
                 const fullItem = await driveService.getFileContent(token, doc.id);
                 await driveSyncService.importSingleFile({
                   id: doc.id,
                   name: doc.name,
                   data: fullItem
                 }, user, currentFolderId);
               }
               successCount++;
            }
            await refreshCharacterList();
            setToast({ message: `导入成功！共导入 ${successCount} 个项目` });
          } catch (error: any) {
            setToast({ message: "导入过程出错: " + error.message, type: 'error' });
          }
        }, 100);
      }
    } catch (e: any) {
      console.error("Picker failed:", e);
      setToast({ message: "浏览失败: " + e.message, type: 'error' });
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
      await driveSyncService.backupToCloud(user);
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
    handleBrowseDrive, handleBrowseDriveRoot, navigateDrive, navigateToPathIndex, importFromDrive, handleCloudBackup, handleCloudRestore
  };
};
