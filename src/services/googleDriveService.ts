import { GoogleAuthProvider, signInWithPopup, getAuth } from 'firebase/auth';
import { googleProvider } from '../lib/firebase';

// 核心权限：只能访问、修改和删除由本应用创建的文件/文件夹
// 这是一个“非敏感权限”，不需要 Google 审核应用即可发布。
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const PICKER_SCOPE = 'https://www.googleapis.com/auth/drive.readonly'; // Picker typically needs this for full browsing

/**
 * 动态加载 Google API 脚本
 */
export async function loadGoogleApi(): Promise<void> {
  const loadScript = (url: string) => new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${url}"]`)) return resolve(true);
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  await Promise.all([
    loadScript('https://apis.google.com/js/api.js'),
    loadScript('https://accounts.google.com/gsi/client')
  ]);
}

/**
 * 打开 Google Picker 文件选择器
 */
export async function openGooglePicker(accessToken: string, apiKey: string, appId: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const gapi = (window as any).gapi;
    if (!gapi) return reject(new Error("Google API not loaded"));

    gapi.load('picker', {
      callback: () => {
        const pickerBuilder = new (window as any).google.picker.PickerBuilder()
          .setOAuthToken(accessToken)
          .setDeveloperKey(apiKey)
          .setAppId(appId)
          // 启用核心特性
          .enableFeature((window as any).google.picker.Feature.MULTISELECT_ENABLED)
          .enableFeature((window as any).google.picker.Feature.SUPPORT_FOLDERS)
          .enableFeature((window as any).google.picker.Feature.SUPPORT_DRIVES);

        // 使用通用文档视图，并配置文件夹选中支持
        const docsView = new (window as any).google.picker.DocsView((window as any).google.picker.ViewId.DOCS)
          .setIncludeFolders(true)
          .setSelectFolderEnabled(true)
          .setMimeTypes('application/vnd.google-apps.folder,application/json,text/plain,application/octet-stream');

        const picker = pickerBuilder
          .addView(docsView)
          .setCallback((data: any) => {
            if (data.action === (window as any).google.picker.Action.PICKED) {
              resolve(data.docs);
            } else if (data.action === (window as any).google.picker.Action.CANCEL) {
              resolve([]);
            }
          })
          .build();
        picker.setVisible(true);
      }
    });
  });
}

export async function getDriveAccessToken(extraScopes: string[] = []) {
  // Try to get cached token
  const cacheKey = 'google_drive_token_v3_' + extraScopes.join('_');
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    const { token, expiry } = JSON.parse(cached);
    if (Date.now() < expiry) {
      return token;
    }
  }

  const provider = new GoogleAuthProvider();
  provider.addScope(DRIVE_SCOPE);
  extraScopes.forEach(scope => provider.addScope(scope));
  
  const auth = getAuth();
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;
    
    if (token) {
      // Cache token for 55 minutes
      const expiry = Date.now() + 55 * 60 * 1000;
      localStorage.setItem(cacheKey, JSON.stringify({ token, expiry }));
    }
    
    return token;
  } catch (error) {
    console.error("[googleDriveService] Failed to get Google Drive access token:", error);
    throw error;
  }
}

async function findFileIdByName(accessToken: string, name: string, parentId: string | null = null, isFolder: boolean = false) {
  const query = `name = '${name.replace(/'/g, "\\'")}' and trashed = false${parentId ? ` and '${parentId}' in parents` : " and 'root' in parents"}${isFolder ? " and mimeType = 'application/vnd.google-apps.folder'" : ""}`;
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const data = await response.json();
  return data.files?.[0]?.id || null;
}

export async function ensureFolder(accessToken: string, folderName: string, parentId: string | null = null): Promise<string> {
  const existingId = await findFileIdByName(accessToken, folderName, parentId, true);
  if (existingId) return existingId;

  const metadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: parentId ? [parentId] : []
  };

  const response = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Failed to create folder');
  return data.id;
}

export async function uploadOrUpdateFile(accessToken: string, fileName: string, content: any, parentId: string) {
  const existingId = await findFileIdByName(accessToken, fileName, parentId, false);
  
  const metadata = {
    name: fileName,
    parents: existingId ? undefined : [parentId]
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' }));

  const url = existingId 
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

  const response = await fetch(url, {
    method: existingId ? 'PATCH' : 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to sync file');
  }

  return await response.json();
}

export async function listDriveFiles(accessToken: string, parentId: string) {
  const query = `'${parentId}' in parents and trashed = false`;
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id, name, mimeType)`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Failed to list files');
  return data.files || [];
}

export async function getFileContent(accessToken: string, fileId: string) {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) throw new Error('Failed to download file');
  return await response.json();
}

export async function findPF1Root(accessToken: string): Promise<string | null> {
  return await findFileIdByName(accessToken, "PF1CharacterSheet", null, true);
}
