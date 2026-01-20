/**
 * 주어진 날짜가 해당 월의 몇 번째 주인지 계산하여 반환합니다.
 *
 * @param {Date} date - 계산할 날짜 객체
 * @returns {string} "YYYY년 M월 N째주" 형식의 문자열
 */
export const getWeekOfMonth = (date: Date): string => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const firstDayOfMonth = new Date(year, date.getMonth(), 1);
  const firstWeekday = firstDayOfMonth.getDay();
  const weekNumber = Math.ceil((date.getDate() + firstWeekday) / 7);
  return `${year}년 ${month}월 ${weekNumber}째주`;
};
