import React from 'react';
import { Users, CheckCircle2 } from 'lucide-react';

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

interface FriendSelectorForMeetingProps {
  groupedFriends: GroupedFriends[];
  invitedFriends: Friend[];
  onToggleFriend: (friend: Friend) => void;
}

const FriendSelectorForMeeting: React.FC<FriendSelectorForMeetingProps> = ({ groupedFriends, invitedFriends, onToggleFriend }) => {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Users size={18} className="text-gray-400 dark:text-gray-500" />
        <label className="text-[13px] font-black text-gray-400 dark:text-gray-500">누구와 함께하나요?</label>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-[24px] p-4 border-2 border-transparent">
        {groupedFriends.map((group) => (
          <div key={group.id} className="mb-3 last:mb-0">
            <h5 className="text-xs font-bold text-gray-400 dark:text-gray-500 mb-2 px-1">{group.name}</h5>
            <div className="flex flex-wrap gap-2">
              {group.friends.map((friend) => {
                const isSelected = invitedFriends.some((f) => f.id === friend.id);
                return (
                  <button
                    key={friend.id}
                    onClick={() => onToggleFriend(friend)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-[16px] text-[13px] font-bold transition-all whitespace-nowrap border-2 ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-blue-900/50'
                        : 'bg-white dark:bg-gray-700 border-white dark:border-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    {friend.name}
                    {isSelected && <CheckCircle2 size={14} className="text-blue-200" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {invitedFriends.length > 0 && <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 mt-2 ml-1">총 {invitedFriends.length}명 선택됨</p>}
      </div>
    </section>
  );
};

export default FriendSelectorForMeeting;
