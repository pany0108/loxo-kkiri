import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Sparkles, Loader2, Check } from 'lucide-react';
import { signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { auth, db, googleProvider } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * 로그인 페이지 컴포넌트입니다.
 * 이메일/비밀번호 로그인 및 Google 소셜 로그인을 처리합니다.
 * 로그인 성공 시 기존 유저 여부를 확인하여 캘린더 또는 회원가입 페이지로 이동시킵니다.
 * * @returns {JSX.Element} 로그인 화면
 */
const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * 인증된 사용자의 Firestore 등록 여부를 확인하고 페이지를 라우팅합니다.
   * - 기존 유저: 메인 캘린더(/calendar)로 이동
   * - 신규 유저: 추가 정보 입력 페이지(/signup-social)로 이동
   * * @param {any} user - Firebase Auth User 객체
   */
  const handleUserRegistration = useCallback(
    async (user: any) => {
      try {
        setIsLoading(true);

        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          // 기존 유저: 캘린더로 바로 이동
          navigate('/calendar', { replace: true });
        } else {
          // 신규 유저: 소셜 프로필 정보 준비
          const signupData = {
            uid: user.uid,
            email: user.email || '',
            lastName: user.displayName?.charAt(0) || '',
            firstName: user.displayName?.slice(1) || '',
          };

          // 모바일 리다이렉트 환경에서의 데이터 유실 방지를 위해 LocalStorage 백업
          localStorage.setItem('pendingSignup', JSON.stringify(signupData));

          // 회원가입 페이지로 이동
          navigate('/signup-social', {
            replace: true,
            state: signupData,
          });
        }
      } catch (error: any) {
        // 네트워크 또는 권한 오류 발생 시 처리
        setIsLoading(false);
        alert('사용자 정보를 확인하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }
    },
    [navigate],
  );

  /**
   * 컴포넌트 마운트 시 인증 상태 및 리다이렉트 결과를 확인합니다.
   */
  useEffect(() => {
    setIsLoading(true);

    // 1. 소셜 로그인 리다이렉트 결과 처리 (모바일 환경 대응)
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          handleUserRegistration(result.user);
        } else if (auth.currentUser) {
          // 2. 이미 로그인된 세션이 있는 경우
          handleUserRegistration(auth.currentUser);
        } else {
          setIsLoading(false);
        }
      })
      .catch(() => {
        setIsLoading(false);
      });

    // 3. 실시간 인증 상태 변화 감지
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        handleUserRegistration(user);
      }
    });

    return () => unsubscribe();
  }, [handleUserRegistration]);

  /**
   * 저장된 이메일 정보를 불러옵니다.
   */
  useEffect(() => {
    const savedEmail = localStorage.getItem('savedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  /**
   * 이메일/비밀번호 로그인 핸들러
   */
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);

      if (rememberMe) localStorage.setItem('savedEmail', email);
      else localStorage.removeItem('savedEmail');

      // onAuthStateChanged에서 라우팅 처리하므로 별도 navigate 불필요
    } catch (error: any) {
      alert('이메일 또는 비밀번호를 다시 확인해주세요.');
      setIsLoading(false);
    }
  };

  /**
   * Google 소셜 로그인 핸들러
   * 1. 팝업 방식을 우선 시도합니다.
   * 2. 팝업 차단 등으로 실패 시 리다이렉트 방식으로 자동 전환합니다.
   */
  const handleGoogleLogin = async () => {
    setIsLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        await handleUserRegistration(result.user);
      }
    } catch (error: any) {
      // 팝업이 차단된 경우 리다이렉트로 대체 시도
      if (error.code === 'auth/popup-blocked') {
        alert('팝업이 차단되어 리다이렉트 방식으로 로그인을 시도합니다.');
        await signInWithRedirect(auth, googleProvider);
      } else {
        alert('로그인 중 오류가 발생했습니다.');
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white font-['Pretendard']">
      <div className="flex-1 px-6 pt-28 pb-12 overflow-y-auto max-w-md mx-auto w-full">
        {/* 상단 브랜딩 영역 */}
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

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="space-y-3">
            {/* 이메일 입력 */}
            <div className="group relative">
              <div className="flex items-center h-[60px] bg-gray-50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white rounded-[18px] px-5 transition-all duration-300">
                <User size={20} className="text-gray-300 mr-4 transition-colors group-focus-within:text-blue-600" />
                <input
                  type="email"
                  placeholder="이메일 주소"
                  className="bg-transparent border-none outline-none w-full h-full text-[16px] font-bold text-gray-800 placeholder:text-gray-300"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* 비밀번호 입력 */}
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

          {/* 이메일 저장 및 비밀번호 재설정 링크 */}
          <div className="flex justify-between items-center px-1 pt-1">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                <div
                  className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center
                  ${rememberMe ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-200 group-hover:border-blue-400'}`}
                >
                  {rememberMe && <Check size={14} className="text-white" strokeWidth={4} />}
                </div>
              </div>
              <span className={`text-sm font-bold transition-colors ${rememberMe ? 'text-gray-800' : 'text-gray-400'}`}>이메일 저장</span>
            </label>

            <button
              type="button"
              onClick={() => navigate('/change-password', { state: { from: 'login' } })}
              className="text-xs font-bold text-gray-300 hover:text-blue-500 transition-colors"
            >
              비밀번호 재설정
            </button>
          </div>

          <div className="pt-8 space-y-3">
            {/* 로그인 버튼 */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-[60px] bg-blue-600 text-white rounded-[20px] font-black text-[17px] shadow-lg flex items-center justify-center"
            >
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : '로그인'}
            </button>

            {/* 구글 로그인 버튼 */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full h-[60px] bg-white text-gray-700 rounded-[20px] font-bold text-[15px] border-2 border-gray-100 flex items-center justify-center gap-3"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <img src="https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png" alt="google" className="w-5 h-5" />
                  구글로 계속하기
                </>
              )}
            </button>

            {/* 회원가입 이동 버튼 */}
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
