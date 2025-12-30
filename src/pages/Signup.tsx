import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Smartphone, ChevronLeft, Calendar, ShieldCheck, CheckCircle, Sparkles, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff, Mail } from 'lucide-react';
// [추가] Firebase 도구 소환
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

/**
 * 비밀번호 유효성 검사 로직
 */
const validatePasswordLocally = (password: string, userInfo: any) => {
  if (password.length < 10) return '비밀번호는 10자 이상이어야 합니다.';
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const combinations = [hasLetter, hasNumber, hasSpecial].filter(Boolean).length;
  if (combinations < 2) return '영문, 숫자, 특수문자 중 2종류 이상을 조합해주세요.';
  if (userInfo.email && password.includes(userInfo.email.split('@')[0])) return '비밀번호에 이메일 아이디를 포함할 수 없습니다.';
  return true;
};

const Signup = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '', // [변경] id -> email
    password: '',
    confirmPassword: '',
    lastName: '',
    firstName: '',
    nickname: '',
    phone: '',
    birthDate: '',
    authCode: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isAuthSent, setIsAuthSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 이메일 형식 실시간 검사
  useEffect(() => {
    if (!formData.email) {
      setErrors((prev) => ({ ...prev, email: '' }));
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setErrors((prev) => ({ ...prev, email: '올바른 이메일 형식이 아닙니다.' }));
    } else {
      setErrors((prev) => ({ ...prev, email: '' }));
    }
  }, [formData.email]);

  // 비밀번호 일치 실시간 검사
  useEffect(() => {
    if (!formData.confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: '' }));
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: '비밀번호가 일치하지 않습니다.' }));
    } else {
      setErrors((prev) => ({ ...prev, confirmPassword: '' }));
    }
  }, [formData.password, formData.confirmPassword]);

  const formatPhone = (value: string) => {
    const nums = value.replace(/[^\d]/g, '');
    if (nums.length <= 3) return nums;
    if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
    return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7, 11)}`;
  };

  const formatBirth = (value: string) => {
    const nums = value.replace(/[^\d]/g, '');
    if (nums.length <= 4) return nums;
    if (nums.length <= 6) return `${nums.slice(0, 4)}/${nums.slice(4)}`;
    return `${nums.slice(0, 4)}/${nums.slice(4, 6)}/${nums.slice(6, 8)}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;
    if (name === 'password' || name === 'confirmPassword') {
      formattedValue = value.replace(/[^a-zA-Z0-9!@#$%^&*(),.?":{}|<>]/g, '');
    }
    if (name === 'phone') formattedValue = formatPhone(value);
    if (name === 'birthDate') formattedValue = formatBirth(value);
    setFormData((prev) => ({ ...prev, [name]: formattedValue }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 비밀번호 입력창에서 한글 입력 시 발생하는 'Process' 키 이벤트를 차단
    if (e.nativeEvent.isComposing || e.key === 'Process') {
      e.preventDefault();
    }
  };

  const handleSendAuth = () => {
    if (!formData.phone || formData.phone.length < 13) {
      alert('올바른 휴대폰 번호를 입력해주세요.');
      return;
    }
    setIsAuthSent(true);
    alert('인증번호가 발송되었습니다. (테스트 번호: 1234)');
  };

  const handleVerify = () => {
    if (formData.authCode === '1234') {
      setIsVerified(true);
    } else {
      alert('인증번호가 일치하지 않습니다.');
    }
  };

  /**
   * [핵심] 실제 회원가입 처리 함수
   */
  // src/pages/Signup.tsx 내부의 handleSubmit 함수

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. 유효성 검사 (생략)
    if (!isVerified) return alert('본인인증을 완료해주세요.');

    setIsLoading(true);

    try {
      // 2. [가입] 이메일과 비번으로 Firebase 계정 생성
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user; // 방금 가입된 유저의 정보

      // 3. [프로필] 유저의 닉네임을 Firebase 기본 프로필에 저장
      await updateProfile(user, {
        displayName: formData.nickname,
      });

      // 4. [DB 저장] 상세 정보를 Firestore 'users' 컬렉션에 저장
      // doc(db, "폴더명", "문서이름") -> 서류 봉투를 지정하는 작업
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid, // 유저 고유 ID
        email: formData.email, // 이메일
        nickname: formData.nickname, // 닉네임
        lastName: formData.lastName, // 성
        firstName: formData.firstName, // 이름
        phone: formData.phone, // 전화번호
        birthDate: formData.birthDate, // 생년월일
        createdAt: new Date().toISOString(), // 가입일시
      });

      alert(`${formData.nickname}님, 가입을 축하합니다!`);
      navigate('/calendar'); // 캘린더 화면으로 이동
    } catch (error: any) {
      console.error('회원가입 에러:', error);
      if (error.code === 'auth/email-already-in-use') {
        alert('이미 가입된 이메일입니다.');
      } else {
        alert('가입 중 오류가 발생했습니다: ' + error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white font-['Pretendard']">
      <div className="px-4 pt-6">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
          <ChevronLeft size={28} />
        </button>
      </div>

      <div className="flex-1 px-8 pt-6 pb-12 overflow-y-auto max-w-md mx-auto w-full">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 rounded-xl mb-6">
            <Sparkles className="text-blue-600 w-6 h-6" />
          </div>
          <h2 className="text-[28px] font-black text-gray-900 leading-[1.2] tracking-tight">
            새로운 시작, <br />
            <span className="text-blue-600">회원가입을 시작할까요?</span>
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            {/* 이메일 주소 [수정됨] */}
            <div className="group relative">
              <div
                className={`flex items-center h-[60px] bg-gray-50 border-2 rounded-[20px] px-5 transition-all ${
                  errors.email ? 'border-red-400 bg-white' : 'border-transparent focus-within:border-blue-500 focus-within:bg-white'
                }`}
              >
                <Mail size={20} className={`${errors.email ? 'text-red-400' : 'text-gray-300 group-focus-within:text-blue-600'} mr-4`} />
                <input
                  name="email"
                  type="email"
                  placeholder="이메일 주소 (abc@example.com)"
                  className="bg-transparent border-none outline-none w-full h-full text-[15px] font-bold text-gray-800 placeholder:text-gray-300"
                  onChange={handleChange}
                  required
                />
              </div>
              {errors.email && (
                <div className="flex items-center gap-1 ml-4 mt-1">
                  <AlertCircle size={12} className="text-red-500" />
                  <p className="text-[11px] text-red-500 font-bold">{errors.email}</p>
                </div>
              )}
            </div>

            {/* 비밀번호 */}
            <div className="group relative">
              <div
                className={`flex items-center h-[60px] bg-gray-50 border-2 rounded-[20px] px-5 transition-all ${
                  errors.password ? 'border-red-400 bg-white' : 'border-transparent focus-within:border-blue-500 focus-within:bg-white'
                }`}
              >
                <Lock size={20} className={`${errors.password ? 'text-red-400' : 'text-gray-300 group-focus-within:text-blue-600'} mr-4`} />
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="비밀번호 (10자 이상 조합)"
                  className="bg-transparent border-none outline-none w-full h-full text-[15px] font-bold text-gray-800 placeholder:text-gray-300"
                  value={formData.password}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  pattern='[a-zA-Z0-9!@#$%^&*(),.?":{}|<>-]*'
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-300 hover:text-gray-500 transition-colors">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="text-[11px] text-red-500 ml-4 mt-1 font-bold">{errors.password}</p>}
            </div>

            {/* 비밀번호 확인 */}
            <div className="group relative">
              <div
                className={`flex items-center h-[60px] bg-gray-50 border-2 rounded-[20px] px-5 transition-all ${
                  formData.confirmPassword && errors.confirmPassword
                    ? 'border-red-400 bg-white'
                    : formData.confirmPassword && !errors.confirmPassword
                    ? 'border-emerald-400 bg-white'
                    : 'border-transparent focus-within:border-blue-500 focus-within:bg-white'
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
                  name="confirmPassword"
                  type="password"
                  placeholder="비밀번호 다시 입력"
                  className="bg-transparent border-none outline-none w-full h-full text-[15px] font-bold text-gray-800 placeholder:text-gray-300"
                  onChange={handleChange}
                  required
                />
                {formData.confirmPassword && !errors.confirmPassword && <CheckCircle2 size={18} className="text-emerald-500" />}
              </div>
              {formData.confirmPassword && errors.confirmPassword && <p className="text-[11px] text-red-500 ml-4 mt-1 font-bold">{errors.confirmPassword}</p>}
            </div>

            {/* 이름 (성/이름) */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1 group">
                <div className="flex items-center h-[60px] bg-gray-50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white rounded-[20px] px-5 transition-all">
                  <input
                    name="lastName"
                    placeholder="성"
                    className="bg-transparent border-none outline-none w-full h-full text-[15px] font-bold text-gray-800 placeholder:text-gray-300"
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              <div className="col-span-2 group">
                <div className="flex items-center h-[60px] bg-gray-50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white rounded-[20px] px-5 transition-all">
                  <input
                    name="firstName"
                    placeholder="이름"
                    className="bg-transparent border-none outline-none w-full h-full text-[15px] font-bold text-gray-800 placeholder:text-gray-300"
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </div>

            {/* 생년월일 */}
            <div className="group">
              <div className="flex items-center h-[60px] bg-gray-50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white rounded-[20px] px-5 transition-all">
                <Calendar size={20} className="text-gray-300 mr-4 group-focus-within:text-blue-600" />
                <input
                  name="birthDate"
                  type="tel"
                  inputMode="numeric"
                  value={formData.birthDate}
                  placeholder="생년월일 (YYYY/MM/DD)"
                  className="bg-transparent border-none outline-none w-full h-full text-[15px] font-bold text-gray-800 placeholder:text-gray-300"
                  onChange={handleChange}
                  required
                  maxLength={10}
                />
              </div>
            </div>

            {/* 휴대폰 인증 */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <div
                  className={`flex-[2.5] flex items-center h-[60px] bg-gray-50 border-2 border-transparent rounded-[20px] px-5 transition-all ${
                    isVerified ? 'bg-blue-50 border-blue-100' : 'focus-within:border-blue-500 focus-within:bg-white'
                  }`}
                >
                  <Smartphone size={20} className={isVerified ? 'text-blue-500 mr-4' : 'text-gray-300 mr-4'} />
                  <input
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    value={formData.phone}
                    placeholder="휴대폰 번호"
                    className="bg-transparent border-none outline-none w-full h-full text-[15px] font-bold text-gray-800 placeholder:text-gray-300"
                    onChange={handleChange}
                    required
                    readOnly={isVerified}
                  />
                  {isVerified && <CheckCircle2 size={20} className="text-blue-500 ml-2" />}
                </div>
                <button
                  type="button"
                  onClick={handleSendAuth}
                  disabled={isVerified}
                  className="flex-1 h-[60px] bg-gray-900 text-white rounded-[20px] text-[13px] font-black active:scale-[0.95] disabled:opacity-50"
                >
                  {isAuthSent ? '재발송' : '인증요청'}
                </button>
              </div>

              {isAuthSent && !isVerified && (
                <div className="flex gap-2 animate-in fade-in slide-in-from-top-1">
                  <div className="flex-[2.5] flex items-center h-[60px] bg-gray-50 border-2 border-blue-500 rounded-[20px] px-5 focus-within:bg-white">
                    <input
                      name="authCode"
                      type="tel"
                      inputMode="numeric"
                      value={formData.authCode}
                      placeholder="인증번호 4자리"
                      className="bg-transparent border-none outline-none w-full h-full text-[15px] font-bold text-gray-800 placeholder:text-gray-300"
                      onChange={handleChange}
                      maxLength={4}
                    />
                  </div>
                  <button type="button" onClick={handleVerify} className="flex-1 h-[60px] bg-blue-600 text-white rounded-[20px] text-[15px] font-black active:scale-[0.95]">
                    확인
                  </button>
                </div>
              )}
            </div>

            {/* 닉네임 */}
            <div className="group">
              <div className="flex items-center h-[60px] bg-gray-50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white rounded-[20px] px-5 transition-all">
                <CheckCircle size={20} className="text-gray-300 mr-4 group-focus-within:text-blue-600" />
                <input
                  name="nickname"
                  placeholder="닉네임"
                  className="bg-transparent border-none outline-none w-full h-full text-[15px] font-bold text-gray-800 placeholder:text-gray-300"
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          <div className="pt-10">
            <button
              type="submit"
              disabled={isLoading || !isVerified || !!errors.email || !!errors.confirmPassword}
              className={`w-full h-[62px] rounded-[24px] font-black text-[17px] shadow-lg transition-all flex items-center justify-center gap-2
                ${
                  isVerified && !errors.email && !errors.confirmPassword
                    ? 'bg-blue-600 text-white shadow-blue-100 active:scale-[0.98]'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                }`}
            >
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : '회원가입 완료'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Signup;
