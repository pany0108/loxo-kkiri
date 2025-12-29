import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Smartphone, ChevronLeft, Calendar, ShieldCheck, CheckCircle, Sparkles } from 'lucide-react';
import { validatePassword } from '../utils/validation';

const Signup = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    id: '',
    password: '',
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

  const forbiddenIds = ['admin', 'root', 'master', 'support'];

  // 1. 자동 포맷팅 함수들
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
    if (name === 'phone') formattedValue = formatPhone(value);
    if (name === 'birthDate') formattedValue = formatBirth(value);

    setFormData((prev) => ({ ...prev, [name]: formattedValue }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  // 2. 인증번호 발송 함수 (추가됨)
  const handleSendAuth = () => {
    if (!formData.phone || formData.phone.length < 13) {
      alert('올바른 휴대폰 번호를 입력해주세요.');
      return;
    }
    setIsAuthSent(true);
    alert('인증번호가 발송되었습니다. (테스트 번호: 1234)');
  };

  // 3. 인증번호 확인 함수 (추가됨)
  const handleVerify = () => {
    if (formData.authCode === '1234') {
      setIsVerified(true);
      alert('인증되었습니다.');
    } else {
      alert('인증번호가 일치하지 않습니다.');
    }
  };

  // 4. 회원가입 제출 함수 (추가됨)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!isVerified) {
      alert('휴대폰 본인인증을 완료해주세요.');
      return;
    }

    // 아이디 금칙어 체크
    if (forbiddenIds.includes(formData.id.toLowerCase())) {
      newErrors.id = '사용할 수 없는 아이디입니다.';
    }

    // 비밀번호 유효성 검사 (개인정보 포함 여부 등)
    const fullName = formData.lastName + formData.firstName;
    const pwdResult = validatePassword(formData.password, {
      userId: formData.id,
      name: fullName,
      birthDate: formData.birthDate,
      phone: formData.phone,
    });

    if (pwdResult !== true) {
      newErrors.password = pwdResult as string;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const randomTag = Math.floor(1000 + Math.random() * 9000);
    alert(`${formData.nickname}#${randomTag}님, 회원가입을 축하합니다!`);
    navigate('/login');
  };

  return (
    <div className="flex flex-col min-h-screen bg-white font-['Pretendard']">
      <header className="px-6 py-6 border-b border-gray-50 sticky top-0 bg-white/90 backdrop-blur-md z-20">
        <div className="flex items-center mb-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors">
            <ChevronLeft size={24} />
          </button>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">회원가입</h1>
            <Sparkles size={20} className="text-blue-500 fill-blue-500" />
          </div>
          <p className="text-[13px] font-medium text-gray-400 leading-relaxed">
            슈퍼 스케줄러와 함께 <br />
            스마트한 일정 관리를 시작해보세요.
          </p>
        </div>
      </header>

      <div className="flex-1 px-8 pb-12 overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-6 pt-6">
          {/* 아이디 */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">ID</label>
            <div
              className={`flex items-center bg-gray-50 border-2 rounded-2xl px-4 py-3 ${
                errors.id ? 'border-red-400' : 'border-transparent focus-within:border-blue-500 focus-within:bg-white'
              }`}
            >
              <User size={18} className="text-gray-400 mr-3" />
              <input
                name="id"
                placeholder="영문 소문자, 숫자 조합"
                className="bg-transparent outline-none w-full text-sm font-semibold text-gray-800"
                onChange={handleChange}
                required
              />
            </div>
            {errors.id && <p className="text-[10px] text-red-500 ml-2">{errors.id}</p>}
          </div>

          {/* 비밀번호 */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Password</label>
            <div
              className={`flex items-center bg-gray-50 border-2 rounded-2xl px-4 py-3 ${
                errors.password ? 'border-red-400' : 'border-transparent focus-within:border-blue-500 focus-within:bg-white'
              }`}
            >
              <Lock size={18} className="text-gray-400 mr-3" />
              <input
                name="password"
                type="password"
                placeholder="10자 이상, 조합 필수"
                className="bg-transparent outline-none w-full text-sm font-semibold text-gray-800"
                onChange={handleChange}
                required
              />
            </div>
            {errors.password && <p className="text-[10px] text-red-500 ml-2 leading-tight">{errors.password}</p>}
          </div>

          {/* 성/이름 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500">성</label>
              <div className="bg-gray-50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white rounded-2xl px-4 py-3">
                <input name="lastName" placeholder="김" className="bg-transparent outline-none w-full text-sm font-semibold text-gray-800" onChange={handleChange} required />
              </div>
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-bold text-gray-500">이름</label>
              <div className="bg-gray-50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white rounded-2xl px-4 py-3">
                <input name="firstName" placeholder="철수" className="bg-transparent outline-none w-full text-sm font-semibold text-gray-800" onChange={handleChange} required />
              </div>
            </div>
          </div>

          {/* 생년월일 */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Birth Date</label>
            <div className="flex items-center bg-gray-50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white rounded-2xl px-4 py-3">
              <Calendar size={18} className="text-gray-400 mr-3" />
              <input
                name="birthDate"
                value={formData.birthDate}
                placeholder="19901231 (숫자만 입력)"
                className="bg-transparent outline-none w-full text-sm font-semibold text-gray-800"
                onChange={handleChange}
                required
                maxLength={10}
              />
            </div>
          </div>

          {/* 휴대폰 번호 */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Phone</label>
            <div className="flex gap-2">
              <div
                className={`flex-1 flex items-center bg-gray-50 border-2 border-transparent rounded-2xl px-4 py-3 ${
                  isVerified ? 'bg-blue-50' : 'focus-within:border-blue-500 focus-within:bg-white'
                }`}
              >
                <Smartphone size={18} className={isVerified ? 'text-blue-500 mr-3' : 'text-gray-400 mr-3'} />
                <input
                  name="phone"
                  value={formData.phone}
                  placeholder="01012345678"
                  className="bg-transparent outline-none w-full text-sm font-semibold text-gray-800"
                  onChange={handleChange}
                  required
                  readOnly={isVerified}
                />
                {isVerified && <CheckCircle size={18} className="text-blue-500 ml-2" />}
              </div>
              <button
                type="button"
                onClick={handleSendAuth}
                disabled={isVerified}
                className="px-4 bg-gray-900 text-white rounded-2xl text-xs font-bold disabled:bg-gray-200 transition-colors"
              >
                {isAuthSent ? '재발송' : '인증하기'}
              </button>
            </div>
          </div>

          {/* 인증번호 입력창 (발송 후 노출) */}
          {isAuthSent && !isVerified && (
            <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-xs font-bold text-blue-600 ml-1">인증번호 입력</label>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center bg-blue-50 border-2 border-blue-200 rounded-2xl px-4 py-3">
                  <ShieldCheck size={18} className="text-blue-500 mr-3" />
                  <input
                    name="authCode"
                    value={formData.authCode}
                    placeholder="4자리 숫자"
                    className="bg-transparent outline-none w-full text-sm font-semibold text-gray-800"
                    onChange={handleChange}
                    maxLength={4}
                  />
                </div>
                <button type="button" onClick={handleVerify} className="px-6 bg-blue-600 text-white rounded-2xl text-xs font-bold active:scale-95 transition-all">
                  확인
                </button>
              </div>
            </div>
          )}

          {/* 닉네임 */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Nickname</label>
            <div className="bg-gray-50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white rounded-2xl px-4 py-3">
              <input
                name="nickname"
                placeholder="닉네임 (16자 이하)"
                className="bg-transparent outline-none w-full text-sm font-semibold text-gray-800"
                onChange={handleChange}
                required
                maxLength={16}
              />
            </div>
          </div>

          {/* 제출 버튼 */}
          <div className="pt-10">
            <button
              type="submit"
              disabled={!isVerified}
              className={`
                relative w-full py-5 rounded-[24px] font-black text-lg transition-all duration-300
                flex items-center justify-center gap-2 overflow-hidden shadow-xl
                ${
                  isVerified
                    ? 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700 hover:-translate-y-1 active:scale-[0.98]'
                    : 'bg-gray-100 text-gray-400 shadow-none cursor-not-allowed'
                }
              `}
            >
              <span>회원가입 완료</span>
              {isVerified ? <CheckCircle size={20} /> : <Lock size={18} className="opacity-50" />}
            </button>

            {!isVerified && <p className="text-center mt-4 text-[11px] font-bold text-rose-400 animate-pulse">본인인증을 완료해야 가입이 가능합니다.</p>}

            <p className="text-center mt-6 text-[11px] text-gray-300 font-medium">
              가입 시 <span className="underline decoration-gray-200 px-1">이용약관</span> 및 <span className="underline decoration-gray-200 px-1">개인정보 처리방침</span>에
              동의하게 됩니다.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Signup;
