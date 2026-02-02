import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth, GoogleAuthProvider } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

let app: any
let auth: any
let db: any

function initFirebase() {
  // 🚫 Prevent Firebase from running during build / SSR
  if (typeof window === "undefined") {
    return { app: null, auth: null, db: null }
  }

  if (app) return { app, auth, db }

 const firebaseConfig = {
  apiKey: "AIzaSyC-fkyxIV20z8DCqSL8BodEzDdDezbjFVE",
  authDomain: "septoctor-cf82c.firebaseapp.com",
  projectId: "septoctor-cf82c",
  storageBucket: "septoctor-cf82c.firebasestorage.app",
  messagingSenderId: "935827613646",
  appId: "1:935827613646:web:bce68f9ae5e95ff84aed9f",
  measurementId: "G-R4SPSD8MZX",
}

  app = getApps().length ? getApp() : initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)

  return { app, auth, db }
}

// ✅ Provider must also be client-only
let googleProvider: GoogleAuthProvider | null = null

if (typeof window !== "undefined") {
  googleProvider = new GoogleAuthProvider()
  googleProvider.setCustomParameters({ prompt: "select_account" })
}

export { initFirebase, googleProvider }
