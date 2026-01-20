import { useState } from 'react';

import { MyNewSlot } from 'services';

/**
 * 약속 시간 조율(응답) 폼 로직을 처리하는 커스텀 훅
 * - 주최자 제안 시간 선택 및 역제안 시간 관리를 담당합니다.
 * @param {any[]} hostSlots - 주최자가 제안한 시간대 목록
 */
export const useMeetingResponseForm = (hostSlots: any[]) => {
  const [selectedHostSlots, setSelectedHostSlots] = useState<string[]>([]);
  const [myNewSlots, setMyNewSlots] = useState<MyNewSlot[]>([]);

  /** 주최자 제안 슬롯 토글 핸들러 */
  const toggleHostSlot = (slotId: string) => {
    setSelectedHostSlots((prev) => (prev.includes(slotId) ? prev.filter((id) => id !== slotId) : [...prev, slotId]));
  };

  /** 역제안 날짜 토글 핸들러 */
  const toggleMyNewSlot = (dateStr: string) => {
    const isHostDate = hostSlots.some((s) => s.date === dateStr);
    if (isHostDate) return;

    if (myNewSlots.find((s) => s.date === dateStr)) {
      setMyNewSlots((prev) => prev.filter((s) => s.date !== dateStr));
    } else {
      setMyNewSlots((prev) => [...prev, { date: dateStr, startTime: '12:00', endTime: '14:00', isAllDay: false }]);
    }
  };

  /** 역제안 시간 변경 핸들러 */
  const updateSlotTime = (dateStr: string, field: 'startTime' | 'endTime', value: string) => {
    setMyNewSlots((prev) => prev.map((s) => (s.date === dateStr ? { ...s, [field]: value, isAllDay: false } : s)));
  };

  /** 역제안 종일 토글 핸들러 */
  const toggleAllDay = (dateStr: string) => {
    setMyNewSlots((prev) => prev.map((s) => (s.date === dateStr ? { ...s, isAllDay: !s.isAllDay } : s)));
  };

  return {
    selectedHostSlots,
    myNewSlots,
    toggleHostSlot,
    toggleMyNewSlot,
    updateSlotTime,
    toggleAllDay,
  };
};
