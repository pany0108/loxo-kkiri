import { useEffect, useReducer, useRef } from 'react';
import toast from 'react-hot-toast';

import { useFormValidation } from 'hooks/common/useFormValidation';
import { signUpUser } from 'services/authService';
import type { SignUpData } from 'services/authService';
import { formatPhone } from 'utils';

/** 회원가입 폼 상태 인터페이스 */
interface SignUpState {
  formData: {
    email: string;
    password: string;
    confirmPassword: string;
    lastName: string;
    firstName: string;
    phone: string;
    birthDate: string;
    authCode: string;
  };
  isAuthSent: boolean;
  isVerified: boolean;
  isLoading: boolean;
  isLeapMonth: boolean;
  isLunar: boolean;
}

/** 초기 상태 값 */
const initialState: SignUpState = {
  formData: {
    email: '',
    password: '',
    confirmPassword: '',
    lastName: '',
    firstName: '',
    phone: '',
    birthDate: '',
    authCode: '',
  },
  isAuthSent: false,
  isVerified: true, // [임시] 휴대폰 인증 비활성화 (원래 false)
  isLoading: false,
  isLeapMonth: false,
  isLunar: false,
};

/** 상태 업데이트 액션 타입 정의 */
type SignUpAction =
  | { type: 'SET_FIELD'; field: keyof SignUpState['formData']; value: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_AUTH_SENT'; payload: boolean }
  | { type: 'SET_VERIFIED'; payload: boolean }
  | { type: 'SET_BIRTH_TYPE'; payload: { isLunar: boolean; isLeapMonth: boolean } };

/** 상태 관리 리듀서 함수 */
function signUpReducer(state: SignUpState, action: SignUpAction): SignUpState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, formData: { ...state.formData, [action.field]: action.value } };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_AUTH_SENT':
      return { ...state, isAuthSent: action.payload };
    case 'SET_VERIFIED':
      return { ...state, isVerified: action.payload };
    case 'SET_BIRTH_TYPE':
      return {
        ...state,
        isLunar: action.payload.isLunar,
        isLeapMonth: action.payload.isLunar ? action.payload.isLeapMonth : false, // 양력이면 윤달은 항상 false
      };
    default:
      return state;
  }
}

/**
 * 회원가입 폼 로직을 처리하는 커스텀 훅
 * - 입력 값 관리, 유효성 검사, 회원가입 요청 등을 처리합니다.
 */
export const useSignupForm = () => {
  // --- Refs ---
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);
  const firstNameRef = useRef<HTMLInputElement>(null);
  const birthDateRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const authCodeRef = useRef<HTMLInputElement>(null);

  // --- State & Validation ---
  const [state, dispatch] = useReducer(signUpReducer, initialState);
  const errors = useFormValidation(state.formData);

  // --- Effects ---
  // 인증 번호 발송 시 입력 필드로 포커스 이동
  useEffect(() => {
    if (state.isAuthSent && !state.isVerified) {
      setTimeout(() => authCodeRef.current?.focus(), 100);
    }
  }, [state.isAuthSent, state.isVerified]);

  // --- Handlers ---
  /** 입력 필드 변경 핸들러 */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'password' || name === 'confirmPassword') {
      formattedValue = value.replace(/[^a-zA-Z0-9!@#$%^&*(),.?":{}|<>]/g, '');
    }
    if (name === 'phone') formattedValue = formatPhone(value);

    dispatch({ type: 'SET_FIELD', field: name as keyof SignUpState['formData'], value: formattedValue });
  };

  /** 회원가입 제출 핸들러 */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.isVerified) {
      toast.error('본인인증을 완료해주세요.');
      return;
    }
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const signUpData: SignUpData = { ...state.formData, isLunar: state.isLunar, isLeapMonth: state.isLeapMonth };
      const { fullName } = await signUpUser(signUpData);
      return { success: true, fullName };
    } catch (error: any) {
      return { success: false, error };
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  return {
    state,
    dispatch,
    errors,
    refs: { emailRef, passwordRef, confirmPasswordRef, lastNameRef, firstNameRef, birthDateRef, phoneRef, authCodeRef },
    handleChange,
    handleSubmit,
  };
};
