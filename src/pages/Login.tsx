import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Sparkles, Loader2, Check } from 'lucide-react';
import { signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, getRedirectResult, browserSessionPersistence, setPersistence } from 'firebase/auth';
import { auth, db, googleProvider } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Login.tsx 내부의 함수 수정
  const handleUserRegistration = useCallback(
    async (user: any) => {
      try {
        console.log('1. Firestore 확인 시작 - UID:', user.uid);
        setIsLoading(true);

        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          console.log('2. 기존 유저 확인됨 -> 캘린더 이동');
          navigate('/calendar', { replace: true });
        } else {
          console.log('2. 신규 유저 확인됨 -> 가입 페이지 준비');

          // 데이터 준비
          const signupData = {
            uid: user.uid,
            email: user.email || '',
            lastName: user.displayName?.charAt(0) || '',
            firstName: user.displayName?.slice(1) || '',
          };

          // [중요] 모바일 유실 대비 LocalStorage에 즉시 저장
          localStorage.setItem('pendingSignup', JSON.stringify(signupData));

          console.log('3. 가입 페이지로 이동 시도');
          // replace: true를 사용해 로그인 페이지 기록을 지웁니다.
          navigate('/signup-social', {
            replace: true,
            state: signupData,
          });
        }
      } catch (error: any) {
        console.error('Firestore 조회 중 치명적 에러:', error);
        // 권한 문제(Rules)인지, 네트워크 문제인지 팝업으로 확인
        alert(`가입 확인 중 에러 발생: ${error.code}\n${error.message}`);
        setIsLoading(false);
      }
    },
    [navigate],
  );

  // 1. [해결] 리다이렉트 처리 로직의 우선순위 최적화
  useEffect(() => {
    setIsLoading(true); // 컴포넌트 마운트 즉시 로딩 시작

    // 1. 리다이렉트 결과 확인
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log('리다이렉트 결과 처리 중...');
          handleUserRegistration(result.user);
        } else {
          // 결과가 없으면 현재 로그인 상태인지 한 번 더 확인
          if (auth.currentUser) {
            handleUserRegistration(auth.currentUser);
          } else {
            setIsLoading(false); // 둘 다 아니면 로딩 해제
          }
        }
      })
      .catch((error) => {
        console.error('인증 에러:', error);
        setIsLoading(false);
      });

    // 2. [추가] 실시간 인증 감시 (가장 확실한 방법)
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        console.log('실시간 세션 감지됨');
        handleUserRegistration(user);
      }
    });

    return () => unsubscribe();
  }, [handleUserRegistration]);

  // 아이디 저장 로직
  useEffect(() => {
    const savedEmail = localStorage.getItem('savedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // 이메일 로그인 핸들러
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      if (rememberMe) localStorage.setItem('savedEmail', email);
      else localStorage.removeItem('savedEmail');
      navigate('/calendar');
    } catch (error: any) {
      alert('로그인 정보를 다시 확인해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 2. 구글 소셜 로그인 핸들러 (개선형)
   */
  const handleGoogleLogin = async () => {
    setIsLoading(true);

    try {
      // [해결책] 모바일에서도 Popup 방식을 시도합니다.
      // 팝업은 사용자 클릭 이벤트(onClick) 직후에 바로 실행되어야 차단되지 않습니다.
      const result = await signInWithPopup(auth, googleProvider);

      if (result.user) {
        console.log('팝업 로그인 성공:', result.user.uid);
        await handleUserRegistration(result.user);
      }
    } catch (error: any) {
      console.error('구글 로그인 에러:', error);

      // 만약 팝업이 차단되었다면 리다이렉트로 대체 (마지막 시도)
      if (error.code === 'auth/popup-blocked') {
        alert('팝업이 차단되어 리다이렉트 방식으로 시도합니다.');
        await signInWithRedirect(auth, googleProvider);
      } else {
        alert('로그인 중 오류가 발생했습니다: ' + error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="flex flex-col min-h-screen bg-white font-['Pretendard']">
      <div className="flex-1 px-6 pt-28 pb-12 overflow-y-auto max-w-md mx-auto w-full">
        {/* 상단 브랜딩 */}
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

          {/* [추가] 이메일 저장 체크박스 및 비밀번호 재설정 */}
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

            <button type="button" onClick={() => navigate('/change-password')} className="text-xs font-bold text-gray-300 hover:text-blue-500 transition-colors">
              비밀번호 재설정
            </button>
          </div>

          <div className="pt-8 space-y-3">
            {/* 이메일 로그인 버튼 */}
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
              disabled={isLoading} // 로딩 중 클릭 방지
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
