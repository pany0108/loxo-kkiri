import { AddFriendModal, AddFromContactsModal, FriendListPopup } from 'components';
import { Plus, Search, UserPlus, Users, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

interface Friend {
  uid: string;
  id: string;
  name: string;
  group?: string;
  email: string;
}

interface GroupedFriends {
  id: string;
  name: string;
  friends: Friend[];
}

interface FriendSelectorForMeetingProps {
  groupedFriends: GroupedFriends[];
  invitedFriends: Friend[];
  allFriends: Friend[];
  onToggleFriend: (friend: { id: string }) => void;
  onToggleGroup: (group: { friends: { id: string }[] }) => void;
  user: any;
}

/**
 * 약속 생성 시 친구 선택 컴포넌트
 * - 친구 검색, 선택, 추가 기능을 제공합니다.
 * @param {GroupedFriends[]} groupedFriends - 그룹화된 친구 목록
 * @param {Friend[]} invitedFriends - 초대된 친구 목록
 * @param {Friend[]} allFriends - 전체 친구 목록
 * @param {function} onToggleFriend - 친구 선택 토글 핸들러
 * @param {function} onToggleGroup - 그룹 선택 토글 핸들러
 * @param {any} user - 현재 사용자 정보
 */
const FriendSelectorForMeeting: React.FC<FriendSelectorForMeetingProps> = ({ groupedFriends, invitedFriends, allFriends, onToggleFriend, onToggleGroup, user }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
  const [isAddFromContactsModalOpen, setIsAddFromContactsModalOpen] = useState(false);

  // 검색어에 따른 친구 필터링
  const searchResults = useMemo(() => {
    if (!searchTerm) {
      return [];
    }
    return allFriends.filter((friend) => friend.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [allFriends, searchTerm]);

  /** 이름으로 친구 추가 핸들러 */
  const handleAddFriendByName = () => {
    if (!searchTerm.trim()) return;

    const friendToAdd = allFriends.find((f) => f.name.toLowerCase() === searchTerm.trim().toLowerCase());

    if (friendToAdd) {
      if (invitedFriends.some((f) => f.uid === friendToAdd.uid)) {
        toast('이미 초대된 친구입니다.', { icon: '😅' });
      } else {
        onToggleFriend(friendToAdd);
      }
    } else {
      toast.error('존재하지 않는 친구입니다.');
    }
    setSearchTerm('');
  };

  /** 연락처 모달 열기 핸들러 */
  const handleOpenContactsModal = () => {
    setIsAddFriendModalOpen(false);
    setIsAddFromContactsModalOpen(true);
  };

  return (
    <>
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Users size={18} className="text-sub dark:text-gray-500" />
          <label className="text-caption">누구와 함께하나요?</label>
        </div>

        {/* 검색 및 추가 영역 */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-[24px] p-4 border-2 border-transparent space-y-4">
          <div className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <div className="flex items-center bg-white dark:bg-gray-800 rounded-[16px] px-4 h-[52px] shadow-sm border border-gray-100 dark:border-gray-700/50 focus-within:ring-2 focus-within:ring-primary/50 transition-all">
                  <Search size={18} className="text-sub dark:text-gray-500 mr-3 shrink-0" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddFriendByName()}
                    placeholder="친구 이름 검색 후 추가"
                    className="w-full bg-transparent outline-none text-main dark:text-white text-[14px] font-bold placeholder:text-sub dark:placeholder:text-gray-500"
                  />
                </div>
                {searchTerm && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-700 rounded-xl shadow-lg border border-gray-100 dark:border-gray-600 z-10 max-h-48 overflow-y-auto">
                    {searchResults.map((friend) => (
                      <button
                        key={friend.uid}
                        onClick={() => {
                          onToggleFriend(friend);
                          setSearchTerm('');
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
                onClick={() => setIsAddFriendModalOpen(true)}
                className="w-[52px] h-[52px] bg-primary text-white rounded-[16px] flex items-center justify-center shrink-0 shadow-md shadow-primary/30 dark:shadow-primary/20 active:scale-95 transition-all"
              >
                <Plus size={20} strokeWidth={3} />
              </button>
            </div>
          </div>
          {/* 선택된 친구 목록 표시 */}
          {invitedFriends.length > 0 && (
            <div className="px-1">
              <h5 className="text-xs font-bold text-sub dark:text-gray-500 mb-2">선택된 친구 ({invitedFriends.length}명)</h5>
              <div className="flex flex-wrap gap-2">
                {invitedFriends.map((friend) => (
                  <button
                    key={`invited-${friend.uid}`}
                    onClick={() => onToggleFriend(friend)}
                    className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-xs font-bold transition-all bg-primary text-white"
                  >
                    {friend.name}
                    <X size={14} className="bg-white/20 rounded-full p-0.5" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 친구 목록 팝업 열기 버튼 */}
          <button
            onClick={() => setIsPopupOpen(true)}
            className="w-full h-[52px] border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-[20px] flex items-center justify-center gap-2 text-sub dark:text-gray-400 font-bold text-[13px] hover:border-primary hover:text-primary hover:bg-primary/20 transition-all active:scale-[0.99]"
          >
            <UserPlus size={16} strokeWidth={2.5} />
            친구 목록에서 선택하기
          </button>
        </div>
      </section>
      {/* 관련 모달들 */}
      <FriendListPopup
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        groupedFriends={groupedFriends}
        invitedFriends={invitedFriends}
        onToggleFriend={onToggleFriend}
        onToggleGroup={onToggleGroup}
      />
      <AddFriendModal isOpen={isAddFriendModalOpen} onClose={() => setIsAddFriendModalOpen(false)} myInfo={user} friends={allFriends} onOpenContacts={handleOpenContactsModal} />
      <AddFromContactsModal isOpen={isAddFromContactsModalOpen} onClose={() => setIsAddFromContactsModalOpen(false)} myInfo={user} existingFriends={allFriends} />
    </>
  );
};

export default FriendSelectorForMeeting;
