import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

// Import the Firebase configuration
import firebaseConfig from '../firebase-applet-config.json';

export const isFirebaseAvailable = !!(firebaseConfig && firebaseConfig.apiKey);

const app = isFirebaseAvailable ? initializeApp(firebaseConfig) : null;
export const db = app ? getFirestore(app, firebaseConfig.firestoreDatabaseId) : (null as unknown as Firestore);
export const auth = app ? getAuth(app) : (null as unknown as Auth);
