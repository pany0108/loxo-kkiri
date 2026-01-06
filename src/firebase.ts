import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyCatGVUjIC50vXsAuaCr9Qdmj-nOgN8Ei0',
  authDomain: 'super-scheduler-c99f7.web.app',
  projectId: 'super-scheduler-c99f7',
  storageBucket: 'super-scheduler-c99f7.appspot.com',
  messagingSenderId: '260376909396',
  appId: '1:260376909396:web:c423df6dcf26b60dd13fc1',
  measurementId: 'G-2PJ3FMH867',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app); // DB 연동용
const storage = getStorage(app); // 파일 업로드용
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(app); // 로그인용
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, storage, firebaseApp, googleProvider };
