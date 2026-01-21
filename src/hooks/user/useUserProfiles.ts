import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { UserProfile } from 'types';

// 동일 세션 내에서 프로필 재요청을 방지하기 위한 간단한 인메모리 캐시입니다.
const profileCache = new Map<string, UserProfile>();

/**
 * UID 목록을 기반으로 Firestore에서 여러 사용자 프로필을 가져옵니다.
 * 중복 요청을 피하기 위해 인메모리 캐시를 사용합니다.
 * @param uids - 프로필을 가져올 사용자 UID 배열
 * @returns 프로필 객체(UID를 키로 함)와 로딩 상태를 포함하는 객체
 */
export const useUserProfiles = (uids: string[]) => {
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);

  // uids 배열의 참조 변경으로 인한 불필요한 재실행을 방지하기 위해 문자열로 키를 생성합니다.
  const uidsKey = JSON.stringify(uids);

  useEffect(() => {
    // uidsKey를 파싱하여 UID 배열을 복원하고, 중복 제거 및 빈 값 필터링을 수행합니다.
    const parsedUids = JSON.parse(uidsKey) as string[];
    const uniqueUids = Array.from(new Set(parsedUids.filter(Boolean)));

    if (uniqueUids.length === 0) {
      setProfiles({});
      setLoading(false);
      return;
    }

    const fetchProfiles = async () => {
      setLoading(true);
      const uidsToFetch: string[] = [];
      const cachedProfiles: Record<string, UserProfile> = {};

      // 캐시에 있는 프로필은 바로 사용하고, 없는 경우 가져올 목록에 추가합니다.
      uniqueUids.forEach((uid) => {
        if (profileCache.has(uid)) {
          cachedProfiles[uid] = profileCache.get(uid)!;
        } else {
          uidsToFetch.push(uid);
        }
      });

      // 모든 프로필이 캐시에 있다면 추가 요청 없이 상태를 업데이트합니다.
      if (uidsToFetch.length === 0) {
        setProfiles(cachedProfiles);
        setLoading(false);
        return;
      }

      try {
        const newProfiles: Record<string, UserProfile> = {};
        // Firestore 'in' 쿼리는 최대 30개까지만 지원하므로 slice로 제한합니다.
        // (실제 프로덕션에서는 30개 이상일 경우 청크로 나누어 요청하는 로직이 필요할 수 있습니다)
        const q = query(collection(db, 'users'), where('uid', 'in', uidsToFetch.slice(0, 30)));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          const data = doc.data() as UserProfile;
          newProfiles[data.uid] = data;
          // 가져온 데이터를 캐시에 저장합니다.
          profileCache.set(data.uid, data);
        });

        // 캐시된 프로필과 새로 가져온 프로필을 합쳐서 상태를 업데이트합니다.
        setProfiles({ ...cachedProfiles, ...newProfiles });
      } catch (error) {
        console.error('Error fetching user profiles: ', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, [uidsKey]);

  return { profiles, loading };
};
