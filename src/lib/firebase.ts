import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

let app: any = null;
let db: any = null;
let auth: any = null;
let isFirebaseAvailable = false;

try {
  // If we have actual keys and not placeholders
  if (firebaseConfig && firebaseConfig.apiKey && !firebaseConfig.apiKey.includes('placeholder')) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    auth = getAuth(app);
    isFirebaseAvailable = true;

    // Validate connection in background
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
        console.log("Firebase connected successfully!");
      } catch (error: any) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.warn("Please check your Firebase configuration or internet connection.");
        }
      }
    };
    testConnection();
  } else {
    console.log("Using default simulated multiplayer (Firebase not provisioned yet). To enable real cloud database matchmaking, run the Firebase setup tool!");
  }
} catch (e) {
  console.log("Firebase loading failed, running in simulated mode.", e);
}

export { db, auth, isFirebaseAvailable };
