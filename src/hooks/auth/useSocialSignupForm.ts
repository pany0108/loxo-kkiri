import { useReducer, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { signOut } from 'firebase/auth';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { formatPhone } from 'utils';
import { completeSocialSignUp, SocialSignUpData } from 'services/authService';

// --- State & Reducer ---
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

const initialState: SocialSignupState = {
  formData: { phone: '', birthDate: '' },
  isLoading: false,
  isLeapMonth: false,
  isLunar: false,
  isVerified: true, // [임시] 휴대폰 인증 비활성화 (원래 false)
  userData: null,
};

type Action =
  | { type: 'SET_USER_DATA'; payload: SocialSignupState['userData'] }
  | { type: 'SET_FIELD'; field: keyof SocialSignupState['formData']; value: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_BIRTH_TYPE'; payload: { isLunar: boolean; isLeapMonth: boolean } };

function reducer(state: SocialSignupState, action: Action): SocialSignupState {
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

export const useSocialSignupForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [state, dispatch] = useReducer(reducer, initialState);
  const { formData, userData, isLunar, isLeapMonth, isLoading, isVerified } = state;

  const birthDateRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  // Initialize user data from location state or local storage
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

  // Check user status and redirect if already completed or if data is missing
  useEffect(() => {
    const checkUserStatus = async () => {
      if (userData?.uid) {
        const userRef = doc(db, 'users', userData.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data()?.phone && userSnap.data()?.birthDate) {
          navigate('/calendar', { replace: true });
        }
      } else {
        const timer = setTimeout(() => {
          if (!localStorage.getItem('pendingSignup')) {
            toast.error('인증 정보가 만료되었습니다. 다시 로그인해주세요.');
            navigate('/login', { replace: true });
          }
        }, 500);
        return () => clearTimeout(timer);
      }
    };
    checkUserStatus();
  }, [userData, navigate]);

  // Cleanup effects
  useEffect(() => {
    sessionStorage.removeItem('isAuthChecking');
    return () => {
      localStorage.removeItem('pendingSignup');
    };
  }, []);

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

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listenerPromise = CapacitorApp.addListener('backButton', () => handleBack());
    return () => {
      listenerPromise.then((listener: PluginListenerHandle) => listener.remove());
    };
  }, [handleBack]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const formattedValue = name === 'phone' ? formatPhone(value) : value;
    dispatch({ type: 'SET_FIELD', field: name as keyof SocialSignupState['formData'], value: formattedValue });
  };

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
