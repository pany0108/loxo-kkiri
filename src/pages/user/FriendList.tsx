import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Search, UserPlus, Check, Loader2, MoreVertical, X, Folder, FolderPlus, Users } from 'lucide-react';
import { auth, db, firebaseApp } from '../../firebase'; // firebaseApp 추가
import { doc, updateDoc, arrayRemove } from 'firebase/firestore';
import {
  ImagePreviewModal,
  AddFriendModal,
  ProfilePopup,
  FriendActionMenu,
  EditFriendNameModal,
  DeleteFriendModal,
  GroupManagerModal,
  MoveToGroupModal,
  AddFromContactsModal,
} from 'components';
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

  // 더보기 메뉴 및 수정/삭제 팝업 상태
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [profilePopupFriend, setProfilePopupFriend] = useState<Friend | null>(null);
  const [newFriendId, setNewFriendId] = useState<string | null>(location.state?.newFriendId || null);

  // [수정] 친구 추가 모달 상태
  const [isAddFromContactsModalOpen, setIsAddFromContactsModalOpen] = useState(false); // [추가] 연락처에서 친구 추가 모달 상태
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // [추가] 다중 선택 상태
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedFriendUids, setSelectedFriendUids] = useState<Set<string>>(new Set());
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // [추가] 그룹 관리 상태
  const [isGroupManagerOpen, setIsGroupManagerOpen] = useState(false);
  const [isMoveToGroupOpen, setIsMoveToGroupOpen] = useState(false);
  const [groups, setGroups] = useState<FriendGroup[]>([]);

  // [추가] 친구 목록 보기 모드 ('default': 가나다순, 'group': 그룹별)
  const [viewMode, setViewMode] = useState<'default' | 'group'>('default');

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

  // [수정] viewMode가 변경될 때 스크롤 초기화 (Window + Div 모두 적용)
  useEffect(() => {
    // 렌더링 직후 실행을 위해 setTimeout 사용
    const timer = setTimeout(() => {
      // 렌더링 후 DOM이 업데이트될 시간을 줍니다.
      // 1. 브라우저 전체 스크롤 초기화
      window.scrollTo(0, 0);

      // 2. 내부 컨테이너 스크롤 초기화
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0; // 직접 scrollTop을 0으로 설정
      }
    }, 50); // 약간의 딜레이를 주어 확실하게 스크롤을 초기화합니다.

    setNewFriendId(null);
    return () => clearTimeout(timer);
  }, [viewMode]);

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

  // --- 그룹 관리 로직 ---

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

  // ---------------------------------

  /**
   * 검색어에 따라 친구 목록을 필터링하고 이름순으로 정렬합니다.
   */
  const groupedFriends = useMemo(() => {
    // 1. 검색어로 친구 필터링
    const filteredBySearch = friends.filter((f) => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

    if (viewMode === 'default') {
      // 기본 보기: 모든 친구를 가나다순으로 정렬
      const sortedFriends = [...filteredBySearch].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
      // 새 친구가 있다면 최상단으로 이동
      if (newFriendId) {
        const newFriendIndex = sortedFriends.findIndex((f) => f.uid === newFriendId);
        if (newFriendIndex > -1) {
          const [newFriend] = sortedFriends.splice(newFriendIndex, 1);
          sortedFriends.unshift(newFriend);
        }
      }
      return [{ id: 'all', name: '모든 친구', friends: sortedFriends }];
    } else {
      // 그룹별 보기: 기존 그룹화 및 정렬 로직
      const groupMap = new Map<string, { name: string; friends: Friend[] }>();

      // 그룹 목록 초기화 (사용자 정의 그룹 + 기본 그룹)
      groups.forEach((g) => groupMap.set(g.id, { name: g.name, friends: [] }));
      groupMap.set('uncategorized', { name: '미분류', friends: [] });

      // 필터링된 친구들을 그룹에 할당
      filteredBySearch.forEach((friend) => {
        const groupId = friend.group || 'uncategorized';
        if (groupMap.has(groupId)) {
          groupMap.get(groupId)!.friends.push(friend);
        } else {
          // 정의되지 않은 그룹에 속한 친구는 '미분류'로
          groupMap.get('uncategorized')!.friends.push(friend);
        }
      });

      // 각 그룹 내에서 친구 정렬
      groupMap.forEach((groupData) => {
        groupData.friends.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
        // '새 친구'를 해당 그룹의 최상단으로 이동
        if (newFriendId) {
          const newFriendIndex = groupData.friends.findIndex((f) => f.uid === newFriendId);
          if (newFriendIndex > -1) {
            const [newFriend] = groupData.friends.splice(newFriendIndex, 1);
            groupData.friends.unshift(newFriend);
          }
        }
      });

      // 최종 렌더링을 위한 배열 생성 (이름순 정렬, '미분류'는 마지막)
      return Array.from(groupMap.entries())
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => {
          if (a.id === 'uncategorized') return 1;
          if (b.id === 'uncategorized') return -1;
          return a.name.localeCompare(b.name, 'ko');
        })
        .filter((group) => group.friends.length > 0); // 검색 결과가 없는 그룹은 숨김
    }
  }, [friends, groups, searchTerm, newFriendId, viewMode]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <Loader2 className="animate-spin text-blue-500 w-8 h-8" aria-label="로딩 중" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh bg-gray-50 dark:bg-gray-950 font-['Pretendard']">
      {isSelectionMode ? (
        <div className="fixed top-0 right-0 left-0 px-6 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-4 bg-gray-50/95 dark:bg-gray-950/95 border-b border-gray-100 dark:border-gray-800 z-40 shadow-sm">
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
        // Normal mode header
        <div className="fixed top-0 right-0 left-0 px-6 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-4 bg-gray-50/95 dark:bg-gray-950/95 border-b border-gray-100 dark:border-gray-800 z-40 shadow-sm">
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
            {/* [추가] 연락처에서 친구 추가 버튼 */}
            <button
              onClick={() => setIsAddFromContactsModalOpen(true)}
              className="p-2.5 bg-blue-600 text-white dark:bg-blue-500 rounded-full shadow-lg active:scale-90 transition-transform"
              aria-label="연락처에서 친구 추가"
            >
              <Users size={20} />
            </button>
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
          {/* [추가] 보기 모드 선택 버튼 */}
          <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-[16px] mt-4">
            <button
              onClick={() => setViewMode('default')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[12px] text-[13px] font-bold transition-all ${
                viewMode === 'default' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400'
              }`}
            >
              <Users size={16} /> 전체
            </button>
            <button
              onClick={() => setViewMode('group')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[12px] text-[13px] font-bold transition-all ${
                viewMode === 'group' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400'
              }`}
            >
              <Folder size={16} /> 그룹
            </button>
          </div>
        </div>
      )}

      <div
        ref={scrollContainerRef}
        className={`flex-1 px-6 pb-[calc(10rem+env(safe-area-inset-bottom))] overflow-y-auto w-full min-h-0 overscroll-y-contain ${
          isSelectionMode ? 'pt-[calc(81px+env(safe-area-inset-top))]' : 'pt-[calc(213px+env(safe-area-inset-top))]'
        }`}
        onScroll={cancelLongPress}
      >
        <>
          {groupedFriends.length > 0 ? (
            groupedFriends.map((group) => (
              <section key={group.id} className="pt-4 space-y-2">
                {viewMode === 'group' &&
                  group.id !== 'all' && ( // '모든 친구' 그룹일 때는 그룹 헤더 숨김
                    <h2 className="text-[12px] font-bold text-gray-400 dark:text-gray-500 flex items-center gap-2">
                      <Folder size={14} /> {group.name}
                      <span className="text-blue-600">{group.friends.length}</span>
                    </h2>
                  )}
                <div className="bg-white dark:bg-gray-800 rounded-[32px] border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                  <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                    {group.friends.map((friend) => (
                      <div
                        key={friend.uid}
                        className={`group flex items-center justify-between py-4 pl-5 pr-2 transition-colors cursor-pointer touch-pan-y ${
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
                            className="p-4 text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 active:bg-gray-100 dark:active:bg-gray-700 rounded-full transition-all"
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
          {viewMode === 'group' && (
            <section className="pt-4">
              <button
                onClick={() => setIsGroupManagerOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-[32px] text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <FolderPlus size={16} />
                <span className="text-sm font-bold">그룹 추가 / 관리</span>
              </button>
            </section>
          )}
        </>
      </div>

      {/* [추가] 다중 선택 시 하단 액션 바 */}
      {isSelectionMode && selectedFriendUids.size > 0 && (
        <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 z-40 p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 animate-in slide-in-from-bottom duration-300">
          <button
            onClick={() => setIsMoveToGroupOpen(true)}
            className="w-full h-[52px] bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100 dark:shadow-blue-900/50"
          >
            <FolderPlus size={20} />
            그룹 변경
          </button>
        </div>
      )}

      <FriendActionMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        friend={selectedFriend}
        onEdit={() => {
          setEditName(selectedFriend?.name || '');
          setIsEditModalOpen(true);
          setIsMenuOpen(false);
        }}
        onMoveGroup={() => {
          setIsMoveToGroupOpen(true);
          setIsMenuOpen(false);
        }}
        onDelete={() => {
          setIsDeleteModalOpen(true);
          setIsMenuOpen(false);
        }}
      />

      <MoveToGroupModal
        isOpen={isMoveToGroupOpen}
        onClose={() => setIsMoveToGroupOpen(false)}
        groups={groups}
        onMove={isSelectionMode ? handleMoveMultipleFriendsToGroup : handleMoveFriendToGroup}
        isMultiSelect={isSelectionMode}
        selectionCount={selectedFriendUids.size}
        friendName={selectedFriend?.name}
      />

      <GroupManagerModal
        isOpen={isGroupManagerOpen}
        onClose={() => {
          setIsGroupManagerOpen(false);
          setGroups(myInfo?.friendGroups || []); // 변경사항 취소
        }}
        initialGroups={myInfo?.friendGroups || []}
        onSave={handleSaveGroups}
        friends={friends}
        user={user}
      />

      <EditFriendNameModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} initialName={editName} onSave={handleEditSave} />

      <DeleteFriendModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} friendName={selectedFriend?.name} onConfirm={handleDeleteConfirm} />

      {/* 이미지 미리보기 모달 */}
      {previewImage && <ImagePreviewModal images={[previewImage]} initialIndex={0} onClose={() => setPreviewImage(null)} />}

      {/* [수정] 친구 프로필 팝업 컴포넌트화 */}
      <AddFromContactsModal isOpen={isAddFromContactsModalOpen} onClose={() => setIsAddFromContactsModalOpen(false)} myInfo={myInfo} existingFriends={friends} />
      <ProfilePopup friend={profilePopupFriend} onClose={() => setProfilePopupFriend(null)} />
      <AddFriendModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} myInfo={myInfo} friends={friends} />
    </div>
  );
};

export default FriendList;
