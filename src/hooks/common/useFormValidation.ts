import { useEffect, useState } from 'react';

import { validatePassword } from 'utils';

type FormData = Record<string, any>;

/**
 * 폼 데이터 유효성 검사를 수행하는 커스텀 훅
 * - 이메일, 비밀번호, 비밀번호 확인 필드에 대한 실시간 유효성 검사를 처리합니다.
 * @param {FormData} formData - 검사할 폼 데이터 객체
 * @returns {Record<string, string>} 각 필드별 에러 메시지 객체
 */
export const useFormValidation = (formData: FormData) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 이메일 형식 실시간 검사
  useEffect(() => {
    if (!formData.email) {
      setErrors((prev) => {
        const { email, ...rest } = prev;
        return rest;
      });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setErrors((prev) => ({ ...prev, email: '올바른 이메일 형식이 아닙니다.' }));
    } else {
      setErrors((prev) => ({ ...prev, email: '' }));
    }
  }, [formData.email]);

  // 비밀번호 실시간 유효성 검사
  useEffect(() => {
    if (!formData.password) {
      setErrors((prev) => {
        const { password, ...rest } = prev;
        return rest;
      });
      return;
    }

    const validationResult = validatePassword(formData.password, formData.email);

    if (validationResult !== true) {
      setErrors((prev) => ({ ...prev, password: validationResult as string }));
    } else {
      setErrors((prev) => ({ ...prev, password: '' }));
    }
  }, [formData.password, formData.email]);

  // 비밀번호 일치 여부 실시간 검사
  useEffect(() => {
    if (formData.password !== formData.confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: '비밀번호가 일치하지 않습니다.' }));
    } else {
      setErrors((prev) => ({ ...prev, confirmPassword: '' }));
    }
  }, [formData.password, formData.confirmPassword]);

  return errors;
};
