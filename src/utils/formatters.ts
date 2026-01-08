/**
 * 휴대폰 번호 포맷팅 (010-0000-0000)
 */
export const formatPhone = (value: string) => {
  const nums = value.replace(/[^\d]/g, '');
  if (nums.length <= 3) return nums;
  if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
  return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7, 11)}`;
};

/**
 * 생년월일 포맷팅 (YYYY/MM/DD)
 */
export const formatBirth = (value: string) => {
  const nums = value.replace(/[^\d]/g, '');
  if (nums.length <= 4) return nums;
  if (nums.length <= 6) return `${nums.slice(0, 4)}/${nums.slice(4)}`;
  return `${nums.slice(0, 4)}/${nums.slice(4, 6)}/${nums.slice(6, 8)}`;
};
