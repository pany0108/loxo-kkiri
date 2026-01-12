import React from 'react';
import { Plus } from 'lucide-react';

const EmptyProposalGuide = () => {
  return (
    <div className="py-8 text-center border-2 border-dashed border-gray-100 dark:border-gray-700/50 rounded-2xl">
      <Plus size={20} className="mx-auto text-[#8B95A1] dark:text-gray-600 mb-2" />
      <p className="text-[12px] text-[#8B95A1] dark:text-gray-500 font-bold">
        가능한 다른 날짜가 있다면
        <br />
        달력을 눌러 추가해주세요.
      </p>
    </div>
  );
};

export default EmptyProposalGuide;
