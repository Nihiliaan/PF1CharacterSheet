import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

/**
 * 将渲染出的 SVG 或 BBCode 内容上传至 Google Cloud Storage (Firebase Storage)
 * 路径格式：public_cards/${charId}/${templateId}.${extension}
 */
export async function uploadRenderedCard(
  charId: string,
  templateId: string,
  content: string,
  mimeType: string,
  extension: string
): Promise<{ downloadUrl: string; storagePath: string }> {
  if (!charId) {
    throw new Error('未提供有效的人物卡 ID (charId)');
  }
  if (!templateId) {
    throw new Error('未提供有效的模板 ID (templateId)');
  }

  const safeCharId = encodeURIComponent(charId);
  const safeTemplateId = encodeURIComponent(templateId);
  const storagePath = `public_cards/${safeCharId}/${safeTemplateId}.${extension}`;

  const storageRef = ref(storage, storagePath);

  // 设定公共可读元数据与缓存策略 (120 秒，平衡实时性与 CDN 负载)
  const metadata = {
    contentType: mimeType,
    cacheControl: 'public,max-age=120',
    customMetadata: {
      charId,
      templateId,
      uploadedAt: new Date().toISOString()
    }
  };

  await uploadString(storageRef, content, 'raw', metadata);
  const downloadUrl = await getDownloadURL(storageRef);

  return { downloadUrl, storagePath };
}

/**
 * 组装规范化的动态外链 URL
 * @param charId 角色 ID
 * @param templateId 模板 ID
 * @param extension 格式后缀 ('svg' | 'bbc')
 * @param format 'query' (推荐：?charId=...&templateId=...) 或 'path' (/render/charId/templateId.svg)
 */
export function getRenderUrl(
  charId: string,
  templateId: string,
  extension: string = 'svg',
  format: 'query' | 'path' = 'query'
): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://pf1charactersheet-157e9.web.app';
  const cleanCharId = encodeURIComponent(charId || 'default');
  const cleanTemplateId = encodeURIComponent(templateId || 'svg-badge');

  if (format === 'query') {
    return `${origin}/api/render?charId=${cleanCharId}&templateId=${cleanTemplateId}`;
  }

  return `${origin}/render/${cleanCharId}/${cleanTemplateId}.${extension}`;
}
