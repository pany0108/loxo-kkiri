import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Sparkles, Loader2, Check } from 'lucide-react';
import { signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth, db, googleProvider } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

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

  /**
   * 인증된 사용자의 Firestore 등록 여부를 확인하고 페이지를 라우팅합니다.
   * - 기존 유저: 메인 캘린더(/calendar)로 이동
   * - 신규 유저: 추가 정보 입력 페이지(/signup-social)로 이동
   * * @param {any} user - Firebase Auth User 객체
   */
  const handleUserRegistration = useCallback(
    async (user: any) => {
      try {
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
        toast.error('사용자 정보를 확인하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        // 에러를 다시 던져서 호출한 쪽에서 로딩 상태를 처리하도록 합니다.
        throw error;
      }
    },
    [navigate],
  );

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
    // 1. 소셜 로그인 리다이렉트 결과 처리 (모바일 환경 대응)
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          sessionStorage.setItem('isAuthChecking', 'true'); // [추가] 리다이렉트 후 캘린더 플래시 방지
          try {
            await handleUserRegistration(result.user);
          } catch (e) {
            setIsPageLoading(false); // handleUserRegistration에서 에러 발생 시 로딩 종료
          }
        } else {
          setIsPageLoading(false);
        }
      })
      .catch((error) => {
        toast.error(`로그인 정보를 가져오는 중 오류가 발생했습니다. (${error.code || error.message})`);
        setIsPageLoading(false);
      });
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
    setIsEmailLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);

      if (rememberMe) localStorage.setItem('savedEmail', email);
      else localStorage.removeItem('savedEmail');

      // onAuthStateChanged에서 라우팅 처리하므로 별도 navigate 불필요
    } catch (error: any) {
      toast.error('이메일 또는 비밀번호를 다시 확인해주세요.');
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
      // 1. 네이티브 앱(Android/iOS)인 경우
      if (Capacitor.isNativePlatform()) {
        // [추가] 다른 계정으로 로그인할 수 있도록, 네이티브 GoogleAuth에서 먼저 로그아웃을 시도합니다.
        // 이렇게 하면 항상 계정 선택 화면이 나타납니다.
        try {
          await GoogleAuth.signOut();
        } catch (e) {
          // 로그아웃 실패는 무시하고 로그인 절차를 계속 진행합니다 (예: 아직 아무도 로그인하지 않은 경우).
          console.info('GoogleAuth signOut failed, this is expected if not signed in.');
        }
        // 네이티브 구글 로그인 팝업 실행
        const googleUser = await GoogleAuth.signIn();

        // 받아온 ID 토큰으로 Firebase 자격 증명 생성
        const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);

        // Firebase 로그인 처리
        const result = await signInWithCredential(auth, credential);

        if (result.user) {
          await handleUserRegistration(result.user);
        }
      }
      // 2. 웹 브라우저 환경인 경우
      else {
        // [추가] 항상 계정을 선택할 수 있도록 prompt 옵션 추가
        googleProvider.setCustomParameters({ prompt: 'select_account' });
        const result = await signInWithPopup(auth, googleProvider);
        if (result.user) {
          await handleUserRegistration(result.user);
        }
      }
    } catch (error: any) {
      console.error('Google Login Error:', error);
      setIsGoogleLoading(false);
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
    }
  };

  return (
    <div className="flex flex-col min-h-dvh bg-white dark:bg-gray-950 font-['Pretendard']">
      <div className="flex flex-1 flex-col justify-center px-6 max-w-md mx-auto w-full">
        {/* 상단 브랜딩 영역 */}
        <div className="mb-10 text-left">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-8 shadow-xl shadow-blue-100 dark:shadow-blue-900/50 ring-4 ring-blue-50 dark:ring-blue-500/10">
            <Sparkles className="text-white w-7 h-7 fill-white/20" />
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

      <footer className="pb-10 text-center">
        <p className="text-[11px] font-bold text-gray-200 dark:text-gray-700 tracking-[0.2em] uppercase">Powered by Super Scheduler</p>
      </footer>
    </div>
  );
};

export default Login;
