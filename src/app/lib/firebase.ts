// firebase.ts
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

let app: FirebaseApp | undefined;
let db: ReturnType<typeof getFirestore> | undefined;
let storage: ReturnType<typeof getStorage> | undefined;

try {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  // Check if all required config values are present
  const requiredConfig = ['apiKey', 'authDomain', 'projectId'] as const;
  const missingConfig = requiredConfig.filter(key => !firebaseConfig[key]);
  
  if (missingConfig.length > 0) {
    throw new Error(`Missing required Firebase configuration: ${missingConfig.join(', ')}`);
  }

  // Initialize Firebase only if it hasn't been initialized already
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    storage = getStorage(app);
  }
} catch (error) {
  console.error('Error initializing Firebase:', error);
  // In development, provide a more helpful message
  if (process.env.NODE_ENV === 'development') {
    console.log('Please ensure you have set up the required environment variables:');
    console.log('NEXT_PUBLIC_FIREBASE_API_KEY');
    console.log('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
    console.log('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  }
}

// Export a function to get Firestore that checks if Firebase is initialized
export function getFirestoreDb() {
  if (!db) {
    throw new Error('Firebase is not initialized. Please check your environment variables.');
  }
  return db;
}

export { app, db, storage };
