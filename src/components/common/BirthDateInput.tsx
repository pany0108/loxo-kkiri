import React, { useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { FormInput } from 'components';
import { formatBirth } from 'utils';

interface BirthDateInputProps {
  inputRef: React.RefObject<HTMLInputElement>;
  value: string;
  isLunar: boolean;
  isLeapMonth: boolean;
  onValueChange: (value: string) => void;
  onTypeChange: (details: { isLunar: boolean; isLeapMonth: boolean }) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  required?: boolean;
}

const BirthDateInput: React.FC<BirthDateInputProps> = ({ inputRef, value, isLunar, isLeapMonth, onValueChange, onTypeChange, onKeyDown, required }) => {
  // 양력으로 전환 시, 윤달은 비활성화합니다.
  useEffect(() => {
    if (!isLunar && isLeapMonth) {
      onTypeChange({ isLunar: false, isLeapMonth: false });
    }
  }, [isLunar, isLeapMonth, onTypeChange]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onValueChange(formatBirth(e.target.value));
  };

  return (
    <div>
      <div className="flex items-center justify-end mb-2 px-1 h-6">
        <div className="flex items-center gap-2">
          {isLunar && (
            <label className="flex items-center gap-1.5 cursor-pointer animate-in fade-in">
              <input
                type="checkbox"
                checked={isLeapMonth}
                onChange={(e) => onTypeChange({ isLunar, isLeapMonth: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800"
              />
              <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">윤달</span>
            </label>
          )}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => onTypeChange({ isLunar: false, isLeapMonth })}
              className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${
                !isLunar ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-gray-200 shadow-sm' : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              양력
            </button>
            <button
              type="button"
              onClick={() => onTypeChange({ isLunar: true, isLeapMonth })}
              className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${
                isLunar ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-gray-200 shadow-sm' : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              음력
            </button>
          </div>
        </div>
      </div>
      <FormInput
        inputRef={inputRef}
        icon={<Calendar size={20} />}
        name="birthDate"
        type="tel"
        enterKeyHint="next"
        inputMode="numeric"
        value={value}
        placeholder="생년월일 (YYYY/MM/DD)"
        onChange={handleDateChange}
        onKeyDown={onKeyDown}
        required={required}
        maxLength={10}
      />
    </div>
  );
};

export default BirthDateInput;
