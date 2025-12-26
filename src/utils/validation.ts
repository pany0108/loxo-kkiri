export const validatePassword = (password: string, userId: string, userInfo: any) => {
  const specialChars = /[!@#$%^&*]/;
  const alphabet = /[a-zA-Z]/;
  const numbers = /[0-9]/;

  if (password.length < 10) return '최소 10자 이상이어야 합니다.';
  if (!(specialChars.test(password) && alphabet.test(password) && numbers.test(password))) {
    return '영문, 숫자, 특수기호 조합이 필요합니다.';
  }
  if (password.includes(userId)) return '아이디를 비밀번호에 포함할 수 없습니다.';

  // 연속 문자 및 반복 문자 검사 (예: 111, abc)
  const repeatRegex = /(.)\1\1/;
  if (repeatRegex.test(password)) return '동일한 문자를 3회 이상 반복할 수 없습니다.';

  return true;
};
