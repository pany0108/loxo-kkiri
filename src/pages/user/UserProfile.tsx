// src/pages/UserProfile.tsx

import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { User, Loader2, UserPlus, Check } from 'lucide-react';
import { auth, db } from '../../firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useFirestoreDoc } from 'hooks';
import { TopNav, PageFooter } from 'components';

interface UserProfileData {
  uid: string;
  name: string;
  email: string;
  statusMessage?: string;
  photoURL?: string;
  friendsList?: { uid: string }[];
}

const UserProfile = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const currentUser = auth.currentUser;

  const userDocRef = useMemo(() => (userId ? doc(db, 'users', userId) : null), [userId]);
  const { data: userData, loading: isLoading } = useFirestoreDoc<UserProfileData>(userDocRef);

  const currentUserDocRef = useMemo(() => (currentUser ? doc(db, 'users', currentUser.uid) : null), [currentUser]);
  const { data: myData } = useFirestoreDoc<UserProfileData>(currentUserDocRef);

  // [추가] 본인 프로필에 접근 시 /profile(내 프로필)로 리다이렉트합니다.
  useEffect(() => {
    if (userId && currentUser && userId === currentUser.uid) {
      navigate('/profile', { replace: true });
    }
  }, [userId, currentUser, navigate]);

  const [isAdding, setIsAdding] = useState(false);

  const isAlreadyFriend = useMemo(() => {
    return myData?.friendsList?.some((friend) => friend.uid === userId) || false;
  }, [myData, userId]);

  const handleAddFriend = async () => {
    if (!currentUser || !userData) return;
    if (isAlreadyFriend) {
      toast('이미 친구입니다.');
      return;
    }

    setIsAdding(true);
    try {
      const myRef = doc(db, 'users', currentUser.uid);
      await updateDoc(myRef, {
        friendsList: arrayUnion({
          uid: userData.uid,
          name: userData.name,
          email: userData.email,
          statusMessage: userData.statusMessage || '',
          photoURL: userData.photoURL || '',
        }),
      });
      toast.success(`${userData.name}님을 친구로 추가했습니다!`);
      // 친구 목록으로 이동하며 새로 추가된 친구 ID 전달
      navigate('/friend-list', { state: { newFriendId: userData.uid }, replace: true });
    } catch (error) {
      toast.error('친구 추가 중 오류가 발생했습니다.');
      console.error(error);
    } finally {
      setIsAdding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-[#007AFF] dark:text-blue-400 mb-2" />
        <p className="text-[#8B95A1] font-bold">프로필을 불러오는 중...</p>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-950">
        <p>사용자를 찾을 수 없습니다.</p>
        <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-[#007AFF] text-white rounded-lg">
          뒤로가기
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950 font-['Pretendard']">
      {/* 상단 네비게이션을 TopNav 컴포넌트로 교체 */}
      <TopNav title="프로필" />

      {/* TopNav가 fixed이므로 콘텐츠가 가려지지 않도록 pt-[76px]로 상단 패딩 조정 */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-[calc(76px+env(safe-area-inset-top))] min-h-0 pb-32 overflow-y-auto">
        <div className="w-32 h-32 rounded-full mb-6 overflow-hidden border-4 border-white dark:border-gray-800 shadow-lg">
          {userData.photoURL ? (
            <img src={userData.photoURL} alt={userData.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#007AFF] to-[#0062cc] flex items-center justify-center text-white">
              <User size={60} strokeWidth={2} />
            </div>
          )}
        </div>
        <div className="flex flex-col items-center">
          <h2 className="text-3xl font-black text-[#191F28] dark:text-white">{userData.name}</h2>
          <p className="text-base font-medium text-[#8B95A1] dark:text-gray-500 mt-2">{userData.email}</p>
          <div className="mt-6 max-w-sm w-full bg-[#007AFF]/10 dark:bg-blue-900/50 rounded-2xl px-5 py-4 border border-[#007AFF]/20 dark:border-blue-500/20">
            <p className={`text-base font-semibold ${userData.statusMessage ? 'text-[#007AFF] dark:text-blue-200' : 'text-[#007AFF] dark:text-blue-500'}`}>
              {userData.statusMessage || '상태 메시지가 없습니다.'}
            </p>
          </div>
        </div>
      </div>

      <PageFooter>
        <button
          onClick={handleAddFriend}
          disabled={isAdding || isAlreadyFriend}
          className={`w-full h-[62px] rounded-[24px] font-black text-[17px] shadow-lg transition-all flex items-center justify-center gap-2
            ${isAlreadyFriend ? 'bg-gray-100 text-[#8B95A1] cursor-not-allowed shadow-none' : 'bg-[#007AFF] text-white shadow-[#007AFF]/20 active:scale-[0.98]'}
          `}
        >
          {isAdding ? (
            <Loader2 size={20} className="animate-spin" />
          ) : isAlreadyFriend ? (
            <>
              <Check size={20} /> 이미 친구입니다
            </>
          ) : (
            <>
              <UserPlus size={20} /> 친구 추가
            </>
          )}
        </button>
      </PageFooter>
    </div>
  );
};

export default UserProfile;
