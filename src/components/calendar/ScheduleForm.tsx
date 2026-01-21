import React from 'react';
import {
  AlignLeft,
  Bell,
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
  Clock,
  FileText,
  History,
  Map,
  MapPin,
  Maximize2,
  Minus,
  Palette,
  Pencil,
  Plus,
  Sparkles,
} from 'lucide-react';

import { FormCheckbox, FormInput, FormTextarea, RecurrenceOptions } from 'components';
import { RecurrenceSettings } from 'components/calendar/RecurrenceOptions';
import { COLOR_OPTIONS, ICON_MAP, NOTIFICATION_OPTIONS } from 'utils';

interface ScheduleFormProps {
  formData: any;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleToggleAllDay: () => void;
  handleAnniversaryChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleLunarChange: (isLunar: boolean) => void;
  recurrence: RecurrenceSettings;
  setRecurrence: (settings: RecurrenceSettings) => void;
  myCalendars: any[];
  selectedCalendar: any;
  isCalListOpen: boolean;
  setIsCalListOpen: (isOpen: boolean) => void;
  handleCalendarSelect: (calendar: any) => void;
  currentUser: any;
  navigate: any;
  openMapModal: () => void;
  titleInputRef?: React.RefObject<HTMLDivElement>;
  scheduleSearchResults?: any[];
  showSuggestions?: boolean;
  setShowSuggestions?: (show: boolean) => void;
  handleSuggestionClick?: (schedule: any) => void;
  dropdownRef?: React.RefObject<HTMLDivElement>;
  isEditMode?: boolean;
}

/**
 * 일정 입력 폼 컴포넌트
 * - 제목, 캘린더 선택, 날짜/시간, 반복 설정, 장소, 알림, 메모 등을 입력받습니다.
 *
 * @param {ScheduleFormProps} props
 * @returns {JSX.Element}
 */
const ScheduleForm: React.FC<ScheduleFormProps> = ({
  formData,
  handleChange,
  handleToggleAllDay,
  handleAnniversaryChange,
  handleLunarChange,
  recurrence,
  setRecurrence,
  myCalendars,
  selectedCalendar,
  isCalListOpen,
  setIsCalListOpen,
  handleCalendarSelect,
  currentUser,
  navigate,
  openMapModal,
  titleInputRef,
  scheduleSearchResults = [],
  showSuggestions = false,
  setShowSuggestions,
  handleSuggestionClick,
  dropdownRef,
  isEditMode = false,
}) => {
  const sortedCalendars = React.useMemo(() => {
    return [...myCalendars].sort((a, b) => {
      if (selectedCalendar && a.id === selectedCalendar.id) return -1;
      if (selectedCalendar && b.id === selectedCalendar.id) return 1;
      if (a.isDefault) return -1;
      if (b.isDefault) return 1;
      return 0;
    });
  }, [myCalendars, selectedCalendar]);

  const [isMapLoading, setIsMapLoading] = React.useState(true);
  const [zoom, setZoom] = React.useState(15);

  React.useEffect(() => {
    if (formData.location) {
      setIsMapLoading(true);
    }
  }, [formData.location, zoom]);

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoom((prev) => Math.min(prev + 1, 20));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoom((prev) => Math.max(prev - 1, 1));
  };

  return (
    <section className="space-y-4">
      {/* 일정 제목 입력 */}
      <div ref={titleInputRef} className="group relative">
        <div className="flex items-center gap-2 px-1 mb-2">
          <Pencil size={18} className="text-sub dark:text-gray-500" />
          <label className="text-caption">어떤 일정인가요?</label>
        </div>
        <FormInput
          name="title"
          value={formData.title}
          onChange={handleChange}
          onFocus={() => !isEditMode && formData.title && scheduleSearchResults.length > 0 && setShowSuggestions && setShowSuggestions(true)}
          placeholder="무엇을 하나요?"
          required
          autoComplete="off"
        />
        {!isEditMode && showSuggestions && scheduleSearchResults.length > 0 && handleSuggestionClick && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-700 rounded-xl shadow-lg border border-gray-100 dark:border-gray-600 z-20 max-h-48 overflow-y-auto">
            {scheduleSearchResults.map((schedule) => (
              <button
                key={schedule.id}
                type="button"
                onClick={() => handleSuggestionClick(schedule)}
                className="w-full text-left px-4 py-3 text-sm font-bold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-3"
              >
                <History size={14} className="text-gray-400" />
                <div className="flex-1">
                  <p>{schedule.title}</p>
                  <p className="text-xs text-gray-400 font-medium">
                    {schedule.start.split('T')[0]}
                    {schedule.location ? ` · ${schedule.location}` : ''}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 캘린더 선택 드롭다운 */}
      <div className="group relative" ref={dropdownRef}>
        <div className="flex items-center gap-2 px-1 mb-2">
          <CalendarIcon size={18} className="text-sub dark:text-gray-500" />
          <label className="text-caption">어디에 저장할까요?</label>
        </div>
        <button
          type="button"
          onClick={() => setIsCalListOpen(!isCalListOpen)}
          className="w-full flex items-center justify-between h-[60px] bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus-within:border-primary focus-within:bg-white dark:focus-within:bg-gray-800 rounded-[20px] px-5 transition-all text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: selectedCalendar?.color || '#ccc' }}>
              {(selectedCalendar as any)?.icon && ICON_MAP[(selectedCalendar as any).icon] ? (
                React.createElement(ICON_MAP[(selectedCalendar as any).icon], { size: 14 })
              ) : (
                <CalendarIcon size={14} />
              )}
            </div>
            <span className="text-[15px] font-bold text-main dark:text-gray-200">
              {selectedCalendar ? (selectedCalendar as any).customNames?.[currentUser?.uid || ''] || selectedCalendar.name : '캘린더 선택...'}
            </span>
          </div>
          <ChevronDown size={20} className={`text-sub dark:text-gray-400 transition-transform duration-200 ${isCalListOpen ? 'rotate-180' : ''}`} />
        </button>

        {isCalListOpen && (
          <div className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-gray-800 rounded-[24px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-black/50 border border-gray-100 dark:border-gray-700 p-2 z-50 animate-in fade-in zoom-in-95 duration-200">
            {sortedCalendars.map((cal) => {
              const IconComponent = (cal as any).icon && ICON_MAP[(cal as any).icon] ? ICON_MAP[(cal as any).icon] : CalendarIcon;
              const calName = (cal as any).customNames?.[currentUser?.uid || ''] || cal.name;
              return (
                <button
                  key={cal.id}
                  type="button"
                  onClick={() => handleCalendarSelect(cal)}
                  className={`w-full flex items-center justify-between p-4 rounded-[18px] transition-all ${
                    selectedCalendar?.id === cal.id ? 'bg-primary/20 dark:bg-primary/10 text-primary' : 'text-sub dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: cal.color || '#007AFF' }}>
                      <IconComponent size={16} />
                    </div>
                    <span className="text-[14px] font-bold">{calName}</span>
                  </div>
                  {selectedCalendar?.id === cal.id && <Check size={16} className="text-primary" />}
                </button>
              );
            })}
            <div className="h-[1px] bg-gray-50 dark:bg-gray-700 my-2 mx-2" />
            <button
              type="button"
              onClick={() =>
                navigate('/create-calendar', {
                  state: {
                    from: isEditMode ? `/schedule/edit/${formData.id}` : '/add-schedule',
                    scheduleData: { ...formData, recurrence },
                  },
                })
              }
              className="w-full flex items-center gap-3 p-4 text-sub dark:text-gray-400 font-bold text-[13px] hover:text-primary hover:bg-primary/20 rounded-[18px] transition-colors"
            >
              <Plus size={16} /> 새 캘린더 만들기
            </button>
          </div>
        )}
      </div>

      {/* 기념일 및 음력/윤달 설정 */}
      <div className="flex items-center justify-between px-1">
        <FormCheckbox label="기념일" checked={formData.isAnniversary || false} onChange={handleAnniversaryChange} className="text-primary" />
        {formData.isAnniversary && (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
            {formData.isLunar && (
              <FormCheckbox
                label="윤달"
                checked={formData.isLeapMonth || false}
                onChange={(e) => handleChange({ target: { name: 'isLeapMonth', value: e.target.checked } } as any)}
              />
            )}
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => handleLunarChange(false)}
                className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${
                  !formData.isLunar ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-sub dark:text-gray-400'
                }`}
              >
                양력
              </button>
              <button
                type="button"
                onClick={() => handleLunarChange(true)}
                className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${
                  formData.isLunar ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-sub dark:text-gray-400'
                }`}
              >
                음력
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 시간 설정 영역 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1 mb-2">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-sub dark:text-gray-500" />
            <label className="text-caption">언제인가요?</label>
          </div>
          <div
            onClick={formData.isAnniversary ? undefined : handleToggleAllDay}
            className={`flex items-center gap-2 group ${formData.isAnniversary ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
          >
            <span className={`text-[12px] font-bold transition-colors ${formData.isAllDay ? 'text-emerald-600 dark:text-emerald-400' : 'text-caption'}`}>종일</span>
            <div className={`relative w-10 h-6 rounded-full transition-colors duration-200 shrink-0 ${formData.isAllDay ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'}`}>
              <div
                className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-200 ${
                  formData.isAllDay ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-[24px] p-2 space-y-1 border border-gray-100 dark:border-gray-700/50">
          {formData.isAnniversary ? (
            <div className="flex items-center h-[56px] px-4 gap-3">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 shrink-0">
                <Sparkles size={18} />
                <span className="text-[14px] font-bold">날짜</span>
              </div>
              <input
                type="date"
                name="start"
                value={formData.start.split('T')[0]}
                onChange={(e) => {
                  handleChange(e);
                  handleChange({ target: { name: 'end', value: e.target.value } } as any);
                }}
                className="bg-transparent text-[14px] font-bold text-main dark:text-white outline-none text-right font-mono w-full"
              />
            </div>
          ) : (
            <>
              <div className="flex items-center h-[56px] px-4 gap-3">
                <Clock size={18} className="text-sub dark:text-gray-400 shrink-0" />
                <div className="flex-1 flex items-center justify-between gap-3">
                  <span className="text-[13px] font-bold text-sub dark:text-gray-400 shrink-0">시작</span>
                  <input
                    type={formData.isAllDay ? 'date' : 'datetime-local'}
                    name="start"
                    value={formData.isAllDay ? formData.start.split('T')[0] : formData.start}
                    onChange={handleChange}
                    className="bg-transparent text-[14px] font-bold text-main dark:text-white outline-none text-right font-mono w-full"
                  />
                </div>
              </div>
              <div className="h-[1px] bg-gray-200 dark:bg-gray-700/50 mx-4" />
              <div className="flex items-center h-[56px] px-4 gap-3">
                <Clock size={18} className="text-sub dark:text-gray-400 shrink-0" />
                <div className="flex-1 flex items-center justify-between gap-3">
                  <span className="text-[13px] font-bold text-sub dark:text-gray-400 shrink-0">종료</span>
                  <input
                    type={formData.isAllDay ? 'date' : 'datetime-local'}
                    name="end"
                    value={formData.isAllDay ? formData.end.split('T')[0] : formData.end}
                    onChange={handleChange}
                    className="bg-transparent text-[14px] font-bold text-main dark:text-white outline-none text-right font-mono w-full"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 색상 선택 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1 mb-2">
          <Palette size={18} className="text-sub dark:text-gray-500" />
          <label className="text-caption">어떤 색으로 표시할까요?</label>
        </div>
        <div className="flex flex-wrap gap-3 px-1">
          {COLOR_OPTIONS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => handleChange({ target: { name: 'color', value: color } } as any)}
              className={`w-8 h-8 rounded-full transition-all flex items-center justify-center ${
                formData.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-110'
              }`}
              style={{ backgroundColor: color }}
            >
              {formData.color === color && <Check size={14} className="text-white" strokeWidth={3} />}
            </button>
          ))}
        </div>
      </div>

      {/* 반복 설정 옵션 */}
      <RecurrenceOptions startDate={formData.start} value={recurrence} onChange={setRecurrence} />

      {/* 상세 정보 (장소, 알림, 메모) - 기념일이 아닐 때만 표시 */}
      {!formData.isAnniversary && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1 mb-2">
            <FileText size={18} className="text-sub dark:text-gray-500" />
            <label className="text-caption">더 자세히 기록해볼까요?</label>
          </div>

          <FormInput
            icon={<MapPin size={18} />}
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="장소"
            rightContent={
              <button
                type="button"
                onClick={openMapModal}
                className="p-2 text-sub dark:text-gray-500 hover:text-primary dark:hover:text-blue-400 transition-colors"
                title="지도에서 선택"
              >
                <Map size={18} />
              </button>
            }
          />

          {formData.location && (
            <div className="w-full h-48 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 relative bg-gray-100 dark:bg-gray-800 group">
              {isMapLoading && (
                <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center z-10">
                  <MapPin className="text-gray-400 dark:text-gray-500 w-8 h-8 animate-bounce opacity-50" />
                </div>
              )}
              <iframe
                key={`${formData.location}_${zoom}`}
                title="Location Preview"
                width="100%"
                height="100%"
                frameBorder="0"
                style={{ border: 0, opacity: isMapLoading ? 0 : 1, transition: 'opacity 0.3s ease-in-out' }}
                loading="lazy"
                src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyD-e_Nh3dflo_xgW4CcIySthA9i8L46rUk&q=${encodeURIComponent(formData.location)}&zoom=${zoom}&language=ko`}
                allowFullScreen
                onLoad={() => setIsMapLoading(false)}
              />
              <div onClick={openMapModal} className="absolute inset-0 bg-black/0 hover:bg-black/5 transition-colors cursor-pointer flex items-center justify-center z-20">
                <div className="bg-white/90 dark:bg-gray-800/90 p-2 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity transform scale-90 group-hover:scale-100">
                  <Maximize2 size={20} className="text-gray-600 dark:text-gray-300" />
                </div>
              </div>
              <div className="absolute bottom-2 right-2 flex flex-col gap-1 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-1.5 bg-white/90 dark:bg-gray-800/90 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 transition-colors"
                >
                  <Plus size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1.5 bg-white/90 dark:bg-gray-800/90 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 transition-colors"
                >
                  <Minus size={16} />
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center h-[56px] bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus-within:border-primary focus-within:bg-white dark:focus-within:bg-gray-800 rounded-[20px] px-4 gap-4 transition-all relative">
            <Bell size={18} className="text-sub dark:text-gray-400" />
            <select
              name="notification"
              value={formData.notification}
              onChange={handleChange}
              className="bg-transparent outline-none w-full text-[14px] font-bold text-main dark:text-gray-200 appearance-none z-10"
            >
              {NOTIFICATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <FormTextarea icon={<AlignLeft size={18} />} name="content" value={formData.content} onChange={handleChange} rows={3} placeholder="메모" />
        </div>
      )}
    </section>
  );
};

export default ScheduleForm;
