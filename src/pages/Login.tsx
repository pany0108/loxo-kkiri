import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ArrowRight, Loader2 } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // 가상의 로그인 지연 (나중에 Firebase 연동 시 실제 로직으로 교체)
    setTimeout(() => {
      setIsLoading(false);
      navigate('/calendar');
    }, 1000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white px-8 pt-24 pb-12">
      {/* 1. 상단 브랜딩 영역 */}
      <div className="mb-12">
        <div className="w-16 h-16 bg-blue-600 rounded-[22px] flex items-center justify-center mb-6 shadow-xl shadow-blue-200 ring-4 ring-blue-50">
          <ArrowRight className="text-white w-8 h-8" />
        </div>
        <h2 className="text-3xl font-black text-gray-900 leading-[1.2] mb-3">
          우리 가족 <br />
          <span className="text-blue-600">슈퍼 스케줄러</span>
        </h2>
        <p className="text-gray-400 font-medium">더 쉽고 빠른 약속 제안을 경험해보세요.</p>
      </div>

      {/* 2. 로그인 입력 폼 */}
      <form onSubmit={handleLogin} className="space-y-4 flex-1">
        <div className="space-y-3">
          {/* 아이디 입력창 */}
          <div className="group">
            <div className="flex items-center bg-gray-50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white rounded-2xl px-4 py-4 transition-all duration-200 shadow-sm shadow-transparent focus-within:shadow-blue-50">
              <User className="text-gray-400 mr-3 w-5 h-5 group-focus-within:text-blue-600" />
              <input
                type="text"
                placeholder="아이디"
                className="bg-transparent border-none outline-none w-full text-gray-800 font-semibold placeholder:text-gray-300"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
              />
            </div>
          </div>

          {/* 비밀번호 입력창 */}
          <div className="group">
            <div className="flex items-center bg-gray-50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white rounded-2xl px-4 py-4 transition-all duration-200 shadow-sm shadow-transparent focus-within:shadow-blue-50">
              <Lock className="text-gray-400 mr-3 w-5 h-5 group-focus-within:text-blue-600" />
              <input
                type="password"
                placeholder="비밀번호"
                className="bg-transparent border-none outline-none w-full text-gray-800 font-semibold placeholder:text-gray-300"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        {/* 3. 하단 버튼 영역 */}
        <div className="pt-8 space-y-4">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4.5 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-100 active:scale-[0.97] disabled:bg-blue-300 disabled:scale-100 flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : '로그인'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/signup')}
            className="w-full py-4.5 bg-white text-gray-500 rounded-2xl font-bold text-base border-2 border-gray-100 hover:bg-gray-50 transition-all active:scale-[0.97]"
          >
            회원가입
          </button>
        </div>
      </form>

      {/* 4. 푸터 보조 링크 */}
      <div className="mt-8 text-center">
        <button type="button" className="text-[13px] font-bold text-gray-300 hover:text-blue-500 transition-colors">
          계정 정보를 잊으셨나요?
        </button>
      </div>
    </div>
  );
};

export default Login;
