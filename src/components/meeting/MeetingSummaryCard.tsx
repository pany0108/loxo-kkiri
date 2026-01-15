import React from 'react';
import { AlignLeft, MapPin, Users } from 'lucide-react';

interface InvitedFriend {
  id: string;
  name: string;
}

interface MeetingSummaryCardProps {
  title: string;
  description?: string;
  location?: string;
  invitedFriends: InvitedFriend[];
}

const MeetingSummaryCard: React.FC<MeetingSummaryCardProps> = ({ title, description, location, invitedFriends }) => {
  return (
    <section className="bg-gray-50 dark:bg-gray-800 rounded-3xl p-6 mb-8 border border-gray-100 dark:border-gray-700/50 shadow-card">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-bold text-primary dark:text-blue-300 bg-primary/10 dark:bg-blue-900/50 px-2 py-1 rounded-md">SUMMARY</span>
      </div>
      <h3 className="text-[18px] font-black text-main dark:text-white mb-2">{title}</h3>

      <div className="space-y-3 mb-4">
        {description && (
          <div className="flex items-start gap-2.5">
            <AlignLeft size={16} className="text-sub dark:text-gray-500 mt-0.5 shrink-0" />
            <p className="text-[14px] font-medium text-sub dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{description}</p>
          </div>
        )}
        {location && (
          <div className="flex items-start gap-2.5">
            <MapPin size={16} className="text-sub dark:text-gray-500 mt-0.5 shrink-0" />
            <p className="text-[14px] font-medium text-sub dark:text-gray-300 leading-relaxed">{location}</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-4 border-t border-gray-200/60 dark:border-gray-700/50">
        <Users size={16} className="text-sub dark:text-gray-500" />
        <span className="text-[13px] font-bold text-sub dark:text-gray-400">
          {invitedFriends.length > 0 ? invitedFriends.map((f) => f.name).join(', ') : '초대된 친구 없음'}
        </span>
      </div>
    </section>
  );
};

export default MeetingSummaryCard;
