import { useContext } from 'react';
import { AuthContext } from 'contexts/AuthContext';

/**
 * 전역 사용자 인증 상태를 제공하는 커스텀 훅입니다.
 * AuthProvider 내부에서 사용해야 합니다.
 * @returns {{user: User | null, loading: boolean}} 현재 사용자 객체와 로딩 상태
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
