import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { arrayRemove, arrayUnion, collection, doc, getDocs, query, updateDoc, where, writeBatch } from 'firebase/firestore';
import { Ban, Check, Folder, FolderPlus, Loader2, MoreVertical, Plus, Search, Share2, UserPlus, Users } from 'lucide-react';
import toast from 'react-hot-toast';

import { auth, db } from '../../firebase';
import {
  AddFriendModal,
  AddFromContactsModal,
  ConfirmModal,
  DeleteFriendModal,
  EditFriendNameModal,
  FormInput,
  FriendActionMenu,
  GroupManagerModal,
  ImagePreviewModal,
  MoveToGroupModal,
  ProfilePopup,
} from 'components';
import { useCalendar, useUI } from 'contexts';
import { useAuth, useFirestoreDoc } from 'hooks';
import { deleteCalendar, leaveCalendar } from 'services';
import { Friend, FriendGroup } from 'types';

interface FriendListProps {
  isEmbedded?: boolean;
}

/**
 * 친구 목록 페이지 컴포넌트
 * - 친구 목록 조회, 검색, 그룹 관리를 수행합니다.
 * - 친구 추가, 삭제, 이름 수정 및 공유 캘린더 연동 관리를 제공합니다.
 *
 * @param {FriendListProps} props
 * @returns {JSX.Element} 친구 목록 화면
 */
const FriendList: React.FC<FriendListProps> = ({ isEmbedded = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { setIsBottomNavVisible } = useUI();
  const { myCalendars } = useCalendar();

  // --- State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [profilePopupFriend, setProfilePopupFriend] = useState<Friend | null>(null);
  const [newFriendId, setNewFriendId] = useState<string | null>(location.state?.newFriendId || null);

  const [isAddFromContactsModalOpen, setIsAddFromContactsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedFriendUids, setSelectedFriendUids] = useState<Set<string>>(new Set());
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hiddenFriendIds, setHiddenFriendIds] = useState<Set<string>>(new Set());

  const [isGroupManagerOpen, setIsGroupManagerOpen] = useState(false);
  const [isMoveToGroupOpen, setIsMoveToGroupOpen] = useState(false);
  const [groups, setGroups] = useState<FriendGroup[]>([]);

  const [viewMode, setViewMode] = useState<'default' | 'group'>('default');

  // --- Data Fetching ---
  const userDocRef = useMemo(() => (user ? doc(db, 'users', user.uid) : null), [user]);
  const { data: myInfo, loading: isLoading } = useFirestoreDoc<any>(userDocRef);

  const friends: Friend[] = useMemo(() => {
    const list = myInfo?.friendsList || [];
    return list.filter((f: Friend) => !hiddenFriendIds.has(f.uid));
  }, [myInfo, hiddenFriendIds]);

  // --- Effects ---
  useEffect(() => {
    if (myInfo?.friendGroups) {
      setGroups(myInfo.friendGroups);
    }
  }, [myInfo]);

  useEffect(() => {
    if (location.state?.newFriendId) {
      setNewFriendId(location.state.newFriendId);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  useEffect(() => {
    setIsBottomNavVisible(!isSelectionMode);
    return () => {
      setIsBottomNavVisible(true);
    };
  }, [isSelectionMode, setIsBottomNavVisible]);

  useEffect(() => {
    setNewFriendId(null);
  }, [viewMode]);

  // --- Handlers ---

  /** 친구 초대 핸들러 (Web Share API) */
  const handleInviteFriend = async () => {
    // TODO: 추후 수정 필요
    const appUrl = 'https://play.google.com/store/apps/details?id=com.namu.kkiri';

    const shareData = {
      title: '끼리 초대',
      text: `${user?.displayName || '친구'}님이 Super Scheduler로 초대했습니다!\n함께 일정을 관리하고 소통해보세요. 👇`,
      url: appUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') toast.error('공유에 실패했습니다.');
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        toast.success('초대 메시지가 복사되었습니다.\n카카오톡에 붙여넣기 해주세요!', { icon: '💬' });
      } catch (e) {
        toast.error('복사에 실패했습니다.');
      }
    }
  };

  /** 연락처에서 추가 모달 열기 */
  const handleOpenContactsModal = () => {
    setIsAddModalOpen(false);
    setIsAddFromContactsModalOpen(true);
  };

  /** 친구 아이템 롱프레스 시작 (선택 모드 진입) */
  const handlePointerDown = (friendUid: string) => {
    if (isSelectionMode) return;
    longPressTimer.current = setTimeout(() => {
      setIsSelectionMode(true);
      setSelectedFriendUids((prev) => new Set(prev).add(friendUid));
    }, 500);
  };

  /** 롱프레스 취소 */
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  /** 롱프레스 종료 */
  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  /** 친구 아이템 클릭 핸들러 */
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

  /** 전체 선택/해제 핸들러 */
  const handleSelectAll = () => {
    const allFriendUids = new Set(friends.map((f) => f.uid));
    setSelectedFriendUids(selectedFriendUids.size === friends.length ? new Set() : allFriendUids);
  };

  // 삭제 시 함께 정리될 공유 캘린더 계산
  const sharedCalendarsToDelete = useMemo(() => {
    if (!selectedFriend || !user || !myCalendars) return [];
    return myCalendars.filter((cal) => {
      const members = cal.members || [];
      const isTwoMembers = members.length === 2;
      const hasMe = members.includes(user.uid);
      const hasFriend = members.includes(selectedFriend.uid);
      if (!isTwoMembers || !hasMe || !hasFriend) return false;
      if (cal.ownerId === user.uid) return !cal.isDefault;
      return true;
    });
  }, [selectedFriend, user, myCalendars]);

  const sharedCalendarName = useMemo(() => {
    if (sharedCalendarsToDelete.length === 0) return undefined;
    if (sharedCalendarsToDelete.length === 1) return sharedCalendarsToDelete[0].name;
    return `${sharedCalendarsToDelete[0].name} 외 ${sharedCalendarsToDelete.length - 1}개`;
  }, [sharedCalendarsToDelete]);

  const sharedCalendarActionText = useMemo(() => {
    if (sharedCalendarsToDelete.length === 0) return undefined;
    const ownedCount = sharedCalendarsToDelete.filter((c) => c.ownerId === user?.uid).length;
    const unownedCount = sharedCalendarsToDelete.length - ownedCount;

    if (ownedCount > 0 && unownedCount === 0) return '도 함께 삭제됩니다.';
    if (ownedCount === 0 && unownedCount > 0)
      return (
        <>
          에서 나가게 됩니다. <br /> 그래도 삭제하시겠습니까?
        </>
      );
    return '가 정리됩니다.';
  }, [sharedCalendarsToDelete, user]);

  /** 친구 이름 수정 저장 핸들러 */
  const handleEditSave = async () => {
    if (!selectedFriend || !editName.trim()) return;
    try {
      const myRef = doc(db, 'users', auth.currentUser!.uid);
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

  /** 친구 삭제 확정 핸들러 */
  const handleDeleteConfirm = () => {
    if (!selectedFriend || !user) return;
    const friendToDelete = selectedFriend;
    const calendarsToDelete = sharedCalendarsToDelete; // 현재 시점의 삭제 대상 캘린더 캡처

    // 1. 낙관적 업데이트: UI에서 즉시 숨김
    setHiddenFriendIds((prev) => new Set(prev).add(friendToDelete.uid));
    setIsDeleteModalOpen(false);
    setIsMenuOpen(false);
    setSelectedFriend(null);

    // 2. 실제 삭제 로직 (지연 실행)
    const timerId = setTimeout(async () => {
      try {
        const myRef = doc(db, 'users', user.uid);
        await updateDoc(myRef, { friendsList: arrayRemove(friendToDelete) });

        if (calendarsToDelete.length > 0) {
          await Promise.all(
            calendarsToDelete.map((cal) => {
              if (cal.ownerId === user.uid) {
                return deleteCalendar(cal.id);
              }
              return leaveCalendar(cal as any, user);
            }),
          );
        }

        // 단둘이 생성된 미확정 약속 삭제
        const meetingsRef = collection(db, 'meetings');
        const q = query(meetingsRef, where('participants', 'array-contains', user.uid), where('status', 'in', ['PENDING', 'VOTING']));
        const querySnapshot = await getDocs(q);
        const batch = writeBatch(db);
        let deletedMeetingsCount = 0;

        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const participants = data.participants || [];
          if (participants.length === 2 && participants.includes(friendToDelete.uid)) {
            batch.delete(docSnap.ref);
            deletedMeetingsCount++;
          }
        });

        if (deletedMeetingsCount > 0) {
          await batch.commit();
        }

        // 삭제 완료 후 hidden 목록에서 제거 (이미 DB에서 삭제되었으므로)
        setHiddenFriendIds((prev) => {
          const next = new Set(prev);
          next.delete(friendToDelete.uid);
          return next;
        });
      } catch (e) {
        console.error('친구 삭제 오류:', e);
        toast.error('친구 삭제 중 오류가 발생했습니다.');
        // 에러 발생 시 복구
        setHiddenFriendIds((prev) => {
          const next = new Set(prev);
          next.delete(friendToDelete.uid);
          return next;
        });
      }
    }, 4000);

    // 3. 실행 취소 토스트 표시
    toast(
      (t) => (
        <div className="flex items-center justify-between w-full gap-3">
          <span className="text-sm font-medium">친구를 삭제했습니다.</span>
          <button
            onClick={() => {
              clearTimeout(timerId);
              setHiddenFriendIds((prev) => {
                const next = new Set(prev);
                next.delete(friendToDelete.uid);
                return next;
              });
              toast.dismiss(t.id);
              toast.success('삭제를 취소했습니다.');
            }}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold rounded-lg transition-colors"
          >
            실행 취소
          </button>
        </div>
      ),
      { duration: 4000, position: 'bottom-center', style: { minWidth: '300px' } },
    );
  };

  /** 친구 차단 핸들러 */
  const handleBlockFriend = () => {
    if (!selectedFriend || !user) return;
    setIsBlockModalOpen(true);
    setIsMenuOpen(false);
  };

  /** 친구 차단 확정 핸들러 */
  const confirmBlockFriend = async () => {
    if (!selectedFriend || !user) return;
    try {
      const myRef = doc(db, 'users', user.uid);
      await updateDoc(myRef, {
        friendsList: arrayRemove(selectedFriend),
        blockedUsers: arrayUnion(selectedFriend.uid),
      });
      toast.success(`${selectedFriend.name}님을 차단했습니다.`);
      setIsBlockModalOpen(false);
      setSelectedFriend(null);
    } catch (e) {
      console.error('친구 차단 오류:', e);
      toast.error('차단 중 오류가 발생했습니다.');
    }
  };

  /** 그룹 관리 저장 핸들러 */
  const handleSaveGroups = async (newGroups: FriendGroup[]) => {
    if (!user) return;
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

  /** 단일 친구 그룹 이동 핸들러 */
  const handleMoveFriendToGroup = async (groupId: string | null) => {
    if (!selectedFriend || !user) return;
    const updatedFriendsList = friends.map((f) => {
      if (f.uid === selectedFriend.uid) {
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

  /** 다중 친구 그룹 이동 핸들러 */
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

  // 친구 목록 그룹화 및 정렬
  const groupedFriends = useMemo(() => {
    const filteredBySearch = friends.filter((f) => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

    if (viewMode === 'default') {
      const sortedFriends = [...filteredBySearch].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
      if (newFriendId) {
        const newFriendIndex = sortedFriends.findIndex((f) => f.uid === newFriendId);
        if (newFriendIndex > -1) {
          const [newFriend] = sortedFriends.splice(newFriendIndex, 1);
          sortedFriends.unshift(newFriend);
        }
      }
      if (sortedFriends.length === 0) return [];
      return [{ id: 'all', name: '모든 친구', friends: sortedFriends }];
    } else {
      const groupMap = new Map<string, { name: string; friends: Friend[] }>();
      groups.forEach((g) => groupMap.set(g.id, { name: g.name, friends: [] }));
      groupMap.set('uncategorized', { name: '미분류', friends: [] });

      filteredBySearch.forEach((friend) => {
        const groupId = friend.group || 'uncategorized';
        if (groupMap.has(groupId)) {
          groupMap.get(groupId)!.friends.push(friend);
        } else {
          groupMap.get('uncategorized')!.friends.push(friend);
        }
      });

      groupMap.forEach((groupData) => {
        groupData.friends.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
        if (newFriendId) {
          const newFriendIndex = groupData.friends.findIndex((f) => f.uid === newFriendId);
          if (newFriendIndex > -1) {
            const [newFriend] = groupData.friends.splice(newFriendIndex, 1);
            groupData.friends.unshift(newFriend);
          }
        }
      });

      return Array.from(groupMap.entries())
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => {
          if (a.id === 'uncategorized') return 1;
          if (b.id === 'uncategorized') return -1;
          return a.name.localeCompare(b.name, 'ko');
        })
        .filter((group) => group.friends.length > 0);
    }
  }, [friends, groups, searchTerm, newFriendId, viewMode]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] bg-transparent">
        <Loader2 className="animate-spin text-blue-500 w-8 h-8" aria-label="로딩 중" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent">
      {isSelectionMode && (
        <div className="sticky top-0 z-20 px-5 pt-3 pb-2 flex items-center justify-between bg-white dark:bg-black border-b border-gray-100 dark:border-gray-800">
          <h1 className="text-xl font-bold text-main dark:text-white">{selectedFriendUids.size}명 선택됨</h1>
          <div className="flex gap-3">
            <button onClick={handleSelectAll} className="text-sm font-bold text-primary">
              {selectedFriendUids.size === friends.length ? '전체해제' : '전체선택'}
            </button>
            <button
              onClick={() => {
                setIsSelectionMode(false);
                setSelectedFriendUids(new Set());
              }}
              className="text-sm font-bold text-sub"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {!isSelectionMode && (
        <div className="py-2 flex gap-3 shrink-0 items-center">
          <FormInput
            containerClassName="flex-1 min-w-0"
            wrapperClassName="!h-[52px]"
            icon={<Search size={20} />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="친구 검색"
            onClear={() => setSearchTerm('')}
          />

          <button
            onClick={() => setViewMode(viewMode === 'default' ? 'group' : 'default')}
            className={`shrink-0 w-[52px] h-[52px] flex items-center justify-center rounded-xl border-2 transition-all active:scale-95 ${
              viewMode === 'group'
                ? 'bg-primary border-primary text-white'
                : 'bg-gray-50 dark:bg-gray-800/50 border-transparent text-sub dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            aria-label="보기 모드 변경"
          >
            {viewMode === 'default' ? <Users size={24} /> : <Folder size={24} />}
          </button>

          <div className="relative">
            <button
              onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
              className="shrink-0 w-[52px] h-[52px] flex items-center justify-center rounded-xl bg-black dark:bg-white text-white dark:text-black transition-all active:scale-95 shadow-md"
              aria-label="추가 메뉴 열기"
            >
              <Plus size={24} strokeWidth={2.5} />
            </button>

            {isAddMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsAddMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-20 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-200">
                  <button
                    onClick={() => {
                      setIsAddModalOpen(true);
                      setIsAddMenuOpen(false);
                    }}
                    className="w-full px-4 py-3 text-left text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <UserPlus size={18} /> 친구 검색/추가
                  </button>
                  <button
                    onClick={() => {
                      handleInviteFriend();
                      setIsAddMenuOpen(false);
                    }}
                    className="w-full px-4 py-3 text-left text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Share2 size={18} /> 친구 초대하기
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="pt-2 pb-24" onScroll={cancelLongPress}>
        {groupedFriends.length > 0 ? (
          groupedFriends.map((group) => (
            <div key={group.id} className="mb-6">
              {viewMode === 'group' && group.id !== 'all' && (
                <h2 className="text-[13px] font-bold text-gray-500 dark:text-gray-400 flex items-center gap-2 mb-3 px-1">
                  {group.name} <span className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-500">{group.friends.length}</span>
                </h2>
              )}
              <div className="space-y-3">
                {group.friends.map((friend) => (
                  <div
                    key={friend.uid}
                    className={`w-full p-3 flex items-center gap-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm active:scale-[0.99] transition-all cursor-pointer touch-pan-y ${
                      selectedFriendUids.has(friend.uid) ? 'ring-2 ring-primary bg-primary/5 dark:bg-blue-900/20' : ''
                    }`}
                    onPointerDown={() => handlePointerDown(friend.uid)}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    onClick={() => handleFriendClick(friend)}
                  >
                    {isSelectionMode && (
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                          selectedFriendUids.has(friend.uid) ? 'bg-primary border-primary' : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        {selectedFriendUids.has(friend.uid) && <Check size={12} className="text-white" />}
                      </div>
                    )}
                    <div
                      className="w-[48px] h-[48px] rounded-[18px] shrink-0 bg-gray-50 dark:bg-gray-800 overflow-hidden flex items-center justify-center"
                      onClick={(e) => {
                        if (!isSelectionMode) {
                          e.stopPropagation();
                          if (friend.photoURL) setPreviewImage(friend.photoURL);
                        }
                      }}
                    >
                      {friend.photoURL ? (
                        <img src={friend.photoURL} alt={friend.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-lg text-gray-300">{friend.name[0]}</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-main dark:text-white text-[15px] truncate mb-0.5">{friend.name}</h4>
                      <p className="text-[13px] text-gray-500 dark:text-gray-400 truncate font-medium">{friend.statusMessage || ''}</p>
                    </div>
                    {!isSelectionMode && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFriend(friend);
                          setIsMenuOpen(true);
                        }}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-main dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <MoreVertical size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-sub dark:text-gray-400">
            <Users size={48} className="mb-4 opacity-10" />
            <p className="text-sm font-bold text-gray-400">친구가 없거나 검색 결과가 없어요.</p>
          </div>
        )}
        {viewMode === 'group' && (
          <div className="pt-2 pb-8">
            <button
              onClick={() => setIsGroupManagerOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-[24px] text-sub dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            >
              <FolderPlus size={16} />
              <span className="text-sm font-bold">그룹 추가 / 관리</span>
            </button>
          </div>
        )}
      </div>

      {isSelectionMode && selectedFriendUids.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-black pb-[calc(1rem+env(safe-area-inset-bottom))] z-50">
          <button
            onClick={() => setIsMoveToGroupOpen(true)}
            className="w-full h-[52px] bg-primary text-white rounded-[16px] font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform"
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
        onBlock={handleBlockFriend}
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
          setGroups(myInfo?.friendGroups || []);
        }}
        initialGroups={myInfo?.friendGroups || []}
        onSave={handleSaveGroups}
        friends={friends}
        user={user}
      />

      <EditFriendNameModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} initialName={editName} onSave={handleEditSave} />

      <DeleteFriendModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        friendName={selectedFriend?.name}
        onConfirm={handleDeleteConfirm}
        sharedCalendarName={sharedCalendarName}
        sharedCalendarActionText={sharedCalendarActionText}
      />

      <ConfirmModal
        isOpen={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        onConfirm={confirmBlockFriend}
        icon={<Ban size={32} />}
        iconContainerClassName="bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400"
        title="친구 차단"
        message={
          <>
            <span className="font-bold text-main dark:text-white">{selectedFriend?.name}</span>님을 차단하시겠습니까?
            <br />
            차단하면 친구 목록에서 삭제되고 대화를 받을 수 없습니다.
          </>
        }
        confirmText="차단하기"
        confirmButtonClassName="bg-red-500"
      />

      {previewImage && <ImagePreviewModal images={[previewImage]} initialIndex={0} onClose={() => setPreviewImage(null)} />}

      <AddFromContactsModal isOpen={isAddFromContactsModalOpen} onClose={() => setIsAddFromContactsModalOpen(false)} myInfo={myInfo} existingFriends={friends} />
      <ProfilePopup friend={profilePopupFriend} onClose={() => setProfilePopupFriend(null)} />
      <AddFriendModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} myInfo={myInfo} friends={friends} onOpenContacts={handleOpenContactsModal} />
    </div>
  );
};

export default FriendList;
