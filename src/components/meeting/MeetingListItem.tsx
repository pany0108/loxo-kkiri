import React from 'react';
import { Users, ChevronRight } from 'lucide-react';

interface Meeting {
  id: string;
  title: string;
  status: 'PENDING' | 'VOTING' | 'CONFIRMED';
  members: number;
  hostId: string;
  isRetry?: boolean;
  isVotingCompleted?: boolean;
}

interface MeetingListItemProps {
  meeting: Meeting;
  onClick: (meeting: Meeting) => void;
}

const getStatusBadge = (status: string, isVotingCompleted?: boolean) => {
  if (status === 'VOTING' && isVotingCompleted) {
    return { className: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400', text: '확정 대기중' };
  }
  switch (status) {
    case 'VOTING':
      return { className: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400', text: '투표 진행중' };
    case 'CONFIRMED':
      return { className: 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400', text: '약속 확정' };
    default:
      return { className: 'bg-[#007AFF]/10 dark:bg-blue-500/10 text-[#007AFF] dark:text-blue-400', text: '시간 조율중' };
  }
};

const MeetingListItem: React.FC<MeetingListItemProps> = ({ meeting, onClick }) => {
  const badge = getStatusBadge(meeting.status, meeting.isVotingCompleted);

  return (
    <button
      onClick={() => onClick(meeting)}
      className="w-full bg-white dark:bg-gray-800 p-5 rounded-[24px] border-2 border-gray-50 dark:border-gray-700/50 flex items-center justify-between active:scale-[0.98] transition-all hover:border-[#007AFF]/20 dark:hover:border-blue-500/20 hover:shadow-lg hover:shadow-[#007AFF]/10 dark:hover:shadow-blue-900/30 group"
    >
      <div className="text-left space-y-2">
        <div className="flex items-center gap-2">
          {meeting.isRetry && <span className="text-[10px] font-black px-2 py-1 rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">재요청</span>}
          <span className={`text-[10px] font-black px-2 py-1 rounded-md ${badge.className}`}>{badge.text}</span>
        </div>
        <h4 className="font-black text-[#191F28] dark:text-gray-200 text-[16px] group-hover:text-[#007AFF] dark:group-hover:text-blue-400 transition-colors">{meeting.title}</h4>
        <div className="flex items-center gap-1.5 text-[#8B95A1] dark:text-gray-500">
          <Users size={14} />
          <span className="text-[12px] font-bold">{meeting.members}명 참여중</span>
        </div>
      </div>
      <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-[#8B95A1] dark:text-gray-600 group-hover:bg-[#007AFF]/10 dark:group-hover:bg-blue-500/10 group-hover:text-[#007AFF] dark:group-hover:text-blue-400 transition-colors">
        <ChevronRight size={18} />
      </div>
    </button>
  );
};

export default MeetingListItem;
