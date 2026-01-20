/**
 * 휴대폰 번호 포맷팅 함수 (010-0000-0000)
 *
 * @param {string} value - 숫자만 포함된 문자열 또는 포맷팅되지 않은 전화번호
 * @returns {string} 하이픈이 포함된 전화번호 문자열
 */
export const formatPhone = (value: string) => {
  const nums = value.replace(/[^\d]/g, '');
  if (nums.length <= 3) return nums;
  if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
  return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7, 11)}`;
};

/**
 * 생년월일 포맷팅 함수 (YYYY/MM/DD)
 *
 * @param {string} value - 숫자만 포함된 문자열
 * @returns {string} 슬래시가 포함된 생년월일 문자열
 */
export const formatBirth = (value: string) => {
  const nums = value.replace(/[^\d]/g, '');
  if (nums.length <= 4) return nums;
  if (nums.length <= 6) return `${nums.slice(0, 4)}/${nums.slice(4)}`;
  return `${nums.slice(0, 4)}/${nums.slice(4, 6)}/${nums.slice(6, 8)}`;
};
