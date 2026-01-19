// src/pages/social/FriendList.tsx
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Search, UserPlus, Check, Loader2, MoreVertical, Folder, FolderPlus, Users } from 'lucide-react';
import { auth, db } from '../../firebase';
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
  FormInput,
} from 'components';
import { useFirestoreDoc, useAuth } from 'hooks';
import { useCalendar, useUI } from 'contexts';
import { Friend, FriendGroup } from 'types';
import { deleteCalendar, leaveCalendar } from 'services';

interface FriendListProps {
  isEmbedded?: boolean;
}

const FriendList: React.FC<FriendListProps> = ({ isEmbedded = false }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [profilePopupFriend, setProfilePopupFriend] = useState<Friend | null>(null);
  const [newFriendId, setNewFriendId] = useState<string | null>(location.state?.newFriendId || null);

  const [isAddFromContactsModalOpen, setIsAddFromContactsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedFriendUids, setSelectedFriendUids] = useState<Set<string>>(new Set());
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isGroupManagerOpen, setIsGroupManagerOpen] = useState(false);
  const [isMoveToGroupOpen, setIsMoveToGroupOpen] = useState(false);
  const [groups, setGroups] = useState<FriendGroup[]>([]);

  const [viewMode, setViewMode] = useState<'default' | 'group'>('default');

  const { user } = useAuth();
  const { setIsBottomNavVisible } = useUI();
  const userDocRef = useMemo(() => (user ? doc(db, 'users', user.uid) : null), [user]);
  const { data: myInfo, loading: isLoading } = useFirestoreDoc<any>(userDocRef);
  const { myCalendars } = useCalendar();

  const friends: Friend[] = useMemo(() => myInfo?.friendsList || [], [myInfo]);

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

  const handleOpenContactsModal = () => {
    setIsAddModalOpen(false);
    setIsAddFromContactsModalOpen(true);
  };

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

  const handleDeleteConfirm = async () => {
    if (!selectedFriend || !user) return;
    try {
      const myRef = doc(db, 'users', auth.currentUser!.uid);
      await updateDoc(myRef, { friendsList: arrayRemove(selectedFriend) });

      let deletedCount = 0;
      let leftCount = 0;

      if (sharedCalendarsToDelete.length > 0) {
        await Promise.all(
          sharedCalendarsToDelete.map((cal) => {
            if (cal.ownerId === user.uid) {
              deletedCount++;
              return deleteCalendar(cal.id);
            }
            leftCount++;
            return leaveCalendar(cal as any, user);
          }),
        );
      }

      let message = '친구를 삭제했습니다.';
      if (deletedCount > 0 && leftCount === 0) {
        message = '친구를 삭제하고 공유 캘린더를 삭제했습니다.';
      } else if (deletedCount === 0 && leftCount > 0) {
        message = '친구를 삭제하고 공유 캘린더에서 나갔습니다.';
      } else if (deletedCount > 0 && leftCount > 0) {
        message = '친구를 삭제하고 공유 캘린더를 정리했습니다.';
      }

      toast.success(message);
      setIsDeleteModalOpen(false);
      setIsMenuOpen(false);
    } catch (e) {
      console.error('친구 삭제 오류:', e);
      toast.error('친구 삭제 중 오류가 발생했습니다.');
    }
  };

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
      {/* 선택 모드 헤더 */}
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

      {/* 검색 및 액션 버튼 [수정됨: min-w-0 추가] */}
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

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="shrink-0 w-[52px] h-[52px] flex items-center justify-center rounded-xl bg-black dark:bg-white text-white dark:text-black transition-all active:scale-95 shadow-md"
            aria-label="친구 추가"
          >
            <UserPlus size={24} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* 친구 목록 리스트 (내부 스크롤 제거, Bottom 패딩 추가) */}
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

      {/* Modals */}
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

      {previewImage && <ImagePreviewModal images={[previewImage]} initialIndex={0} onClose={() => setPreviewImage(null)} />}

      <AddFromContactsModal isOpen={isAddFromContactsModalOpen} onClose={() => setIsAddFromContactsModalOpen(false)} myInfo={myInfo} existingFriends={friends} />
      <ProfilePopup friend={profilePopupFriend} onClose={() => setProfilePopupFriend(null)} />
      <AddFriendModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} myInfo={myInfo} friends={friends} onOpenContacts={handleOpenContactsModal} />
    </div>
  );
};

export default FriendList;
