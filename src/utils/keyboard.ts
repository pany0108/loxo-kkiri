import React from 'react';

/**
 * Handles key down events on an input field.
 * - Prevents Hangul input in password fields.
 * - Moves focus to the next field on 'Enter'.
 * @param e The keyboard event.
 * @param nextRef A ref to the next input element to focus.
 * @param isPasswordField Whether the input is a password field.
 */
export const handleEnterToNext = (e: React.KeyboardEvent<HTMLInputElement>, nextRef: React.RefObject<HTMLInputElement | null> | null, isPasswordField: boolean = false) => {
  if (isPasswordField) {
    // Prevent Hangul composition
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
