import { useCallback, useEffect, useReducer, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

import { completeSocialSignUp, SocialSignUpData } from 'services/authService';
import { formatPhone } from 'utils';
import { auth, db } from '../../firebase';

/** 소셜 회원가입 추가 정보 입력 폼 상태 인터페이스 */
interface SocialSignupState {
  formData: {
    phone: string;
    birthDate: string;
  };
  isLoading: boolean;
  isLeapMonth: boolean;
  isLunar: boolean;
  isVerified: boolean;
  userData: {
    uid: string;
    email: string;
    lastName: string;
    firstName: string;
  } | null;
}

/** 초기 상태 값 */
const initialState: SocialSignupState = {
  formData: { phone: '', birthDate: '' },
  isLoading: false,
  isLeapMonth: false,
  isLunar: false,
  isVerified: true, // [임시] 휴대폰 인증 비활성화 (원래 false)
  userData: null,
};

/** 상태 업데이트 액션 타입 정의 */
type Action =
  | { type: 'SET_USER_DATA'; payload: SocialSignupState['userData'] }
  | { type: 'SET_FIELD'; field: keyof SocialSignupState['formData']; value: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_BIRTH_TYPE'; payload: { isLunar: boolean; isLeapMonth: boolean } };

function reducer(state: SocialSignupState, action: Action): SocialSignupState {
  /** 상태 관리 리듀서 함수 */
  switch (action.type) {
    case 'SET_USER_DATA':
      return { ...state, userData: action.payload };
    case 'SET_FIELD':
      return { ...state, formData: { ...state.formData, [action.field]: action.value } };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_BIRTH_TYPE':
      return {
        ...state,
        isLunar: action.payload.isLunar,
        isLeapMonth: action.payload.isLunar ? action.payload.isLeapMonth : false,
      };
    default:
      return state;
  }
}

/**
 * 소셜 로그인 후 추가 정보 입력을 처리하는 커스텀 훅
 * - 생년월일, 전화번호 등 필수 정보를 입력받아 가입을 완료합니다.
 */
export const useSocialSignupForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [state, dispatch] = useReducer(reducer, initialState);
  const { formData, userData, isLunar, isLeapMonth, isVerified } = state;

  const birthDateRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  // 위치 상태(location state) 또는 로컬 스토리지에서 사용자 데이터 초기화
  useEffect(() => {
    let initialUserData = null;
    if (location.state?.uid) {
      localStorage.setItem('pendingSignup', JSON.stringify(location.state));
      initialUserData = location.state;
    } else {
      const saved = localStorage.getItem('pendingSignup');
      initialUserData = saved ? JSON.parse(saved) : null;
    }
    dispatch({ type: 'SET_USER_DATA', payload: initialUserData });
  }, [location.state]);

  // 사용자 상태 확인 및 리다이렉트 처리 (이미 가입된 경우 등)
  useEffect(() => {
    const checkUserStatus = async () => {
      // Use the currently authenticated user as the primary source of truth.
      const currentUser = auth.currentUser;

      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data()?.phone && userSnap.data()?.birthDate) {
          // This user is fully registered. They should not be on this page.
          localStorage.removeItem('pendingSignup'); // Clean up just in case
          navigate('/calendar', { replace: true });
          return; // Exit early
        }
        // If profile is not complete, we stay on this page to let the user fill it.
        return;
      }

      // If there's no currentUser, check for pending signup data.
      // If that's also missing, it's an invalid state.
      if (!localStorage.getItem('pendingSignup')) {
        toast.error('인증 정보가 만료되었습니다. 다시 로그인해주세요.');
        navigate('/login', { replace: true });
      }
    };
    checkUserStatus();
  }, [navigate]);

  // 정리(Cleanup) 이펙트
  useEffect(() => {
    sessionStorage.removeItem('isAuthChecking');
    return () => {
      localStorage.removeItem('pendingSignup');
    };
  }, []);

  /** 뒤로가기 핸들러 (로그아웃 처리) */
  const handleBack = useCallback(async () => {
    try {
      localStorage.removeItem('pendingSignup');
      await signOut(auth);
      window.location.replace('/');
    } catch (error) {
      console.error('Sign out error on social signup back:', error);
      toast.error('로그아웃 중 오류가 발생했습니다.');
    }
  }, []);

  // 하드웨어 뒤로가기 버튼 처리 (모바일)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listenerPromise = CapacitorApp.addListener('backButton', () => handleBack());
    return () => {
      listenerPromise.then((listener: PluginListenerHandle) => listener.remove());
    };
  }, [handleBack]);

  /** 입력 필드 변경 핸들러 */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const formattedValue = name === 'phone' ? formatPhone(value) : value;
    dispatch({ type: 'SET_FIELD', field: name as keyof SocialSignupState['formData'], value: formattedValue });
  };

  /** 가입 완료 처리 핸들러 */
  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isVerified) {
      toast.error('본인인증을 완료해주세요.');
      return;
    }
    if (!auth.currentUser || !userData) {
      toast.error('인증 정보가 만료되었습니다. 다시 로그인해주세요.');
      navigate('/login', { replace: true });
      return;
    }
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const socialSignUpData: SocialSignUpData = {
        lastName: userData.lastName,
        firstName: userData.firstName,
        phone: formData.phone,
        birthDate: formData.birthDate,
        isLunar,
        isLeapMonth,
      };
      const { fullName } = await completeSocialSignUp(auth.currentUser, socialSignUpData);
      localStorage.removeItem('pendingSignup');
      toast.success(`${fullName}님, 가입을 축하합니다!`);
      navigate('/calendar', { replace: true });
    } catch (error: any) {
      console.error('Social Signup Error:', error);
      toast.error('가입 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  return {
    state,
    dispatch,
    refs: { birthDateRef, phoneRef },
    handlers: { handleChange, handleComplete, handleBack },
  };
};
