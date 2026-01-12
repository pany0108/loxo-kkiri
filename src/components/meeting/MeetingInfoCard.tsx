import React from 'react';
import { AlignLeft, MapPin } from 'lucide-react';

interface MeetingInfoCardProps {
  title: string;
  description?: string;
  location?: string;
}

const MeetingInfoCard: React.FC<MeetingInfoCardProps> = ({ title, description, location }) => {
  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-[28px] p-6 mb-10 border border-gray-100 dark:border-gray-700/50 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-bold text-[#007AFF] dark:text-blue-300 bg-[#007AFF]/10 dark:bg-blue-900/50 px-2 py-1 rounded-md">INVITATION</span>
      </div>

      <h3 className="text-[19px] font-black text-[#191F28] dark:text-white mb-3">{title}</h3>

      <div className="space-y-3">
        <div className="flex items-start gap-2.5">
          <AlignLeft size={16} className="text-[#8B95A1] dark:text-gray-500 mt-0.5 shrink-0" />
          <p className="text-[14px] font-medium text-[#8B95A1] dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{description || '설명 없음'}</p>
        </div>
        {location && (
          <div className="flex items-start gap-2.5">
            <MapPin size={16} className="text-[#8B95A1] dark:text-gray-500 mt-0.5 shrink-0" />
            <p className="text-[14px] font-medium text-[#8B95A1] dark:text-gray-300 leading-relaxed">{location}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingInfoCard;
