import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Users,
  Check,
  Sparkles,
  UserPlus,
  PenLine,
  Loader2,
  Search,
  Plus,
  X,
  Home,
  Briefcase,
  ChevronDown,
  GraduationCap,
  Dumbbell,
  Plane,
  Music,
  Heart,
  Star,
  Gift,
  Coffee,
  ShoppingCart,
  Gamepad2,
} from 'lucide-react';
// Firebase 관련 import
import toast from 'react-hot-toast';
import { collection, addDoc, doc, onSnapshot, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { AddFriendModal, AddFromContactsModal, FriendListPopup, PageLayout, PageHeader, PageFooter } from 'components';
import { notifyCalendarInvite } from 'services';

const CALENDAR_ICONS = [
  { id: 'home', component: Home, label: '집' },
  { id: 'work', component: Briefcase, label: '직장' },
  { id: 'study', component: GraduationCap, label: '공부' },
  { id: 'workout', component: Dumbbell, label: '운동' },
  { id: 'travel', component: Plane, label: '여행' },
  { id: 'music', component: Music, label: '음악' },
  { id: 'love', component: Heart, label: '연애' },
  { id: 'star', component: Star, label: '중요' },
  { id: 'gift', component: Gift, label: '기념일' },
  { id: 'food', component: Coffee, label: '약속' },
  { id: 'shopping', component: ShoppingCart, label: '쇼핑' },
  { id: 'game', component: Gamepad2, label: '취미' },
];

// [추가] 친구 데이터 타입 정의
interface Friend {
  uid: string;
  name: string;
  email: string;
  group?: string;
  photoURL?: string;
}

interface FriendGroup {
  id: string;
  name: string;
}

const COLOR_OPTIONS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#84cc16', // lime
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#f43f5e', // rose
  '#64748b', // slate
  '#71717a', // zinc
];

const CreateCalendar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isFriendSelectionPopupOpen, setIsFriendSelectionPopupOpen] = useState(false);
  // 로그인 유저 상태
  const [user, setUser] = useState<User | null>(null);

  const [calName, setCalName] = useState('');
  const [selectedFriendUids, setSelectedFriendUids] = useState<string[]>([]);
  const [selectedIcon, setSelectedIcon] = useState(CALENDAR_ICONS[0].id);
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[7]); // Default blue
  const [isColorDropdownOpen, setIsColorDropdownOpen] = useState(false);
  const colorDropdownRef = useRef<HTMLDivElement>(null);

  // [수정] DB에서 불러온 친구 목록 상태
  const [friends, setFriends] = useState<Friend[]>([]); // 모든 친구 목록
  const [friendGroups, setFriendGroups] = useState<FriendGroup[]>([]); // 친구 그룹 목록

  // [추가] 친구 검색어 상태
  const [friendSearchTerm, setFriendSearchTerm] = useState('');
  // [추가] 친구 검색 결과 상태
  const [searchResults, setSearchResults] = useState<Friend[]>([]);

  // [추가] 친구 추가 모달 상태
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddFromContactsModalOpen, setIsAddFromContactsModalOpen] = useState(false);
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

  const handleOpenContactsModal = () => {
    setIsAddModalOpen(false);
    setIsAddFromContactsModalOpen(true);
  };

  // [추가] 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorDropdownRef.current && !colorDropdownRef.current.contains(event.target as Node)) {
        setIsColorDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // [추가] 친구 검색 결과 업데이트
  useEffect(() => {
    if (friendSearchTerm.trim() === '') {
      setSearchResults([]);
      return;
    }
    const lowerCaseSearchTerm = friendSearchTerm.toLowerCase();
    const filtered = friends.filter(
      (f) => f.name.toLowerCase().includes(lowerCaseSearchTerm) && !selectedFriendUids.includes(f.uid), // 이미 선택된 친구는 검색 결과에서 제외
    );
    setSearchResults(filtered);
  }, [friendSearchTerm, friends, selectedFriendUids]);

  const toggleFriend = (friendUid: string) => {
    setSelectedFriendUids((prev) => (prev.includes(friendUid) ? prev.filter((uid) => uid !== friendUid) : [...prev, friendUid]));
  };

  const onToggleGroup = (group: { friends: { uid: string }[] }) => {
    const selectedUidsSet = new Set(selectedFriendUids);

    const areAllSelected = group.friends.every((f) => selectedUidsSet.has(f.uid));

    if (areAllSelected) {
      group.friends.forEach((f) => selectedUidsSet.delete(f.uid));
    } else {
      group.friends.forEach((f) => selectedUidsSet.add(f.uid));
    }
    setSelectedFriendUids(Array.from(selectedUidsSet));
  };

  // [추가] 검색어에 따라 친구 목록 필터링
  const groupedFriends = useMemo(() => {
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

  // [추가] 검색 입력란에서 친구 추가
  const handleAddFriendByName = () => {
    if (friendSearchTerm.trim() === '') return;

    const friendToAdd = searchResults.find((f) => f.name.toLowerCase() === friendSearchTerm.toLowerCase());

    if (friendToAdd) {
      toggleFriend(friendToAdd.uid);
      setFriendSearchTerm(''); // 추가 후 검색어 초기화
      setSearchResults([]); // 검색 결과 초기화
    } else {
      toast.error('검색된 친구가 없습니다.');
    }
  };

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
        color: selectedColor, // [수정] 선택된 색상 저장
        icon: selectedIcon, // [추가] 선택된 아이콘 저장
        createdAt: new Date().toISOString(),
        isDefault: false, // 기본 캘린더 여부
      });

      // [추가] 공유된 친구들에게 알림 보내기
      if (selectedFriendUids.length > 0 && user?.displayName) {
        const batch = writeBatch(db);
        for (const friendUid of selectedFriendUids) {
          await notifyCalendarInvite(batch, {
            friendUid,
            inviterId: user.uid,
            inviterName: user.displayName,
            calendarId: docRef.id,
            calendarName: finalName,
          });
        }
        // 모든 알림 준비가 끝난 후 배치 커밋
        await batch.commit();
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

  const renderFooter = () => (
    <PageFooter>
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
        {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <span>캘린더 생성하기</span>}
      </button>
    </PageFooter>
  );

  return (
    <>
      <PageLayout title="새 캘린더 만들기" footer={renderFooter()} onBack={() => navigate(-1)}>
        <PageHeader icon={<Sparkles className="text-blue-600 dark:text-blue-400 w-6 h-6" />}>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-[1.3] tracking-tight">
            새로운 <span className="text-blue-600 dark:text-blue-400">캘린더</span>를<br />
            만들어볼까요?
          </h2>
        </PageHeader>

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
            <div className="flex items-center justify-between">
              <label className="block text-[13px] font-black text-gray-400 ml-1">캘린더 아이콘</label>
              <div className="relative" ref={colorDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsColorDropdownOpen(!isColorDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm active:scale-95 transition-all"
                >
                  <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: selectedColor }} />
                  <span className="text-[12px] font-bold text-gray-600 dark:text-gray-300"></span>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>
                {isColorDropdownOpen && (
                  <div className="absolute top-full right-0 mt-2 p-3 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 w-[240px]">
                    <div className="grid grid-cols-5 gap-2">
                      {COLOR_OPTIONS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => {
                            setSelectedColor(color);
                            setIsColorDropdownOpen(false);
                          }}
                          className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                          style={{ backgroundColor: color }}
                        >
                          {selectedColor === color && <Check size={14} className="text-white" strokeWidth={3} />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-3 px-1">
              {CALENDAR_ICONS.map(({ id, component: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedIcon(id)}
                  className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center border-2`}
                  style={{
                    borderColor: selectedIcon === id ? selectedColor : 'transparent',
                    backgroundColor: selectedIcon === id ? `${selectedColor}20` : 'transparent', // 20 is hex opacity ~12%
                  }}
                >
                  <Icon
                    size={20}
                    style={{
                      color: selectedColor,
                      opacity: selectedIcon === id ? 1 : 0.4,
                    }}
                  />
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
              <span className="text-[11px] font-bold px-2 py-1 rounded-lg transition-colors bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300">
                {selectedFriendUids.length}명
              </span>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-[24px] p-4 border-2 border-transparent space-y-4">
              <div className="relative">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <div className="flex items-center bg-white dark:bg-gray-800 rounded-[16px] px-4 h-[52px] shadow-sm border border-gray-100 dark:border-gray-700/50 focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
                      <Search size={18} className="text-gray-400 dark:text-gray-500 mr-3 shrink-0" />
                      <input
                        type="text"
                        value={friendSearchTerm}
                        onChange={(e) => setFriendSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddFriendByName()}
                        placeholder="친구 이름 검색 후 추가"
                        className="w-full bg-transparent outline-none text-gray-900 dark:text-white text-[14px] font-bold placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      />
                    </div>
                    {friendSearchTerm && searchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-700 rounded-xl shadow-lg border border-gray-100 dark:border-gray-600 z-10 max-h-48 overflow-y-auto">
                        {searchResults.map((friend) => (
                          <button
                            key={friend.uid}
                            onClick={() => {
                              toggleFriend(friend.uid);
                              setFriendSearchTerm('');
                              setSearchResults([]);
                            }}
                            className="w-full text-left px-4 py-3 text-sm font-bold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                          >
                            {friend.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="w-[52px] h-[52px] bg-blue-600 text-white rounded-[16px] flex items-center justify-center shrink-0 shadow-md shadow-blue-100 dark:shadow-blue-900/50 active:scale-95 transition-all"
                  >
                    <Plus size={20} strokeWidth={3} />
                  </button>
                </div>
              </div>

              {selectedFriendUids.length > 0 && (
                <div className="px-1">
                  <h5 className="text-xs font-bold text-gray-400 dark:text-gray-500 mb-2">선택된 친구 ({selectedFriendUids.length}명)</h5>
                  <div className="flex flex-wrap gap-2">
                    {friends
                      .filter((f) => selectedFriendUids.includes(f.uid))
                      .map((friend) => (
                        <button
                          key={`invited-${friend.uid}`}
                          type="button"
                          onClick={() => toggleFriend(friend.uid)}
                          className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-xs font-bold transition-all bg-blue-600 text-white"
                        >
                          {friend.name}
                          <X size={14} className="bg-white/20 rounded-full p-0.5" />
                        </button>
                      ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsFriendSelectionPopupOpen(true)}
                className="w-full h-[52px] border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-[20px] flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 font-bold text-[13px] hover:border-blue-300 dark:hover:border-blue-500 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-900/20 transition-all active:scale-[0.99]"
              >
                <UserPlus size={16} strokeWidth={2.5} />
                친구 목록에서 선택하기
              </button>
            </div>
          </section>
        </div>
      </PageLayout>

      <AddFriendModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} myInfo={user} friends={friends} onOpenContacts={handleOpenContactsModal} />
      <AddFromContactsModal isOpen={isAddFromContactsModalOpen} onClose={() => setIsAddFromContactsModalOpen(false)} myInfo={user as any} existingFriends={friends} />
      {/* [수정] ProposeMeetingCreate와 동일한 FriendListPopup 사용 */}
      <FriendListPopup
        isOpen={isFriendSelectionPopupOpen}
        onClose={() => setIsFriendSelectionPopupOpen(false)}
        groupedFriends={groupedFriends.map((g) => ({
          ...g,
          friends: g.friends.map((f) => ({ id: f.uid, name: f.name, group: f.group })),
        }))}
        invitedFriends={friends.filter((f) => selectedFriendUids.includes(f.uid)).map((f) => ({ id: f.uid, name: f.name, group: f.group }))}
        onToggleFriend={(friend) => toggleFriend(friend.id)}
        onToggleGroup={(group) => {
          // `onToggleGroup`은 `uid`를 포함한 전체 `Friend` 객체를 기대하므로,
          // `id`만 있는 `group.friends`를 `uid`를 가진 친구 객체로 다시 매핑합니다.
          const originalGroup = groupedFriends.find((g) => g.id === group.id);
          if (originalGroup) {
            onToggleGroup(originalGroup);
          }
        }}
      />
    </>
  );
};

export default CreateCalendar;
