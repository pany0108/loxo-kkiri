import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { getRedirectResult, signInWithPopup, signInWithRedirect, UserCredential } from 'firebase/auth';
import { Lock, User } from 'lucide-react';
import toast from 'react-hot-toast';

import { auth, googleProvider } from '../../firebase';
import { FormCheckbox, FormInput, LoadingButton, LogoImage } from 'components';
import { signInWithEmail, signInWithGoogle } from 'services/authService';

/**
 * 로그인 페이지 컴포넌트입니다.
 * 이메일/비밀번호 로그인 및 Google 소셜 로그인을 처리합니다.
 * 로그인 성공 시 기존 유저 여부를 확인하여 캘린더 또는 회원가입 페이지로 이동시킵니다.
 * @returns {JSX.Element} 로그인 화면
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
    // Native는 자동 초기화되지만, Web 환경에서는 명시적 초기화가 필수입니다.
    // 플랫폼 구분 없이 호출하여 Web 지원을 추가하고, Native에서의 중복 호출은 플러그인이 처리합니다.
    if (Capacitor.isNativePlatform()) {
      GoogleAuth.initialize({
        clientId: '831596904912-r3icrrjova3r2ur4210bggg0q68n7fgj.apps.googleusercontent.com', // 아까 복사한 웹 클라이언트 ID
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      }).catch((error) => {
        console.error('GoogleAuth initialization failed:', error);
      });
    }
  }, []);

  /**
   * 컴포넌트 마운트 시 인증 상태 및 리다이렉트 결과를 확인합니다.
   */
  useEffect(() => {
    // 1. 소셜 로그인 리다이렉트 결과 처리 (모바일 환경 대응)
    getRedirectResult(auth)
      .then(async (result: UserCredential | null) => {
        if (result?.user) {
          sessionStorage.setItem('isAuthChecking', 'true'); // 리다이렉트 후 캘린더 플래시 방지
          // App.tsx에서 인증 상태 변경을 감지하여 라우팅을 처리하므로
          // 여기서는 별도의 로직이 필요 없습니다.
        } else {
          setIsPageLoading(false);
        }
      })
      .catch((error: any) => {
        toast.error(`로그인 정보를 가져오는 중 오류가 발생했습니다. (${error.code || error.message})`);
        setIsPageLoading(false);
      });
  }, []);

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
    sessionStorage.setItem('isAuthChecking', 'true');

    try {
      // 플랫폼에 따라 로그인 방식 분기
      if (Capacitor.isNativePlatform()) {
        // 1. 앱(Native) 환경: 기존에 만드신 서비스 함수 사용 (Plugin 사용)
        await signInWithGoogle();
      } else {
        // 2. 웹(Web) 환경: Firebase 표준 팝업 로그인 사용
        await signInWithPopup(auth, googleProvider);
      }

      // 성공 시 로직 (App.tsx에서 감지하므로 비워둠)
    } catch (error: any) {
      console.error('Google Login Error:', error);
      sessionStorage.removeItem('isAuthChecking'); // 에러 발생 시 플래그 제거

      // 팝업 닫힘이나 취소는 에러로 처리하지 않음
      if (error.message === 'User cancelled login') {
        toast('구글 로그인을 취소했습니다.', { icon: '👋' });
        return;
      }

      // Firebase Auth 에러 코드 처리
      let errorMessage = '로그인에 실패했습니다. 다시 시도해주세요.';
      const errorCode = error.code ? String(error.code) : null;
      if (errorCode) {
        switch (errorCode) {
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
            // 리다이렉트 시에도 계정 선택 프롬프트 유지
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
            errorMessage = `로그인 중 오류가 발생했습니다. (${errorCode})`;
            break;
        }
      }
      toast.error(errorMessage);
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-[calc(4rem+env(safe-area-inset-bottom))] bg-white dark:bg-gray-950 font-['Pretendard']">
      <div className="flex flex-1 flex-col justify-center px-page max-w-md mx-auto w-full">
        {/* 상단 브랜딩 영역 */}
        <div className="mb-10 text-left">
          <LogoImage className="mb-8" />
          <h2 className="text-h1">
            아무도 모르게, <br />
            <span className="text-primary">우리 끼리</span>
          </h2>
          <p className="mt-3 text-body text-sub font-medium">
            우리만의 비밀스러운 약속 아지트,
            <br />
            끼리에 오신 것을 환영합니다.
          </p>
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="space-y-3">
            {/* 이메일 입력 */}
            <FormInput
              icon={<User size={20} />}
              type="email"
              placeholder="이메일 주소"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onClear={() => setEmail('')}
              required
            />

            {/* 비밀번호 입력 */}
            <FormInput
              icon={<Lock size={20} />}
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {/* 이메일 저장 및 비밀번호 재설정 링크 */}
          <div className="flex justify-between items-center px-1 pt-1">
            <FormCheckbox label="이메일 저장" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />

            <button
              type="button"
              onClick={() => navigate('/change-password', { state: { from: 'login' } })}
              className="text-xs font-bold text-sub dark:text-gray-600 hover:text-primary transition-colors"
            >
              비밀번호 재설정
            </button>
          </div>

          <div className="pt-8 space-y-3">
            {/* 로그인 버튼 */}
            <LoadingButton type="submit" isLoading={isEmailLoading} disabled={isEmailLoading || isGoogleLoading || isPageLoading} className="btn-primary h-[60px] rounded-xl">
              로그인
            </LoadingButton>

            {/* 구글 로그인 버튼 */}
            <LoadingButton
              type="button"
              onClick={handleGoogleLogin}
              isLoading={isGoogleLoading}
              disabled={isEmailLoading || isGoogleLoading || isPageLoading}
              className="w-full h-[60px] bg-white dark:bg-gray-800 text-main dark:text-gray-200 rounded-xl font-bold text-[15px] border-2 border-gray-100 dark:border-gray-700 flex items-center justify-center gap-3"
            >
              <img src="https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png" alt="google" className="w-5 h-5" />
              구글로 계속하기
            </LoadingButton>

            {/* 회원가입 이동 버튼 */}
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="w-full h-[50px] bg-transparent text-sub dark:text-gray-500 font-bold text-[14px] hover:text-main dark:hover:text-gray-300 transition-all"
            >
              회원가입 하기
            </button>
          </div>
        </form>
      </div>

      <footer className="text-center">
        <p className="text-[11px] font-bold text-gray-200 dark:text-gray-700 tracking-[0.2em] uppercase">Powered by Kkiri</p>
      </footer>
    </div>
  );
};

export default Login;
