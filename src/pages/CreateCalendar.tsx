import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, Users, Check, Sparkles, UserPlus, PenLine, CheckCircle2, Loader2, Search } from 'lucide-react';
// [추가] Firebase 관련 import
import toast from 'react-hot-toast';
import { collection, addDoc, doc, onSnapshot, query, where, getDocs, arrayUnion, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e', '#64748b'];

// [추가] 친구 데이터 타입 정의
interface Friend {
  uid: string;
  name: string;
  email: string;
}

const CreateCalendar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // 로그인 유저 상태
  const [user, setUser] = useState<any>(null);

  const [calName, setCalName] = useState('');
  const [selectedFriendUids, setSelectedFriendUids] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);

  // [수정] DB에서 불러온 친구 목록 상태
  const [friends, setFriends] = useState<Friend[]>([]);

  // [추가] 친구 검색어 상태
  const [friendSearchTerm, setFriendSearchTerm] = useState('');

  // [추가] 친구 추가 모달 상태
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newFriendEmail, setNewFriendEmail] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // [추가] 로그인된 사용자의 친구 목록을 실시간으로 불러오기
  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFriends(data.friendsList || []);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const toggleFriend = (friendUid: string) => {
    setSelectedFriendUids((prev) => (prev.includes(friendUid) ? prev.filter((uid) => uid !== friendUid) : [...prev, friendUid]));
  };

  // [추가] 친구 추가 로직 (FriendList.tsx에서 가져옴)
  const handleAddFriend = async () => {
    if (!newFriendEmail.trim() || !user) return;

    if (newFriendEmail === user.email) {
      toast.error('자기 자신은 친구로 추가할 수 없습니다.');
      return;
    }

    setIsAdding(true);
    try {
      const q = query(collection(db, 'users'), where('email', '==', newFriendEmail.trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast.error('존재하지 않는 이메일입니다.');
        return;
      }

      const targetUserDoc = querySnapshot.docs[0];
      const targetUserData = targetUserDoc.data();

      if (friends.some((f) => f.uid === targetUserDoc.id)) {
        toast('이미 친구 목록에 있습니다.', { icon: '⚠️' });
        return;
      }

      const myRef = doc(db, 'users', user.uid);
      await updateDoc(myRef, {
        friendsList: arrayUnion({
          uid: targetUserDoc.id,
          name: targetUserData.name,
          email: targetUserData.email,
          statusMessage: targetUserData.statusMessage || '',
          photoURL: targetUserData.photoURL || '',
        }),
      });

      toast.success(`${targetUserData.name}님을 친구로 추가했습니다.`);
      setNewFriendEmail('');
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('친구 추가 오류:', error);
      toast.error('친구 추가 중 오류가 발생했습니다.');
    } finally {
      setIsAdding(false);
    }
  };

  // [추가] 검색어에 따라 친구 목록 필터링
  const filteredFriends = useMemo(() => {
    if (!friendSearchTerm) return friends;
    return friends.filter((friend) => friend.name.toLowerCase().includes(friendSearchTerm.toLowerCase()));
  }, [friendSearchTerm, friends]);

  // [수정] 캘린더 이름 자동 생성 로직 변경
  const finalName = useMemo(() => {
    if (calName) return calName; // 1. 사용자가 직접 입력한 이름이 최우선

    // 2. 친구를 선택하지 않았거나 사용자 정보가 없으면 자동 생성 안함
    if (selectedFriendUids.length === 0 || !user?.displayName) {
      return '';
    }

    // 3. 선택된 친구 목록을 기반으로 캘린더 이름을 요약하여 생성
    const selectedFriendNames = friends.filter((f) => selectedFriendUids.includes(f.uid)).map((f) => f.name);
    const totalMemberNames = [user.displayName, ...selectedFriendNames];
    const totalCount = totalMemberNames.length;

    if (totalCount <= 2) {
      // 2명 이하일 경우: "홍길동, 김철수의 캘린더"
      return `${totalMemberNames.join(', ')}의 캘린더`;
    }
    // 3명 이상일 경우: "홍길동님 외 2명의 캘린더"
    return `${totalMemberNames[0]}님 외 ${totalCount - 1}명의 캘린더`;
  }, [calName, selectedFriendUids, friends, user?.displayName]);

  // 이름이 없으면 생성 불가 (친구 선택 안해도 본인 캘린더로 생성 가능하게 조건 완화)
  const isSubmitDisabled = !finalName.trim() || isSubmitting;

  // [수정] DB에 캘린더 저장
  const handleSubmit = async () => {
    if (isSubmitDisabled || !user) {
      if (!user) toast.error('로그인이 필요합니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      const docRef = await addDoc(collection(db, 'calendars'), {
        name: finalName,
        ownerId: user.uid,
        members: [user.uid, ...selectedFriendUids],
        color: selectedColor,
        createdAt: new Date().toISOString(),
        isDefault: false, // 기본 캘린더 여부
      });

      // [추가] 공유된 친구들에게 알림 보내기
      if (selectedFriendUids.length > 0 && user?.displayName) {
        const notificationPromises = selectedFriendUids.map((friendUid) => {
          return addDoc(collection(db, 'notifications'), {
            userId: friendUid, // 알림을 받을 사용자 ID
            type: 'CALENDAR_INVITE',
            message: `${user.displayName}님께서 '${finalName}' 캘린더에 당신을 초대했습니다.`,
            fromUserId: user.uid,
            fromUserName: user.displayName,
            relatedId: docRef.id,
            calendarName: finalName,
            isRead: false,
            createdAt: new Date().toISOString(),
          });
        });
        // Promise.all로 모든 알림 생성을 동시에 처리
        await Promise.all(notificationPromises);
      }

      toast.success(`'${finalName}' 캘린더가 생성되었습니다!`);

      const { from, scheduleData } = location.state || {};

      if (from === '/add-schedule') {
        navigate('/add-schedule', {
          replace: true,
          state: {
            from: '/create-calendar',
            newlyCreatedCalendarId: docRef.id,
            scheduleData: scheduleData,
          },
        });
      } else if (from && from.startsWith('/schedule/edit/')) {
        // [추가] ScheduleEdit에서 왔다면, 생성된 캘린더 ID를 포함하여 다시 돌아감
        navigate(from, {
          replace: true,
          state: {
            ...scheduleData,
            calendarId: docRef.id,
          },
        });
      } else {
        navigate('/calendar-manager', { replace: true });
      }
    } catch (error) {
      console.error('Error adding calendar: ', error);
      toast.error('캘린더 생성 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white font-['Pretendard']">
      <nav className="shrink-0 px-6 pt-6 flex items-center bg-white/80 backdrop-blur-md z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors active:scale-90" aria-label="뒤로 가기">
          <ChevronLeft size={28} />
        </button>
      </nav>

      <div className="flex-1 px-6 pt-4 overflow-y-auto w-full">
        <header className="mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 rounded-xl mb-6">
            <Sparkles className="text-blue-600 w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 leading-[1.3] tracking-tight">
            새로운 <span className="text-blue-600">캘린더</span>를<br />
            만들어볼까요?
          </h2>
        </header>

        <div className="space-y-8">
          <section className="space-y-3">
            <label className="block text-[13px] font-black text-gray-400 ml-1">캘린더 이름</label>
            <div className="flex items-center h-[60px] bg-gray-50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white rounded-[20px] px-5 transition-all shadow-sm">
              <PenLine size={20} className="text-gray-300 mr-4" />
              <input
                value={calName}
                onChange={(e) => setCalName(e.target.value)}
                placeholder="캘린더 이름을 입력해주세요"
                className="bg-transparent border-none outline-none w-full h-full text-[16px] font-bold text-gray-800 placeholder:text-gray-400/80"
              />
            </div>
          </section>

          <section className="space-y-3">
            <label className="block text-[13px] font-black text-gray-400 ml-1">캘린더 색상</label>
            <div className="flex flex-wrap gap-3 px-1">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-8 h-8 rounded-full transition-all flex items-center justify-center ${
                    selectedColor === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {selectedColor === color && <Check size={14} className="text-white" strokeWidth={3} />}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-gray-400" />
                <label className="text-[13px] font-black text-gray-400">공유할 친구 선택</label>
              </div>
              <span
                className={`text-[11px] font-bold px-2 py-1 rounded-lg transition-colors ${
                  selectedFriendUids.length > 0 ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'
                }`}
              >
                {selectedFriendUids.length}명 선택됨
              </span>
            </div>
            {/* [추가] 친구 검색 입력란 */}
            <div className="relative">
              <div className="flex items-center h-[52px] bg-gray-50 rounded-[20px] px-4 transition-all shadow-sm focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:bg-white">
                <Search size={18} className="text-gray-400 mr-3 shrink-0" />
                <input
                  type="text"
                  value={friendSearchTerm}
                  onChange={(e) => setFriendSearchTerm(e.target.value)}
                  placeholder="친구 이름으로 검색"
                  className="flex-1 bg-transparent outline-none text-gray-900 text-[15px] font-bold placeholder:text-gray-300"
                />
              </div>
            </div>

            {filteredFriends.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {filteredFriends.map((friend) => {
                  const isSelected = selectedFriendUids.includes(friend.uid);
                  return (
                    <button
                      key={friend.uid}
                      onClick={() => toggleFriend(friend.uid)}
                      className={`
                        relative p-4 rounded-[20px] border-2 transition-all duration-200 flex items-center gap-3 text-left active:scale-[0.98]
                        ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100'
                            : 'bg-white border-gray-100 text-gray-600 hover:border-blue-100 hover:bg-gray-50'
                        }
                      `}
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-black transition-colors ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {friend.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`text-[15px] font-bold block truncate ${isSelected ? 'text-white' : 'text-gray-900'}`}>{friend.name}</span>
                      </div>
                      {isSelected && (
                        <div className="absolute top-3 right-3 text-white">
                          <CheckCircle2 size={18} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center">
                <p className="text-gray-400 text-sm font-bold">검색 결과가 없습니다.</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="w-full p-4 rounded-[20px] border-2 border-dashed border-gray-200 text-gray-400 flex flex-col items-center justify-center gap-2 hover:bg-gray-50 hover:border-blue-200 hover:text-blue-500 transition-all active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
                <UserPlus size={20} />
              </div>
              <span className="text-[13px] font-bold">새 친구 초대</span>
            </button>
          </section>
        </div>
      </div>

      <footer className="shrink-0 bg-white/80 backdrop-blur-md border-t border-gray-50 z-20 px-6 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div className="mb-3 text-center h-5">
          {finalName && <p className="text-[13px] font-bold text-blue-600 animate-in fade-in slide-in-from-bottom-1">✨ "{finalName}" 생성 예정</p>}
        </div>
        <button
          disabled={isSubmitDisabled}
          onClick={handleSubmit}
          className={`
            w-full h-[62px] rounded-[24px] font-black text-[17px] shadow-lg transition-all flex items-center justify-center gap-2
            ${!isSubmitDisabled ? 'bg-blue-600 text-white shadow-blue-100 active:scale-[0.98]' : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'}
          `}
        >
          {isSubmitting ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <>
              <span>캘린더 생성하기</span>
              <Check size={20} strokeWidth={3} />
            </>
          )}
        </button>
      </footer>

      {/* [추가] 친구 추가 모달 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-[32px] p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-1">새 친구 찾기</h3>
            <p className="text-gray-400 dark:text-gray-500 text-[13px] mb-6 font-medium leading-relaxed">친구의 이메일 주소를 정확히 입력해주세요.</p>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-[20px] p-2 mb-6 border border-gray-100 dark:border-gray-700/50 focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-gray-800 transition-all">
              <input
                type="email"
                value={newFriendEmail}
                onChange={(e) => setNewFriendEmail(e.target.value)}
                enterKeyHint="send"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddFriend();
                  }
                }}
                placeholder="example@email.com"
                className="w-full bg-transparent outline-none p-3 text-[15px] font-bold dark:text-white"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="flex-1 py-3.5 rounded-[20px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 font-bold text-[14px]"
              >
                취소
              </button>
              <button
                onClick={handleAddFriend}
                disabled={isAdding || !newFriendEmail.includes('@')}
                className="flex-1 py-3.5 rounded-[20px] bg-blue-600 text-white font-bold text-[14px] flex items-center justify-center gap-2 active:scale-95 disabled:bg-blue-300 dark:disabled:bg-blue-800"
              >
                {isAdding ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Check size={16} strokeWidth={3} /> 추가하기
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateCalendar;
