import React from 'react';
import { Settings, ShieldCheck, User, Link as LinkIcon } from 'lucide-react';
import { useCharacter } from '../../contexts/CharacterContext';
import { googleProvider, githubProvider, discordProvider } from '../../lib/firebase';

interface AccountSettingsProps {}

const AccountSettings = ({}: AccountSettingsProps) => {
  const { 
    user, 
    setToast, 
    handleLinkAccount, 
    handleUnlinkProvider 
  } = useCharacter();

  if (!user) return null;

  const providers = [
    { id: 'google.com', name: 'Google', icon: User, provider: googleProvider },
    { id: 'github.com', name: 'GitHub', icon: User, provider: githubProvider },
    { id: 'discord.com', name: 'Discord', icon: User, provider: discordProvider }
  ];

  const linkedProviders = user.providerData.map(p => p.providerId);

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
    <div className="max-w-2xl mx-auto py-12 px-4 h-full overflow-y-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-serif font-bold text-ink flex items-center gap-3 uppercase tracking-tight">
          <Settings className="text-primary animate-spin-slow" size={32} />
          账户设置
        </h2>
        <p className="text-stone-500 mt-2 font-medium">管理您的个人资料和账号连接</p>
      </div>

      <div className="flex flex-col gap-6 pb-20">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 hover:shadow-md transition-shadow">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group">
              <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} className="w-24 h-24 rounded-full border-4 border-stone-50 shadow-lg object-cover group-hover:scale-105 transition-transform" referrerPolicy="no-referrer" />
              <div className="absolute bottom-0 right-0 p-1.5 bg-primary text-white rounded-full border-2 border-white">
                <ShieldCheck size={14} />
              </div>
            </div>
            <div className="text-center sm:text-left">
              <h3 className="text-2xl font-bold text-stone-800">{user.displayName || '未命名用户'}</h3>
              <p className="text-stone-500 font-mono text-sm">{user.email}</p>
              <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-2">
                {linkedProviders.map(id => (
                  <span key={id} className="px-2.5 py-1 bg-stone-100 text-stone-600 rounded-md text-[10px] font-bold uppercase tracking-wider border border-stone-200">
                    {id.split('.')[0]} 已验证
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Connections */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="p-6 bg-stone-50 border-b border-stone-200">
            <h4 className="flex items-center gap-2 text-sm font-bold text-stone-700">
              <LinkIcon size={16} className="text-stone-400" /> 第三方账号绑定
            </h4>
          </div>
          <div className="p-6 space-y-4">
            {providers.map(p => {
              const isLinked = linkedProviders.includes(p.id);
              return (
                <div key={p.id} className="group flex items-center justify-between p-4 bg-white rounded-xl border border-stone-100 hover:border-primary/20 hover:shadow-md transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl transition-colors ${isLinked ? 'bg-primary/10 text-primary' : 'bg-stone-100 text-stone-400'}`}>
                      <p.icon size={20} />
                    </div>
                    <div>
                      <span className="font-bold text-stone-800 block capitalize">{p.name} 登录方式</span>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">
                        {isLinked ? '已并入您的多元宇宙身份' : '尚未觉醒此登录路径'}
                      </span>
                    </div>
                  </div>
                  {isLinked ? (
                    <button 
                      onClick={() => onUnlink(p.id)}
                      className="text-xs font-bold text-stone-400 hover:text-rose-600 px-4 py-2 rounded-lg hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100"
                    >
                      断开连接
                    </button>
                  ) : (
                    <button 
                      onClick={() => onLink(p.provider)}
                      className="text-xs font-bold text-primary hover:bg-primary text-white bg-primary/10 px-4 py-2 rounded-lg hover:text-white transition-all border border-primary/20"
                    >
                      立即绑定
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="px-6 py-4 bg-stone-50 border-t border-stone-200">
            <p className="text-[10px] text-stone-400 font-medium italic">
              * 绑定多个账号后，可以使用其中任何一个账号登录同一个系统账户。若绑定时提示冲突，请确保该账号未被其他用户占用。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
