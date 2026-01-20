import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import relativeTime from 'dayjs/plugin/relativeTime';
import { ChevronRight, Users } from 'lucide-react';
import React from 'react';

dayjs.extend(relativeTime);
dayjs.locale('ko');

interface Meeting {
  id: string;
  title: string;
  status: 'PENDING' | 'VOTING' | 'CONFIRMED';
  members: number;
  hostId: string;
  isRetry?: boolean;
  isVotingCompleted?: boolean;
  isRecentlyUpdated?: boolean;
  updatedAt?: string;
  participants?: { uid: string; name?: string; photoURL?: string }[];
  hasVoted?: boolean;
}

interface MeetingListItemProps {
  meeting: Meeting;
  onClick: (meeting: Meeting) => void;
}

/** 약속 상태에 따른 배지 스타일 및 텍스트 반환 함수 */
const getStatusBadge = (status: string, isVotingCompleted?: boolean, hasVoted?: boolean) => {
  if (status === 'VOTING') {
    if (isVotingCompleted) {
      return { className: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400', text: '확정 대기중' };
    }
    // 투표 중인데 내가 투표하지 않은 경우
    if (hasVoted === false) {
      return { className: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold animate-pulse', text: '투표 필요' };
    }
    return { className: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400', text: '투표 진행중' };
  }

  if (status === 'PENDING') {
    // 조율 중인데 내가 응답하지 않은 경우
    if (hasVoted === false) {
      return { className: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold animate-pulse', text: '응답 필요' };
    }
    return { className: 'bg-primary/10 dark:bg-blue-500/10 text-primary dark:text-blue-400', text: '시간 조율중' };
  }

  if (status === 'CONFIRMED') {
    return { className: 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400', text: '약속 확정' };
  }

  return { className: 'bg-gray-100 dark:bg-gray-800 text-gray-500', text: '상태 없음' };
};

/**
 * 약속 목록 아이템 컴포넌트
 * - 약속의 제목, 상태, 참여자 정보 등을 요약하여 표시합니다.
 * @param {Meeting} meeting - 약속 정보 객체
 * @param {function} onClick - 클릭 핸들러
 */
const MeetingListItem: React.FC<MeetingListItemProps> = ({ meeting, onClick }) => {
  const badge = getStatusBadge(meeting.status, meeting.isVotingCompleted, meeting.hasVoted);

  return (
    <button
      onClick={() => onClick(meeting)}
      className={`w-full p-5 rounded-2xl border-2 flex items-center justify-between active:scale-[0.98] transition-all group border-gray-100 dark:border-gray-700/50 hover:border-primary/20 dark:hover:border-blue-500/20 hover:shadow-lg hover:shadow-primary/10 dark:hover:shadow-blue-900/30 ${
        meeting.isRecentlyUpdated ? 'bg-blue-50/40 dark:bg-blue-900/10' : 'bg-white dark:bg-gray-800'
      }`}
    >
      {/* 좌측 정보 영역 */}
      <div className="text-left space-y-2">
        <div className="flex items-center gap-2">
          {meeting.isRetry && <span className="text-[10px] font-black px-2 py-1 rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">재요청</span>}
          <span className={`text-[10px] font-black px-2 py-1 rounded-md ${badge.className}`}>{badge.text}</span>
        </div>
        <h4 className="font-black text-main dark:text-gray-200 text-[16px] group-hover:text-primary dark:group-hover:text-blue-400 transition-colors">{meeting.title}</h4>
        {/* 참여자 정보 */}
        <div className="flex items-center gap-1.5 text-sub dark:text-gray-400">
          {meeting.participants && meeting.participants.length > 0 ? (
            <div className="flex -space-x-2 mr-1">
              {meeting.participants.slice(0, 3).map((p) => (
                <div
                  key={p.uid}
                  className="w-5 h-5 rounded-full border border-white dark:border-gray-800 bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center"
                >
                  {p.photoURL ? (
                    <img src={p.photoURL} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[8px] font-bold text-gray-500 dark:text-gray-400">{p.name?.[0]}</span>
                  )}
                </div>
              ))}
              {meeting.participants.length > 3 && (
                <div className="w-5 h-5 rounded-full border border-white dark:border-gray-800 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <span className="text-[8px] font-bold text-gray-500 dark:text-gray-400">+{meeting.participants.length - 3}</span>
                </div>
              )}
            </div>
          ) : (
            <Users size={14} />
          )}
          <span className="text-[12px] font-bold">{meeting.members}명</span>
        </div>
      </div>
      {/* 우측 아이콘 및 업데이트 시간 */}
      <div className="flex flex-col items-end gap-1">
        <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-sub dark:text-gray-400 group-hover:bg-primary/10 dark:group-hover:bg-blue-500/10 group-hover:text-primary dark:group-hover:text-blue-400 transition-colors">
          <ChevronRight size={18} />
        </div>
        {meeting.updatedAt && (
          <span className={`text-[10px] font-medium mt-1 ${meeting.isRecentlyUpdated ? 'text-blue-500 dark:text-blue-400 font-bold' : 'text-gray-400 dark:text-gray-500'}`}>
            {dayjs(meeting.updatedAt).fromNow()}
            {meeting.isRecentlyUpdated && ' 업데이트'}
          </span>
        )}
      </div>
    </button>
  );
};

export default MeetingListItem;
