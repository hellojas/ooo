import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore'

// Web API keys identify the project; they are not secrets. Access is enforced by firestore.rules.
const app = initializeApp({
  apiKey: 'AIzaSyBj-pT9pS57ry1UAbojecprGrulNcRzCvw',
  authDomain: 'projectooo-7c335.firebaseapp.com',
  projectId: 'projectooo-7c335',
  storageBucket: 'projectooo-7c335.firebasestorage.app',
  messagingSenderId: '339741946789',
  appId: '1:339741946789:web:85a4be3c396f40f178ee4c',
  measurementId: 'G-9DN6ZFM0K8',
})

export const auth = getAuth(app)
export const db = initializeFirestore(app, { localCache: persistentLocalCache() })
export const googleProvider = new GoogleAuthProvider()
