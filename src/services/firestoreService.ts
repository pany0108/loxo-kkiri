import {
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  serverTimestamp,
  writeBatch,
  DocumentData,
  QueryConstraint,
  WithFieldValue,
  SetOptions,
  DocumentReference,
  CollectionReference,
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Firestore에서 단일 문서를 가져옵니다.
 * @param collectionPath - 컬렉션 경로
 * @param docId - 문서 ID
 * @returns 문서 데이터 또는 null
 */
export const getDocument = async <T>(collectionPath: string, docId: string): Promise<(T & { id: string }) | null> => {
  const docRef = doc(db, collectionPath, docId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as T & { id: string };
  }
  return null;
};

/**
 * Firestore에서 쿼리 조건에 맞는 여러 문서를 가져옵니다.
 * @param collectionPath - 컬렉션 경로
 * @param constraints - Firestore 쿼리 제약 조건들
 * @returns 문서 데이터 배열
 */
export const getDocuments = async <T>(collectionPath: string, ...constraints: QueryConstraint[]): Promise<(T & { id: string })[]> => {
  const collRef = collection(db, collectionPath);
  const q = query(collRef, ...constraints);
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as T & { id: string }));
};

/**
 * Firestore에 새 문서를 추가합니다. `createdAt`과 `updatedAt` 타임스탬프가 자동으로 추가됩니다.
 * @param collectionPath - 컬렉션 경로
 * @param data - 저장할 데이터
 * @returns 생성된 문서의 참조
 */
export const addDocument = async <T extends DocumentData>(collectionPath: string, data: WithFieldValue<T>): Promise<DocumentReference<T>> => {
  const collRef = collection(db, collectionPath) as CollectionReference<T>;
  const dataWithTimestamp = {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  return addDoc(collRef, dataWithTimestamp);
};

/**
 * Firestore 문서를 업데이트합니다. `updatedAt` 타임스탬프가 자동으로 업데이트됩니다.
 * @param collectionPath - 컬렉션 경로
 * @param docId - 문서 ID
 * @param data - 업데이트할 데이터
 */
export const updateDocument = async (collectionPath: string, docId: string, data: DocumentData): Promise<void> => {
  const docRef = doc(db, collectionPath, docId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Firestore 문서를 덮어쓰거나 생성합니다. `createdAt`과 `updatedAt` 타임스탬프가 자동으로 관리됩니다.
 * @param collectionPath - 컬렉션 경로
 * @param docId - 문서 ID
 * @param data - 저장할 데이터
 */
export const setDocument = async <T extends DocumentData>(collectionPath: string, docId: string, data: WithFieldValue<T>): Promise<void> => {
  const docRef = doc(db, collectionPath, docId) as DocumentReference<T>;
  const docSnap = await getDoc(docRef);

  const dataWithTimestamp: { [key: string]: any } = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  if (!docSnap.exists()) {
    dataWithTimestamp.createdAt = serverTimestamp();
  }

  await setDoc(docRef, dataWithTimestamp, { merge: true });
};

/**
 * Firestore 문서를 삭제합니다.
 * @param collectionPath - 컬렉션 경로
 * @param docId - 문서 ID
 */
export const deleteDocument = async (collectionPath: string, docId: string): Promise<void> => {
  const docRef = doc(db, collectionPath, docId);
  await deleteDoc(docRef);
};

/**
 * Firestore `writeBatch` 인스턴스를 생성합니다.
 * @returns WriteBatch 인스턴스
 */
export const createBatch = () => writeBatch(db);
