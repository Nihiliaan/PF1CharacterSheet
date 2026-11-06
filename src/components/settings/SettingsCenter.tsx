import React, { useState } from 'react';
import { 
  Settings, Sliders, FileText, Database, ShieldCheck, User, Link as LinkIcon, 
  ArrowLeft, Check, Sparkles, CheckCircle2, AlertCircle, RefreshCw
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { useSettings } from '../../contexts/SettingsContext';
import { googleProvider, githubProvider, discordProvider } from '../../lib/firebase';

type SettingsTab = 'editor' | 'export' | 'storage' | 'account';

export default function SettingsCenter() {
  const { t } = useTranslation();
  const { user, handleLogin, handleLinkAccount, handleUnlinkProvider } = useAuth();
  const { setView, setToast, isHeaderPinned, setIsHeaderPinned } = useUI();
  const { settings, updateSetting } = useSettings();

  const [activeTab, setActiveTab] = useState<SettingsTab>('editor');

  const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
    { id: 'editor', label: '编辑器设置', icon: Sliders },
    { id: 'export', label: '导出设置', icon: FileText },
    { id: 'storage', label: '存储与同步', icon: Database },
    { id: 'account', label: '账户设置', icon: User },
  ];

  // 账户绑定相关数据
  const providers = [
    { id: 'google.com', name: 'Google', iconUrl: 'https://cdn.simpleicons.org/google/4285F4', provider: googleProvider },
    { id: 'github.com', name: 'GitHub', iconUrl: 'https://cdn.simpleicons.org/github/181717', provider: githubProvider },
    { id: 'discord.com', name: 'Discord', iconUrl: 'https://cdn.simpleicons.org/discord/5865F2', provider: discordProvider }
  ];
  const linkedProviders = user?.providerData?.map(p => p.providerId) || [];

  const onLink = async (provider: any) => {
    await handleLinkAccount(provider);
  };

  const onUnlink = async (providerId: string) => {
    if (linkedProviders.length <= 1) {
      setToast({ message: "至少需要保留一个登录方式", type: 'error' });
      return;
    }
    await handleUnlinkProvider(providerId);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 h-full flex flex-col overflow-hidden">
      {/* 头部导航与标题 */}
      <div className="flex items-center justify-between pb-6 border-b border-stone-200 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('editor')}
            className="p-2 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 transition-colors"
            title="返回编辑器"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-ink flex items-center gap-3 uppercase tracking-tight">
              <Settings className="text-primary" size={28} />
              系统设置
            </h2>
            <p className="text-stone-500 text-xs sm:text-sm font-medium mt-0.5">
              自定义编辑器行为、导出规范、存储缓存与账户集成
            </p>
          </div>
        </div>
      </div>

      {/* 主体：左侧 Tab 导航 + 右侧设置内容 */}
      <div className="flex-1 flex flex-col md:flex-row gap-6 pt-6 overflow-hidden min-h-0">
        {/* Tab 导航栏 */}
        <div className="flex md:flex-col gap-1.5 shrink-0 overflow-x-auto md:overflow-visible md:w-48 border-b md:border-b-0 md:border-r border-stone-200 pb-2 md:pb-0 md:pr-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap text-left ${
                  isActive
                    ? 'bg-stone-800 text-white font-bold shadow-sm'
                    : 'text-stone-600 hover:bg-stone-200/70 hover:text-stone-900'
                }`}
              >
                <Icon size={17} className={isActive ? 'text-primary' : 'text-stone-400'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* 内容展示区 */}
        <div className="flex-1 overflow-y-auto pr-1 pb-16 space-y-6">
          {/* 1. 编辑器设置 */}
          {activeTab === 'editor' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
                <h3 className="text-base font-bold text-stone-800 mb-4 pb-2 border-b border-stone-100 flex items-center gap-2">
                  <Sliders size={18} className="text-primary" />
                  界面偏好
                </h3>

                <div className="space-y-4">
                  {/* 固定顶栏 */}
                  <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-stone-100 hover:border-stone-200 hover:bg-stone-50/50 transition-colors">
                    <div className="flex-1">
                      <div className="font-bold text-stone-800 text-sm">常驻顶部菜单栏</div>
                      <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                        开启后顶部操作栏将始终保持固定显示；关闭后顶栏将随鼠标悬停自动滑动显隐，释放更多垂直阅读空间。
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                      <input
                        type="checkbox"
                        checked={isHeaderPinned}
                        onChange={(e) => setIsHeaderPinned(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-stone-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-stone-500 text-xs flex items-start gap-2.5">
                <Sparkles size={16} className="text-stone-400 shrink-0 mt-0.5" />
                <span>更多字体排印、自适应紧凑模式与富文本快捷交互设置正在持续接入中。</span>
              </div>
            </div>
          )}

          {/* 2. 导出设置 */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
                <h3 className="text-base font-bold text-stone-800 mb-4 pb-2 border-b border-stone-100 flex items-center gap-2">
                  <FileText size={18} className="text-primary" />
                  BBCode 导出规则
                </h3>

                <div className="space-y-4">
                  {/* 多件物品导出时显示总价和总重 */}
                  <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-stone-100 hover:border-stone-200 hover:bg-stone-50/50 transition-colors">
                    <div className="flex-1">
                      <div className="font-bold text-stone-800 text-sm flex items-center gap-2">
                        多件物品导出时显示总价和总重
                      </div>
                      <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                        开启后，在导出 BBCode 装备与物品清单时，当某件物品数量大于 1，其表格中的价值和重量将自动计算并显示为单项数值乘以数量的总价与总重；关闭时则保持显示单件数值。
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                      <input
                        type="checkbox"
                        checked={settings.export.showTotalForMultipleItems}
                        onChange={(e) => updateSetting('export', 'showTotalForMultipleItems', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-stone-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. 存储与同步设置 */}
          {activeTab === 'storage' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
                <h3 className="text-base font-bold text-stone-800 mb-4 pb-2 border-b border-stone-100 flex items-center gap-2">
                  <Database size={18} className="text-primary" />
                  本地缓存与持久化
                </h3>

                <div className="space-y-4">
                  {/* 开启本地缓存，离开页面也可在本地保留修改 */}
                  <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-stone-100 hover:border-stone-200 hover:bg-stone-50/50 transition-colors">
                    <div className="flex-1">
                      <div className="font-bold text-stone-800 text-sm">
                        开启本地缓存，离开页面也可在本地保留修改
                      </div>
                      <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                        开启后，所有编辑修改将实时自动保存在本地安全缓存中。用户关闭标签页、刷新、切换视图或新建角色时，将不再弹出未保存拦截提示；同时在编辑器顶部工具栏呈现“放弃修改”按钮，支持随时放弃未保存草稿并重置为上次保存的状态。
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                      <input
                        type="checkbox"
                        checked={settings.storage.enableLocalAutoCache}
                        onChange={(e) => updateSetting('storage', 'enableLocalAutoCache', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-stone-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  {/* 保存人物卡时自动尝试同步到纯美苹果园 */}
                  <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-stone-100 hover:border-stone-200 hover:bg-stone-50/50 transition-colors">
                    <div className="flex-1">
                      <div className="font-bold text-stone-800 text-sm flex items-center gap-2">
                        <RefreshCw size={14} className="text-amber-700" />
                        保存人物卡时自动尝试同步到纯美苹果园
                      </div>
                      <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                        开启后，每当点击“保存”且当前角色已在“果园同步”中绑定了论坛楼层编号时，系统将在保存成功后自动通过论坛助手油猴脚本将最新排版的 BBCode 静默同步至纯美苹果园对应的帖子楼层中。
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                      <input
                        type="checkbox"
                        checked={settings.storage.autoSyncToForumOnSave}
                        onChange={(e) => updateSetting('storage', 'autoSyncToForumOnSave', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-stone-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. 账户设置 */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              {!user ? (
                <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center shadow-xs">
                  <User size={56} className="text-stone-300 mx-auto mb-4" />
                  <h3 className="text-xl font-serif font-bold text-stone-800 mb-2">未登录账户</h3>
                  <p className="text-stone-500 text-xs sm:text-sm max-w-md mx-auto mb-6">
                    登录后可在云端无限保存角色卡、跨设备实时同步档案库，并管理三方身份凭据。
                  </p>
                  <button
                    onClick={() => handleLogin(googleProvider)}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-stone-800 hover:bg-stone-900 text-white rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer"
                  >
                    <User size={16} />
                    <span>立即使用 Google 登录</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* 用户基本资料 */}
                  <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
                    <div className="flex flex-col sm:flex-row items-center gap-5">
                      <div className="relative shrink-0">
                        <img
                          src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`}
                          alt="Avatar"
                          className="w-20 h-20 rounded-full border-4 border-stone-50 shadow-md object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute bottom-0 right-0 p-1 bg-primary text-white rounded-full border-2 border-white">
                          <ShieldCheck size={12} />
                        </div>
                      </div>
                      <div className="text-center sm:text-left flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-stone-800 truncate">{user.displayName || '未命名用户'}</h3>
                        <p className="text-stone-500 font-mono text-xs mt-0.5 truncate">{user.email}</p>
                        <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-1.5">
                          {linkedProviders.map((id) => (
                            <span
                              key={id}
                              className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded text-[10px] font-bold uppercase tracking-wider border border-stone-200"
                            >
                              {id.split('.')[0]} 已验证
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 第三方账号绑定 */}
                  <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
                    <div className="p-5 bg-stone-50 border-b border-stone-200">
                      <h4 className="flex items-center gap-2 text-sm font-bold text-stone-700">
                        <LinkIcon size={16} className="text-stone-400" /> 第三方账号绑定
                      </h4>
                    </div>
                    <div className="p-5 space-y-3">
                      {providers.map((p) => {
                        const isLinked = linkedProviders.includes(p.id);
                        return (
                          <div
                            key={p.id}
                            className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-stone-100 hover:border-stone-200 transition-all"
                          >
                            <div className="flex items-center gap-3.5">
                              <div
                                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors ${
                                  isLinked ? 'bg-primary/5' : 'bg-stone-100 grayscale'
                                }`}
                              >
                                <img src={p.iconUrl} alt={p.name} className="w-5 h-5 object-contain" />
                              </div>
                              <div>
                                <span className="font-bold text-stone-800 text-sm block capitalize">{p.name} 登录</span>
                                <span className="text-[10px] font-medium text-stone-400">
                                  {isLinked ? '已并入您的身份凭据' : '尚未绑定'}
                                </span>
                              </div>
                            </div>
                            {isLinked ? (
                              <button
                                onClick={() => onUnlink(p.id)}
                                className="text-xs font-bold text-stone-400 hover:text-rose-600 px-3.5 py-1.5 rounded-lg hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100 cursor-pointer"
                              >
                                解绑
                              </button>
                            ) : (
                              <button
                                onClick={() => onLink(p.provider)}
                                className="text-xs font-bold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer"
                              >
                                立即绑定
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="px-5 py-3.5 bg-stone-50 border-t border-stone-200">
                      <p className="text-[11px] text-stone-400 font-medium">
                        * 绑定多个账号后，可以使用其中任何一个账号登录同一个系统账户。
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
