import { DocumentData, DocumentReference, DocumentSnapshot, Query, QuerySnapshot, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';

interface UseFirestoreQueryResult<T> {
  data: T[] | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Firestore Collection을 실시간으로 구독하는 커스텀 훅
 * @template T 데이터 타입
 * @param {Query | null} query - Firestore 쿼리 객체 (useMemo 사용 권장)
 * @returns {UseFirestoreQueryResult<T>} 데이터, 로딩 상태, 에러 객체
 */
export function useFirestoreQuery<T>(query: Query | null): UseFirestoreQueryResult<T> {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!query) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      query,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const resolvedData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as T[];
        setData(resolvedData);
        setLoading(false);
      },
      (err: Error) => {
        setError(err);
        setLoading(false);
        console.error('useFirestoreQuery error:', err);
      },
    );

    return () => unsubscribe();
  }, [query]);

  return { data, loading, error };
}

interface UseFirestoreDocResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Firestore Document를 실시간으로 구독하는 커스텀 훅
 * @template T 데이터 타입
 * @param {DocumentReference | null} docRef - Firestore 문서 참조 객체 (useMemo 사용 권장)
 * @returns {UseFirestoreDocResult<T>} 데이터, 로딩 상태, 에러 객체
 */
export function useFirestoreDoc<T>(docRef: DocumentReference | null): UseFirestoreDocResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!docRef) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot: DocumentSnapshot<DocumentData>) => {
        if (snapshot.exists()) {
          setData({ id: snapshot.id, ...snapshot.data() } as T);
        } else {
          setData(null);
        }
        setLoading(false);
      },
      (err: Error) => {
        setError(err);
        setLoading(false);
        console.error('useFirestoreDoc error:', err);
      },
    );

    return () => unsubscribe();
  }, [docRef]);

  return { data, loading, error };
}
