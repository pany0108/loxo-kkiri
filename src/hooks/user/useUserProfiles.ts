import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { UserProfile } from 'types';

// A simple in-memory cache to avoid re-fetching profiles within the same session.
const profileCache = new Map<string, UserProfile>();

/**
 * Fetches multiple user profiles from Firestore based on a list of UIDs.
 * It uses an in-memory cache to avoid redundant fetches.
 * @param uids - An array of user UIDs to fetch profiles for.
 * @returns An object containing the profiles and a loading state.
 */
export const useUserProfiles = (uids: string[]) => {
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Memoize uids array to prevent re-fetches on reference changes
    const uniqueUids = Array.from(new Set(uids.filter(Boolean)));

    if (uniqueUids.length === 0) {
      setProfiles({});
      setLoading(false);
      return;
    }

    const fetchProfiles = async () => {
      setLoading(true);
      const uidsToFetch: string[] = [];
      const cachedProfiles: Record<string, UserProfile> = {};

      uniqueUids.forEach((uid) => {
        if (profileCache.has(uid)) {
          cachedProfiles[uid] = profileCache.get(uid)!;
        } else {
          uidsToFetch.push(uid);
        }
      });

      if (uidsToFetch.length === 0) {
        setProfiles(cachedProfiles);
        setLoading(false);
        return;
      }

      try {
        const newProfiles: Record<string, UserProfile> = {};
        const q = query(collection(db, 'users'), where('uid', 'in', uidsToFetch.slice(0, 30))); // Firestore 'in' query limit is 30
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          const data = doc.data() as UserProfile;
          newProfiles[data.uid] = data;
          profileCache.set(data.uid, data);
        });

        setProfiles({ ...cachedProfiles, ...newProfiles });
      } catch (error) {
        console.error('Error fetching user profiles: ', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, [JSON.stringify(uids)]); // Use JSON.stringify to create a stable dependency

  return { profiles, loading };
};
