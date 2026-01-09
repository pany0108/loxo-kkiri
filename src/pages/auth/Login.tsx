import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Sparkles, Loader2, Check, CalendarDays } from 'lucide-react';
import { signInWithRedirect, User as FirebaseUser, getRedirectResult, UserCredential } from 'firebase/auth';
import { auth, googleProvider } from '../../firebase';
import toast from 'react-hot-toast';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { signInWithEmail, signInWithGoogle, checkUserRegistration } from 'services/authService';

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
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);

  // 앱 실행 시 GoogleAuth 초기화 (한 번만 실행)
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      GoogleAuth.initialize();
    }
  }, []);

  /**
   * 컴포넌트 마운트 시 인증 상태 및 리다이렉트 결과를 확인합니다.
   */
  useEffect(() => {
    const handleRedirectResult = async (user: FirebaseUser) => {
      const registrationStatus = await checkUserRegistration(user);
      if (registrationStatus.isNewUser) {
        localStorage.setItem('pendingSignup', JSON.stringify(registrationStatus.state));
        navigate('/signup-social', {
          replace: true,
          state: registrationStatus.state,
        });
      }
      // 기존 유저는 onAuthStateChanged가 /calendar로 리디렉션합니다.
    };

    // 1. 소셜 로그인 리다이렉트 결과 처리 (모바일 환경 대응)
    getRedirectResult(auth)
      .then(async (result: UserCredential | null) => {
        if (result?.user) {
          sessionStorage.setItem('isAuthChecking', 'true'); // [추가] 리다이렉트 후 캘린더 플래시 방지
          try {
            await handleRedirectResult(result.user);
          } catch (e) {
            console.error('Redirect registration check failed', e);
            toast.error('사용자 정보를 확인하는 중 오류가 발생했습니다.');
            setIsPageLoading(false);
          }
        } else {
          setIsPageLoading(false);
        }
      })
      .catch((error: any) => {
        toast.error(`로그인 정보를 가져오는 중 오류가 발생했습니다. (${error.code || error.message})`);
        setIsPageLoading(false);
      });
  }, [navigate]);

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
    setIsEmailLoading(true);
    try {
      await signInWithEmail({ email, password });
      if (rememberMe) localStorage.setItem('savedEmail', email);
      else localStorage.removeItem('savedEmail');
      // onAuthStateChanged에서 라우팅 처리하므로 별도 navigate 불필요
    } catch (error: any) {
      toast.error('이메일 또는 비밀번호를 다시 확인해주세요.');
    } finally {
      setIsEmailLoading(false);
    }
  };

  /**
   * Google 소셜 로그인 핸들러
   * 1. 팝업 방식을 우선 시도합니다.
   * 2. 팝업 차단 등으로 실패 시 리다이렉트 방식으로 자동 전환합니다.
   */
  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    sessionStorage.setItem('isAuthChecking', 'true'); // [추가] 캘린더 플래시 방지를 위한 플래그 설정

    try {
      const user = await signInWithGoogle();
      const registrationStatus = await checkUserRegistration(user);

      if (registrationStatus.isNewUser) {
        localStorage.setItem('pendingSignup', JSON.stringify(registrationStatus.state));
        navigate('/signup-social', {
          replace: true,
          state: registrationStatus.state,
        });
      }
      // 기존 유저는 onAuthStateChanged가 /calendar로 리디렉션합니다.
    } catch (error: any) {
      console.error('Google Login Error:', error);
      sessionStorage.removeItem('isAuthChecking'); // [추가] 에러 발생 시 플래그 제거

      // 팝업 닫힘이나 취소는 에러로 처리하지 않음
      if (error.message === 'User cancelled login') {
        toast('구글 로그인을 취소했습니다.', { icon: '👋' });
        return;
      }

      // Firebase Auth 에러 코드 처리
      let errorMessage = '로그인에 실패했습니다. 다시 시도해주세요.';
      if (error.code) {
        switch (error.code) {
          case 'auth/network-request-failed':
            errorMessage = '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.';
            break;
          case 'auth/invalid-credential':
          case 'auth/user-disabled':
            errorMessage = '유효하지 않은 계정 정보입니다. 관리자에게 문의해주세요.';
            break;
          case 'auth/account-exists-with-different-credential':
            errorMessage = '다른 방식으로 이미 가입된 계정입니다. 해당 방식으로 로그인해주세요.';
            break;
          case 'auth/popup-blocked': // 웹 환경에서 팝업 차단 시
            toast('팝업이 차단되어 리다이렉트 방식으로 로그인을 시도합니다.', { icon: 'ℹ️' });
            // [추가] 리다이렉트 시에도 계정 선택 프롬프트 유지
            googleProvider.setCustomParameters({ prompt: 'select_account' });
            await signInWithRedirect(auth, googleProvider);
            return;
          case 'auth/operation-not-allowed':
            errorMessage = '구글 로그인이 활성화되어 있지 않습니다. 관리자에게 문의해주세요.';
            break;
          case '12501': // Common Google Sign-In error code for configuration issues on Android
            errorMessage = '구글 로그인 설정에 문제가 있습니다. 앱 개발자에게 문의해주세요. (에러 코드: 12501)';
            break;
          case '10': // Google Sign-In error code for DEVELOPER_ERROR
            errorMessage = '앱 설정에 오류가 있습니다. SHA-1 지문 또는 패키지 이름이 올바르게 등록되었는지 확인해주세요. (에러 코드: 10)';
            break;
          default:
            errorMessage = `로그인 중 오류가 발생했습니다. (${error.code})`;
            break;
        }
      }
      toast.error(errorMessage);
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-[calc(4rem+env(safe-area-inset-bottom))] bg-white dark:bg-gray-950 font-['Pretendard']">
      <div className="flex flex-1 flex-col justify-center px-6 max-w-md mx-auto w-full">
        {/* 상단 브랜딩 영역 */}
        <div className="mb-10 text-left">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-8 shadow-xl shadow-blue-100 dark:shadow-blue-900/50 ring-4 ring-blue-50 dark:ring-blue-500/10">
            <CalendarDays className="text-white w-7 h-7 fill-white/20" />
          </div>
          <h2 className="text-[30px] font-black text-gray-900 dark:text-white leading-[1.2] tracking-tight">
            일정 관리의 <br />
            <span className="text-blue-600">새로운 기준</span>
          </h2>
          <p className="mt-3 text-gray-400 font-medium text-[15px]">슈퍼 스케줄러와 함께 스마트하게 약속하세요.</p>
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="space-y-3">
            {/* 이메일 입력 */}
            <div className="group relative">
              <div className="flex items-center h-[60px] bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-gray-800 rounded-[18px] px-5 transition-all duration-300">
                <User size={20} className="text-gray-300 mr-4 transition-colors group-focus-within:text-blue-600" />
                <input
                  type="email"
                  placeholder="이메일 주소"
                  className="bg-transparent border-none outline-none w-full h-full text-[16px] font-bold text-gray-800 dark:text-white placeholder:text-gray-300"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* 비밀번호 입력 */}
            <div className="group relative">
              <div className="flex items-center h-[60px] bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-gray-800 rounded-[18px] px-5 transition-all duration-300">
                <Lock size={20} className="text-gray-300 mr-4 transition-colors group-focus-within:text-blue-600" />
                <input
                  type="password"
                  placeholder="비밀번호"
                  className="bg-transparent border-none outline-none w-full h-full text-[16px] font-bold text-gray-800 dark:text-white placeholder:text-gray-300"
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
                  className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${
                    rememberMe ? 'bg-blue-600 border-blue-600' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 group-hover:border-blue-400'
                  }`}
                >
                  {rememberMe && <Check size={14} className="text-white" strokeWidth={4} />}
                </div>
              </div>
              <span className={`text-sm font-bold transition-colors ${rememberMe ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400'}`}>이메일 저장</span>
            </label>

            <button
              type="button"
              onClick={() => navigate('/change-password', { state: { from: 'login' } })}
              className="text-xs font-bold text-gray-300 dark:text-gray-600 hover:text-blue-500 transition-colors"
            >
              비밀번호 재설정
            </button>
          </div>

          <div className="pt-8 space-y-3">
            {/* 로그인 버튼 */}
            <button
              type="submit"
              disabled={isEmailLoading || isGoogleLoading || isPageLoading}
              className="w-full h-[60px] bg-blue-600 text-white rounded-[20px] font-black text-[17px] shadow-lg flex items-center justify-center"
            >
              {isEmailLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : '로그인'}
            </button>

            {/* 구글 로그인 버튼 */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isEmailLoading || isGoogleLoading || isPageLoading}
              className="w-full h-[60px] bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-[20px] font-bold text-[15px] border-2 border-gray-100 dark:border-gray-700 flex items-center justify-center gap-3"
            >
              {isGoogleLoading ? (
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
              className="w-full h-[50px] bg-transparent text-gray-400 dark:text-gray-500 font-bold text-[14px] hover:text-gray-600 dark:hover:text-gray-300 transition-all"
            >
              회원가입 하기
            </button>
          </div>
        </form>
      </div>

      <footer className="text-center">
        <p className="text-[11px] font-bold text-gray-200 dark:text-gray-700 tracking-[0.2em] uppercase">Powered by Super Scheduler</p>
      </footer>
    </div>
  );
};

export default Login;
