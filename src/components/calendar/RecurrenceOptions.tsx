import React, { useState } from 'react';
import dayjs from 'dayjs';
import { ChevronDown, Repeat } from 'lucide-react';

// [수정] interval과 endCount가 빈 값('')을 가질 수 있도록 타입 변경
export interface RecurrenceSettings {
  frequency: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number | ''; // 빈 값 허용
  daysOfWeek: number[];
  monthlyType: 'date' | 'nth_day' | 'last_day';
  endType: 'none' | 'date' | 'count';
  endDate: string;
  endCount: number | ''; // 빈 값 허용
}

interface RecurrenceOptionsProps {
  startDate: string;
  value: RecurrenceSettings;
  onChange: (settings: RecurrenceSettings) => void;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const RecurrenceOptions = ({ startDate, value, onChange }: RecurrenceOptionsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const startDayjs = dayjs(startDate);

  const currentDay = startDayjs.date();
  const currentMonth = startDayjs.month() + 1;
  const currentWeekday = startDayjs.day();
  const weekNumber = Math.ceil(currentDay / 7);

  const handleChange = (field: keyof RecurrenceSettings, val: any) => {
    onChange({ ...value, [field]: val });
  };

  const toggleDayOfWeek = (dayIdx: number) => {
    const currentDays = value.daysOfWeek;
    let newDays;
    if (currentDays.includes(dayIdx)) {
      newDays = currentDays.filter((d) => d !== dayIdx);
    } else {
      newDays = [...currentDays, dayIdx].sort();
    }
    handleChange('daysOfWeek', newDays);
  };

  // [수정] 숫자 입력 핸들러 (빈 값 처리 포함)
  const handleNumberInput = (field: 'interval' | 'endCount', inputValue: string) => {
    // 1. 빈 값인 경우 바로 적용
    if (inputValue === '') {
      handleChange(field, '');
      return;
    }

    // 2. 숫자가 아닌 문자가 포함된 경우 무시 (정규식 검사)
    if (!/^\d+$/.test(inputValue)) {
      return;
    }

    // 3. 숫자 변환 후 저장 (1 이상만 허용하고 싶다면 조건 추가 가능)
    const num = parseInt(inputValue, 10);
    handleChange(field, num);
  };

  const getSummaryText = () => {
    if (value.frequency === 'none') return '반복 없음';

    // 빈 값일 경우 '1'로 간주하여 텍스트 표시 (UX 보정)
    const intervalDisplay = value.interval === '' ? 1 : value.interval;

    let text = '';
    if (value.frequency === 'daily') text = `매일(${intervalDisplay}일마다)`;
    if (value.frequency === 'weekly') {
      const days = value.daysOfWeek.map((d) => WEEKDAYS[d]).join(',');
      text = `매주 ${intervalDisplay > 1 ? `${intervalDisplay}주 ` : ''}${days}`;
    }
    if (value.frequency === 'monthly') text = `매월(${intervalDisplay}개월마다)`;
    if (value.frequency === 'yearly') text = `매년(${intervalDisplay}년마다)`;

    if (value.endType === 'count') {
      const countDisplay = value.endCount === '' ? 10 : value.endCount;
      text += `, ${countDisplay}회`;
    }
    if (value.endType === 'date') text += `, ${value.endDate}까지`;

    return text;
  };

  return (
    <div className="space-y-3">
      <label className="block text-[13px] font-black text-gray-400 ml-1">반복 설정</label>

      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between h-[60px] px-5 rounded-[20px] border-2 transition-all cursor-pointer
          ${value.frequency !== 'none' ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-gray-50 border-transparent text-gray-800'}
        `}
      >
        <div className="flex items-center gap-3">
          <Repeat size={18} className={value.frequency !== 'none' ? 'text-blue-500' : 'text-gray-400'} />
          <span className="text-[14px] font-bold">{getSummaryText()}</span>
        </div>
        <ChevronDown size={18} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${value.frequency !== 'none' ? 'text-blue-400' : 'text-gray-300'}`} />
      </div>

      {isOpen && (
        <div className="bg-white border-2 border-gray-100 rounded-[24px] p-5 space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* 반복 주기 선택 */}
          <div className="flex gap-2 p-1 bg-gray-50 rounded-xl overflow-x-auto">
            {['none', 'daily', 'weekly', 'monthly', 'yearly'].map((freq) => (
              <button
                key={freq}
                type="button"
                onClick={() => {
                  let newSettings = { ...value, frequency: freq as any };
                  if (freq === 'weekly' && value.daysOfWeek.length === 0) {
                    newSettings.daysOfWeek = [currentWeekday];
                  }
                  onChange(newSettings);
                }}
                className={`flex-1 py-2 rounded-lg text-[12px] font-bold whitespace-nowrap px-3 transition-all
                  ${value.frequency === freq ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}
                `}
              >
                {{ none: '없음', daily: '매일', weekly: '매주', monthly: '매월', yearly: '매년' }[freq]}
              </button>
            ))}
          </div>

          {value.frequency !== 'none' && (
            <>
              {/* 간격 설정 */}
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-bold text-gray-500">반복 간격</span>
                <div className="flex items-center bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-200 focus-within:border-blue-500 focus-within:bg-white transition-all">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={value.interval}
                    onChange={(e) => handleNumberInput('interval', e.target.value)}
                    className="w-10 bg-transparent text-center font-bold text-gray-800 outline-none"
                    placeholder=""
                  />
                  <span className="text-[13px] text-gray-500 font-medium">{{ daily: '일', weekly: '주', monthly: '개월', yearly: '년' }[value.frequency]}마다</span>
                </div>
              </div>

              {/* 주간 반복 요일 선택 */}
              {value.frequency === 'weekly' && (
                <div className="space-y-2">
                  <span className="text-[13px] font-bold text-gray-500">반복 요일</span>
                  <div className="flex justify-between gap-1">
                    {WEEKDAYS.map((day, idx) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDayOfWeek(idx)}
                        className={`w-9 h-9 rounded-full text-[12px] font-bold transition-all
                          ${value.daysOfWeek.includes(idx) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}
                        `}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 월간/연간 기준 선택 */}
              {(value.frequency === 'monthly' || value.frequency === 'yearly') && (
                <div className="space-y-2">
                  <span className="text-[13px] font-bold text-gray-500">반복 기준</span>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded-lg">
                      <input
                        type="radio"
                        checked={value.monthlyType === 'date'}
                        onChange={() => handleChange('monthlyType', 'date')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-[13px] font-medium text-gray-700">
                        {value.frequency === 'monthly' ? `매월 ${currentDay}일` : `매년 ${currentMonth}월 ${currentDay}일`}
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded-lg">
                      <input
                        type="radio"
                        checked={value.monthlyType === 'nth_day'}
                        onChange={() => handleChange('monthlyType', 'nth_day')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-[13px] font-medium text-gray-700">
                        {value.frequency === 'monthly'
                          ? `매월 ${weekNumber}번째 ${WEEKDAYS[currentWeekday]}요일`
                          : `매년 ${currentMonth}월 ${weekNumber}번째 ${WEEKDAYS[currentWeekday]}요일`}
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded-lg">
                      <input
                        type="radio"
                        checked={value.monthlyType === 'last_day'}
                        onChange={() => handleChange('monthlyType', 'last_day')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-[13px] font-medium text-gray-700">{value.frequency === 'monthly' ? '매월 마지막 날' : `매년 ${currentMonth}월 마지막 날`}</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="h-[1px] bg-gray-100 my-2" />

              {/* 종료 조건 */}
              <div className="space-y-3">
                <span className="text-[13px] font-bold text-gray-500">반복 종료</span>

                <div className="space-y-2">
                  <label className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <input type="radio" name="endType" checked={value.endType === 'none'} onChange={() => handleChange('endType', 'none')} className="text-blue-600" />
                      <span className="text-[13px] font-medium text-gray-700">없음 (계속 반복)</span>
                    </div>
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <input type="radio" name="endType" checked={value.endType === 'date'} onChange={() => handleChange('endType', 'date')} className="text-blue-600" />
                      <span className="text-[13px] font-medium text-gray-700">날짜</span>
                    </div>
                    <input
                      type="date"
                      value={value.endDate}
                      disabled={value.endType !== 'date'}
                      onChange={(e) => handleChange('endDate', e.target.value)}
                      className="bg-white border border-gray-200 rounded-md px-2 py-1 text-[12px] outline-none focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <input type="radio" name="endType" checked={value.endType === 'count'} onChange={() => handleChange('endType', 'count')} className="text-blue-600" />
                      <span className="text-[13px] font-medium text-gray-700">횟수</span>
                    </div>
                    <div
                      className={`flex items-center gap-2 bg-white border rounded-md px-2 py-1 transition-all ${
                        value.endType === 'count' ? 'border-gray-200 focus-within:border-blue-500' : 'bg-gray-100 border-gray-200'
                      }`}
                    >
                      <input
                        type="text"
                        inputMode="numeric"
                        value={value.endCount}
                        disabled={value.endType !== 'count'}
                        onChange={(e) => handleNumberInput('endCount', e.target.value)}
                        placeholder=""
                        className="w-8 bg-transparent text-center text-[12px] outline-none disabled:text-gray-400"
                      />
                      <span className={`text-[12px] ${value.endType === 'count' ? 'text-gray-500' : 'text-gray-400'}`}>회</span>
                    </div>
                  </label>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default RecurrenceOptions;
