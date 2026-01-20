import React from 'react';
import { Loader2, Smartphone, Sparkles } from 'lucide-react';

import { BirthDateInput, FormInput, PageFooter, PageHeader, PageLayout, PageTitle } from 'components';
import LoadingButton from '../../components/ui/LoadingButton';
import { useSocialSignupForm } from 'hooks/auth/useSocialSignupForm';
import { handleEnterToNext } from 'utils';

/**
 * 소셜 로그인(구글 등) 직후 추가 정보를 입력받는 페이지 컴포넌트입니다.
 * - 소셜 계정에서 제공하지 않는 필수 정보(생년월일, 전화번호)를 수집합니다.
 * - 모바일 환경에서의 리다이렉트 데이터 유실을 방지하기 위해 LocalStorage를 활용합니다.
 * @returns {JSX.Element} 추가 정보 입력 화면
 */
const SignupSocial = () => {
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

        <form id="social-signup-form" onSubmit={handleComplete} className="space-y-8">
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
