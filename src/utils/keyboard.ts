import React from 'react';

/**
 * 입력 필드에서 키 다운 이벤트를 처리하는 핸들러
 * - 비밀번호 필드인 경우 한글 입력을 방지합니다.
 * - Enter 키 입력 시 다음 입력 필드로 포커스를 이동합니다.
 *
 * @param {React.KeyboardEvent<HTMLInputElement>} e - 키보드 이벤트 객체
 * @param {React.RefObject<HTMLInputElement | null> | null} nextRef - 포커스를 이동할 다음 입력 필드의 Ref
 * @param {boolean} [isPasswordField=false] - 비밀번호 필드 여부
 */
export const handleEnterToNext = (e: React.KeyboardEvent<HTMLInputElement>, nextRef: React.RefObject<HTMLInputElement | null> | null, isPasswordField: boolean = false) => {
  if (isPasswordField) {
    // 한글 조합 방지
    if (e.nativeEvent.isComposing || e.key === 'Process') {
      e.preventDefault();
      return;
    }
  }

  if (e.key === 'Enter' && nextRef?.current) {
    e.preventDefault();
    nextRef.current.focus();
  }
};
