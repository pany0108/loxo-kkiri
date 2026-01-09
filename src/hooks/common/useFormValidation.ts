import { useState, useEffect } from 'react';
import { validatePassword } from 'utils';

type FormData = Record<string, any>;

export const useFormValidation = (formData: FormData) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * 이메일 형식 실시간 검사 Effect
   */
  useEffect(() => {
    if (!formData.email) {
      setErrors((prev) => ({ ...prev, email: '' }));
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setErrors((prev) => ({ ...prev, email: '올바른 이메일 형식이 아닙니다.' }));
    } else {
      setErrors((prev) => ({ ...prev, email: '' }));
    }
  }, [formData.email]);

  /**
   * 비밀번호 실시간 유효성 검사 Effect
   */
  useEffect(() => {
    if (!formData.password) {
      setErrors((prev) => ({ ...prev, password: '' }));
      return;
    }

    const validationResult = validatePassword(formData.password, formData.email);

    if (validationResult !== true) {
      setErrors((prev) => ({ ...prev, password: validationResult as string }));
    } else {
      setErrors((prev) => ({ ...prev, password: '' }));
    }
  }, [formData.password, formData.email]);

  /**
   * 비밀번호 일치 여부 실시간 검사 Effect
   */
  useEffect(() => {
    if (formData.password !== formData.confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: '비밀번호가 일치하지 않습니다.' }));
    } else {
      setErrors((prev) => ({ ...prev, confirmPassword: '' }));
    }
  }, [formData.password, formData.confirmPassword]);

  return errors;
};
