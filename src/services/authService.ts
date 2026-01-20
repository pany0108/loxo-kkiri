import {
  createUserWithEmailAndPassword,
  updateProfile,
  User,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithCredential,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth, googleProvider } from '../firebase';
import { setupInitialCalendars } from './userService';
import { getDocument, setDocument } from './firestoreService';

export interface SignUpData {
  email: string;
  password: string;
  lastName: string;
  firstName: string;
  phone: string;
  birthDate: string;
  isLunar: boolean;
  isLeapMonth: boolean;
}

interface UserProfileData {
  lastName: string;
  firstName: string;
  phone: string;
  birthDate: string;
  isLunar: boolean;
  isLeapMonth: boolean;
}

/**
 * 사용자 프로필 생성 및 초기 데이터 설정을 완료합니다.
 * - 회원가입 및 소셜 로그인 추가 정보 입력 시 공통으로 사용됩니다.
 *
 * @param {User} user - Firebase 사용자 객체
 * @param {UserProfileData} data - 사용자 프로필 정보
 * @returns {Promise<{ fullName: string }>} 사용자 전체 이름
 */
const finalizeUserSetup = async (user: User, data: UserProfileData): Promise<{ fullName: string }> => {
  const { lastName, firstName, phone, birthDate, isLunar, isLeapMonth } = data;
  const fullName = `${lastName}${firstName}`;

  // 1. Update Firebase Auth profile displayName
  await updateProfile(user, { displayName: fullName });

  // 2. Save user details to Firestore
  await setDocument('users', user.uid, {
    uid: user.uid,
    email: user.email,
    name: fullName,
    lastName,
    firstName,
    phone: phone.replace(/[^\d]/g, ''), // Store only digits
    birthDate,
    isLeapMonth: isLunar && isLeapMonth,
    birthDateType: isLunar ? 'lunar' : 'solar',
    fcmTokens: [],
  });

  // 3. Set up initial calendars and birthday schedule
  await setupInitialCalendars(user, { birthDate, isLunar, isLeapMonth });

  return { fullName };
};

/**
 * 이메일/비밀번호로 회원가입을 진행합니다.
 *
 * @param {SignUpData} data - 회원가입 정보
 * @returns {Promise<{ user: User; fullName: string }>} 생성된 사용자 객체 및 이름
 * @throws {Error} Firebase 인증 에러 발생 시
 */
export const signUpUser = async (data: SignUpData): Promise<{ user: User; fullName: string }> => {
  const { email, password, ...profileData } = data;

  // 1. Create user with email and password
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // 2. Finalize user profile and initial data setup
  const { fullName } = await finalizeUserSetup(user, profileData);

  return { user, fullName };
};

export interface SocialSignUpData {
  lastName: string;
  firstName: string;
  phone: string;
  birthDate: string;
  isLunar: boolean;
  isLeapMonth: boolean;
}

/**
 * 소셜 로그인 사용자의 추가 정보 입력을 완료합니다.
 *
 * @param {User} user - 소셜 로그인된 Firebase 사용자 객체
 * @param {SocialSignUpData} data - 추가 입력 정보
 * @returns {Promise<{ fullName: string }>} 사용자 전체 이름
 */
export const completeSocialSignUp = async (user: User, data: SocialSignUpData): Promise<{ fullName: string }> => {
  // Finalize user profile and initial data setup
  return finalizeUserSetup(user, data);
};

export interface EmailSignInCredentials {
  email: string;
  password: string;
}

/**
 * 이메일/비밀번호로 로그인합니다.
 *
 * @param {EmailSignInCredentials} credentials - 이메일 및 비밀번호
 * @returns {Promise<User>} 인증된 사용자 객체
 */
export const signInWithEmail = async (credentials: EmailSignInCredentials): Promise<User> => {
  const { email, password } = credentials;
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

/**
 * 구글 로그인을 진행합니다. (Native/Web 지원)
 *
 * @returns {Promise<User>} 인증된 사용자 객체
 */
export const signInWithGoogle = async (): Promise<User> => {
  if (Capacitor.isNativePlatform()) {
    // Native flow: sign out first to always show account picker.
    try {
      await GoogleAuth.signOut();
    } catch (e) {
      console.info('GoogleAuth signOut failed, this is expected if not signed in.');
    }
    const googleUser = await GoogleAuth.signIn();
    const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
    const result = await signInWithCredential(auth, credential);
    return result.user;
  } else {
    // Web flow: prompt for account selection.
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  }
};

export interface CheckUserRegistrationResult {
  isNewUser: boolean;
  state?: {
    uid: string;
    email: string;
    lastName: string;
    firstName: string;
  };
}

/**
 * 사용자의 가입 상태(신규/기존)를 확인합니다.
 * - 프로필 정보가 불완전한 경우 신규 사용자로 간주합니다.
 *
 * @param {User} user - Firebase 사용자 객체
 * @returns {Promise<CheckUserRegistrationResult>} 신규 사용자 여부 및 상태 정보
 */
export const checkUserRegistration = async (user: User): Promise<CheckUserRegistrationResult> => {
  const userData = await getDocument<{ phone?: string }>('users', user.uid);

  if (userData?.phone) {
    // Existing user with a complete profile.
    return { isNewUser: false };
  } else {
    // New user or incomplete profile.
    if (!userData) {
      const providerData = user.providerData[0];
      await setDocument('users', user.uid, {
        uid: user.uid,
        email: user.email || '',
        name: user.displayName || '이름 없음',
        photoURL: user.photoURL || '',
        provider: providerData ? providerData.providerId : 'unknown',
        // `createdAt` will be added automatically by `setDocument` on creation
        fcmTokens: [],
      });
    }

    const signupData = {
      uid: user.uid,
      email: user.email || '',
      lastName: user.displayName?.charAt(0) || '',
      firstName: user.displayName?.slice(1) || '',
    };

    return { isNewUser: true, state: signupData };
  }
};

export interface ChangePasswordCredentials {
  currentPassword: string;
  newPassword: string;
}

/**
 * 비밀번호를 변경합니다.
 * - 보안을 위해 재인증 과정을 거칩니다.
 *
 * @param {User} user - 현재 로그인된 사용자 객체
 * @param {ChangePasswordCredentials} credentials - 현재 비밀번호 및 새 비밀번호
 * @returns {Promise<void>}
 */
export const changePassword = async (user: User, credentials: ChangePasswordCredentials): Promise<void> => {
  const { currentPassword, newPassword } = credentials;

  if (!user.email) {
    throw new Error('User does not have an email address.');
  }

  // 1. Re-authenticate the user
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);

  // 2. Update the password
  await updatePassword(user, newPassword);
};

export interface FindUserInfo {
  name: string;
  phone: string;
}

export interface FindUserResult {
  found: boolean;
  full?: string;
  masked?: string;
}

/**
 * 이름과 전화번호로 사용자 이메일을 찾습니다. (Cloud Function 호출)
 *
 * @param {FindUserInfo} info - 이름 및 전화번호
 * @returns {Promise<FindUserResult>} 찾은 이메일 정보
 */
export const findUserByInfo = async (info: FindUserInfo): Promise<FindUserResult> => {
  // Explicitly specify the region for the Cloud Function.
  const functions = getFunctions(undefined, 'asia-northeast3');
  const findUserByInfoFunction = httpsCallable(functions, 'findUserByInfo');
  const result = await findUserByInfoFunction({ name: info.name, phone: info.phone.replace(/[^\d]/g, '') });
  return result.data as FindUserResult;
};

/**
 * 비밀번호 재설정 이메일을 발송합니다.
 *
 * @param {string} email - 이메일 주소
 * @returns {Promise<void>}
 */
export const sendPasswordReset = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(auth, email);
};
