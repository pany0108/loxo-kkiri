export const validatePassword = (password: string, userData: any) => {
  const { userId, name, birthDate, phone } = userData;

  // 1. 최소 10자 이상, 영문/숫자/특수문자 조합
  const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{10,}$/;
  if (!passwordRegex.test(password)) {
    return '10자 이상, 영문, 숫자, 특수문자(!@#$%^&*)를 포함해야 합니다.';
  }

  // 2. 동일한 문자 3회 이상 반복 금지
  if (/(\w)\1\1/.test(password)) {
    return '동일한 문자를 3회 이상 반복할 수 없습니다.';
  }

  // 3. 연속된 숫자/문자 금지 (abc, 123 등)
  for (let i = 0; i < password.length - 2; i++) {
    const c1 = password.charCodeAt(i);
    const c2 = password.charCodeAt(i + 1);
    const c3 = password.charCodeAt(i + 2);
    if ((c1 + 1 === c2 && c2 + 1 === c3) || (c1 - 1 === c2 && c2 - 1 === c3)) {
      return '연속된 문자나 숫자를 사용할 수 없습니다.';
    }
  }

  // 4. 개인정보 포함 금지
  const birthClean = birthDate?.replace(/\//g, '') || '';
  const phoneLast = phone?.split('-').pop() || '';

  if ((userId && password.includes(userId)) || (name && password.includes(name)) || (birthClean && password.includes(birthClean)) || (phoneLast && password.includes(phoneLast))) {
    return '비밀번호에 아이디, 이름, 생년월일, 전화번호 등 개인정보를 포함할 수 없습니다.';
  }

  return true;
};
