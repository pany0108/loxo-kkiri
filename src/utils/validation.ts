export const validatePassword = (password: string, userId: string, userInfo: any) => {
  const specialChars = /[!@#$%^&*]/;
  const alphabet = /[a-zA-Z]/;
  const numbers = /[0-9]/;

  if (password.length < 10) return '비밀번호는 최소 10자 이상이어야 합니다.';
  if (!(specialChars.test(password) && alphabet.test(password) && numbers.test(password))) {
    return '숫자, 영문, 특수기호(!@#$%^&*)를 모두 조합해야 합니다.';
  }
  if (password.includes(userId)) return '아이디를 비밀번호에 포함할 수 없습니다.';

  // 3회 이상 반복되는 문자 확인 (aaa, 111 등)
  const repeatRegex = /(.)\1\1/;
  if (repeatRegex.test(password)) return '동일한 문자를 3회 이상 반복할 수 없습니다.';

  // 연속된 숫자/문자 확인 (123, abc 등) - 간단한 버전
  const sequential = '01234567890abcdefghijklmnopqrstuvwxyz';
  for (let i = 0; i < password.length - 2; i++) {
    const segment = password.substring(i, i + 3).toLowerCase();
    if (sequential.includes(segment)) return '연속된 문자나 숫자를 사용할 수 없습니다.';
  }

  return true;
};
