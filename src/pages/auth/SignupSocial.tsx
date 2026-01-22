import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Smartphone, Sparkles } from 'lucide-react';

import { BirthDateInput, FormInput, LoadingButton, PageFooter, PageHeader, PageLayout, PageTitle } from 'components';
import { useSocialSignupForm } from 'hooks/auth/useSocialSignupForm';
import { handleEnterToNext } from 'utils';

/**
 * 소셜 로그인(구글 등) 직후 추가 정보를 입력받는 페이지 컴포넌트입니다.
 * - 소셜 계정에서 제공하지 않는 필수 정보(생년월일, 전화번호)를 수집합니다.
 * - 모바일 환경에서의 리다이렉트 데이터 유실을 방지하기 위해 LocalStorage를 활용합니다.
 *
 * @returns {JSX.Element} 추가 정보 입력 화면
 */
const SignupSocial = () => {
  const navigate = useNavigate();
  const { state, dispatch, refs, handlers } = useSocialSignupForm();
  const { formData, isLoading, isLeapMonth, isLunar, userData } = state;
  const { birthDateRef, phoneRef } = refs;
  const { handleChange, handleComplete, handleBack } = handlers;

  // 필수 데이터가 로딩되지 않았을 때 로딩 화면 표시
  if (!userData) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-white dark:bg-gray-950">
        <Loader2 className="w-10 h-10 animate-spin text-[#478BCC]" />
      </div>
    );
  }

  const { lastName, firstName } = userData;

  /**
   * 폼 제출 핸들러
   * - handleComplete 실행 후 성공 시 캘린더 화면으로 이동합니다.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    try {
      // handleComplete는 성공 시 void를, 실패 시 에러를 던질 것으로 예상합니다.
      await handleComplete(e);

      // 성공적으로 완료되면 캘린더 화면으로 이동합니다.
      navigate('/calendar', { replace: true });
    } catch (error) {
      // 실패 시 hook 내부에서 toast 에러를 처리할 것으로 예상되므로, 여기서는 콘솔에만 기록합니다.
      console.error('Social signup failed:', error);
    }
  };

  return (
    <PageLayout
      title="추가 정보 입력"
      onBack={handleBack}
      footer={
        <PageFooter zIndex={50}>
          <LoadingButton type="submit" form="social-signup-form" isLoading={isLoading} disabled={isLoading || !formData.birthDate || !formData.phone} className="btn-primary">
            끼리 시작하기
          </LoadingButton>
        </PageFooter>
      }
    >
      <>
        <PageHeader className="mb-12" icon={<Sparkles className="text-primary w-6 h-6" />}>
          <PageTitle>
            반가워요,
            <span className="text-primary">
              {lastName}
              {firstName}님!
            </span>
            <br />딱 두 가지만 더 알려주세요.
          </PageTitle>
        </PageHeader>

        <form id="social-signup-form" onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-3">
            <BirthDateInput
              inputRef={birthDateRef}
              value={formData.birthDate}
              isLunar={isLunar}
              isLeapMonth={isLeapMonth}
              onValueChange={(value) => dispatch({ type: 'SET_FIELD', field: 'birthDate', value })}
              onTypeChange={(payload) => dispatch({ type: 'SET_BIRTH_TYPE', payload })}
              onKeyDown={(e) => handleEnterToNext(e, phoneRef)}
              required
            />

            <FormInput
              inputRef={phoneRef}
              icon={<Smartphone size={20} />}
              name="phone"
              type="tel"
              inputMode="numeric"
              value={formData.phone}
              placeholder="010-0000-0000"
              onChange={handleChange}
              required
            />
          </div>
        </form>
      </>
    </PageLayout>
  );
};

export default SignupSocial;
