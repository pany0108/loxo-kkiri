import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Search, UserPlus, User, ChevronRight, Check, Loader2, MoreVertical, Edit2, Trash2, AlertCircle, X, Users, Folder, FolderPlus } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, updateDoc, query, collection, where, getDocs, arrayUnion, arrayRemove, addDoc } from 'firebase/firestore';
import { ImagePreviewModal } from 'components';
import { useFirestoreDoc } from 'hooks';

/**
 * 친구 데이터 인터페이스
 */
interface Friend {
  uid: string;
  name: string;
  email: string;
  statusMessage?: string;
  photoURL?: string;
  group?: string; // 그룹 ID
}

/**
 * [추가] 친구 그룹 데이터 인터페이스
 */
interface FriendGroup {
  id: string;
  name: string;
}

/**
 * 친구 목록 관리 컴포넌트입니다.
 * - Firestore 실시간 리스너를 통해 친구 목록 동기화
 * - 이메일 검색을 통한 친구 추가
 * - 친구 별명 수정 및 목록 삭제 기능 제공
 * * @returns {JSX.Element} 친구 목록 관리 화면
 */
const FriendList = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // --- 상태 관리 ---
  const [searchTerm, setSearchTerm] = useState('');

  // 친구 추가 모달 상태
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newFriendInput, setNewFriendInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addFriendMethod, setAddFriendMethod] = useState<'email' | 'phone'>('email');

  // 더보기 메뉴 및 수정/삭제 팝업 상태
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [profilePopupFriend, setProfilePopupFriend] = useState<Friend | null>(null);
  const [newFriendId, setNewFriendId] = useState<string | null>(location.state?.newFriendId || null);

  // [추가] 다중 선택 상태
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedFriendUids, setSelectedFriendUids] = useState<Set<string>>(new Set());
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // [추가] 그룹 관리 상태
  const [isGroupManagerOpen, setIsGroupManagerOpen] = useState(false);
  const [isMoveToGroupOpen, setIsMoveToGroupOpen] = useState(false);
  const [groups, setGroups] = useState<FriendGroup[]>([]);

  // 바텀시트 스와이프 제어 Ref
  const sheetTouchStartY = useRef<number | null>(null);
  const sheetTouchEndY = useRef<number | null>(null);
  const minSheetSwipeDistance = 50;
  const addFriendInputRef = useRef<HTMLInputElement>(null);
  const groupInputsContainerRef = useRef<HTMLDivElement>(null);

  // 스크롤 컨테이너 Ref 정의
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const user = auth.currentUser;
  const userDocRef = useMemo(() => (user ? doc(db, 'users', user.uid) : null), [user]);
  const { data: myInfo, loading: isLoading } = useFirestoreDoc<any>(userDocRef);

  // myInfo 데이터가 변경될 때마다 friends 목록을 파생시킵니다.
  const friends: Friend[] = useMemo(() => myInfo?.friendsList || [], [myInfo]);

  // [추가] 그룹 목록 상태 초기화
  useEffect(() => {
    if (myInfo?.friendGroups) {
      setGroups(myInfo.friendGroups);
    }
  }, [myInfo]);

  // [추가] 다른 페이지에서 친구 추가 후 돌아왔을 때, 해당 친구를 목록 상단에 표시하기 위해 state를 관리합니다.
  useEffect(() => {
    if (location.state?.newFriendId) {
      setNewFriendId(location.state.newFriendId);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  // [추가] 친구 추가 모달이 열리거나 탭이 변경될 때 입력창에 포커스합니다.
  useEffect(() => {
    if (isAddModalOpen) {
      setTimeout(() => addFriendInputRef.current?.focus(), 100);
    }
  }, [isAddModalOpen, addFriendMethod]);

  const prevGroupsLengthRef = useRef(groups.length);
  useEffect(() => {
    // 그룹 추가 시 새로 생긴 입력창에 자동 포커스
    if (isGroupManagerOpen && groups.length > prevGroupsLengthRef.current) {
      // [수정] last-of-type 선택자 대신, 모든 input을 가져와 마지막 요소를 선택하는 방식으로 변경
      const inputs = groupInputsContainerRef.current?.querySelectorAll<HTMLInputElement>('input');
      if (inputs && inputs.length > 0) {
        const lastInput = inputs[inputs.length - 1];
        lastInput.focus();
        lastInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
    // 현재 길이를 ref에 저장하여 다음 렌더링에서 비교
    prevGroupsLengthRef.current = groups.length;
  }, [groups, isGroupManagerOpen]);

  // --- [추가] 다중 선택 로직 ---
  const handlePointerDown = (friendUid: string) => {
    if (isSelectionMode) return;
    longPressTimer.current = setTimeout(() => {
      setIsSelectionMode(true);
      setSelectedFriendUids((prev) => new Set(prev).add(friendUid));
    }, 500);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const handleFriendClick = (friend: Friend) => {
    if (isSelectionMode) {
      setSelectedFriendUids((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(friend.uid)) {
          newSet.delete(friend.uid);
        } else {
          newSet.add(friend.uid);
        }
        return newSet;
      });
    } else {
      setProfilePopupFriend(friend);
    }
  };

  const handleSelectAll = () => {
    const allFriendUids = new Set(friends.map((f) => f.uid));
    setSelectedFriendUids(selectedFriendUids.size === friends.length ? new Set() : allFriendUids);
  };
  /**
   * [추가] 바텀시트 스와이프 핸들러
   */
  const onSheetTouchStart = (e: React.TouchEvent) => {
    sheetTouchEndY.current = null;
    sheetTouchStartY.current = e.targetTouches[0].clientY;
  };

  const onSheetTouchMove = (e: React.TouchEvent) => {
    sheetTouchEndY.current = e.targetTouches[0].clientY;
  };

  const onSheetTouchEnd = () => {
    if (!sheetTouchStartY.current || !sheetTouchEndY.current) return;
    const distance = sheetTouchEndY.current - sheetTouchStartY.current;
    if (distance > minSheetSwipeDistance) {
      setIsMenuOpen(false);
    }
  };

  /**
   * 이메일로 사용자를 검색하여 친구 목록에 추가합니다.
   * - 자기 자신 추가 불가
   * - 이미 등록된 친구 중복 추가 불가
   * - 존재하지 않는 이메일 처리
   */
  const handleAddFriend = async () => {
    if (!newFriendInput.trim() || !auth.currentUser) return;

    const searchField = addFriendMethod;
    const searchValue = newFriendInput.trim();

    // 자기 자신 추가 방지
    if (searchField === 'email' && searchValue === auth.currentUser.email) {
      toast.error('자기 자신은 친구로 추가할 수 없습니다.');
      return;
    }
    if (searchField === 'phone' && searchValue === myInfo?.phone) {
      toast.error('자기 자신은 친구로 추가할 수 없습니다.');
      return;
    }

    setIsAdding(true);
    try {
      // 이메일 또는 휴대폰 번호로 유저 검색
      const q = query(collection(db, 'users'), where(searchField, '==', searchValue));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast.error(`존재하지 않는 ${searchField === 'email' ? '이메일' : '휴대폰 번호'}입니다.`);
        return;
      }

      const targetUserDoc = querySnapshot.docs[0];
      const targetUserData = targetUserDoc.data();

      // 이미 친구인지 확인
      if (friends.some((f) => f.uid === targetUserDoc.id)) {
        toast('이미 친구 목록에 있습니다.', { icon: '⚠️' });
        return;
      }

      // 내 친구 목록에 추가 (arrayUnion)
      const myRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(myRef, {
        friendsList: arrayUnion({
          uid: targetUserDoc.id,
          name: targetUserData.name,
          email: targetUserData.email,
          statusMessage: targetUserData.statusMessage || '',
          photoURL: targetUserData.photoURL || '',
        }),
      });

      // [추가] 상대방에게 친구 추가 알림 보내기
      await addDoc(collection(db, 'notifications'), {
        userId: targetUserDoc.id, // 알림을 받을 사용자 (상대방)
        type: 'FRIEND_REQUEST',
        message: `${myInfo?.name || '누군가'}님이 당신을 친구로 추가했습니다.`,
        relatedId: auth.currentUser.uid, // 나를 다시 추가할 수 있도록 내 UID를 전달
        fromUserName: myInfo?.name || '누군가',
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      // 성공 처리
      toast.success(`${targetUserData.name}님을 친구로 추가했습니다.`);
      closeAddModal();
    } catch (error) {
      console.error('친구 추가 오류:', error);
      toast.error('친구 추가 중 오류가 발생했습니다.');
    } finally {
      setIsAdding(false);
    }
  };

  /**
   * 선택한 친구의 표시 이름(별명)을 수정합니다.
   * Firestore의 배열 데이터를 업데이트합니다.
   */
  const handleEditSave = async () => {
    if (!selectedFriend || !editName.trim()) return;
    try {
      const myRef = doc(db, 'users', auth.currentUser!.uid);

      // 배열 내 특정 객체만 수정하여 전체 리스트 교체
      const updatedList = friends.map((f) => (f.uid === selectedFriend.uid ? { ...f, name: editName.trim() } : f));

      await updateDoc(myRef, { friendsList: updatedList });
      toast.success('이름이 수정되었습니다.');
      setIsEditModalOpen(false);
      setIsMenuOpen(false);
    } catch (e) {
      console.error('친구 이름 수정 오류:', e);
      toast.error('이름 수정 중 오류가 발생했습니다.');
    }
  };

  /**
   * 친구 추가 모달을 닫고 입력값을 초기화합니다.
   */
  const closeAddModal = () => {
    setNewFriendInput('');
    setIsAddModalOpen(false);
    setAddFriendMethod('email'); // 탭 초기화
  };

  /**
   * [추가] 휴대폰 번호 자동 포맷팅 (010-0000-0000)
   */
  const formatPhone = (value: string) => {
    const nums = value.replace(/[^\d]/g, '');
    if (nums.length <= 3) return nums;
    if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
    return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7, 11)}`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (addFriendMethod === 'phone') {
      setNewFriendInput(formatPhone(e.target.value));
    } else {
      setNewFriendInput(e.target.value);
    }
  };

  /**
   * 엔터 키 입력 시 지정된 액션을 실행합니다.
   * @param {React.KeyboardEvent} e - 키보드 이벤트
   * @param {() => void} action - 실행할 함수
   */
  const handleKeyDownAction = (e: React.KeyboardEvent<HTMLInputElement>, action: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };

  /**
   * 친구 목록에서 선택한 대상을 삭제합니다.
   */
  const handleDeleteConfirm = async () => {
    if (!selectedFriend) return;
    try {
      const myRef = doc(db, 'users', auth.currentUser!.uid);
      await updateDoc(myRef, { friendsList: arrayRemove(selectedFriend) });
      toast.success('친구를 삭제했습니다.');
      setIsDeleteModalOpen(false);
      setIsMenuOpen(false);
    } catch (e) {
      console.error('친구 삭제 오류:', e);
      toast.error('친구 삭제 중 오류가 발생했습니다.');
    }
  };

  // --- [추가] 그룹 관리 로직 ---

  const handleSaveGroups = async (newGroups: FriendGroup[]) => {
    if (!user) return;

    // [추가] 그룹 이름 유효성 검사
    if (newGroups.some((g) => g.name.trim() === '')) {
      toast.error('그룹 이름은 비워둘 수 없습니다.');
      return;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { friendGroups: newGroups });
      setGroups(newGroups);
      toast.success('그룹이 저장되었습니다.');
      setIsGroupManagerOpen(false);
    } catch (error) {
      toast.error('그룹 저장 중 오류가 발생했습니다.');
      console.error(error);
    }
  };

  const handleMoveFriendToGroup = async (groupId: string | null) => {
    if (!selectedFriend || !user) return;

    const updatedFriendsList = friends.map((f) => {
      if (f.uid === selectedFriend.uid) {
        // groupId가 null이면 group 속성을 제거 (미분류로 이동)
        if (groupId === null) {
          const { group, ...rest } = f;
          return rest;
        }
        return { ...f, group: groupId };
      }
      return f;
    });

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { friendsList: updatedFriendsList });
      toast.success(`${selectedFriend.name}님을 이동했습니다.`);
      setIsMoveToGroupOpen(false);
      setIsMenuOpen(false);
    } catch (error) {
      toast.error('그룹 이동 중 오류가 발생했습니다.');
      console.error(error);
    }
  };

  const handleMoveMultipleFriendsToGroup = async (groupId: string | null) => {
    if (selectedFriendUids.size === 0 || !user) return;

    const updatedFriendsList = friends.map((f) => {
      if (selectedFriendUids.has(f.uid)) {
        if (groupId === null) {
          const { group, ...rest } = f;
          return rest;
        }
        return { ...f, group: groupId };
      }
      return f;
    });

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { friendsList: updatedFriendsList });
      toast.success(`${selectedFriendUids.size}명의 친구를 이동했습니다.`);
      setIsMoveToGroupOpen(false);
      setIsSelectionMode(false);
      setSelectedFriendUids(new Set());
    } catch (error) {
      toast.error('그룹 이동 중 오류가 발생했습니다.');
      console.error(error);
    }
  };

  // -----------------------------

  /**
   * 검색어에 따라 친구 목록을 필터링하고 이름순으로 정렬합니다.
   */
  const groupedFriends = useMemo(() => {
    const groupMap = new Map<string, { name: string; friends: Friend[] }>();

    // 그룹 목록 초기화 (사용자 정의 그룹 + 기본 그룹)
    groups.forEach((g) => groupMap.set(g.id, { name: g.name, friends: [] }));
    groupMap.set('uncategorized', { name: '미분류', friends: [] });

    // 1. 검색어로 친구 필터링
    const filteredBySearch = friends.filter((f) => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

    // 2. 필터링된 친구들을 그룹에 할당
    filteredBySearch.forEach((friend) => {
      const groupId = friend.group || 'uncategorized';
      if (groupMap.has(groupId)) {
        groupMap.get(groupId)!.friends.push(friend);
      } else {
        // 정의되지 않은 그룹에 속한 친구는 '미분류'로
        groupMap.get('uncategorized')!.friends.push(friend);
      }
    });

    // 3. 각 그룹 내에서 친구 정렬
    groupMap.forEach((groupData, groupId) => {
      groupData.friends.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
      // '새 친구'를 해당 그룹의 최상단으로 올리는 로직
      if (newFriendId) {
        const newFriendIndex = groupData.friends.findIndex((f) => f.uid === newFriendId);
        if (newFriendIndex > -1) {
          const [newFriend] = groupData.friends.splice(newFriendIndex, 1);
          groupData.friends.unshift(newFriend);
        }
      }
    });

    // 4. 최종 렌더링을 위한 배열 생성 (이름순 정렬, '미분류'는 마지막)
    const sortedGroupArray = Array.from(groupMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => {
        if (a.id === 'uncategorized') return 1;
        if (b.id === 'uncategorized') return -1;
        return a.name.localeCompare(b.name, 'ko');
      })
      // 검색 결과가 없는 그룹은 숨김
      .filter((group) => group.friends.length > 0);

    return sortedGroupArray;
  }, [friends, groups, searchTerm, newFriendId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950 font-['Pretendard']">
      {isSelectionMode ? (
        <div className="sticky top-0 bg-gray-50/95 dark:bg-gray-950/95 px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800 z-40">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setIsSelectionMode(false);
                setSelectedFriendUids(new Set());
              }}
              className="p-2 -ml-2 text-gray-500"
            >
              <X size={24} />
            </button>
            <h3 className="text-lg font-black text-gray-900 dark:text-white">{selectedFriendUids.size}명 선택됨</h3>
            <button onClick={handleSelectAll} className="text-sm font-bold text-blue-600 p-2">
              {selectedFriendUids.size === friends.length ? '전체해제' : '전체선택'}
            </button>
          </div>
        </div>
      ) : (
        <div className="sticky top-0 bg-gray-50/95 dark:bg-gray-950/95 z-20 px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-gray-900 dark:text-white">친구 목록</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="p-2.5 bg-gray-900 text-white dark:bg-gray-700 rounded-full shadow-lg active:scale-90 transition-transform"
                aria-label="친구 추가"
              >
                <UserPlus size={20} />
              </button>
            </div>
          </div>
          <div className="relative">
            <div className="flex items-center bg-white dark:bg-gray-800 rounded-[20px] px-4 py-3.5 shadow-sm border border-gray-100 dark:border-gray-700/50 focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
              <Search size={18} className="text-gray-400 dark:text-gray-500 mr-3 shrink-0" />
              <input
                type="text"
                value={searchTerm}
                placeholder="친구 이름 검색"
                className="flex-1 bg-transparent outline-none text-gray-900 dark:text-white text-[15px] font-bold placeholder:text-gray-300 dark:placeholder:text-gray-600"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      <div ref={scrollContainerRef} className="flex-1 px-6 pt-4 pb-24 overflow-y-auto w-full min-h-0 overscroll-y-contain" onScroll={cancelLongPress}>
        <>
          {groupedFriends.length > 0 ? (
            groupedFriends.map((group) => (
              <section key={group.id} className="pt-4 first:pt-0">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h2 className="text-[12px] font-bold text-gray-400 dark:text-gray-500 flex items-center gap-2">
                    <Folder size={14} /> {group.name}
                    <span className="text-blue-600">{group.friends.length}</span>
                  </h2>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-[32px] border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                  <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                    {group.friends.map((friend) => (
                      <div
                        key={friend.uid}
                        className={`group flex items-center justify-between p-4 pl-5 transition-colors cursor-pointer touch-pan-y ${
                          selectedFriendUids.has(friend.uid) ? 'bg-blue-50 dark:bg-blue-900/50' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                        onPointerDown={() => handlePointerDown(friend.uid)}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                        onClick={() => handleFriendClick(friend)}
                      >
                        {isSelectionMode && (
                          <div className="mr-4">
                            <div
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                selectedFriendUids.has(friend.uid) ? 'bg-blue-600 border-blue-600' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                              }`}
                            >
                              {selectedFriendUids.has(friend.uid) && <Check size={16} className="text-white" />}
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-4 overflow-hidden flex-1">
                          <div
                            className="w-[48px] h-[48px] rounded-[18px] shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (friend.photoURL) setPreviewImage(friend.photoURL);
                            }}
                          >
                            {friend.photoURL ? (
                              <img src={friend.photoURL} alt={friend.name} className="w-full h-full object-cover rounded-[18px]" />
                            ) : (
                              <div className="w-full h-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-lg rounded-[18px]">
                                {friend.name[0]}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-[16px] font-bold text-gray-900 dark:text-white truncate">{friend.name}</span>
                            <p className="text-[12px] font-medium truncate text-gray-500 dark:text-gray-400">{friend.statusMessage || '상태 메시지 없음'}</p>
                          </div>
                        </div>
                        {!isSelectionMode && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFriend(friend);
                              setIsMenuOpen(true);
                            }}
                            className="p-2 text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 active:bg-gray-100 dark:active:bg-gray-700 rounded-full transition-all"
                          >
                            <MoreVertical size={20} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ))
          ) : (
            <div className="py-20 text-center">
              <p className="text-gray-400 dark:text-gray-500 text-sm font-bold">친구가 없거나 검색 결과가 없어요.</p>
            </div>
          )}
          <section className="pt-4">
            <button
              onClick={() => setIsGroupManagerOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-[32px] text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <FolderPlus size={16} />
              <span className="text-sm font-bold">그룹 추가 / 관리</span>
            </button>
          </section>
        </>
      </div>

      {/* [추가] 다중 선택 시 하단 액션 바 */}
      {isSelectionMode && selectedFriendUids.size > 0 && (
        <div className="fixed bottom-20 left-0 right-0 z-40 p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 animate-in slide-in-from-bottom duration-300">
          <button
            onClick={() => setIsMoveToGroupOpen(true)}
            className="w-full h-[52px] bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100 dark:shadow-blue-900/50"
          >
            <FolderPlus size={20} />
            그룹 변경
          </button>
        </div>
      )}

      {/* 친구 관리 바텀시트 메뉴 */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setIsMenuOpen(false)} />
          <div
            className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-t-[32px] px-6 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] animate-in slide-in-from-bottom duration-300 shadow-2xl"
            onTouchStart={onSheetTouchStart}
            onTouchMove={onSheetTouchMove}
            onTouchEnd={onSheetTouchEnd}
          >
            <button onClick={() => setIsMenuOpen(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
              <X size={20} />
            </button>
            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-6" />
            <h3 className="text-[14px] font-black text-gray-400 dark:text-gray-500 mb-4 px-2 tracking-tight">{selectedFriend?.name}님 관리</h3>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setEditName(selectedFriend?.name || '');
                  setIsEditModalOpen(true);
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-[22px] transition-colors"
              >
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                  <Edit2 size={20} />
                </div>
                <span className="font-bold text-gray-700 dark:text-gray-300">이름 수정하기</span>
              </button>
              <button
                onClick={() => {
                  setIsMoveToGroupOpen(true);
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-[22px] transition-colors"
              >
                <div className="w-10 h-10 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 rounded-xl flex items-center justify-center">
                  <FolderPlus size={20} />
                </div>
                <span className="font-bold text-gray-700 dark:text-gray-300">그룹 변경</span>
              </button>
              <button
                onClick={() => {
                  setIsDeleteModalOpen(true);
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-4 p-4 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-[22px] transition-colors"
              >
                <div className="w-10 h-10 bg-red-50 dark:bg-blue-500/10 text-red-500 rounded-xl flex items-center justify-center">
                  <Trash2 size={20} />
                </div>
                <span className="font-bold text-red-500">친구 삭제하기</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* [추가] 그룹 이동 모달 */}
      {isMoveToGroupOpen && selectedFriend && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setIsMoveToGroupOpen(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-t-[32px] px-6 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] animate-in slide-in-from-bottom duration-300 shadow-2xl">
            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-6" />
            <h3 className="text-[14px] font-black text-gray-400 dark:text-gray-500 mb-4 px-2 tracking-tight">
              {isSelectionMode ? `${selectedFriendUids.size}명 그룹 이동` : `${selectedFriend?.name}님 그룹 이동`}
            </h3>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {/* '미분류'로 이동하는 버튼 */}
              <button
                onClick={() => (isSelectionMode ? handleMoveMultipleFriendsToGroup(null) : handleMoveFriendToGroup(null))}
                className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-[22px] transition-colors"
              >
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 rounded-xl flex items-center justify-center">
                  <Folder size={20} />
                </div>
                <span className="font-bold text-gray-700 dark:text-gray-300">미분류</span>
              </button>
              {/* 사용자 정의 그룹 목록 */}
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => (isSelectionMode ? handleMoveMultipleFriendsToGroup(group.id) : handleMoveFriendToGroup(group.id))}
                  className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-[22px] transition-colors"
                >
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 rounded-xl flex items-center justify-center">
                    <Folder size={20} />
                  </div>
                  <span className="font-bold text-gray-700 dark:text-gray-300">{group.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* [추가] 그룹 관리 모달 */}
      {isGroupManagerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsGroupManagerOpen(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-4">그룹 관리</h3>
            <div ref={groupInputsContainerRef} className="space-y-2 mb-6 max-h-60 overflow-y-auto">
              {groups.map((group, index) => (
                <div key={group.id} className="flex items-center gap-2">
                  <input
                    value={group.name}
                    placeholder="그룹 이름 입력"
                    onChange={(e) => {
                      const newName = e.target.value;
                      setGroups((prev) => prev.map((g) => (g.id === group.id ? { ...g, name: newName } : g)));
                    }}
                    className="flex-1 h-12 bg-gray-50 dark:bg-gray-700 rounded-xl px-4 font-bold text-sm text-gray-800 dark:text-white min-w-0 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                  <button
                    onClick={async () => {
                      // 그룹 삭제 시, 해당 그룹의 친구들은 '미분류'로 이동됩니다.
                      const updatedFriends = friends.map((f) => {
                        if (f.group === group.id) {
                          const { group, ...rest } = f;
                          return rest;
                        }
                        return f;
                      });
                      await updateDoc(doc(db, 'users', user!.uid), { friendsList: updatedFriends });
                      setGroups((prev) => prev.filter((g) => g.id !== group.id));
                    }}
                    className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-xl"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                const newGroup: FriendGroup = { id: `group_${Date.now()}`, name: '' };
                setGroups((prev) => [...prev, newGroup]);
              }}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed rounded-xl text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 mb-6"
            >
              <FolderPlus size={16} />
              <span className="text-sm font-bold">새 그룹 추가</span>
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsGroupManagerOpen(false);
                  setGroups(myInfo?.friendGroups || []); // 변경사항 취소
                }}
                className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 font-bold rounded-[20px]"
              >
                취소
              </button>
              <button
                onClick={() => handleSaveGroups(groups)}
                className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-[20px] shadow-lg shadow-blue-100 dark:shadow-blue-900/50"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 이름 수정 모달 */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">이름 수정</h3>
            <p className="text-gray-400 dark:text-gray-500 text-[13px] mb-6 font-medium leading-relaxed">내가 알아보기 쉬운 이름으로 변경해보세요.</p>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              type="text"
              enterKeyHint="done"
              onKeyDown={(e) => handleKeyDownAction(e, handleEditSave)}
              className="w-full h-[58px] bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-700 rounded-[18px] px-5 font-bold text-gray-800 dark:text-white outline-none mb-6 transition-all"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setIsEditModalOpen(false)} className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 font-bold rounded-[20px]">
                취소
              </button>
              <button onClick={handleEditSave} className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-[20px] shadow-lg shadow-blue-100 dark:shadow-blue-900/50">
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsDeleteModalOpen(false)} />
          <div className="relative w-full max-w-[320px] bg-white dark:bg-gray-800 rounded-[32px] p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">친구 삭제</h3>
            <p className="text-gray-400 dark:text-gray-400 text-[14px] mb-8 font-medium leading-relaxed">
              정말 <span className="text-gray-900 dark:text-gray-200 font-bold">'{selectedFriend?.name}'</span>님을
              <br />
              친구 목록에서 삭제할까요?
            </p>
            <div className="flex flex-col gap-2">
              <button onClick={handleDeleteConfirm} className="w-full py-4 bg-red-500 text-white font-bold rounded-[20px] active:scale-95 transition-all">
                삭제하기
              </button>
              <button onClick={() => setIsDeleteModalOpen(false)} className="w-full py-4 text-gray-400 dark:text-gray-500 font-bold hover:text-gray-600 dark:hover:text-gray-300">
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 이미지 미리보기 모달 */}
      {previewImage && <ImagePreviewModal images={[previewImage]} initialIndex={0} onClose={() => setPreviewImage(null)} />}

      {/* [추가] 친구 프로필 팝업 */}
      {profilePopupFriend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setProfilePopupFriend(null)} />
          <div className="relative w-full max-w-xs bg-white dark:bg-gray-800 rounded-[32px] p-6 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setProfilePopupFriend(null)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              <X size={20} />
            </button>
            <div className="w-24 h-24 rounded-full mx-auto mb-4 overflow-hidden border-4 border-white dark:border-gray-700 shadow-lg">
              {profilePopupFriend.photoURL ? (
                <img src={profilePopupFriend.photoURL} alt={profilePopupFriend.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center text-4xl font-bold">
                  {profilePopupFriend.name[0]}
                </div>
              )}
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white">{profilePopupFriend.name}</h3>
            <p className="text-sm text-gray-400 dark:text-gray-500 font-medium mt-1 mb-4">{profilePopupFriend.email}</p>
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3">
              {profilePopupFriend.statusMessage || '상태 메시지가 없습니다.'}
            </p>
          </div>
        </div>
      )}

      {/* 친구 추가 모달 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeAddModal} />
          <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-[32px] p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-1">새 친구 찾기</h3>
            <p className="text-gray-400 dark:text-gray-500 text-[13px] mb-6 font-medium leading-relaxed">친구의 이메일 또는 휴대폰 번호로 추가하세요.</p>
            <div className="flex p-1 bg-gray-100 dark:bg-gray-700/50 rounded-xl mb-4">
              <button
                onClick={() => {
                  setAddFriendMethod('email');
                  setNewFriendInput('');
                }}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${addFriendMethod === 'email' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'text-gray-400'}`}
              >
                이메일
              </button>
              <button
                onClick={() => {
                  setAddFriendMethod('phone');
                  setNewFriendInput('');
                }}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${addFriendMethod === 'phone' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'text-gray-400'}`}
              >
                휴대폰 번호
              </button>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-[20px] p-2 mb-6 border border-gray-100 dark:border-gray-700/50 focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-gray-800 transition-all">
              <input
                ref={addFriendInputRef}
                type={addFriendMethod === 'email' ? 'email' : 'tel'}
                value={newFriendInput}
                onChange={handleInputChange}
                enterKeyHint="send"
                onKeyDown={(e) => handleKeyDownAction(e, handleAddFriend)}
                placeholder={addFriendMethod === 'email' ? 'example@email.com' : '010-0000-0000'}
                className="w-full bg-transparent outline-none p-3 text-[15px] font-bold dark:text-white"
                maxLength={addFriendMethod === 'phone' ? 13 : undefined}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={closeAddModal} className="flex-1 py-3.5 rounded-[20px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 font-bold text-[14px]">
                취소
              </button>
              <button
                onClick={handleAddFriend}
                disabled={isAdding || !newFriendInput.trim()}
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

export default FriendList;
