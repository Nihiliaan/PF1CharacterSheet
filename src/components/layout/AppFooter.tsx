import React from 'react';
import { User as FirebaseUser } from 'firebase/auth';

interface AppFooterProps {
  user: FirebaseUser | null;
}

export default function AppFooter({ user }: AppFooterProps) {
  return (
    <footer className="text-center text-stone-500 bg-stone-200/50 text-[10px] py-4 font-mono uppercase tracking-widest border-t border-stone-200 flex-shrink-0">
       Personal Character Vault • {user ? `Signed in as ${user.displayName}` : 'Guest Mode'}
    </footer>
  );
}
