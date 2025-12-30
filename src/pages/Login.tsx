import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Sparkles, Loader2 } from 'lucide-react';
// [추가] Firebase 인증에 필요한 도구들을 불러옵니다.
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState(''); // 아이디 대신 이메일 형식을 권장합니다.
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  /**
   * 1. 이메일/비밀번호 로그인 핸들러
   * @param e 폼 제출 이벤트
   */
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Firebase에게 이메일과 비밀번호로 로그인을 요청합니다.
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/calendar'); // 성공 시 캘린더 이동
    } catch (error: any) {
      console.error(error);
      alert('로그인 정보를 다시 확인해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 2. 구글 소셜 로그인 핸들러
   */
  const handleGoogleLogin = async () => {
    try {
      // 팝업창을 띄워 구글 로그인을 진행합니다.
      await signInWithPopup(auth, googleProvider);
      navigate('/calendar'); // 성공 시 캘린더 이동
    } catch (error) {
      console.error(error);
      alert('구글 로그인 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white font-['Pretendard']">
      <div className="flex-1 px-6 pt-28 pb-12 overflow-y-auto max-w-md mx-auto w-full">
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

        {/* 2. 로그인 입력 폼 (이메일/비번) */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="space-y-3">
            <div className="group relative">
              <div className="flex items-center h-[60px] bg-gray-50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white rounded-[18px] px-5 transition-all duration-300">
                <User size={20} className="text-gray-300 mr-4 transition-colors group-focus-within:text-blue-600" />
                <input
                  type="email" // 아이디 대신 이메일 사용을 권장 (Firebase 기본값)
                  placeholder="이메일 주소"
                  className="bg-transparent border-none outline-none w-full h-full text-[16px] font-bold text-gray-800 placeholder:text-gray-300"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

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
                  autoComplete="current-password"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end items-center px-1 pt-1">
            <button type="button" onClick={() => navigate('/change-password')} className="text-xs font-bold text-gray-300 hover:text-blue-500 transition-colors">
              비밀번호 재설정
            </button>
          </div>

          <div className="pt-8 space-y-3">
            {/* 이메일 로그인 버튼 */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-[60px] bg-blue-600 text-white rounded-[20px] font-black text-[17px] shadow-lg shadow-blue-100 active:scale-[0.98] disabled:bg-blue-300 transition-all flex items-center justify-center"
            >
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : '로그인'}
            </button>

            {/* [추가] 구글 로그인 버튼 */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full h-[60px] bg-white text-gray-700 rounded-[20px] font-bold text-[15px] border-2 border-gray-100 hover:bg-gray-50 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
            >
              <img src="https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png" alt="google" className="w-5 h-5" />
              구글로 계속하기
            </button>

            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="w-full h-[50px] bg-transparent text-gray-400 font-bold text-[14px] hover:text-gray-600 transition-all"
            >
              회원가입 하기
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
