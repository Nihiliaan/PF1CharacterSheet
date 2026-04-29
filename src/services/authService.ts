import { 
  signInWithPopup, 
  linkWithPopup, 
  unlink, 
  signOut, 
  User,
  AuthProvider,
  GoogleAuthProvider,
  GithubAuthProvider,
  OAuthProvider
} from 'firebase/auth';
import { auth, googleProvider, githubProvider, discordProvider } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export async function loginWithProvider(provider: AuthProvider) {
  try {
    const result = await signInWithPopup(auth, provider);
    await syncUserProfile(result.user);
    return result.user;
  } catch (error) {
    console.error("Login failed", error);
    throw error;
  }
}

export async function linkAccount(provider: AuthProvider) {
  if (!auth.currentUser) throw new Error("No user logged in");
  try {
    const result = await linkWithPopup(auth.currentUser, provider);
    await syncUserProfile(result.user);
    return result.user;
  } catch (error: any) {
    if (error.code === 'auth/credential-already-in-use') {
      // Handle account merging logic or just inform user
      console.error("Account already in use");
    }
    throw error;
  }
}

export async function unlinkProvider(providerId: string) {
  if (!auth.currentUser) throw new Error("No user logged in");
  try {
    const result = await unlink(auth.currentUser, providerId);
    await syncUserProfile(result);
    return result;
  } catch (error) {
    console.error("Unlink failed", error);
    throw error;
  }
}

export async function logout() {
  await signOut(auth);
}

async function syncUserProfile(user: User) {
  const userRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userRef);
  
  const userData = {
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
    linkedProviders: user.providerData.map(p => p.providerId),
    lastLogin: new Date().toISOString()
  };

  if (!userDoc.exists()) {
    await setDoc(userRef, userData);
  } else {
    await updateDoc(userRef, userData);
  }
}
