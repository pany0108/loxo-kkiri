import React, { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Lock, Eye, EyeOff, ShieldCheck, CheckCircle2, AlertCircle, Loader2, Mail, User, Smartphone } from 'lucide-react';
import { TopNav, PageHeader, FormInput } from 'components';
import { useChangePasswordForm } from 'hooks';

/**
 * 비밀번호 변경 및 재설정 페이지 컴포넌트입니다.
 * * 진입 경로(location.state)에 따라 두 가지 모드로 동작합니다:
 * 1. 재설정 모드 (Reset Mode): 로그인 전, 아이디 확인 후 비밀번호를 새로 설정합니다.
 * 2. 변경 모드 (Change Mode): 로그인 후, 현재 비밀번호 확인 과정을 거쳐 변경합니다.
 */
const ChangePassword = () => {
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

  const { state, dispatch, handlers } = useChangePasswordForm();
  const { mode, resetStep, isSubmitting, showPassword, findInfo, foundEmail, confirmedEmail, formData, errors } = state;
  const { handleChange, handleFindInfoChange, handleFindEmail, handleSendResetEmail, handleSubmit } = handlers;
  const isResetMode = mode === 'reset';

  return (
    <div className="flex flex-col min-h-dvh bg-white dark:bg-gray-950 font-['Pretendard']">
      <TopNav title="비밀번호 변경" />

      <div ref={scrollContainerRef} className="flex-1 px-6 pt-[calc(76px+env(safe-area-inset-top))] pb-8 overflow-y-auto w-full">
        {/* 헤더 섹션 */}
        <PageHeader className="mb-10" icon={<Lock className="text-blue-600 w-6 h-6" />}>
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
            {isResetMode ? '가입 시 입력한 이름과 휴대폰 번호를 입력해주세요.' : '현재 사용 중인 비밀번호 확인이 필요합니다.'}
          </p>
        </PageHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            {/* 1. 상단 입력란 (모드에 따라 아이디 또는 현재 비밀번호 입력) */}
            {isResetMode ? (
              resetStep === 1 ? (
                <>
                  <FormInput
                    label="이름"
                    icon={<User size={20} />}
                    type="text"
                    name="name"
                    value={findInfo.name}
                    onChange={handleFindInfoChange}
                    placeholder="가입하신 이름"
                    required
                  />
                  <FormInput
                    label="휴대폰 번호"
                    icon={<Smartphone size={20} />}
                    type="tel"
                    name="phone"
                    value={findInfo.phone}
                    onChange={handleFindInfoChange}
                    placeholder="가입하신 휴대폰 번호"
                    required
                  />
                </>
              ) : (
                foundEmail && (
                  <div className="animate-in fade-in duration-300 space-y-4">
                    <div className="text-center bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl">
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">가입하신 이메일은 아래와 같습니다.</p>
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">{foundEmail.masked}</p>
                    </div>
                    <FormInput
                      label="이메일 주소 확인"
                      icon={<Mail size={20} />}
                      type="email"
                      name="confirmedEmail"
                      value={confirmedEmail}
                      onChange={(e) => dispatch({ type: 'SET_CONFIRMED_EMAIL', payload: e.target.value })}
                      placeholder="위 이메일 주소를 정확히 입력"
                      required
                    />
                  </div>
                )
              )
            ) : (
              <FormInput
                label="현재 비밀번호"
                icon={<Lock size={20} />}
                type={showPassword ? 'text' : 'password'}
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                placeholder="현재 사용 중인 비밀번호"
                required={!isResetMode}
                rightContent={
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'TOGGLE_SHOW_PASSWORD' })}
                    className="text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 ml-2"
                    aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
              />
            )}

            {!isResetMode && (
              <>
                <div className="py-2">
                  <div className="h-[1px] bg-gray-50 dark:bg-gray-800 w-full" />
                </div>

                {/* 2. 새 비밀번호 입력 */}
                <FormInput
                  label="새 비밀번호"
                  icon={<ShieldCheck size={20} />}
                  type={showPassword ? 'text' : 'password'}
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="새 비밀번호 (10자 이상 조합)"
                  error={errors.newPassword}
                  required
                />

                {/* 3. 새 비밀번호 확인 */}
                <FormInput
                  icon={<ShieldCheck size={20} />}
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="새 비밀번호 다시 입력"
                  error={errors.confirmPassword}
                  success={!!formData.confirmPassword && !errors.confirmPassword}
                  rightContent={formData.confirmPassword && !errors.confirmPassword && <CheckCircle2 size={18} className="text-emerald-500" />}
                  required
                />
              </>
            )}
          </div>

          <div className="mt-4 px-1">
            <p className="text-[12px] text-gray-400 dark:text-gray-500 leading-relaxed font-medium">
              * 영문, 숫자, 특수문자를 조합하여 10자 이상의 안전한 비밀번호를 설정해주세요.
              {isResetMode && ' 재설정 후 다시 로그인해 주시기 바랍니다.'}
            </p>
          </div>

          {/* 제출 버튼 */}
          <footer className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-t border-gray-50 dark:border-gray-800 z-50 px-6 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            {isResetMode ? (
              resetStep === 1 ? (
                <button
                  type="button"
                  onClick={handleFindEmail}
                  disabled={isSubmitting || !findInfo.name || !findInfo.phone}
                  className={`w-full h-[62px] rounded-[24px] font-black text-[17px] shadow-lg transition-all flex items-center justify-center gap-2 ${
                    !isSubmitting && findInfo.name && findInfo.phone
                      ? 'bg-blue-600 text-white shadow-blue-100 dark:shadow-blue-900/50 active:scale-[0.98]'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed shadow-none'
                  }`}
                >
                  {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : '이메일 찾기'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSendResetEmail}
                  disabled={isSubmitting || !confirmedEmail}
                  className={`w-full h-[62px] rounded-[24px] font-black text-[17px] shadow-lg transition-all flex items-center justify-center gap-2 ${
                    !isSubmitting && confirmedEmail
                      ? 'bg-blue-600 text-white shadow-blue-100 dark:shadow-blue-900/50 active:scale-[0.98]'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed shadow-none'
                  }`}
                >
                  {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : '재설정 메일 발송'}
                </button>
              )
            ) : (
              <button
                type="submit"
                disabled={isSubmitting || !formData.currentPassword || !formData.newPassword || !formData.confirmPassword || !!errors.newPassword || !!errors.confirmPassword}
                className={`w-full h-[62px] rounded-[24px] font-black text-[17px] shadow-lg transition-all flex items-center justify-center gap-2
                ${
                  !isSubmitting && formData.currentPassword && formData.newPassword && formData.confirmPassword && !errors.newPassword && !errors.confirmPassword
                    ? 'bg-blue-600 text-white shadow-blue-100 dark:shadow-blue-900/50 active:scale-[0.98]'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed shadow-none'
                }`}
              >
                {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : '비밀번호 변경하기'}
              </button>
            )}
          </footer>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
