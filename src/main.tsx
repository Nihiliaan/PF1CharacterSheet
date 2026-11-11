import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './i18n/config';

// Mitigate "This document requires 'TrustedHTML' assignment" errors
// which can be caused by certain extensions or userscripts in some environments.
const windowAny = window as any;
if (windowAny.trustedTypes && windowAny.trustedTypes.createPolicy) {
  try {
    windowAny.trustedTypes.createPolicy('default', {
      createHTML: (string: string) => string,
      createScriptURL: (string: string) => string,
      createScript: (string: string) => string,
    });
  } catch (e) {
    console.warn('TrustedTypes default policy could not be created:', e);
  }
}

// 启动时若 URL 带有 ?id=（分享链接等），先询问是否已有存活的实例：
// 有则把文档转交给已有实例（其应用内新开选项卡），本页停留提示并尝试自动关闭；
// 没有则正常启动应用。
(async () => {
  const urlId = new URLSearchParams(window.location.search).get('id');
  if (urlId) {
    try {
      const { requestOpenInExistingInstance } = await import('./utils/tabHandoff');
      const handled = await requestOpenInExistingInstance(urlId);
      if (handled) {
        document.body.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#57534e;background:#fafaf9;">
            <div style="text-align:center;">
              <p style="font-size:15px;font-weight:bold;margin-bottom:8px;">已在已打开的应用窗口中打开该文档</p>
              <p style="font-size:12px;color:#a8a29e;">本页可以关闭了（若未自动关闭）</p>
            </div>
          </div>`;
        window.close();
        return;
      }
    } catch (e) {
      console.warn('[boot] 跨窗口转交检测失败，正常启动:', e);
    }
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
})();
