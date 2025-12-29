import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Smartphone, ChevronLeft, Calendar } from 'lucide-react';
import { validatePassword } from '../utils/validation';

const Signup = () => {
  const navigate = useNavigate();

  // 1. 기획안 반영: 생년월일(birthDate) 필드 추가
  const [formData, setFormData] = useState({
    id: '',
    password: '',
    name: '',
    nickname: '',
    phone: '',
    birthDate: '', // YYYY/MM/DD 형식
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // 2. 기획안 반영: 금칙어 리스트
  const forbiddenIds = ['admin', 'root', 'master', 'support'];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    // 3. 아이디 검증 (기획안: 소문자, 숫자, -, _ 만 허용)
    if (forbiddenIds.includes(formData.id.toLowerCase())) {
      newErrors.id = '시스템 예약어(admin 등)는 아이디로 사용할 수 없습니다.';
    } else if (!/^[a-z0-9_-]+$/.test(formData.id)) {
      newErrors.id = '아이디는 영문 소문자, 숫자, -, _만 사용 가능합니다.';
    }

    // 4. 이름 검증 (기획안: 한글)
    if (!/^[가-힣]+$/.test(formData.name)) {
      newErrors.name = '이름은 한글로 입력해주세요.';
    }

    // 5. 비밀번호 검증 (유틸리티 함수 호출)
    // 기획안의 "연속 문자, 개인정보 포함 금지"를 위해 formData 전체 전달
    const pwdResult = validatePassword(formData.password, {
      userId: formData.id,
      name: formData.name,
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

    // 6. 닉네임 태그 부여 (기획안: 중복 허용하되 #태그 부여)
    const randomTag = Math.floor(1000 + Math.random() * 9000);
    const finalNickname = `${formData.nickname}#${randomTag}`;

    alert(`회원가입이 완료되었습니다!\n닉네임: ${finalNickname}`);
    navigate('/login');
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="px-4 py-4 flex items-center border-b border-gray-50 sticky top-0 bg-white z-10">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-gray-400">
          <ChevronLeft size={24} />
        </button>
        <h1 className="flex-1 text-center font-bold text-gray-900 mr-6">회원가입</h1>
      </header>

      <div className="flex-1 px-8 pt-6 pb-12 overflow-y-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-black text-gray-900 leading-tight mb-2">
            슈퍼 스케줄러 <span className="text-blue-600">시작하기</span>
          </h2>
          <p className="text-gray-400 font-medium text-sm">개인정보 보호를 위해 엄격한 보안 정책을 적용합니다.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 아이디 */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 ml-1 uppercase">ID</label>
            <div className={`flex items-center bg-gray-50 border-2 rounded-2xl px-4 py-3 ${errors.id ? 'border-red-400' : 'border-transparent focus-within:border-blue-500'}`}>
              <User size={18} className="text-gray-400 mr-3" />
              <input name="id" placeholder="영문 소문자, 숫자 조합" className="bg-transparent outline-none w-full text-sm font-semibold" onChange={handleChange} required />
            </div>
            {errors.id && <p className="text-[10px] text-red-500 ml-2">{errors.id}</p>}
          </div>

          {/* 비밀번호 */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 ml-1 uppercase">Password</label>
            <div
              className={`flex items-center bg-gray-50 border-2 rounded-2xl px-4 py-3 ${errors.password ? 'border-red-400' : 'border-transparent focus-within:border-blue-500'}`}
            >
              <Lock size={18} className="text-gray-400 mr-3" />
              <input
                name="password"
                type="password"
                placeholder="10자 이상, 조합 필수"
                className="bg-transparent outline-none w-full text-sm font-semibold"
                onChange={handleChange}
                required
              />
            </div>
            {errors.password && <p className="text-[10px] text-red-500 ml-2 leading-tight">{errors.password}</p>}
          </div>

          {/* 이름 & 생년월일 (2열 배치) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 ml-1">이름(한글)</label>
              <div className="bg-gray-50 border-2 border-transparent focus-within:border-blue-500 rounded-2xl px-4 py-3">
                <input name="name" placeholder="실명" className="bg-transparent outline-none w-full text-sm font-semibold" onChange={handleChange} required />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 ml-1">생년월일</label>
              <div className="flex items-center bg-gray-50 border-2 border-transparent focus-within:border-blue-500 rounded-2xl px-4 py-3">
                <input name="birthDate" placeholder="YYYY/MM/DD" className="bg-transparent outline-none w-full text-[13px] font-semibold" onChange={handleChange} required />
              </div>
            </div>
          </div>

          {/* 닉네임 */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 ml-1 uppercase">Nickname</label>
            <div className="bg-gray-50 border-2 border-transparent focus-within:border-blue-500 rounded-2xl px-4 py-3">
              <input
                name="nickname"
                placeholder="16자 이하, 중복 허용"
                className="bg-transparent outline-none w-full text-sm font-semibold"
                onChange={handleChange}
                required
                maxLength={16}
              />
            </div>
          </div>

          {/* 휴대폰 번호 (본인인증 필수 UI) */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 ml-1 uppercase">Phone (본인인증)</label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center bg-gray-50 border-2 border-transparent focus-within:border-blue-500 rounded-2xl px-4 py-3">
                <Smartphone size={18} className="text-gray-400 mr-3" />
                <input name="phone" placeholder="010-0000-0000" className="bg-transparent outline-none w-full text-sm font-semibold" onChange={handleChange} required />
              </div>
              <button type="button" className="px-4 bg-gray-900 text-white rounded-2xl text-xs font-bold">
                인증하기
              </button>
            </div>
          </div>

          <div className="pt-6">
            <button type="submit" className="w-full py-4.5 bg-blue-600 text-white rounded-[20px] font-black text-lg shadow-xl shadow-blue-100 active:scale-[0.98] transition-all">
              회원가입 완료
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Signup;
