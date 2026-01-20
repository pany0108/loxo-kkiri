import { Plus } from 'lucide-react';
import React from 'react';

/**
 * 제안할 시간이 없을 때 표시되는 가이드 컴포넌트
 * @returns {JSX.Element} 가이드 UI
 */
const EmptyProposalGuide = () => {
  return (
    <div className="py-8 text-center border-2 border-dashed border-gray-100 dark:border-gray-700/50 rounded-2xl">
      <Plus size={20} className="mx-auto text-sub dark:text-gray-400 mb-2" />
      <p className="text-[12px] text-sub dark:text-gray-400 font-bold">
        가능한 다른 날짜가 있다면
        <br />
        달력을 눌러 추가해주세요.
      </p>
    </div>
  );
};

export default EmptyProposalGuide;
