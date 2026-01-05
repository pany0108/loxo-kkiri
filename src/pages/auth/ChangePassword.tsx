import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Lock, Eye, EyeOff, ShieldCheck, CheckCircle2, AlertCircle, Loader2, Mail } from 'lucide-react';
import { auth, db } from '../../firebase';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, sendPasswordResetEmail } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { TopNav } from 'components';

const validatePasswordLocally = (password: string, email: string) => {
  if (password.length < 10) return '비밀번호는 10자 이상이어야 합니다.';

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const combinations = [hasLetter, hasNumber, hasSpecial].filter(Boolean).length;
  if (combinations < 2) return '영문, 숫자, 특수문자 중 2종류 이상을 조합해주세요.';

  const emailId = (email || '').split('@')[0];
  if (emailId && password.includes(emailId)) {
    return '비밀번호에 아이디를 포함할 수 없습니다.';
  }

  return true;
};

/**
 * 비밀번호 변경 및 재설정 페이지 컴포넌트입니다.
 * * 진입 경로(location.state)에 따라 두 가지 모드로 동작합니다:
 * 1. 재설정 모드 (Reset Mode): 로그인 전, 아이디 확인 후 비밀번호를 새로 설정합니다.
 * 2. 변경 모드 (Change Mode): 로그인 후, 현재 비밀번호 확인 과정을 거쳐 변경합니다.
 */
const ChangePassword = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  /**
   * 페이지가 로드될 때 스크롤을 최상단으로 이동시킵니다.
   */
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  // --- 상태 관리 ---

  /**
   * 페이지 동작 모드 상태
   * - true: 비밀번호 재설정 (로그인 화면에서 진입)
   * - false: 비밀번호 변경 (마이페이지/설정에서 진입)
   */
  const [isResetMode, setIsResetMode] = useState(false);

  /**
   * 입력 폼 데이터 상태
   */
  const [formData, setFormData] = useState({
    email: '', // 재설정 모드용 이메일
    currentPassword: '', // 변경 모드용 현재 비밀번호
    newPassword: '',
    confirmPassword: '',
  });

  /**
   * 비밀번호 가시성 토글 상태
   */
  const [showPassword, setShowPassword] = useState(false);

  /**
   * [추가] 폼 제출 로딩 상태
   */
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * [추가] 유효성 검사 에러 상태
   */
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * 진입 경로에 따라 모드를 결정합니다.
   * location.state.from === 'login'일 경우 재설정 모드로 전환합니다.
   */
  useEffect(() => {
    if (location.state?.from === 'login') {
      setIsResetMode(true);
    }
  }, [location]);

  /**
   * [추가] 새 비밀번호 실시간 유효성 검사
   */
  useEffect(() => {
    if (!formData.newPassword) {
      setErrors((prev) => ({ ...prev, newPassword: '' }));
      return;
    }
    const emailForValidation = isResetMode ? formData.email : auth.currentUser?.email || '';
    const validationResult = validatePasswordLocally(formData.newPassword, emailForValidation);

    if (validationResult !== true) {
      setErrors((prev) => ({ ...prev, newPassword: validationResult as string }));
    } else {
      setErrors((prev) => ({ ...prev, newPassword: '' }));
    }
  }, [formData.newPassword, formData.email, isResetMode]);

  useEffect(() => {
    if (formData.confirmPassword && formData.newPassword !== formData.confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: '비밀번호가 일치하지 않습니다.' }));
    } else {
      setErrors((prev) => ({ ...prev, confirmPassword: '' }));
    }
  }, [formData.newPassword, formData.confirmPassword]);
  // --- 핸들러 ---

  /**
   * 입력 필드 값 변경 핸들러
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * 폼 제출 및 비밀번호 변경 처리 핸들러
   * 유효성 검사를 통과하면 서버에 변경 요청을 보냅니다.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { email, currentPassword, newPassword } = formData;

    if (errors.newPassword || errors.confirmPassword) {
      toast.error('입력 값을 다시 확인해주세요.');
      return;
    }

    setIsSubmitting(true);

    if (isResetMode) {
      // --- 비밀번호 재설정 로직 ---
      try {
        // [보안 강화] DB에 이메일이 존재하는지 먼저 확인
        const q = query(collection(db, 'users'), where('email', '==', email.trim()));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          toast.error('가입되지 않은 이메일입니다.');
          return; // 여기서 함수 종료
        }

        // 사용자가 존재하면 재설정 이메일 발송
        await sendPasswordResetEmail(auth, email.trim());
        toast.success('비밀번호 재설정 이메일을 발송했습니다. 메일함을 확인해주세요.');
        setTimeout(() => navigate('/'), 1500);
      } catch (error: any) {
        toast.error('요청 처리 중 오류가 발생했습니다.');
        console.error('비밀번호 재설정 오류:', error);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // --- 비밀번호 변경 로직 ---
      const user = auth.currentUser;
      if (!user || !user.email) {
        toast.error('로그인 정보가 유효하지 않습니다.');
        setIsSubmitting(false);
        return;
      }

      // [보안 강화] 이메일/비밀번호로 가입한 사용자인지 확인
      const isPasswordProvider = user.providerData.some((provider) => provider.providerId === 'password');
      if (!isPasswordProvider) {
        toast.error('소셜 로그인 사용자는 앱 내에서 비밀번호를 변경할 수 없습니다.');
        setIsSubmitting(false);
        navigate('/profile');
        return;
      }

      if (currentPassword === newPassword) {
        toast.error('기존 비밀번호와 다른 비밀번호를 사용해주세요.');
        setIsSubmitting(false);
        return;
      }

      try {
        // 1. 사용자 재인증 (현재 비밀번호 확인)
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);

        // 2. 비밀번호 업데이트
        await updatePassword(user, newPassword);

        toast.success('비밀번호가 성공적으로 변경되었습니다.');
        navigate('/profile');
      } catch (error: any) {
        if (error.code === 'auth/wrong-password') {
          toast.error('현재 비밀번호가 일치하지 않습니다.');
        } else if (error.code === 'auth/too-many-requests') {
          toast.error('너무 많은 요청이 있었습니다. 잠시 후 다시 시도해주세요.');
        } else {
          toast.error('비밀번호 변경 중 오류가 발생했습니다.');
        }
        console.error('비밀번호 변경 오류:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="flex flex-col min-h-dvh bg-white dark:bg-gray-950 font-['Pretendard']">
      <TopNav title="비밀번호 변경" />

      <div ref={scrollContainerRef} className="flex-1 px-6 pt-[calc(76px+env(safe-area-inset-top))] pb-8 overflow-y-auto w-full">
        {/* 헤더 섹션 */}
        <header className="mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-xl mb-5">
            <Lock className="text-blue-600 w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-[1.3] tracking-tight">
            {isResetMode ? (
              <>
                잊으신 비밀번호를 <br />
                <span className="text-blue-600 dark:text-blue-400">새로 설정할게요</span>
              </>
            ) : (
              <>
                보안을 위해 <br />
                <span className="text-blue-600 dark:text-blue-400">비밀번호를 변경할게요</span>
              </>
            )}
          </h2>
          <p className="mt-2 text-gray-400 dark:text-gray-500 text-sm font-medium">
            {isResetMode ? '아이디 확인 후 새로운 비밀번호를 입력해주세요.' : '현재 사용 중인 비밀번호 확인이 필요합니다.'}
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            {/* 1. 상단 입력란 (모드에 따라 아이디 또는 현재 비밀번호 입력) */}
            {isResetMode ? (
              <div className="group relative">
                <label className="block text-[13px] font-black text-gray-400 dark:text-gray-500 ml-1 mb-2">이메일</label>
                <div className="flex items-center h-[60px] bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-gray-800 rounded-[20px] px-5 transition-all">
                  <Mail size={20} className="text-gray-300 mr-4 group-focus-within:text-blue-600" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="가입하신 이메일 주소"
                    className="bg-transparent border-none outline-none w-full h-full text-[15px] font-bold text-gray-800 dark:text-white placeholder:text-gray-300"
                    required={isResetMode}
                  />
                </div>
              </div>
            ) : (
              <div className="group relative">
                <label className="block text-[13px] font-black text-gray-400 dark:text-gray-500 ml-1 mb-2">현재 비밀번호</label>
                <div className="flex items-center h-[60px] bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-gray-800 rounded-[20px] px-5 transition-all">
                  <Lock size={20} className="text-gray-300 mr-4 group-focus-within:text-blue-600" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    placeholder="현재 사용 중인 비밀번호"
                    className="bg-transparent border-none outline-none w-full h-full text-[15px] font-bold text-gray-800 dark:text-white placeholder:text-gray-300"
                    required={!isResetMode}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 ml-2"
                    aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            <div className="py-2">
              <div className="h-[1px] bg-gray-50 dark:bg-gray-800 w-full" />
            </div>

            {/* 2. 새 비밀번호 입력 */}
            <div className="group relative">
              <label className="block text-[13px] font-black text-gray-400 dark:text-gray-500 ml-1 mb-2">새 비밀번호</label>
              <div
                className={`flex items-center h-[60px] bg-gray-50 dark:bg-gray-800/50 border-2 rounded-[20px] px-5 transition-all ${
                  errors.newPassword
                    ? 'border-red-400 bg-white dark:bg-gray-800'
                    : 'border-transparent focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-gray-800'
                }`}
              >
                <ShieldCheck size={20} className={`${errors.newPassword ? 'text-red-400' : 'text-gray-300 group-focus-within:text-blue-600'} mr-4`} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="새 비밀번호 (10자 이상 조합)"
                  className="bg-transparent border-none outline-none w-full h-full text-[15px] font-bold text-gray-800 dark:text-white placeholder:text-gray-300"
                  required
                />
              </div>
              {errors.newPassword && (
                <div className="flex items-center gap-1 ml-4 mt-1.5">
                  <AlertCircle size={12} className="text-red-500" />
                  <p className="text-[11px] text-red-500 font-bold">{errors.newPassword}</p>
                </div>
              )}
            </div>

            {/* 3. 새 비밀번호 확인 */}
            <div className="group relative">
              <div
                className={`flex items-center h-[60px] bg-gray-50 dark:bg-gray-800/50 border-2 rounded-[20px] px-5 transition-all ${
                  formData.confirmPassword && errors.confirmPassword
                    ? 'border-red-400 bg-white dark:bg-gray-800'
                    : formData.confirmPassword && !errors.confirmPassword
                    ? 'border-emerald-400 bg-white dark:bg-gray-800'
                    : 'border-transparent focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-gray-800'
                }`}
              >
                <ShieldCheck
                  size={20}
                  className={`${
                    formData.confirmPassword && errors.confirmPassword
                      ? 'text-red-400'
                      : formData.confirmPassword && !errors.confirmPassword
                      ? 'text-emerald-500'
                      : 'text-gray-300 group-focus-within:text-blue-600'
                  } mr-4`}
                />
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="새 비밀번호 다시 입력"
                  className="bg-transparent border-none outline-none w-full h-full text-[15px] font-bold text-gray-800 dark:text-white placeholder:text-gray-300"
                  required
                />
                {formData.confirmPassword && !errors.confirmPassword && <CheckCircle2 size={18} className="text-emerald-500" />}
              </div>

              {/* 불일치 시 에러 메시지 표시 */}
              {formData.confirmPassword && errors.confirmPassword && (
                <div className="flex items-center gap-1 ml-4 mt-1.5">
                  <AlertCircle size={12} className="text-red-500" />
                  <p className="text-[11px] text-red-500 font-bold">{errors.confirmPassword}</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 px-1">
            <p className="text-[12px] text-gray-400 dark:text-gray-500 leading-relaxed font-medium">
              * 영문, 숫자, 특수문자를 조합하여 10자 이상의 안전한 비밀번호를 설정해주세요.
              {isResetMode && ' 재설정 후 다시 로그인해 주시기 바랍니다.'}
            </p>
          </div>

          {/* 제출 버튼 */}
          <footer className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-t border-gray-50 dark:border-gray-800 z-50 px-6 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <button
              type="submit"
              disabled={
                isSubmitting ||
                (isResetMode ? !formData.email : !formData.currentPassword) ||
                !formData.newPassword ||
                !formData.confirmPassword ||
                !!errors.newPassword ||
                !!errors.confirmPassword
              }
              className={`w-full h-[62px] rounded-[24px] font-black text-[17px] shadow-lg transition-all flex items-center justify-center gap-2
                ${
                  !(
                    isSubmitting ||
                    (isResetMode ? !formData.email : !formData.currentPassword) ||
                    !formData.newPassword ||
                    !formData.confirmPassword ||
                    !!errors.newPassword ||
                    !!errors.confirmPassword
                  )
                    ? 'bg-blue-600 text-white shadow-blue-100 dark:shadow-blue-900/50 active:scale-[0.98]'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed shadow-none'
                }`}
            >
              {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : isResetMode ? '비밀번호 재설정하기' : '비밀번호 변경하기'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
