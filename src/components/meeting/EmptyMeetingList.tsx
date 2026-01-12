import React from 'react';
import { CalendarCheck } from 'lucide-react';

const EmptyMeetingList = () => {
  return (
    <div className="py-12 text-center space-y-3 bg-gray-50 dark:bg-gray-800/50 rounded-[24px] border-2 border-dashed border-gray-100 dark:border-gray-700/50">
      <div className="w-14 h-14 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto text-[#8B95A1] dark:text-gray-600 mb-2 shadow-sm">
        <CalendarCheck size={24} />
      </div>
      <div className="space-y-1">
        <p className="text-[#8B95A1] dark:text-gray-400 font-bold text-[13px]">현재 진행 중인 약속이 없어요.</p>
        <p className="text-[#8B95A1] dark:text-gray-500 text-[11px]">새로운 약속을 만들어보세요!</p>
      </div>
    </div>
  );
};

export default EmptyMeetingList;
