import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Smartphone, UserCircle, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { validatePassword } from '../utils/validation';

const Signup = () => {
  const navigate = useNavigate();

  // 폼 상태 관리
  const [formData, setFormData] = useState({
    id: '',
    password: '',
    name: '',
    nickname: '',
    phone: '',
  });

  // 에러 메시지 상태
  const [errors, setErrors] = useState<Record<string, string>>({});

  const forbiddenIds = ['admin', 'root', 'master', 'support'];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // 입력 시 에러 초기화
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    // 1. 아이디 검증
    if (forbiddenIds.includes(formData.id)) {
      newErrors.id = '사용할 수 없는 아이디입니다.';
    } else if (!/^[a-z0-9_-]+$/.test(formData.id)) {
      newErrors.id = '영문 소문자, 숫자, -, _만 가능합니다.';
    }

    // 2. 비밀번호 검증
    const pwdResult = validatePassword(formData.password, formData.id, {});
    if (pwdResult !== true) {
      newErrors.password = pwdResult as string;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    alert('회원가입이 완료되었습니다!');
    navigate('/login');
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* 상단 바 */}
      <header className="px-4 py-4 flex items-center border-b border-gray-50 sticky top-0 bg-white z-10">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-gray-400">
          <ChevronLeft size={24} />
        </button>
        <h1 className="flex-1 text-center font-bold text-gray-900 mr-6">회원가입</h1>
      </header>

      <div className="flex-1 px-8 pt-10 pb-12">
        <div className="mb-10">
          <h2 className="text-2xl font-black text-gray-900 leading-tight mb-2">
            슈퍼 스케줄러 <br />
            <span className="text-blue-600">시작하기</span>
          </h2>
          <p className="text-gray-400 font-medium text-sm text-balance">간편하게 가입하고 멤버들과 일정을 조율해 보세요.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 아이디 섹션 */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 ml-1 uppercase tracking-wider">ID</label>
            <div
              className={`flex items-center bg-gray-50 border-2 rounded-2xl px-4 py-3.5 transition-all ${
                errors.id ? 'border-red-400 bg-red-50' : 'border-transparent focus-within:border-blue-500 focus-within:bg-white'
              }`}
            >
              <User size={18} className={`${errors.id ? 'text-red-400' : 'text-gray-400'} mr-3`} />
              <input
                name="id"
                placeholder="영문 소문자, 숫자 조합"
                className="bg-transparent border-none outline-none w-full text-sm font-semibold"
                onChange={handleChange}
                required
              />
            </div>
            {errors.id && <p className="text-[11px] text-red-500 ml-2 font-medium">{errors.id}</p>}
          </div>

          {/* 비밀번호 섹션 */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 ml-1 uppercase tracking-wider">Password</label>
            <div
              className={`flex items-center bg-gray-50 border-2 rounded-2xl px-4 py-3.5 transition-all ${
                errors.password ? 'border-red-400 bg-red-50' : 'border-transparent focus-within:border-blue-500 focus-within:bg-white'
              }`}
            >
              <Lock size={18} className={`${errors.password ? 'text-red-400' : 'text-gray-400'} mr-3`} />
              <input
                name="password"
                type="password"
                placeholder="10자 이상, 영문/숫자/특수문자 조합"
                className="bg-transparent border-none outline-none w-full text-sm font-semibold"
                onChange={handleChange}
                required
              />
            </div>
            {errors.password && <p className="text-[11px] text-red-500 ml-2 font-medium">{errors.password}</p>}
          </div>

          {/* 이름/닉네임 섹션 (2열 배치) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 ml-1 uppercase tracking-wider">Name</label>
              <div className="flex items-center bg-gray-50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white rounded-2xl px-4 py-3.5 transition-all">
                <input name="name" placeholder="실명 입력" className="bg-transparent border-none outline-none w-full text-sm font-semibold" onChange={handleChange} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 ml-1 uppercase tracking-wider">Nickname</label>
              <div className="flex items-center bg-gray-50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white rounded-2xl px-4 py-3.5 transition-all">
                <input name="nickname" placeholder="닉네임" className="bg-transparent border-none outline-none w-full text-sm font-semibold" onChange={handleChange} required />
              </div>
            </div>
          </div>

          {/* 휴대폰 번호 섹션 */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 ml-1 uppercase tracking-wider">Phone</label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center bg-gray-50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white rounded-2xl px-4 py-3.5 transition-all">
                <Smartphone size={18} className="text-gray-400 mr-3" />
                <input name="phone" placeholder="010-0000-0000" className="bg-transparent border-none outline-none w-full text-sm font-semibold" onChange={handleChange} required />
              </div>
              <button type="button" className="px-4 bg-gray-900 text-white rounded-2xl text-xs font-bold active:scale-95 transition-all shadow-sm">
                인증
              </button>
            </div>
          </div>

          {/* 제출 버튼 */}
          <div className="pt-8">
            <button
              type="submit"
              className="w-full py-4.5 bg-blue-600 text-white rounded-[20px] font-black text-lg shadow-xl shadow-blue-100 active:scale-[0.98] transition-all hover:bg-blue-700"
            >
              회원가입 완료
            </button>
            <p className="text-center mt-6 text-[11px] text-gray-400 font-medium">
              가입 시 서비스 <span className="underline">이용약관</span> 및 <span className="underline">개인정보 처리방침</span>에 동의하게 됩니다.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Signup;
