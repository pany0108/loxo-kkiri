import { useState, useEffect, useMemo, useLayoutEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Users, Check, Sparkles, UserPlus, PenLine, CheckCircle2, Loader2, Search } from 'lucide-react';
// [추가] Firebase 관련 import
import toast from 'react-hot-toast';
import { collection, addDoc, doc, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { AddFriendModal } from 'components';

import { TopNav } from 'components';
const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e', '#64748b'];

// [추가] 친구 데이터 타입 정의
interface Friend {
  uid: string;
  name: string;
  email: string;
  group?: string;
}

interface FriendGroup {
  id: string;
  name: string;
}

const CreateCalendar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  /**
   * 페이지가 로드될 때 스크롤을 최상단으로 이동시킵니다.
   */
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  // 로그인 유저 상태
  const [user, setUser] = useState<any>(null);

  const [calName, setCalName] = useState('');
  const [selectedFriendUids, setSelectedFriendUids] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);

  // [수정] DB에서 불러온 친구 목록 상태
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendGroups, setFriendGroups] = useState<FriendGroup[]>([]);

  // [추가] 친구 검색어 상태
  const [friendSearchTerm, setFriendSearchTerm] = useState('');

  // [추가] 친구 추가 모달 상태
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
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
        setFriendGroups(data.friendGroups || []);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const toggleFriend = (friendUid: string) => {
    setSelectedFriendUids((prev) => (prev.includes(friendUid) ? prev.filter((uid) => uid !== friendUid) : [...prev, friendUid]));
  };

  // [추가] 검색어에 따라 친구 목록 필터링
  const groupedAndFilteredFriends = useMemo(() => {
    const groupMap = new Map<string, { name: string; friends: Friend[] }>();
    friendGroups.forEach((g) => groupMap.set(g.id, { name: g.name, friends: [] }));
    groupMap.set('uncategorized', { name: '미분류', friends: [] });

    const filteredBySearch = friends.filter((f) => f.name.toLowerCase().includes(friendSearchTerm.toLowerCase()));

    filteredBySearch.forEach((friend) => {
      const groupId = friend.group || 'uncategorized';
      if (groupMap.has(groupId)) {
        groupMap.get(groupId)!.friends.push(friend);
      } else {
        groupMap.get('uncategorized')!.friends.push(friend);
      }
    });

    groupMap.forEach((groupData) => groupData.friends.sort((a, b) => a.name.localeCompare(b.name, 'ko')));

    return Array.from(groupMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => {
        if (a.id === 'uncategorized') return 1;
        if (b.id === 'uncategorized') return -1;
        return a.name.localeCompare(b.name, 'ko');
      })
      .filter((group) => group.friends.length > 0);
  }, [friends, friendGroups, friendSearchTerm]);

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
      // [추가] 중복 캘린더 생성 방지 로직
      const newMembers = [user.uid, ...selectedFriendUids].sort();

      // 1. 멤버 구성이 같은 캘린더가 있는지 확인
      const q = query(collection(db, 'calendars'), where('members', '==', newMembers));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // 2. 중복 캘린더가 있으면 토스트 메시지 표시 후 종료
        const existingCalendarName = querySnapshot.docs[0].data().name;
        toast.error(`'${existingCalendarName}' 캘린더가 이미 같은 멤버로 생성되어 있습니다.`);
        setIsSubmitting(false);
        return;
      }

      const docRef = await addDoc(collection(db, 'calendars'), {
        name: finalName,
        ownerId: user.uid,
        members: newMembers, // 정렬된 멤버 배열 저장
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
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-950 font-['Pretendard']">
      {/* 상단 네비게이션 */}
      <TopNav title="새 캘린더 만들기" />

      <div ref={scrollContainerRef} className="flex-1 px-6 pt-[76px] pb-[calc(10rem+env(safe-area-inset-bottom))] overflow-y-auto w-full">
        <header className="mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-xl mb-6">
            <Sparkles className="text-blue-600 dark:text-blue-400 w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-[1.3] tracking-tight">
            새로운 <span className="text-blue-600 dark:text-blue-400">캘린더</span>를<br />
            만들어볼까요?
          </h2>
        </header>

        <div className="space-y-8">
          <section className="space-y-3">
            <label className="block text-[13px] font-black text-gray-400 dark:text-gray-500 ml-1">캘린더 이름</label>
            <div className="flex items-center h-[60px] bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-gray-800 rounded-[20px] px-5 transition-all shadow-sm">
              <PenLine size={20} className="text-gray-300 dark:text-gray-600 mr-4" />
              <input
                value={calName}
                onChange={(e) => setCalName(e.target.value)}
                placeholder="캘린더 이름을 입력해주세요"
                className="bg-transparent border-none outline-none w-full h-full text-[16px] font-bold text-gray-800 dark:text-white placeholder:text-gray-400/80 dark:placeholder:text-gray-500"
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
                <Users size={18} className="text-gray-400 dark:text-gray-500" />
                <label className="text-[13px] font-black text-gray-400 dark:text-gray-500">공유할 친구 선택</label>
              </div>
              <span
                className={`text-[11px] font-bold px-2 py-1 rounded-lg transition-colors ${
                  selectedFriendUids.length > 0
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                }`}
              >
                {selectedFriendUids.length}명 선택됨
              </span>
            </div>
            {/* [추가] 친구 검색 입력란 */}
            <div className="relative">
              <div className="flex items-center h-[52px] bg-gray-50 dark:bg-gray-800/50 rounded-[20px] px-4 transition-all shadow-sm focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:bg-white dark:focus-within:bg-gray-800">
                <Search size={18} className="text-gray-400 dark:text-gray-600 mr-3 shrink-0" />
                <input
                  type="text"
                  value={friendSearchTerm}
                  onChange={(e) => setFriendSearchTerm(e.target.value)}
                  placeholder="친구 이름으로 검색"
                  className="flex-1 bg-transparent outline-none text-gray-900 text-[15px] font-bold placeholder:text-gray-300"
                />
              </div>
            </div>

            {groupedAndFilteredFriends.length > 0 ? (
              groupedAndFilteredFriends.map((group) => (
                <div key={group.id} className="mb-4">
                  <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 mb-2 px-1">{group.name}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {group.friends.map((friend) => {
                      const isSelected = selectedFriendUids.includes(friend.uid);
                      return (
                        <button
                          key={friend.uid}
                          onClick={() => toggleFriend(friend.uid)}
                          className={`
                            relative p-4 rounded-[20px] border-2 transition-all duration-200 flex items-center gap-3 text-left active:scale-[0.98]
                            ${
                              isSelected
                                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100 dark:shadow-blue-900/50'
                                : 'bg-white dark:bg-gray-700/50 border-gray-100 dark:border-transparent text-gray-600 dark:text-gray-300 hover:border-blue-100 dark:hover:border-blue-900/30 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }
                          `}
                        >
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-black transition-colors ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-600 text-gray-400 dark:text-gray-400'
                            }`}
                          >
                            {friend.name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className={`text-[15px] font-bold block truncate ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{friend.name}</span>
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
                </div>
              ))
            ) : (
              <div className="py-10 text-center">
                <p className="text-gray-400 dark:text-gray-500 text-sm font-bold">검색 결과가 없습니다.</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="w-full p-4 rounded-[20px] border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 flex flex-col items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-blue-200 dark:hover:border-blue-600/50 hover:text-blue-500 dark:hover:text-blue-400 transition-all active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
                <UserPlus size={20} />
              </div>
              <span className="text-[13px] font-bold">새 친구 초대</span>
            </button>
          </section>
        </div>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-t border-gray-50 dark:border-gray-800 z-20 px-6 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div className="mb-3 text-center h-5">
          {finalName && <p className="text-[13px] font-bold text-blue-600 dark:text-blue-400 animate-in fade-in slide-in-from-bottom-1">✨ "{finalName}" 생성 예정</p>}
        </div>
        <button
          disabled={isSubmitDisabled}
          onClick={handleSubmit}
          className={`
            w-full h-[62px] rounded-[24px] font-black text-[17px] shadow-lg transition-all flex items-center justify-center gap-2
            ${
              !isSubmitDisabled
                ? 'bg-blue-600 text-white shadow-blue-100 dark:shadow-blue-900/50 active:scale-[0.98]'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed shadow-none'
            }
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

      <AddFriendModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} myInfo={user} friends={friends} />
    </div>
  );
};

export default CreateCalendar;
