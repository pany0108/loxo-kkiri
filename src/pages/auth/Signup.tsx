import React from 'react';
import { Lock, Smartphone, Calendar, ShieldCheck, Sparkles, CheckCircle2, AlertCircle, Eye, EyeOff, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageLayout, PageHeader, FormInput, BirthDateInput, PageFooter, PageTitle } from 'components';
import LoadingButton from '../../components/ui/LoadingButton';
import { handleEnterToNext } from 'utils';
import { useSignupForm } from 'hooks/auth/useSignupForm';

/**
 * 회원가입 페이지 컴포넌트입니다.
 * 이메일, 비밀번호, 실명, 생년월일, 휴대폰 번호를 입력받아 Firebase Authentication 및 Firestore에 유저를 생성합니다.
 * * @returns {JSX.Element} 회원가입 화면
 */
const Signup = () => {
  const { state, dispatch, errors, refs, handleChange, handleSubmit: handleFormSubmit } = useSignupForm();

  const { formData, isLoading, isLeapMonth, isLunar } = state;
  const { emailRef, passwordRef, confirmPasswordRef, lastNameRef, firstNameRef, birthDateRef, phoneRef } = refs;

  /**
   * 회원가입 제출 핸들러
   * - 커스텀 훅의 handleSubmit을 호출하고, 결과에 따라 UI 피드백(토스트, 포커스)을 처리합니다.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    const result = await handleFormSubmit(e);
    if (result?.success) {
      toast.success(`${result.fullName}님, 가입을 축하합니다!`);
    } else if (result?.error) {
      const error = result.error;
      console.error('Signup Error:', error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error('이미 가입된 이메일입니다. 다른 이메일을 사용해주세요.');
        emailRef.current?.focus();
      } else if (error.code === 'auth/invalid-email') {
        toast.error('유효하지 않은 이메일 형식입니다.');
        emailRef.current?.focus();
      } else if (error.code === 'auth/weak-password') {
        toast.error('비밀번호가 안전하지 않습니다. 10자 이상, 영문/숫자/특수문자를 조합해주세요.');
      } else {
        toast.error('가입 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    }
  };

  const renderFooter = () => (
    <PageFooter zIndex={50}>
      <LoadingButton
        type="submit"
        form="signup-form"
        isLoading={isLoading}
        disabled={
          isLoading ||
          !state.isVerified ||
          !!errors.email ||
          !!errors.password ||
          !!errors.confirmPassword ||
          !formData.email ||
          !formData.password ||
          !formData.confirmPassword ||
          !formData.lastName ||
          !formData.firstName ||
          !formData.birthDate ||
          !formData.phone
        }
        className="btn-primary"
      >
        회원가입 완료
      </LoadingButton>
    </PageFooter>
  );

  return (
    <PageLayout title="회원가입" footer={renderFooter()}>
      <>
        <PageHeader className="mb-10" icon={<Sparkles className="text-primary w-6 h-6" />}>
          <PageTitle className="text-[28px] leading-[1.2]">
            새로운 시작, <br />
            <span className="text-primary">회원가입을 시작할까요?</span>
          </PageTitle>
        </PageHeader>

        <form id="signup-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <FormInput
              inputRef={emailRef}
              icon={<Mail size={20} />}
              name="email"
              type="email"
              enterKeyHint="next"
              placeholder="이메일 주소 (abc@example.com)"
              onChange={handleChange}
              onKeyDown={(e) => handleEnterToNext(e, passwordRef)}
              error={errors.email}
              required
            />

            <FormInput
              inputRef={passwordRef}
              icon={<Lock size={20} />}
              name="password"
              type="password"
              enterKeyHint="next"
              placeholder="비밀번호 (10자 이상 조합)"
              value={formData.password}
              onChange={handleChange}
              onKeyDown={(e) => handleEnterToNext(e, confirmPasswordRef)}
              error={errors.password}
              required
            />

            <FormInput
              inputRef={confirmPasswordRef}
              icon={<ShieldCheck size={20} />}
              name="confirmPassword"
              type="password"
              enterKeyHint="next"
              placeholder="비밀번호 다시 입력"
              value={formData.confirmPassword}
              onChange={handleChange}
              onKeyDown={(e) => handleEnterToNext(e, lastNameRef)}
              error={formData.confirmPassword ? errors.confirmPassword : undefined}
              success={!!formData.confirmPassword && !errors.confirmPassword}
              rightContent={formData.confirmPassword && !errors.confirmPassword && <CheckCircle2 size={18} className="text-emerald-500" />}
              required
            />

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1 group">
                <FormInput
                  inputRef={lastNameRef}
                  name="lastName"
                  enterKeyHint="next"
                  placeholder="성"
                  onChange={handleChange}
                  onKeyDown={(e) => handleEnterToNext(e, firstNameRef)}
                  required
                />
              </div>
              <div className="col-span-2 group">
                <FormInput
                  inputRef={firstNameRef}
                  name="firstName"
                  enterKeyHint="next"
                  placeholder="이름"
                  onChange={handleChange}
                  onKeyDown={(e) => handleEnterToNext(e, birthDateRef)}
                  required
                />
              </div>
            </div>

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
              placeholder="휴대폰 번호"
              onChange={handleChange}
              required
            />
          </div>
        </form>
      </>
    </PageLayout>
  );
};

export default Signup;
