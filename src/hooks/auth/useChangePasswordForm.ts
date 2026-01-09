import { useReducer, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { auth } from '../../firebase';
import { validatePassword } from 'utils';
import { changePassword, findUserByInfo, sendPasswordReset } from 'services/authService';

// --- State & Reducer ---
interface ChangePasswordState {
  mode: 'change' | 'reset';
  resetStep: 1 | 2;
  isSubmitting: boolean;
  showPassword: boolean;
  findInfo: { name: string; phone: string };
  foundEmail: { full: string; masked: string } | null;
  confirmedEmail: string;
  formData: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  };
  errors: Record<string, string>;
}

const initialState: ChangePasswordState = {
  mode: 'change',
  resetStep: 1,
  isSubmitting: false,
  showPassword: false,
  findInfo: { name: '', phone: '' },
  foundEmail: null,
  confirmedEmail: '',
  formData: { currentPassword: '', newPassword: '', confirmPassword: '' },
  errors: {},
};

type Action =
  | { type: 'INITIALIZE_MODE'; payload: 'change' | 'reset' }
  | { type: 'SET_RESET_STEP'; payload: 1 | 2 }
  | { type: 'SET_SUBMITTING'; payload: boolean }
  | { type: 'TOGGLE_SHOW_PASSWORD' }
  | { type: 'SET_FIELD'; field: keyof ChangePasswordState['formData']; value: string }
  | { type: 'SET_FIND_INFO'; field: keyof ChangePasswordState['findInfo']; value: string }
  | { type: 'SET_FOUND_EMAIL'; payload: ChangePasswordState['foundEmail'] }
  | { type: 'SET_CONFIRMED_EMAIL'; payload: string }
  | { type: 'SET_ERROR'; field: string; value: string }
  | { type: 'CLEAR_ERROR'; field: string };

function reducer(state: ChangePasswordState, action: Action): ChangePasswordState {
  switch (action.type) {
    case 'INITIALIZE_MODE':
      return { ...initialState, mode: action.payload };
    case 'SET_RESET_STEP':
      return { ...state, resetStep: action.payload };
    case 'SET_SUBMITTING':
      return { ...state, isSubmitting: action.payload };
    case 'TOGGLE_SHOW_PASSWORD':
      return { ...state, showPassword: !state.showPassword };
    case 'SET_FIELD':
      return { ...state, formData: { ...state.formData, [action.field]: action.value } };
    case 'SET_FIND_INFO':
      return { ...state, findInfo: { ...state.findInfo, [action.field]: action.value } };
    case 'SET_FOUND_EMAIL':
      return { ...state, foundEmail: action.payload };
    case 'SET_CONFIRMED_EMAIL':
      return { ...state, confirmedEmail: action.payload };
    case 'SET_ERROR':
      return { ...state, errors: { ...state.errors, [action.field]: action.value } };
    case 'CLEAR_ERROR':
      const newErrors = { ...state.errors };
      delete newErrors[action.field];
      return { ...state, errors: newErrors };
    default:
      return state;
  }
}

export const useChangePasswordForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [state, dispatch] = useReducer(reducer, initialState);

  // --- Effects for Validation and Initialization ---
  useEffect(() => {
    const mode = location.state?.from === 'login' ? 'reset' : 'change';
    dispatch({ type: 'INITIALIZE_MODE', payload: mode });
  }, [location.state]);

  useEffect(() => {
    if (state.mode === 'reset') return;

    if (!state.formData.newPassword) {
      dispatch({ type: 'CLEAR_ERROR', field: 'newPassword' });
      return;
    }
    const emailForValidation = auth.currentUser?.email || '';
    const validationResult = validatePassword(state.formData.newPassword, emailForValidation);

    if (validationResult !== true) {
      dispatch({ type: 'SET_ERROR', field: 'newPassword', value: validationResult as string });
    } else {
      dispatch({ type: 'CLEAR_ERROR', field: 'newPassword' });
    }
  }, [state.formData.newPassword, state.mode]);

  useEffect(() => {
    if (state.formData.confirmPassword && state.formData.newPassword !== state.formData.confirmPassword) {
      dispatch({ type: 'SET_ERROR', field: 'confirmPassword', value: '비밀번호가 일치하지 않습니다.' });
    } else {
      dispatch({ type: 'CLEAR_ERROR', field: 'confirmPassword' });
    }
  }, [state.formData.newPassword, state.formData.confirmPassword]);

  // --- Handlers ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    dispatch({ type: 'SET_FIELD', field: name as keyof ChangePasswordState['formData'], value });
  };

  const handleFindInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;
    if (name === 'phone') {
      const nums = value.replace(/[^\d]/g, '');
      if (nums.length <= 3) formattedValue = nums;
      else if (nums.length <= 7) formattedValue = `${nums.slice(0, 3)}-${nums.slice(3)}`;
      else formattedValue = `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7, 11)}`;
    }
    dispatch({ type: 'SET_FIND_INFO', field: name as keyof ChangePasswordState['findInfo'], value: formattedValue });
  };

  const handleFindEmail = async () => {
    if (!state.findInfo.name || !state.findInfo.phone) {
      toast.error('이름과 휴대폰 번호를 모두 입력해주세요.');
      return;
    }
    dispatch({ type: 'SET_SUBMITTING', payload: true });
    try {
      const data = await findUserByInfo(state.findInfo);
      if (data.found && data.full && data.masked) {
        dispatch({ type: 'SET_FOUND_EMAIL', payload: { full: data.full, masked: data.masked } });
        dispatch({ type: 'SET_RESET_STEP', payload: 2 });
        toast.success('가입된 이메일을 확인했습니다.');
      } else {
        toast.error('일치하는 사용자 정보가 없습니다.');
      }
    } catch (error) {
      toast.error('사용자 정보를 찾는 중 오류가 발생했습니다.');
      console.error('이메일 찾기 오류:', error);
    } finally {
      dispatch({ type: 'SET_SUBMITTING', payload: false });
    }
  };

  const handleSendResetEmail = async () => {
    if (!state.foundEmail) return;

    if (state.confirmedEmail.trim().toLowerCase() !== state.foundEmail.full.toLowerCase()) {
      toast.error('이메일 주소가 일치하지 않습니다.');
      return;
    }

    dispatch({ type: 'SET_SUBMITTING', payload: true });
    try {
      await sendPasswordReset(state.foundEmail.full);
      toast.success('비밀번호 재설정 이메일을 발송했습니다. 메일함을 확인해주세요.');
      setTimeout(() => navigate('/'), 2000);
    } catch (error) {
      toast.error('요청 처리 중 오류가 발생했습니다.');
      console.error('비밀번호 재설정 오류:', error);
    } finally {
      dispatch({ type: 'SET_SUBMITTING', payload: false });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state.mode === 'reset') return;

    const { currentPassword, newPassword } = state.formData;

    if (state.errors.newPassword || state.errors.confirmPassword) {
      toast.error('입력 값을 다시 확인해주세요.');
      return;
    }

    const user = auth.currentUser;
    if (!user || !user.email) {
      toast.error('로그인 정보가 유효하지 않습니다.');
      navigate('/login', { replace: true });
      return;
    }

    const isPasswordProvider = user.providerData.some((p) => p.providerId === 'password');
    if (!isPasswordProvider) {
      toast.error('소셜 로그인 사용자는 앱 내에서 비밀번호를 변경할 수 없습니다.');
      navigate('/profile');
      return;
    }

    if (currentPassword === newPassword) {
      toast.error('기존 비밀번호와 다른 비밀번호를 사용해주세요.');
      return;
    }

    dispatch({ type: 'SET_SUBMITTING', payload: true });
    try {
      await changePassword(user, { currentPassword, newPassword });
      toast.success('비밀번호가 성공적으로 변경되었습니다.');
      navigate('/profile');
    } catch (error: any) {
      if (error.code === 'auth/wrong-password') {
        toast.error('현재 비밀번호가 일치하지 않습니다.');
      } else if (error.code === 'auth/too-many-requests') {
        toast.error('너무 많은 요청이 있었습니다. 잠시 후 다시 시도해주세요.');
      } else {
        toast.error('비밀번호 변경 중 오류가 발생했습니다.');
      }
      console.error('비밀번호 변경 오류:', error);
    } finally {
      dispatch({ type: 'SET_SUBMITTING', payload: false });
    }
  };

  return {
    state,
    dispatch,
    handlers: {
      handleChange,
      handleFindInfoChange,
      handleFindEmail,
      handleSendResetEmail,
      handleSubmit,
    },
  };
};
