import React, { useState, useMemo } from 'react';
import { X, Users, Check } from 'lucide-react';

interface Friend {
  id: string;
  name: string;
  group?: string;
}

interface GroupedFriends {
  id: string;
  name: string;
  friends: Friend[];
}

interface FriendListPopupProps {
  isOpen: boolean;
  onClose: () => void;
  groupedFriends: GroupedFriends[];
  invitedFriends: Friend[];
  onToggleFriend: (friend: Friend) => void;
  onToggleGroup: (group: GroupedFriends) => void;
}

const FriendListPopup: React.FC<FriendListPopupProps> = ({ isOpen, onClose, groupedFriends, invitedFriends, onToggleFriend, onToggleGroup }) => {
  const [viewMode, setViewMode] = useState<'group' | 'alphabetical'>('alphabetical');
  const invitedIds = useMemo(() => new Set(invitedFriends.map((f) => f.id)), [invitedFriends]);

  const alphabeticalFriends = useMemo(() => {
    return groupedFriends.flatMap((g) => g.friends).sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }, [groupedFriends]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-md h-[80vh] bg-white dark:bg-gray-800 rounded-[32px] p-6 shadow-2xl flex flex-col">
        <div className="flex justify-between items-center mb-4 shrink-0">
          <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Users size={20} />
            친구 목록
          </h3>
          <button onClick={onClose} className="p-2 -mr-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="mb-4 shrink-0">
          <div className="flex bg-gray-100 dark:bg-gray-900 rounded-xl p-1">
            <button
              onClick={() => setViewMode('alphabetical')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                viewMode === 'alphabetical' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 shadow-sm' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              가나다순
            </button>
            <button
              onClick={() => setViewMode('group')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                viewMode === 'group' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 shadow-sm' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              그룹별
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto -mx-2 px-2 space-y-3">
          {viewMode === 'group' &&
            groupedFriends.map((group) => {
              const allSelected = group.friends.length > 0 && group.friends.every((friend) => invitedIds.has(friend.id));
              const someSelected = !allSelected && group.friends.some((friend) => invitedIds.has(friend.id));
              return (
                <div key={`group-${group.id}`}>
                  <div
                    onClick={() => onToggleGroup(group)}
                    className="flex items-center gap-3 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors mb-1"
                  >
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                        allSelected ? 'bg-blue-600 border-blue-600' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500'
                      }`}
                    >
                      {allSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                      {someSelected && <div className="w-2 h-2 bg-blue-600 rounded-sm" />}
                    </div>
                    <h5 className="text-sm font-bold text-gray-600 dark:text-gray-400">{group.name}</h5>
                  </div>
                  <div className="pl-8 space-y-1">
                    {group.friends.map((friend) => {
                      const isSelected = invitedIds.has(friend.id);
                      return (
                        <button
                          key={friend.id}
                          onClick={() => onToggleFriend(friend)}
                          className={`w-full flex items-center justify-between text-left px-3 py-2.5 rounded-xl transition-all ${
                            isSelected ? 'bg-blue-50 dark:bg-blue-500/10' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          <span className={`font-bold text-sm ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-gray-200'}`}>{friend.name}</span>
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                              isSelected ? 'bg-blue-600 border-blue-600' : 'bg-gray-200 dark:bg-gray-600 border-gray-200 dark:border-gray-600'
                            }`}
                          >
                            {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          {viewMode === 'alphabetical' &&
            alphabeticalFriends.map((friend) => {
              const isSelected = invitedIds.has(friend.id);
              return (
                <button
                  key={friend.id}
                  onClick={() => onToggleFriend(friend)}
                  className={`w-full flex items-center justify-between text-left px-3 py-2.5 rounded-xl transition-all ${
                    isSelected ? 'bg-blue-50 dark:bg-blue-500/10' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className={`font-bold text-sm ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-gray-200'}`}>{friend.name}</span>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected ? 'bg-blue-600 border-blue-600' : 'bg-gray-200 dark:bg-gray-600 border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                  </div>
                </button>
              );
            })}
        </div>

        <div className="mt-4 shrink-0">
          <button
            onClick={onClose}
            className="w-full h-[56px] bg-blue-600 text-white rounded-[20px] font-black text-base shadow-lg shadow-blue-100 dark:shadow-blue-900/50 active:scale-[0.98] transition-all"
          >
            선택 완료 ({invitedFriends.length}명)
          </button>
        </div>
      </div>
    </div>
  );
};

export default FriendListPopup;
