import React from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { useTranslation } from 'react-i18next';

interface AppFooterProps {
  user: FirebaseUser | null;
}

export default function AppFooter({ user }: AppFooterProps) {
  const { t } = useTranslation();
  return (
    <footer className="text-center text-stone-500 bg-stone-200/50 text-[10px] py-4 font-mono uppercase tracking-widest border-t border-stone-200 flex-shrink-0">
       {t('footer.vault')} • {user ? t('footer.signed_in', { name: user.displayName }) : t('footer.guest')}
    </footer>
  );
}
