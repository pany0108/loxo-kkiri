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
import { auth, googleProvider } from '../firebase';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { setupInitialCalendars } from './userService';
import { getDocument, setDocument } from './firestoreService';

// Define the shape of the data required for sign-up
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
 * Signs up a new user or completes a social sign-up by creating their profile and setting up initial data.
 * This is a helper function to be used by signUpUser and completeSocialSignUp.
 * @param user - The Firebase user object.
 * @param data - The user's profile information.
 * @returns The user's full name.
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
 * Signs up a new user, creates their profile, and sets up initial data.
 * Throws an error from Firebase on failure, which should be caught by the caller.
 * @param data - The user's sign-up information.
 * @returns An object containing the newly created user and their full name.
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
 * Completes the sign-up process for a social login user by adding additional details.
 * Throws an error on failure.
 * @param user - The existing Firebase user object from social login.
 * @param data - The additional user information from the form.
 * @returns An object containing the user's full name.
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
 * Signs in a user with their email and password.
 * Throws a Firebase error on failure.
 * @param credentials - The user's email and password.
 * @returns The authenticated user object.
 */
export const signInWithEmail = async (credentials: EmailSignInCredentials): Promise<User> => {
  const { email, password } = credentials;
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

/**
 * Signs in a user with Google, handling both native and web platforms.
 * Throws a Firebase error on failure.
 * @returns The authenticated user object from Google sign-in.
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
 * Checks if a user is new or has an incomplete profile.
 * Creates a basic user document in Firestore if one doesn't exist.
 * @param user - The Firebase user object.
 * @returns An object indicating if the user is new and state for the next step.
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
 * Changes the password for the currently authenticated user.
 * Throws a Firebase error on failure.
 * @param user - The currently authenticated Firebase user object.
 * @param credentials - The current and new passwords.
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
 * Finds a user's email by their name and phone number using a Cloud Function.
 * Throws an error on failure.
 * @param info - The user's name and phone number.
 * @returns An object containing the found user's email information.
 */
export const findUserByInfo = async (info: FindUserInfo): Promise<FindUserResult> => {
  // Explicitly specify the region for the Cloud Function.
  const functions = getFunctions(undefined, 'asia-northeast3');
  const findUserByInfoFunction = httpsCallable(functions, 'findUserByInfo');
  const result = await findUserByInfoFunction({ name: info.name, phone: info.phone.replace(/[^\d]/g, '') });
  return result.data as FindUserResult;
};

/**
 * Sends a password reset email to the specified email address.
 * Throws a Firebase error on failure.
 * @param email - The user's email address.
 */
export const sendPasswordReset = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(auth, email);
};
