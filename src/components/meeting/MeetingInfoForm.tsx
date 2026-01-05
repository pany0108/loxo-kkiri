import React from 'react';
import { Send, AlignLeft, MapPin } from 'lucide-react';

interface MeetingInfoFormProps {
  title: string;
  description: string;
  location: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onLocationChange: (value: string) => void;
}

const MeetingInfoForm: React.FC<MeetingInfoFormProps> = ({ title, description, location, onTitleChange, onDescriptionChange, onLocationChange }) => {
  return (
    <section className="space-y-4">
      <div className="group relative">
        <label className="block text-[13px] font-black text-gray-400 dark:text-gray-500 ml-1 mb-2">약속 제목</label>
        <div className="flex items-center h-[60px] bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-gray-800 rounded-[20px] px-5 transition-all">
          <Send size={20} className="text-gray-300 dark:text-gray-600 mr-4 group-focus-within:text-blue-600" />
          <input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="예: 강남역 저녁 모임"
            className="bg-transparent border-none outline-none w-full h-full text-[16px] font-bold text-gray-800 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-500"
          />
        </div>
      </div>

      <div className="group relative">
        <label className="block text-[13px] font-black text-gray-400 dark:text-gray-500 ml-1 mb-2">메모 (선택)</label>
        <div className="flex items-start bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-gray-800 rounded-[24px] p-5 transition-all">
          <AlignLeft size={20} className="text-gray-300 dark:text-gray-600 mr-4 mt-1 group-focus-within:text-blue-600" />
          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="장소나 준비물 등을 적어주세요"
            rows={3}
            className="bg-transparent border-none outline-none w-full text-[15px] font-bold text-gray-800 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-500 resize-none"
          />
        </div>
      </div>

      <div className="group relative">
        <label className="block text-[13px] font-black text-gray-400 dark:text-gray-500 ml-1 mb-2">장소 (선택)</label>
        <div className="flex items-center h-[60px] bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-gray-800 rounded-[20px] px-5 transition-all">
          <MapPin size={20} className="text-gray-300 dark:text-gray-600 mr-4 group-focus-within:text-blue-600" />
          <input
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            placeholder="예: 강남역 2번 출구"
            className="bg-transparent border-none outline-none w-full h-full text-[16px] font-bold text-gray-800 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-500"
          />
        </div>
      </div>
    </section>
  );
};

export default MeetingInfoForm;
