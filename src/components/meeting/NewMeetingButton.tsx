import { Plus } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * 새 약속 생성 버튼 컴포넌트
 * - 약속 생성 페이지로 이동하는 큰 버튼입니다.
 * @returns {JSX.Element} 버튼 요소
 */
const NewMeetingButton = () => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/propose/create')}
      className="w-full h-[80px] bg-primary rounded-2xl flex items-center justify-between px-6 shadow-xl shadow-primary/30 dark:shadow-primary/20 active:scale-[0.98] transition-all group mb-8"
    >
      <div className="text-left">
        <p className="text-blue-100 text-[11px] font-bold mb-1 tracking-wider uppercase">New Meeting</p>
        <h3 className="text-white font-black text-[17px]">새로운 약속 제안하기</h3>
      </div>
      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white group-hover:bg-white group-hover:text-primary transition-all">
        <Plus size={24} strokeWidth={3} />
      </div>
    </button>
  );
};

export default NewMeetingButton;
