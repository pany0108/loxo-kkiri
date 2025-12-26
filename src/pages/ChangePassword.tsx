import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, LockKeyhole, Eye, EyeOff } from 'lucide-react';

const ChangePassword = () => {
  const navigate = useNavigate();

  // 폼 상태 관리
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // 비밀번호 보기/숨기기 토글 (커스텀 기능 추가)
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = formData;

    // 유효성 검사
    if (newPassword.length < 6) {
      alert('새 비밀번호를 6자리 이상 입력해주세요.');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (currentPassword === newPassword) {
      alert('기존 비밀번호와 다른 비밀번호를 사용해주세요.');
      return;
    }

    alert('비밀번호가 성공적으로 변경되었습니다.');
    setTimeout(() => navigate('/profile'), 1000);
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* 상단 네비게이션 */}
      <nav className="bg-white px-4 py-4 flex items-center border-b sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 hover:bg-gray-100 rounded-full transition-colors">
          <ChevronLeft size={24} className="text-gray-700" />
        </button>
        <h1 className="flex-1 text-center font-bold text-lg mr-6 text-gray-900">비밀번호 변경</h1>
      </nav>

      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 현재 비밀번호 */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-600 ml-1">현재 비밀번호</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                placeholder="현재 비밀번호 입력"
                className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-4 outline-none focus:border-blue-500 transition-all text-sm"
                required
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <hr className="border-gray-100 my-2" />

          {/* 새 비밀번호 */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-600 ml-1">새 비밀번호</label>
            <input
              type={showPassword ? 'text' : 'password'}
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              placeholder="새 비밀번호 입력 (6자리 이상)"
              className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-4 outline-none focus:border-blue-500 transition-all text-sm"
              required
            />
          </div>

          {/* 새 비밀번호 확인 */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-600 ml-1">새 비밀번호 확인</label>
            <input
              type={showPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="새 비밀번호 다시 입력"
              className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-4 outline-none focus:border-blue-500 transition-all text-sm"
              required
            />
          </div>

          <p className="text-[12px] text-gray-400 px-1 leading-relaxed">* 개인정보 보호를 위해 비밀번호는 주기적으로 변경하시는 것이 좋습니다.</p>

          {/* 제출 버튼 */}
          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-100 active:scale-[0.98] transition-all mt-8">
            비밀번호 변경하기
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
