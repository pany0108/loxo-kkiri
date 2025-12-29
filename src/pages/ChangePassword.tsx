import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Lock, Eye, EyeOff, ShieldCheck, CheckCircle2, AlertCircle, User } from 'lucide-react';

const ChangePassword = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // 로그인 화면에서 왔는지 여부 확인 (경로 파라미터나 state로 판단 가능)
  // 여기서는 예시로 state.fromLogin이 true면 '재설정' 모드로 동작하게 설정
  const [isResetMode, setIsResetMode] = useState(false);

  useEffect(() => {
    // 실제 앱에서는 URL 파라미터나 Link의 state를 통해 모드를 결정합니다.
    if (location.state?.from === 'login') {
      setIsResetMode(true);
    }
  }, [location]);

  // 폼 상태 관리
  const [formData, setFormData] = useState({
    userId: '', // 재설정 모드에서 사용
    currentPassword: '', // 변경 모드에서 사용
    newPassword: '',
    confirmPassword: '',
  });

  // 비밀번호 보기/숨기기 토글
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = formData;

    if (newPassword.length < 10) {
      alert('새 비밀번호를 10자리 이상 입력해주세요.');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (!isResetMode && currentPassword === newPassword) {
      alert('기존 비밀번호와 다른 비밀번호를 사용해주세요.');
      return;
    }

    alert(isResetMode ? '비밀번호가 재설정되었습니다. 다시 로그인해주세요.' : '비밀번호가 성공적으로 변경되었습니다.');
    setTimeout(() => navigate(isResetMode ? '/' : '/profile'), 1000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white font-['Pretendard']">
      {/* 상단 네비게이션 */}
      <div className="px-4 pt-6 flex items-center">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
          <ChevronLeft size={28} />
        </button>
      </div>

      <div className="flex-1 px-8 pt-4 pb-12 overflow-y-auto max-w-md mx-auto w-full">
        {/* 헤더 섹션 */}
        <div className="mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 rounded-xl mb-5">
            <Lock className="text-blue-600 w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 leading-[1.3] tracking-tight">
            {isResetMode ? (
              <>
                잊으신 비밀번호를 <br />
                <span className="text-blue-600">새로 설정할게요</span>
              </>
            ) : (
              <>
                보안을 위해 <br />
                <span className="text-blue-600">비밀번호를 변경할게요</span>
              </>
            )}
          </h2>
          <p className="mt-2 text-gray-400 text-sm font-medium">{isResetMode ? '아이디 확인 후 새로운 비밀번호를 입력해주세요.' : '현재 사용 중인 비밀번호 확인이 필요합니다.'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            {/* 1. 상단 입력란 (모드에 따라 다름) */}
            {isResetMode ? (
              <div className="group relative">
                <label className="block text-[13px] font-black text-gray-400 ml-1 mb-2">아이디 확인</label>
                <div className="flex items-center h-[60px] bg-gray-50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white rounded-[20px] px-5 transition-all">
                  <User size={20} className="text-gray-300 mr-4 group-focus-within:text-blue-600" />
                  <input
                    type="text"
                    name="userId"
                    value={formData.userId}
                    onChange={handleChange}
                    placeholder="가입하신 아이디 입력"
                    className="bg-transparent border-none outline-none w-full h-full text-[15px] font-bold text-gray-800 placeholder:text-gray-300"
                    required={isResetMode}
                  />
                </div>
              </div>
            ) : (
              <div className="group relative">
                <label className="block text-[13px] font-black text-gray-400 ml-1 mb-2">현재 비밀번호</label>
                <div className="flex items-center h-[60px] bg-gray-50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white rounded-[20px] px-5 transition-all">
                  <Lock size={20} className="text-gray-300 mr-4 group-focus-within:text-blue-600" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    placeholder="현재 사용 중인 비밀번호"
                    className="bg-transparent border-none outline-none w-full h-full text-[15px] font-bold text-gray-800 placeholder:text-gray-300"
                    required={!isResetMode}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-300 hover:text-gray-500 ml-2">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            <div className="py-2">
              <div className="h-[1px] bg-gray-50 w-full" />
            </div>

            {/* 2. 새 비밀번호 입력 */}
            <div className="group relative">
              <label className="block text-[13px] font-black text-gray-400 ml-1 mb-2">새 비밀번호</label>
              <div className="flex items-center h-[60px] bg-gray-50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white rounded-[20px] px-5 transition-all">
                <ShieldCheck size={20} className="text-gray-300 mr-4 group-focus-within:text-blue-600" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="새 비밀번호 (10자 이상)"
                  className="bg-transparent border-none outline-none w-full h-full text-[15px] font-bold text-gray-800 placeholder:text-gray-300"
                  required
                />
              </div>
            </div>

            {/* 3. 새 비밀번호 확인 */}
            <div className="group relative">
              <div
                className={`flex items-center h-[60px] bg-gray-50 border-2 rounded-[20px] px-5 transition-all ${
                  formData.confirmPassword && formData.newPassword !== formData.confirmPassword
                    ? 'border-red-400 bg-white'
                    : formData.confirmPassword && formData.newPassword === formData.confirmPassword
                    ? 'border-emerald-400 bg-white'
                    : 'border-transparent focus-within:border-blue-500 focus-within:bg-white'
                }`}
              >
                <ShieldCheck
                  size={20}
                  className={`${
                    formData.confirmPassword && formData.newPassword !== formData.confirmPassword
                      ? 'text-red-400'
                      : formData.confirmPassword && formData.newPassword === formData.confirmPassword
                      ? 'text-emerald-500'
                      : 'text-gray-300 group-focus-within:text-blue-600'
                  } mr-4`}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="새 비밀번호 다시 입력"
                  className="bg-transparent border-none outline-none w-full h-full text-[15px] font-bold text-gray-800 placeholder:text-gray-300"
                  required
                />
                {formData.confirmPassword && formData.newPassword === formData.confirmPassword && <CheckCircle2 size={18} className="text-emerald-500" />}
              </div>
              {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                <div className="flex items-center gap-1 ml-4 mt-1.5">
                  <AlertCircle size={12} className="text-red-500" />
                  <p className="text-[11px] text-red-500 font-bold">비밀번호가 일치하지 않습니다.</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 px-1">
            <p className="text-[12px] text-gray-400 leading-relaxed font-medium">
              * 영문, 숫자, 특수문자를 조합하여 10자 이상의 안전한 비밀번호를 설정해주세요.
              {isResetMode && ' 재설정 후 다시 로그인해 주시기 바랍니다.'}
            </p>
          </div>

          {/* 제출 버튼 */}
          <div className="pt-10">
            <button
              type="submit"
              disabled={(isResetMode ? !formData.userId : !formData.currentPassword) || !formData.newPassword || formData.newPassword !== formData.confirmPassword}
              className={`w-full h-[62px] rounded-[24px] font-black text-[17px] shadow-lg transition-all flex items-center justify-center gap-2
                ${
                  formData.newPassword && formData.newPassword === formData.confirmPassword && (isResetMode ? formData.userId : formData.currentPassword)
                    ? 'bg-blue-600 text-white shadow-blue-100 active:scale-[0.98]'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                }`}
            >
              {isResetMode ? '비밀번호 재설정하기' : '비밀번호 변경하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
