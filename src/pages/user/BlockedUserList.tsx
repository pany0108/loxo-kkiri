import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { arrayRemove, arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { Ban, Loader2, Search, UserX } from 'lucide-react';
import toast from 'react-hot-toast';

import { auth, db } from '../../firebase';
import { ConfirmModal, FormInput, PageHeader, PageLayout, PageTitle } from 'components';
import { useFirestoreDoc, useUserProfiles } from 'hooks';

const BlockedUserList = () => {
  const navigate = useNavigate();
  const user = auth.currentUser;
  const [searchTerm, setSearchTerm] = useState('');
  const [userToUnblock, setUserToUnblock] = useState<{ uid: string; name: string } | null>(null);

  const userDocRef = useMemo(() => (user ? doc(db, 'users', user.uid) : null), [user]);
  const { data: myInfo, loading: myInfoLoading } = useFirestoreDoc<any>(userDocRef);

  const blockedUserIds = useMemo(() => myInfo?.blockedUsers || [], [myInfo]);
  const { profiles, loading: profilesLoading } = useUserProfiles(blockedUserIds);

  const filteredBlockedUsers = useMemo(() => {
    if (!blockedUserIds.length) return [];

    return blockedUserIds
      .map((uid: string) => ({ ...profiles[uid], uid }))
      .filter((profile: any) => {
        const name = profile.name || '알 수 없음';
        return name.toLowerCase().includes(searchTerm.toLowerCase());
      });
  }, [blockedUserIds, profiles, searchTerm]);

  const handleUnblock = async () => {
    if (!user || !userToUnblock) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      const profile = profiles[userToUnblock.uid];
      const friendData = {
        uid: userToUnblock.uid,
        name: profile?.name || userToUnblock.name,
        email: profile?.email || '',
        statusMessage: profile?.statusMessage || '',
        photoURL: profile?.photoURL || '',
      };

      await updateDoc(userRef, {
        blockedUsers: arrayRemove(userToUnblock.uid),
        friendsList: arrayUnion(friendData),
      });
      toast.success(`${userToUnblock.name}님의 차단을 해제하고 친구 목록에 추가했습니다.`);
      setUserToUnblock(null);
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast.error('차단 해제 중 오류가 발생했습니다.');
    }
  };

  if (myInfoLoading || profilesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <PageLayout title="차단 관리" onBack={() => navigate(-1)}>
      <PageHeader icon={<UserX className="text-red-500 w-6 h-6" />}>
        <PageTitle>
          차단된 <span className="text-red-500">사용자</span>를<br />
          관리할 수 있어요.
        </PageTitle>
      </PageHeader>

      <div className="space-y-6">
        <FormInput icon={<Search size={20} />} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="이름으로 검색" onClear={() => setSearchTerm('')} />

        {filteredBlockedUsers.length > 0 ? (
          <div className="space-y-3">
            {filteredBlockedUsers.map((blockedUser: any) => (
              <div
                key={blockedUser.uid}
                className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden flex items-center justify-center">
                    {blockedUser.photoURL ? (
                      <img src={blockedUser.photoURL} alt={blockedUser.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-gray-400">{blockedUser.name?.[0]}</span>
                    )}
                  </div>
                  <span className="font-bold text-main dark:text-white">{blockedUser.name || '알 수 없음'}</span>
                </div>
                <button
                  onClick={() => setUserToUnblock({ uid: blockedUser.uid, name: blockedUser.name || '알 수 없음' })}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
                >
                  차단 해제
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-sub dark:text-gray-500">
            <Ban size={48} className="mb-4 opacity-20" />
            <p className="text-sm font-bold">차단된 사용자가 없습니다.</p>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!userToUnblock}
        onClose={() => setUserToUnblock(null)}
        onConfirm={handleUnblock}
        icon={<UserX size={32} />}
        iconContainerClassName="bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400"
        title="차단 해제"
        message={
          <>
            <span className="font-bold text-main dark:text-white">{userToUnblock?.name}</span>님의 차단을 해제하시겠습니까?
            <br />
            차단이 해제되면 친구 목록에 다시 추가됩니다.
          </>
        }
        confirmText="해제하기"
        confirmButtonClassName="bg-red-500"
      />
    </PageLayout>
  );
};

export default BlockedUserList;
