import React, { useMemo, useRef } from 'react';
import { motion, AnimatePresence, AnimatePresenceProps } from 'framer-motion';
import { X, Search, CheckCircle2 } from 'lucide-react';

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

interface FriendListPopupProps {
  isOpen: boolean;
  onClose: () => void;
  friends: Friend[];
  friendGroups: FriendGroup[];
  selectedFriendUids: string[];
  onToggleFriend: (uid: string) => void;
  onToggleGroup: (group: { friends: Friend[] }) => void;
}

const FriendListPopup: React.FC<FriendListPopupProps> = ({ isOpen, onClose, friends, friendGroups, selectedFriendUids, onToggleFriend, onToggleGroup }) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const sheetTouchStartY = useRef<number | null>(null);
  const sheetTouchEndY = useRef<number | null>(null);
  const minSheetSwipeDistance = 50;

  const AnimatePresenceSafe = AnimatePresence as React.FC<React.PropsWithChildren<AnimatePresenceProps>>;

  const groupedAndFilteredFriends = useMemo(() => {
    const groupMap = new Map<string, { name: string; friends: Friend[] }>();
    friendGroups.forEach((g) => groupMap.set(g.id, { name: g.name, friends: [] }));
    groupMap.set('uncategorized', { name: '미분류', friends: [] });

    const filteredBySearch = friends.filter((f) => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

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
  }, [friends, friendGroups, searchTerm]);

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
      onClose();
    }
  };

  return (
    <AnimatePresenceSafe>
      {isOpen && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div
            className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-t-[32px] pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl h-[80vh] flex flex-col"
            initial={{ y: '100%' }}
            animate={{ y: '0%' }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <button onClick={onClose} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 z-10">
              <X size={20} />
            </button>
            <div className="px-6 pt-6" onTouchStart={onSheetTouchStart} onTouchMove={onSheetTouchMove} onTouchEnd={onSheetTouchEnd}>
              <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-6" />
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-4">친구 선택</h3>
            </div>

            <div className="px-6 relative mb-4">
              <div className="flex items-center h-[52px] bg-gray-50 dark:bg-gray-800/50 rounded-[20px] px-4 transition-all shadow-sm focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:bg-white dark:focus-within:bg-gray-800">
                <Search size={18} className="text-gray-400 dark:text-gray-600 mr-3 shrink-0" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="친구 이름으로 검색"
                  className="flex-1 bg-transparent outline-none text-gray-900 text-[15px] font-bold placeholder:text-gray-300"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 px-6">
              {groupedAndFilteredFriends.length > 0 ? (
                groupedAndFilteredFriends.map((group) => (
                  <div key={group.id} className="mb-4">
                    <div className="flex justify-between items-center mb-2 px-1 sticky top-0 bg-white dark:bg-gray-800 py-1 z-10">
                      <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500">{group.name}</h4>
                      <button onClick={() => onToggleGroup(group)} className="text-xs font-bold text-blue-500">
                        {group.friends.every((f) => selectedFriendUids.includes(f.uid)) ? '전체 해제' : '전체 선택'}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {group.friends.map((friend) => {
                        const isSelected = selectedFriendUids.includes(friend.uid);
                        return (
                          <button
                            key={friend.uid}
                            type="button"
                            onClick={() => onToggleFriend(friend.uid)}
                            className={`relative p-4 rounded-[20px] border-2 transition-all duration-200 flex items-center gap-3 text-left active:scale-[0.98] ${
                              isSelected
                                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100 dark:shadow-blue-900/50'
                                : 'bg-white dark:bg-gray-700/50 border-gray-100 dark:border-transparent text-gray-600 dark:text-gray-300 hover:border-blue-100 dark:hover:border-blue-900/30 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                          >
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-black transition-colors shrink-0 overflow-hidden ${
                                isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-600 text-gray-400 dark:text-gray-400'
                              }`}
                            >
                              {friend.photoURL ? <img src={friend.photoURL} alt={friend.name} className="w-full h-full object-cover" /> : friend.name[0]}
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
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresenceSafe>
  );
};

export default FriendListPopup;
