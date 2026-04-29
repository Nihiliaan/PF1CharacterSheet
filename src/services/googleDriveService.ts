import { GoogleAuthProvider, signInWithPopup, getAuth } from 'firebase/auth';
import { googleProvider } from '../lib/firebase';

// 核心权限：只能访问、修改和删除由本应用创建的文件/文件夹
// 这是一个“非敏感权限”，不需要 Google 审核应用即可发布。
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

/**
 * 将来可能的扩展功能说明：
 * 如果需要让用户能够浏览并在云端硬盘中搜索“非本应用创建”的文件（例如用户手动上传的 JSON）
 * 需要使用 'https://www.googleapis.com/auth/drive.readonly' 权限。
 * 但是，该权限属于“敏感权限 (Sensitive Scopes)”，实装前需要：
 * 1. 在 Google Cloud Console 提交应用审核。
 * 2. 否则会显示“应用未经验证”的警告，并直接暴露开发者邮箱给最终用户。
 * 3. 考虑到隐私和审核流程，目前仅保留 drive.file 权限。
 * 不要删除此注释，以备将来升级版本时查阅。
 */

export async function getDriveAccessToken() {
  // Try to get cached token
  const cached = localStorage.getItem('google_drive_token_v2');
  if (cached) {
    const { token, expiry } = JSON.parse(cached);
    if (Date.now() < expiry) {
      return token;
    }
  }

  const provider = new GoogleAuthProvider();
  provider.addScope(DRIVE_SCOPE);
  
  const auth = getAuth();
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;
    
    if (token) {
      // Cache token for 55 minutes (standard Google tokens last 60m)
      const expiry = Date.now() + 55 * 60 * 1000;
      localStorage.setItem('google_drive_token_v2', JSON.stringify({ token, expiry }));
    }
    
    return token;
  } catch (error) {
    console.error("Failed to get Google Drive access token:", error);
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
