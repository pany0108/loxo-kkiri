import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Sparkles, Loader2, ChevronRight } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      navigate('/calendar');
    }, 1000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white font-['Pretendard']">
      <div className="flex-1 px-8 pt-28 pb-12 overflow-y-auto max-w-md mx-auto w-full">
        {/* 1. 상단 브랜딩 영역 */}
        <div className="mb-14 text-left">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-8 shadow-xl shadow-blue-100 ring-4 ring-blue-50">
            <Sparkles className="text-white w-7 h-7 fill-white/20" />
          </div>
          <h2 className="text-[30px] font-black text-gray-900 leading-[1.2] tracking-tight">
            일정 관리의 <br />
            <span className="text-blue-600">새로운 기준</span>
          </h2>
          <p className="mt-3 text-gray-400 font-medium text-[15px]">슈퍼 스케줄러와 함께 스마트하게 약속하세요.</p>
        </div>

        {/* 2. 로그인 입력 폼 */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-3">
            {/* 아이디 입력창 - 높이 h-[60px] 고정 */}
            <div className="group relative">
              <div className="flex items-center h-[60px] bg-gray-50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white rounded-[18px] px-5 transition-all duration-300">
                <User size={20} className="text-gray-300 mr-4 transition-colors group-focus-within:text-blue-600" />
                <input
                  type="text"
                  placeholder="아이디"
                  className="bg-transparent border-none outline-none w-full h-full text-[16px] font-bold text-gray-800 placeholder:text-gray-300"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* 비밀번호 입력창 - 높이 h-[60px] 고정 */}
            <div className="group relative">
              <div className="flex items-center h-[60px] bg-gray-50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white rounded-[18px] px-5 transition-all duration-300">
                <Lock size={20} className="text-gray-300 mr-4 transition-colors group-focus-within:text-blue-600" />
                <input
                  type="password"
                  placeholder="비밀번호"
                  className="bg-transparent border-none outline-none w-full h-full text-[16px] font-bold text-gray-800 placeholder:text-gray-300"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* 보조 링크 영역 */}
          <div className="flex justify-end items-center px-1 pt-1">
            <div className="flex gap-4">
              <button type="button" className="text-xs font-bold text-gray-300 hover:text-blue-500 transition-colors">
                아이디 찾기
              </button>
              <div className="w-[1px] h-3 bg-gray-100 mt-0.5" />
              <button type="button" onClick={() => navigate('/change-password')} className="text-xs font-bold text-gray-300 hover:text-blue-500 transition-colors">
                비밀번호 재설정
              </button>
            </div>
          </div>

          {/* 3. 버튼 영역 - 높이 h-[60px]로 Input과 통일 */}
          <div className="pt-10 space-y-3">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-[60px] bg-blue-600 text-white rounded-[20px] font-black text-[17px] shadow-lg shadow-blue-100 active:scale-[0.98] disabled:bg-blue-300 transition-all flex items-center justify-center gap-2 group"
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <span>로그인</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="w-full h-[60px] bg-white text-gray-500 rounded-[20px] font-bold text-[15px] border-2 border-gray-100 hover:bg-gray-50 transition-all active:scale-[0.98]"
            >
              회원가입
            </button>
          </div>
        </form>
      </div>

      <footer className="pb-10 text-center">
        <p className="text-[11px] font-bold text-gray-200 tracking-[0.2em] uppercase">Powered by Super Scheduler</p>
      </footer>
    </div>
  );
};

export default Login;
