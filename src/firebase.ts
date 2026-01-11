import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAfy3DK-scMiec9nxf56c4xv5mNn-W_Xk0',
  authDomain: 'loxo-kkiri.firebaseapp.com',
  projectId: 'loxo-kkiri',
  storageBucket: 'loxo-kkiri.firebasestorage.app',
  messagingSenderId: '831596904912',
  appId: '1:831596904912:web:580cd76862398a09d979d5',
  measurementId: 'G-VV39T2YVQ1',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export { app };
