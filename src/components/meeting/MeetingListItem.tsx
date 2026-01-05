import React from 'react';
import { Users, ChevronRight } from 'lucide-react';

interface Meeting {
  id: string;
  title: string;
  status: 'PENDING' | 'VOTING' | 'CONFIRMED';
  members: number;
  dday: string;
  hostId: string;
}

interface MeetingListItemProps {
  meeting: Meeting;
  onClick: (meeting: Meeting) => void;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'VOTING':
      return { className: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400', text: '투표 진행중' };
    case 'CONFIRMED':
      return { className: 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400', text: '약속 확정' };
    default:
      return { className: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400', text: '시간 조율중' };
  }
};

const MeetingListItem: React.FC<MeetingListItemProps> = ({ meeting, onClick }) => {
  const badge = getStatusBadge(meeting.status);

  return (
    <button
      onClick={() => onClick(meeting)}
      className="w-full bg-white dark:bg-gray-800 p-5 rounded-[24px] border-2 border-gray-50 dark:border-gray-700/50 flex items-center justify-between active:scale-[0.98] transition-all hover:border-blue-100 dark:hover:border-blue-500/20 hover:shadow-lg hover:shadow-blue-50/50 dark:hover:shadow-blue-900/30 group"
    >
      <div className="text-left space-y-2">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-black px-2 py-1 rounded-md ${badge.className}`}>{badge.text}</span>
          <span className="text-[11px] font-bold text-gray-300 dark:text-gray-600">| {meeting.dday}</span>
        </div>
        <h4 className="font-black text-gray-800 dark:text-gray-200 text-[16px] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{meeting.title}</h4>
        <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
          <Users size={14} />
          <span className="text-[12px] font-bold">{meeting.members}명 참여중</span>
        </div>
      </div>
      <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-300 dark:text-gray-600 group-hover:bg-blue-50 dark:group-hover:bg-blue-500/10 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
        <ChevronRight size={18} />
      </div>
    </button>
  );
};

export default MeetingListItem;
