import React from 'react';
import { CheckCircle2, Eye, EyeOff, Lock, Mail, ShieldCheck, Smartphone, User } from 'lucide-react';

import { FormInput, LoadingButton, PageFooter, PageHeader, PageLayout, PageTitle } from 'components';
import { useChangePasswordForm } from 'hooks';

/**
 * 비밀번호 변경 및 재설정 페이지 컴포넌트입니다.
 * - 진입 경로(location.state)에 따라 두 가지 모드로 동작합니다:
 *   1. 재설정 모드 (Reset Mode): 로그인 전, 아이디 확인 후 비밀번호를 새로 설정합니다.
 *   2. 변경 모드 (Change Mode): 로그인 후, 현재 비밀번호 확인 과정을 거쳐 변경합니다.
 *
 * @returns {JSX.Element} 비밀번호 변경/재설정 화면
 */
const ChangePassword = () => {
  const { state, dispatch, handlers } = useChangePasswordForm();
  const { mode, resetStep, isSubmitting, showPassword, findInfo, foundEmail, confirmedEmail, formData, errors } = state;
  const { handleChange, handleFindInfoChange, handleFindEmail, handleSendResetEmail, handleSubmit } = handlers;
  const isResetMode = mode === 'reset';

  const renderFooter = () => (
    <PageFooter zIndex={50}>
      {isResetMode ? (
        resetStep === 1 ? (
          <LoadingButton type="button" onClick={handleFindEmail} isLoading={isSubmitting} disabled={isSubmitting || !findInfo.name || !findInfo.phone} className="btn-primary">
            이메일 찾기
          </LoadingButton>
        ) : (
          <LoadingButton type="button" onClick={handleSendResetEmail} isLoading={isSubmitting} disabled={isSubmitting || !confirmedEmail} className="btn-primary">
            재설정 메일 발송
          </LoadingButton>
        )
      ) : (
        <LoadingButton
          type="submit"
          form="change-password-form"
          isLoading={isSubmitting}
          disabled={isSubmitting || !formData.currentPassword || !formData.newPassword || !formData.confirmPassword || !!errors.newPassword || !!errors.confirmPassword}
          className="btn-primary"
        >
          비밀번호 변경하기
        </LoadingButton>
      )}
    </PageFooter>
  );

  return (
    <PageLayout title="비밀번호 변경" footer={renderFooter()}>
      <>
        <PageHeader className="mb-10" icon={<Lock className="text-primary w-6 h-6" />}>
          <PageTitle>
            {isResetMode ? (
              <>
                잊으신 비밀번호를 <br />
                <span className="text-primary">새로 설정할게요</span>
              </>
            ) : (
              <>
                보안을 위해 <br />
                <span className="text-primary">비밀번호를 변경할게요</span>
              </>
            )}
          </PageTitle>
          <p className="text-desc mt-2">{isResetMode ? '가입 시 입력한 이름과 휴대폰 번호를 입력해주세요.' : '현재 사용 중인 비밀번호 확인이 필요합니다.'}</p>
        </PageHeader>

        <form id="change-password-form" onSubmit={handleSubmit} className="space-y-4">
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleFindEmail();
                      }
                    }}
                  />
                </>
              ) : (
                foundEmail && (
                  <div className="animate-in fade-in duration-300 space-y-4">
                    <div className="text-center bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl">
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">가입하신 이메일은 아래와 같습니다.</p>
                      <p className="text-lg font-bold text-primary mt-1">{foundEmail.masked}</p>
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
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSendResetEmail();
                        }
                      }}
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
            <p className="text-desc text-xs">
              * 영문, 숫자, 특수문자를 조합하여 10자 이상의 안전한 비밀번호를 설정해주세요.
              {isResetMode && ' 재설정 후 다시 로그인해 주시기 바랍니다.'}
            </p>
          </div>
        </form>
      </>
    </PageLayout>
  );
};

export default ChangePassword;
