// firebase.ts
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { firebaseConfig } from '././firebaseConfig';


const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);

export { firebaseApp, db, storage };
