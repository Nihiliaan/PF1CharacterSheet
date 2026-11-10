/**
 * 未检测到油猴同步助手时的提示条（含一键安装脚本入口）
 * 是否展示由容器通过条件渲染控制
 */
import React from 'react';
import { AlertTriangle, DownloadCloud } from 'lucide-react';

const HelperTipBanner: React.FC = () => {
  return (
    <div className="p-2.5 bg-amber-50 border border-amber-300 rounded text-xs text-amber-950 flex items-start justify-between gap-3">
      <div className="flex items-start gap-2">
        <AlertTriangle size={15} className="text-amber-700 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-xs">未检测到同步助手响应</p>
          <p className="text-stone-600 text-[11px] mt-0.5">
            请确认浏览器已安装并启用《PF1 人物卡跨站同步助手》（v1.4.0+），且当前浏览器已登录纯美苹果园。
          </p>
        </div>
      </div>
      <a
        href="/scripts/pf1-cross-site-sync-helper.user.js"
        target="_blank"
        rel="noopener noreferrer"
        className="px-2 py-1 text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white rounded shrink-0 shadow-2xs flex items-center gap-1 cursor-pointer"
      >
        <DownloadCloud size={12} />
        <span>一键安装/更新脚本</span>
      </a>
    </div>
  );
};

export default HelperTipBanner;
