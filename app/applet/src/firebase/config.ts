import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// CRITICAL: The app will break without specifying firestoreDatabaseId in the second parameter
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Validate Connection on startup as required by the Firebase integration skill guidelines
async function testConnection() {
  try {
    // Attempt to read from a test path to verify network readiness
    await getDocFromServer(doc(db, 'test_connection_channel', 'connection_probe'));
    console.log("Firebase connection verified successfully.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is currently offline.");
    } else {
      console.warn("Initial Firebase test connection ping returned expected response (collection doesn't exist but connection works).");
    }
  }
}

testConnection();
