import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBm3O_bwvoZCDrZljra78bhZrgWI3iru8Q",
  authDomain: "precificador-fce6f.firebaseapp.com",
  projectId: "precificador-fce6f",
  storageBucket: "precificador-fce6f.firebasestorage.app",
  messagingSenderId: "291319256967",
  appId: "1:291319256967:web:b9f453c4a794bb537be522",
  measurementId: "G-MM9E53W13B"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Use o emulador só em DEV!
if (process.env.NODE_ENV === "development") {
  connectFirestoreEmulator(db, "localhost", 8080);
  // Se usar Auth, também:
  // import { connectAuthEmulator } from "firebase/auth";
  // connectAuthEmulator(auth, "http://localhost:9099");
}