import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, GithubAuthProvider, OAuthProvider } from 'firebase/auth'; 
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import firebaseAppletConfig from '../../firebase-applet-config.json';

// Firebase Configuration - Prioritize Environment Variables for GitHub/External hosting
// If environment variables are not set (e.g. in development), fallback to the local config file.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseAppletConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseAppletConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseAppletConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseAppletConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseAppletConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseAppletConfig.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || firebaseAppletConfig.measurementId,
};

// Database ID defaults to '(default)' if not specified
const firestoreDatabaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID || firebaseAppletConfig.firestoreDatabaseId || '(default)';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app, firestoreDatabaseId);

// Initialize Analytics if supported
export const analytics = isSupported().then(yes => yes ? getAnalytics(app) : null).catch(() => null);

// Validate connection to Firestore
async function testConnection() {
  if (!firebaseConfig.projectId || firebaseConfig.projectId === "YOUR_PROJECT_ID") {
    console.warn("Firebase: Project ID is not configured. Please set your environment variables or firebase-applet-config.json.");
    return;
  }

  try {
    // Attempt a lightweight read to verify connection
    await getDocFromServer(doc(db, '_connection_test_', 'ping'));
  } catch (error: any) {
    // We ignore 'permission-denied' because it means we DID reach the server (which is good!)
    // We only care about connection-level failures
    if (error?.code === 'permission-denied' || error?.message?.includes('permission-denied')) {
      console.log("Firebase: Connection verified (received expected permission denial).");
      return;
    }

    if (error?.message?.includes('the client is offline')) {
      console.error("Firebase: SDK 报告离线。请检查：\n1. 是否已在 Firebase 控制台创建了 Firestore 数据库？\n2. 项目 ID (" + firebaseConfig.projectId + ") 是否正确？\n3. 您的网络是否允许连接到 firebase.googleapis.com");
    } else {
      console.warn("Firebase 连接信息:", error?.message || error);
    }
  }
}
testConnection();

export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();
export const discordProvider = new OAuthProvider('discord.com');
