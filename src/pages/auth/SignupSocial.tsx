import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { doc, setDoc, collection, addDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import toast from 'react-hot-toast';
import { signOut } from 'firebase/auth';
import dayjs from 'dayjs';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Smartphone, Calendar, Sparkles, CheckCircle2, Loader2 } from 'lucide-react';
import { TopNav } from 'components';

/**
 * 소셜 로그인(구글 등) 직후 추가 정보를 입력받는 페이지 컴포넌트입니다.
 * - 소셜 계정에서 제공하지 않는 필수 정보(생년월일, 전화번호)를 수집합니다.
 * - 모바일 환경에서의 리다이렉트 데이터 유실을 방지하기 위해 LocalStorage를 활용합니다.
 * * @returns {JSX.Element} 추가 정보 입력 화면
 */
const SignupSocial = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // --- Refs (포커스 이동용) ---
  const birthDateRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const authCodeRef = useRef<HTMLInputElement>(null); // [추가] 인증번호 입력 필드 Ref
  // --- 상태 관리 ---

  /**
   * 사용자 데이터 초기화
   * location.state(직접 이동) 또는 LocalStorage(리다이렉트 복귀)에서 데이터를 복구합니다.
   */
  const [userData] = useState(() => {
    if (location.state?.uid) {
      // 전달받은 데이터가 있으면 로컬 스토리지에 백업 후 사용
      localStorage.setItem('pendingSignup', JSON.stringify(location.state));
      return location.state;
    }
    const saved = localStorage.getItem('pendingSignup');
    return saved ? JSON.parse(saved) : null;
  });

  const [formData, setFormData] = useState({ phone: '', birthDate: '', authCode: '' });
  const [isAuthSent, setIsAuthSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLeapMonth, setIsLeapMonth] = useState(false); // [추가] 윤달 여부 상태
  const [isLunar, setIsLunar] = useState(false); // [추가] 양력/음력 상태

  // userData 구조 분해 할당 (없을 경우를 대비해 빈 객체 기본값 처리)
  const { uid, email, lastName, firstName } = userData || {};

  // [추가] 양력/음력 상태에 따른 윤달 상태 동기화
  // 양력일 경우, 윤달은 존재하지 않으므로 isLeapMonth 상태를 false로 강제합니다.
  useEffect(() => {
    if (!isLunar) {
      setIsLeapMonth(false);
    }
  }, [isLunar]);

  // [추가] 소셜 로그인 플래시 방지 플래그 제거
  useEffect(() => {
    if (sessionStorage.getItem('isAuthChecking')) {
      sessionStorage.removeItem('isAuthChecking');
    }
  }, []);

  // [추가] 인증번호 발송 후 입력 필드에 자동으로 포커스
  useEffect(() => {
    if (isAuthSent && !isVerified) {
      // isAuthSent가 true로 바뀌고 컴포넌트가 리렌더링된 후 포커스를 줍니다.
      setTimeout(() => {
        authCodeRef.current?.focus();
      }, 100); // 애니메이션 시간을 고려하여 약간의 딜레이를 줍니다.
    }
  }, [isAuthSent, isVerified]);

  // [추가] 뒤로가기 핸들러
  const handleBack = useCallback(async () => {
    // 소셜 로그인 진행 중 뒤로가기 시, 임시 데이터를 삭제하고
    // 로그인 화면으로 돌아가 다른 로그인 방법을 선택할 수 있도록 합니다.
    // 이렇게 하면 사용자가 다른 로그인 방법을 선택하거나 앱을 종료할 수 있습니다.
    try {
      localStorage.removeItem('pendingSignup');
      await signOut(auth);
      // [수정] history 스택에 남기지 않고 페이지를 교체하여 이동합니다.
      window.location.replace('/');
    } catch (error) {
      console.error('Sign out error on social signup back:', error);
      toast.error('로그아웃 중 오류가 발생했습니다.');
    }
  }, []);

  // [추가] 안드로이드 뒤로가기 버튼 처리
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    // addListener는 Promise를 반환하므로, 비동기적으로 처리해야 합니다.
    const listenerPromise = CapacitorApp.addListener('backButton', () => {
      handleBack();
    });

    return () => {
      // 컴포넌트가 언마운트될 때 리스너를 제거합니다.
      listenerPromise.then((listener: PluginListenerHandle) => listener.remove());
    };
  }, [handleBack]);

  /**
   * 데이터 유실 방지 Effect
   * 필수 데이터(uid)가 없으면 로그인 페이지로 리다이렉트합니다.
   * [수정] 또한, 이미 프로필이 완성된 유저가 이 페이지에 접근하면 캘린더로 리다이렉트합니다.
   */
  useEffect(() => {
    const checkUserStatus = async () => {
      if (uid) {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          // 이미 프로필이 완성된 유저이므로 캘린더로 보냅니다.
          navigate('/calendar', { replace: true });
        }
      } else {
        // 인증 정보가 없으므로 로그인 페이지로 보냅니다.
        const timer = setTimeout(() => {
          toast.error('인증 정보가 만료되었습니다. 다시 로그인해주세요.');
          navigate('/login', { replace: true });
        }, 500);
        return () => clearTimeout(timer);
      }
    };

    checkUserStatus();

    // [추가] 사용자가 가입을 완료하지 않고 페이지를 이탈하는 경우(뒤로가기 등)
    // 임시 데이터를 정리합니다.
    return () => {
      // handleComplete에서도 호출되지만, 브라우저 뒤로가기 등 예외 케이스를 처리합니다.
      localStorage.removeItem('pendingSignup');
    };
  }, [uid, navigate]);

  // 필수 데이터가 로딩되지 않았을 때 로딩 화면 표시
  if (!uid) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-white dark:bg-gray-950">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  // --- 헬퍼 함수 ---

  /**
   * 휴대폰 번호 포맷팅 (010-0000-0000)
   */
  const formatPhone = (value: string) => {
    const nums = value.replace(/[^\d]/g, '');
    if (nums.length <= 3) return nums;
    if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
    return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7, 11)}`;
  };

  /**
   * 생년월일 포맷팅 (YYYY/MM/DD)
   */
  const formatBirth = (value: string) => {
    const nums = value.replace(/[^\d]/g, '');
    if (nums.length <= 4) return nums;
    if (nums.length <= 6) return `${nums.slice(0, 4)}/${nums.slice(4)}`;
    return `${nums.slice(0, 4)}/${nums.slice(4, 6)}/${nums.slice(6, 8)}`;
  };

  /**
   * 입력 필드 변경 핸들러
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'phone') formattedValue = formatPhone(value);
    if (name === 'birthDate') formattedValue = formatBirth(value);

    setFormData((prev) => ({ ...prev, [name]: formattedValue }));
  };

  /**
   * 키보드 이벤트 핸들러
   * - 비밀번호 필드에서 한글 입력 방지 (IME 조합 차단)
   * - Enter 키 입력 시 다음 필드로 포커스 이동
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, nextRef: React.RefObject<HTMLInputElement | null>, isPasswordField: boolean = false) => {
    if (isPasswordField) {
      if (e.nativeEvent.isComposing || e.key === 'Process') {
        e.preventDefault();
        return;
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextRef && nextRef.current) {
        nextRef.current.focus();
      }
    }
  };

  /**
   * 휴대폰 인증번호 발송 시뮬레이션
   */
  const handleSendAuth = () => {
    if (!formData.phone || formData.phone.length < 13) {
      toast.error('올바른 휴대폰 번호를 입력해주세요.');
      return;
    }
    setIsAuthSent(true);
    toast.success('인증번호가 발송되었습니다.');
  };

  /**
   * 인증번호 확인 시뮬레이션 (고정값: 1234)
   */
  const handleVerify = () => {
    if (formData.authCode === '1234') {
      setIsVerified(true);
    } else {
      toast.error('인증번호가 일치하지 않습니다.');
    }
  };

  /**
   * 최종 가입 완료 핸들러
   * Firestore에 사용자 정보를 저장하고 메인 캘린더로 이동합니다.
   */
  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isVerified) {
      toast.error('본인인증을 완료해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      await setDoc(doc(db, 'users', uid), {
        uid,
        email,
        name: `${lastName}${firstName}`,
        lastName,
        firstName,
        phone: formData.phone,
        birthDate: formData.birthDate,
        isLeapMonth: isLunar && isLeapMonth, // [추가]
        birthDateType: isLunar ? 'lunar' : 'solar', // [추가]
        createdAt: new Date().toISOString(),
      });

      // [수정] 소셜 로그인 시 기본 캘린더 자동 생성
      const calendarDocRef = await addDoc(collection(db, 'calendars'), {
        name: '내 캘린더',
        ownerId: uid,
        members: [uid],
        isDefault: true,
        color: '#3b82f6', // 기본 파란색
        createdAt: new Date().toISOString(),
      });

      // [추가] 생일 캘린더 자동 생성
      if (formData.birthDate) {
        const birthDate = dayjs(formData.birthDate, 'YYYY/MM/DD').format('YYYY-MM-DD');
        await addDoc(collection(db, 'schedules'), {
          title: '내 생일', // [수정]
          calendarId: calendarDocRef.id,
          isAllDay: true,
          start: birthDate,
          isLeapMonth: isLunar && isLeapMonth, // [추가]
          isLunar: isLunar, // [추가]
          color: '#ec4899', // Pink
          attendees: [uid],
          userId: uid,
          recurrence: {
            frequency: 'yearly',
            interval: 1,
          },
          createdAt: new Date().toISOString(),
        });
      }

      // 가입 완료 후 임시 데이터 삭제 (보안 및 정합성 유지)
      localStorage.removeItem('pendingSignup');

      toast.success('회원가입이 완료되었습니다! ✨');
      navigate('/calendar', { replace: true });
    } catch (error) {
      toast.error('저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-dvh bg-white dark:bg-gray-950 font-['Pretendard']">
      <TopNav title="추가 정보 입력" onBack={handleBack} />

      <div className="flex-1 flex flex-col justify-center px-8 pt-[calc(60px+env(safe-area-inset-top))] pb-8 w-full max-w-md mx-auto">
        <div className="mb-12 text-left">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 rounded-xl mb-6">
            <Sparkles className="text-blue-600 w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 leading-[1.3]">
            반가워요,
            <span className="text-blue-600">
              {lastName}
              {firstName}님!
            </span>
            <br />딱 두 가지만 더 알려주세요.
          </h2>
        </div>

        <form onSubmit={handleComplete} className="space-y-8">
          <div className="space-y-8">
            {/* 생년월일 입력 */}
            <div className="group">
              {/* [추가] 양력/음력 선택 토글 */}
              <div className="flex items-center justify-between mb-2 px-1 h-6">
                <label className="text-[13px] font-black text-gray-400">생년월일</label>
                <div className="flex items-center gap-2">
                  {isLunar && (
                    <label className="flex items-center gap-1.5 cursor-pointer animate-in fade-in">
                      <input
                        type="checkbox"
                        checked={isLeapMonth}
                        onChange={(e) => setIsLeapMonth(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-[11px] font-bold text-gray-500">윤달</span>
                    </label>
                  )}
                  <div className="flex bg-gray-100 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => setIsLunar(false)}
                      className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${!isLunar ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
                    >
                      양력
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsLunar(true)}
                      className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${isLunar ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
                    >
                      음력
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center h-[60px] bg-gray-50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white rounded-[20px] px-5 transition-all">
                <Calendar size={20} className="text-gray-300 mr-4 group-focus-within:text-blue-600" />
                <input
                  ref={birthDateRef}
                  name="birthDate"
                  enterKeyHint="next"
                  type="tel"
                  inputMode="numeric"
                  value={formData.birthDate}
                  placeholder="YYYY/MM/DD"
                  className="bg-transparent border-none outline-none w-full h-full text-[15px] font-bold text-gray-800"
                  onChange={handleChange}
                  onKeyDown={(e) => handleKeyDown(e, phoneRef)}
                  required
                  maxLength={10}
                />
              </div>
            </div>

            {/* 휴대폰 인증 */}
            <div className="space-y-3">
              <label className="block text-[13px] font-black text-gray-400 ml-1">휴대폰 인증</label>
              <div className="flex gap-2">
                <div
                  className={`flex-[2.5] flex items-center h-[60px] bg-gray-50 border-2 border-transparent rounded-[20px] px-5 transition-all ${
                    isVerified ? 'bg-blue-50 border-blue-100' : 'focus-within:border-blue-500 focus-within:bg-white'
                  }`}
                >
                  <Smartphone size={20} className={isVerified ? 'text-blue-500 mr-4' : 'text-gray-300 mr-4'} />
                  <input
                    ref={phoneRef}
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    value={formData.phone}
                    placeholder="010-0000-0000"
                    className="bg-transparent border-none outline-none w-full h-full text-[15px] font-bold text-gray-800"
                    onChange={handleChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault(); // 폼 전체 제출 방지
                        if (isVerified) return; // 이미 인증되었으면 실행 안함
                        handleSendAuth();
                      }
                    }}
                    required
                    readOnly={isVerified}
                  />
                  {isVerified && <CheckCircle2 size={20} className="text-blue-500 ml-2" />}
                </div>
                <button
                  type="button"
                  onClick={handleSendAuth}
                  disabled={isVerified}
                  className="flex-1 h-[60px] bg-gray-900 text-white rounded-[20px] text-[13px] font-black disabled:opacity-50"
                >
                  {isAuthSent ? '재발송' : '인증요청'}
                </button>
              </div>

              {/* 인증번호 입력 (발송 후 노출) */}
              {isAuthSent && !isVerified && (
                <div className="flex gap-2 animate-in fade-in slide-in-from-top-1">
                  <div className="flex-[2.5] flex items-center h-[60px] bg-gray-50 border-2 border-blue-500 rounded-[20px] px-5 focus-within:bg-white">
                    <input
                      ref={authCodeRef}
                      name="authCode"
                      type="tel"
                      inputMode="numeric"
                      value={formData.authCode}
                      placeholder="인증번호 4자리"
                      className="bg-transparent border-none outline-none w-full h-full text-[15px] font-bold text-gray-800 placeholder:text-gray-300"
                      onChange={(e) => setFormData({ ...formData, authCode: e.target.value })}
                      maxLength={4}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleVerify();
                        }
                      }}
                    />
                  </div>
                  <button type="button" onClick={handleVerify} className="flex-1 h-[60px] bg-blue-600 text-white rounded-[20px] text-[15px] font-black">
                    확인
                  </button>
                </div>
              )}
            </div>
          </div>
          {/* [수정] 버튼을 form 내부로 이동 */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading || !isVerified}
              className={`w-full h-[62px] rounded-[24px] font-black text-[17px] shadow-lg transition-all flex items-center justify-center gap-2
              ${isVerified ? 'bg-blue-600 text-white shadow-blue-100 active:scale-[0.98]' : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'}`}
            >
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : '슈퍼 스케줄러 시작하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignupSocial;
