import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { addDoc, collection, doc, getDocs, onSnapshot, query, where, writeBatch } from 'firebase/firestore';
import {
  Briefcase,
  CalendarPlus2,
  Check,
  ChevronDown,
  Coffee,
  Dumbbell,
  Gamepad2,
  Gift,
  GraduationCap,
  Heart,
  Home,
  Loader2,
  Music,
  PenLine,
  Plane,
  Plus,
  Search,
  ShoppingCart,
  Star,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { auth, db } from '../../firebase';
import { AddFriendModal, AddFromContactsModal, FriendListPopup, PageFooter, PageHeader, PageLayout, PageTitle } from 'components';
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

/**
 * 친구 데이터 인터페이스
 */
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
  '#007AFF', // primary
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#f43f5e', // rose
  '#64748b', // slate
  '#71717a', // zinc
];

/**
 * 새 캘린더 생성 페이지 컴포넌트
 * - 캘린더 이름, 아이콘, 색상을 설정하고 친구를 초대하여 공유 캘린더를 생성합니다.
 *
 * @returns {JSX.Element} 캘린더 생성 화면
 */
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

  const [friends, setFriends] = useState<Friend[]>([]); // 모든 친구 목록
  const [friendGroups, setFriendGroups] = useState<FriendGroup[]>([]); // 친구 그룹 목록

  const [friendSearchTerm, setFriendSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Friend[]>([]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddFromContactsModalOpen, setIsAddFromContactsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // 로그인된 사용자의 친구 목록 실시간 구독
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

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorDropdownRef.current && !colorDropdownRef.current.contains(event.target as Node)) {
        setIsColorDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 친구 검색 결과 업데이트
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

  /** 친구 선택 토글 핸들러 */
  const toggleFriend = (friendUid: string) => {
    setSelectedFriendUids((prev) => (prev.includes(friendUid) ? prev.filter((uid) => uid !== friendUid) : [...prev, friendUid]));
  };

  /** 친구 그룹 선택 토글 핸들러 */
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

  // 검색어에 따라 친구 목록 필터링 및 그룹화
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

  /** 검색 입력란에서 친구 추가 핸들러 */
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

  // 캘린더 이름 자동 생성 로직
  const finalName = useMemo(() => {
    if (calName) return calName; // 1. 사용자가 직접 입력한 이름이 최우선

    // 2. 친구를 선택하지 않았거나 사용자 정보가 없으면 자동 생성 안함
    if (selectedFriendUids.length === 0 || !user?.displayName) {
      return '';
    }

    // 3. 선택된 친구 목록을 기반으로 캘린더 이름을 요약하여 생성
    const selectedFriendNames = friends.filter((f) => selectedFriendUids.includes(f.uid)).map((f) => f.name);

    if (selectedFriendNames.length > 0) {
      const targetName = selectedFriendNames[0];
      const lastCharCode = targetName.charCodeAt(targetName.length - 1);
      const isHangul = lastCharCode >= 0xac00 && lastCharCode <= 0xd7a3;
      const hasBatchim = isHangul && (lastCharCode - 0xac00) % 28 > 0;
      const particle = hasBatchim ? '과' : '와';

      if (selectedFriendNames.length === 1) {
        return `${targetName}${particle}의 캘린더`;
      }
      return `${targetName}님 외 ${selectedFriendNames.length - 1}명${particle}의 캘린더`;
    }
    return '';
  }, [calName, selectedFriendUids, friends, user?.displayName]);

  // 이름이 없으면 생성 불가 (친구 선택 안해도 본인 캘린더로 생성 가능하게 조건 완화)
  const isSubmitDisabled = !finalName.trim() || isSubmitting;

  /** 캘린더 생성 및 저장 핸들러 */
  const handleSubmit = async () => {
    if (isSubmitDisabled || !user) {
      if (!user) toast.error('로그인이 필요합니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 중복 캘린더 생성 방지 로직
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

      // 캘린더 이름 및 사용자별 맞춤 이름 생성 로직
      let dbName = calName;
      let customNames: Record<string, string> | null = null;

      // 사용자가 이름을 직접 입력하지 않은 경우 (자동 생성)
      if (!calName.trim()) {
        const selectedFriends = friends.filter((f) => selectedFriendUids.includes(f.uid));
        // 1. 기본 name 필드는 참여자들의 이름을 나열하여 저장 (fallback 용도)
        const allMemberNames = [user.displayName || '알 수 없음', ...selectedFriends.map((f) => f.name)];
        dbName = allMemberNames.join(', ');

        // 2. 각 멤버별로 상대방의 이름을 딴 맞춤 이름 생성 (customNames)
        customNames = {};
        const allMembers = [{ uid: user.uid, name: user.displayName || '알 수 없음' }, ...selectedFriends];

        allMembers.forEach((member) => {
          const others = allMembers.filter((m) => m.uid !== member.uid);
          if (others.length > 0) {
            const targetName = others[0].name;
            const lastCharCode = targetName.charCodeAt(targetName.length - 1);
            const isHangul = lastCharCode >= 0xac00 && lastCharCode <= 0xd7a3;
            const hasBatchim = isHangul && (lastCharCode - 0xac00) % 28 > 0;
            const particle = hasBatchim ? '과' : '와';

            if (others.length === 1) {
              customNames![member.uid] = `${targetName}${particle}의 캘린더`;
            } else {
              customNames![member.uid] = `${targetName}님 외 ${others.length - 1}명${particle}의 캘린더`;
            }
          } else {
            customNames![member.uid] = '나만의 캘린더';
          }
        });
      }

      const docRef = await addDoc(collection(db, 'calendars'), {
        name: dbName,
        customNames: customNames,
        ownerId: user.uid,
        members: newMembers,
        color: selectedColor,
        icon: selectedIcon,
        createdAt: new Date().toISOString(),
        isDefault: false,
      });

      // 공유된 친구들에게 알림 보내기
      if (selectedFriendUids.length > 0 && user?.displayName) {
        const batch = writeBatch(db);
        for (const friendUid of selectedFriendUids) {
          // 알림 메시지에는 해당 친구가 보게 될 캘린더 이름을 사용
          const inviteCalendarName = customNames ? customNames[friendUid] : dbName;

          await notifyCalendarInvite(batch, {
            friendUid,
            inviterId: user.uid,
            inviterName: user.displayName,
            calendarId: docRef.id,
            calendarName: inviteCalendarName,
          });
        }
        // 모든 알림 준비가 끝난 후 배치 커밋
        await batch.commit();
      }

      toast.success(`'${customNames ? customNames[user.uid] : dbName}' 캘린더가 생성되었습니다!`);

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
        // ScheduleEdit에서 왔다면, 생성된 캘린더 ID를 포함하여 다시 돌아감
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
        {finalName && <p className="text-[13px] font-bold text-primary animate-in fade-in slide-in-from-bottom-1">✨ "{finalName}" 생성 예정</p>}
      </div>
      <button disabled={isSubmitDisabled} onClick={handleSubmit} className="btn-primary">
        {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <span>캘린더 생성하기</span>}
      </button>
    </PageFooter>
  );

  return (
    <>
      <PageLayout title="새 캘린더 만들기" footer={renderFooter()} onBack={() => navigate(-1)}>
        <PageHeader icon={<CalendarPlus2 className="text-primary w-6 h-6" />}>
          <PageTitle>
            새로운 <span className="text-primary">캘린더</span>를<br />
            만들어볼까요?
          </PageTitle>
        </PageHeader>

        <div className="space-y-8">
          {/* 캘린더 이름 입력 */}
          <section className="space-y-3">
            <label className="block text-[13px] font-black text-sub dark:text-gray-400 ml-1">캘린더 이름</label>
            <div className="flex items-center h-[60px] bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus-within:border-primary focus-within:bg-white dark:focus-within:bg-gray-800 rounded-[20px] px-5 transition-all shadow-sm">
              <PenLine size={20} className="text-sub dark:text-gray-400 mr-4" />
              <input
                value={calName}
                onChange={(e) => setCalName(e.target.value)}
                placeholder="캘린더 이름을 입력해주세요"
                className="bg-transparent border-none outline-none w-full h-full text-[16px] font-bold text-main dark:text-white placeholder:text-sub/80 dark:placeholder:text-gray-400"
              />
            </div>
          </section>

          {/* 캘린더 아이콘 및 색상 선택 */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-[13px] font-black text-sub ml-1">캘린더 아이콘</label>
              <div className="relative" ref={colorDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsColorDropdownOpen(!isColorDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm active:scale-95 transition-all"
                >
                  <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: selectedColor }} />
                  <span className="text-[12px] font-bold text-sub dark:text-gray-300"></span>
                  <ChevronDown size={14} className="text-sub" />
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

          {/* 공유할 친구 선택 */}
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-sub dark:text-gray-400" />
                <label className="text-[13px] font-black text-sub dark:text-gray-400">공유할 친구 선택</label>
              </div>
              <span className="text-[11px] font-bold px-2 py-1 rounded-lg transition-colors bg-primary/10 text-primary">{selectedFriendUids.length}명</span>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-[24px] p-4 border-2 border-transparent space-y-4">
              <div className="relative">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <div className="flex items-center bg-white dark:bg-gray-800 rounded-[16px] px-4 h-[52px] shadow-sm border border-gray-100 dark:border-gray-700/50 focus-within:ring-2 focus-within:ring-primary/50 transition-all">
                      <Search size={18} className="text-sub dark:text-gray-400 mr-3 shrink-0" />
                      <input
                        type="text"
                        value={friendSearchTerm}
                        onChange={(e) => setFriendSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddFriendByName()}
                        placeholder="친구 이름 검색 후 추가"
                        className="w-full bg-transparent outline-none text-main dark:text-white text-[14px] font-bold placeholder:text-sub dark:placeholder:text-gray-400"
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
                            className="w-full text-left px-4 py-3 text-sm font-bold text-main dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
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
                    className="w-[52px] h-[52px] bg-primary text-white rounded-[16px] flex items-center justify-center shrink-0 shadow-md shadow-primary/30 dark:shadow-primary/20 active:scale-95 transition-all"
                  >
                    <Plus size={20} strokeWidth={3} />
                  </button>
                </div>
              </div>

              {selectedFriendUids.length > 0 && (
                <div className="px-1">
                  <h5 className="text-xs font-bold text-sub dark:text-gray-400 mb-2">선택된 친구 ({selectedFriendUids.length}명)</h5>
                  <div className="flex flex-wrap gap-2">
                    {friends
                      .filter((f) => selectedFriendUids.includes(f.uid))
                      .map((friend) => (
                        <button
                          key={`invited-${friend.uid}`}
                          type="button"
                          onClick={() => toggleFriend(friend.uid)}
                          className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-xs font-bold transition-all bg-primary text-white"
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
                className="w-full h-[52px] border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-[20px] flex items-center justify-center gap-2 text-sub dark:text-gray-400 font-bold text-[13px] hover:border-primary hover:text-primary hover:bg-primary/20 transition-all active:scale-[0.99]"
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
