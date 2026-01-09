/**
 * 비밀번호 유효성 검사 헬퍼 함수
 * - 길이(10자 이상), 문자 조합(영문/숫자/특수문자 중 2개 이상), 아이디 포함 여부를 검사합니다.
 * @param {string} password - 검사할 비밀번호
 * @param {string} email - 사용자 이메일 (아이디 포함 여부 체크용)
 * @returns {string | true} 유효하면 true, 아니면 에러 메시지 문자열 반환
 */
export const validatePassword = (password: string, email: string): string | true => {
  if (!password) {
    return '비밀번호를 입력해주세요.';
  }
  if (password.length < 10) {
    return '비밀번호는 10자 이상이어야 합니다.';
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const combinations = [hasLetter, hasNumber, hasSpecial].filter(Boolean).length;
  if (combinations < 2) {
    return '영문, 숫자, 특수문자 중 2종류 이상을 조합해주세요.';
  }

  const emailId = (email || '').split('@')[0];
  if (emailId && password.includes(emailId)) {
    return '비밀번호에 아이디를 포함할 수 없습니다.';
  }

  return true;
};
