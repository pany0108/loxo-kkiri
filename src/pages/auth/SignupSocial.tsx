import React from 'react';
import { Smartphone, Calendar, Sparkles, CheckCircle2, Loader2 } from 'lucide-react';
import { TopNav, PageHeader, FormInput, BirthDateInput, PageFooter } from 'components';
import { handleEnterToNext } from 'utils';
import { useSocialSignupForm } from 'hooks/useSocialSignupForm';

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
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  const { lastName, firstName } = userData;

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-950 font-['Pretendard']">
      <TopNav title="추가 정보 입력" onBack={handleBack} />

      <div className="flex-1 px-6 pt-[calc(76px+env(safe-area-inset-top))] pb-32 overflow-y-auto w-full">
        <PageHeader className="mb-12" icon={<Sparkles className="text-blue-600 w-6 h-6" />}>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-[1.3] tracking-tight">
            반가워요,
            <span className="text-blue-600">
              {lastName}
              {firstName}님!
            </span>
            <br />딱 두 가지만 더 알려주세요.
          </h2>
        </PageHeader>

        <form onSubmit={handleComplete} className="space-y-8">
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

          <PageFooter zIndex={50}>
            <button
              type="submit"
              disabled={isLoading || !state.isVerified}
              className={`w-full h-[62px] rounded-[24px] font-black text-[17px] shadow-lg transition-all flex items-center justify-center gap-2 ${
                state.isVerified
                  ? 'bg-blue-600 text-white shadow-blue-100 dark:shadow-blue-900/50 active:scale-[0.98]'
                  : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 cursor-not-allowed shadow-none'
              }`}
            >
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : '슈퍼 스케줄러 시작하기'}
            </button>
          </PageFooter>
        </form>
      </div>
    </div>
  );
};

export default SignupSocial;
