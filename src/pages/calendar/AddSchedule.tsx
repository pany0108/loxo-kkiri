import React from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  MapPin,
  AlignLeft,
  Clock,
  Camera,
  Bell,
  ChevronDown,
  Sparkles,
  Plus,
  Check,
  History,
  CalendarPlus,
  Palette,
  Home,
  Briefcase,
  GraduationCap,
  Dumbbell,
  Plane,
  Music,
  Heart,
  Star,
  Gift,
  Coffee,
  ShoppingCart,
  Gamepad2,
  Calendar as CalendarIcon,
} from 'lucide-react';
import dayjs from 'dayjs';
import { PageLayout, RecurrenceOptions, PageHeader, PageFooter, PageTitle, FormInput, FormTextarea, FormCheckbox } from 'components';
import { useAddSchedule } from 'hooks';
import { auth } from '../../firebase';
import LoadingButton from '../../components/ui/LoadingButton';

const NOTIFICATION_OPTIONS = [
  { label: '알림 안함', value: 'none' },
  { label: '정시', value: '0' },
  { label: '5분 전', value: '5' },
  { label: '10분 전', value: '10' },
  { label: '30분 전', value: '30' },
  { label: '1시간 전', value: '60' },
  { label: '1일 전', value: '1440' },
];

const COLOR_OPTIONS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#84cc16', // lime
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#007AFF', // primary
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#f43f5e', // rose
  '#64748b', // slate
  '#71717a', // zinc
];

const ICON_MAP: Record<string, React.ElementType> = {
  home: Home,
  work: Briefcase,
  study: GraduationCap,
  workout: Dumbbell,
  travel: Plane,
  music: Music,
  love: Heart,
  star: Star,
  gift: Gift,
  food: Coffee,
  shopping: ShoppingCart,
  game: Gamepad2,
};

const AddSchedule = () => {
  const navigate = useNavigate();
  const { state, refs, handlers } = useAddSchedule();
  const { formData, recurrence, isCalListOpen, isSubmitting, scheduleSearchResults, showSuggestions, myCalendars, selectedCalendar } = state;
  const { dropdownRef, titleInputRef } = refs;
  const { setRecurrence, setIsCalListOpen, setShowSuggestions, handleChange, handleCalendarSelect, handleSuggestionClick, handleToggle, handleSubmit } = handlers;

  const isAnniversary = (formData as any).isAnniversary;
  const isLunar = (formData as any).isLunar;
  const isLeapMonth = (formData as any).isLeapMonth;

  const currentUser = auth.currentUser;

  const sortedCalendars = React.useMemo(() => {
    return [...myCalendars].sort((a, b) => {
      if (selectedCalendar && a.id === selectedCalendar.id) return -1;
      if (selectedCalendar && b.id === selectedCalendar.id) return 1;
      if (a.isDefault) return -1;
      if (b.isDefault) return 1;
      return 0;
    });
  }, [myCalendars, selectedCalendar]);

  const handleAnniversaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    handleChange({ target: { name: 'isAnniversary', value: checked } } as any);

    if (checked) {
      // 기념일 선택 시 무조건 종일 일정으로 설정
      if (!formData.isAllDay) {
        handleToggle();
      }
      // 초기값 설정
      handleChange({ target: { name: 'isLunar', value: false } } as any);
      handleChange({ target: { name: 'isLeapMonth', value: false } } as any);
    }
  };

  const handleLunarChange = (isLunarValue: boolean) => {
    handleChange({ target: { name: 'isLunar', value: isLunarValue } } as any);
  };

  const renderFooter = () => (
    <PageFooter>
      <LoadingButton
        type="submit"
        form="add-schedule-form" // [추가] form 속성으로 외부 form과 연결
        disabled={!formData.title}
        isLoading={isSubmitting}
        className="btn-primary"
      >
        <span>일정 등록하기</span>
      </LoadingButton>
    </PageFooter>
  );

  return (
    // [수정] PageLayout으로 전체 구조 변경
    <PageLayout title="새 일정 등록" onBack={() => navigate(-1)} footer={renderFooter()}>
      <>
        <PageHeader icon={<CalendarPlus className="text-primary w-6 h-6" />}>
          <PageTitle>
            새로운 <span className="text-primary">일정</span>을<br />
            등록해볼까요?
          </PageTitle>
        </PageHeader>

        {/* [수정] form에 id 추가 */}
        <form id="add-schedule-form" onSubmit={handleSubmit} className="space-y-6">
          <section className="space-y-4">
            {/* [추가] 기념일 설정 */}
            <div className="flex items-center justify-between px-1">
              <FormCheckbox label="기념일" checked={isAnniversary || false} onChange={handleAnniversaryChange} className="text-[#007AFF]" />
              {isAnniversary && (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                  {isLunar && (
                    <FormCheckbox label="윤달" checked={isLeapMonth || false} onChange={(e) => handleChange({ target: { name: 'isLeapMonth', value: e.target.checked } } as any)} />
                  )}
                  <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => handleLunarChange(false)}
                      className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${
                        !isLunar ? 'bg-white dark:bg-gray-700 text-[#007AFF] shadow-sm' : 'text-[#8B95A1] dark:text-gray-500'
                      }`}
                    >
                      양력
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLunarChange(true)}
                      className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${
                        isLunar ? 'bg-white dark:bg-gray-700 text-[#007AFF] shadow-sm' : 'text-[#8B95A1] dark:text-gray-500'
                      }`}
                    >
                      음력
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div ref={titleInputRef} className="group relative">
              <FormInput
                label="일정 제목"
                name="title"
                value={formData.title}
                onChange={handleChange}
                onFocus={() => formData.title && scheduleSearchResults.length > 0 && setShowSuggestions(true)}
                placeholder="무엇을 하나요?"
                required
                autoComplete="off"
              />
              {/* [추가] 이전 일정 추천 UI */}
              {showSuggestions && (
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
                          {dayjs(schedule.start).format('M/D')}
                          {schedule.location ? ` · ${schedule.location}` : ''}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* [추가] 캘린더 선택 섹션 */}
            <div className="group relative" ref={dropdownRef}>
              <label className="block text-caption ml-1 mb-2">캘린더</label>
              <button type="button" onClick={() => setIsCalListOpen(!isCalListOpen)} className="w-full justify-between text-left input-field rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: selectedCalendar?.color || '#ccc' }}>
                    {(selectedCalendar as any)?.icon && ICON_MAP[(selectedCalendar as any).icon] ? (
                      React.createElement(ICON_MAP[(selectedCalendar as any).icon], { size: 14 })
                    ) : (
                      <CalendarIcon size={14} />
                    )}
                  </div>
                  <span className="text-body">
                    {selectedCalendar ? (selectedCalendar as any).customNames?.[currentUser?.uid || ''] || selectedCalendar.name : '캘린더 선택...'}
                  </span>
                </div>
                <ChevronDown size={20} className={`text-sub dark:text-gray-500 transition-transform duration-200 ${isCalListOpen ? 'rotate-180' : ''}`} />
              </button>

              {isCalListOpen && (
                <div className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-gray-800 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-black/50 border border-gray-100 dark:border-gray-700 p-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                  {sortedCalendars.map((cal) => {
                    const IconComponent = (cal as any).icon && ICON_MAP[(cal as any).icon] ? ICON_MAP[(cal as any).icon] : CalendarIcon;
                    const calName = (cal as any).customNames?.[currentUser?.uid || ''] || cal.name;
                    return (
                      <button
                        key={cal.id}
                        type="button"
                        onClick={() => handleCalendarSelect(cal)}
                        className={`w-full flex items-center justify-between p-4 rounded-lg transition-all ${
                          selectedCalendar?.id === cal.id ? 'bg-primary/20 dark:bg-primary/10 text-primary' : 'text-sub dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
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
                          from: '/add-schedule',
                          scheduleData: { ...formData, recurrence }, // Pass current form data
                        },
                      })
                    }
                    className="w-full flex items-center gap-3 p-4 text-sub dark:text-gray-400 font-bold text-[13px] hover:text-primary hover:bg-primary/20 rounded-lg transition-colors"
                  >
                    <Plus size={16} /> 새 캘린더 만들기
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <label className="text-caption">시간 설정</label>
                <div
                  onClick={isAnniversary ? undefined : handleToggle}
                  className={`flex items-center gap-2 group ${isAnniversary ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
                >
                  <span className={`text-[12px] font-bold transition-colors ${formData.isAllDay ? 'text-emerald-600' : 'text-caption'}`}>종일</span>
                  <div className={`relative w-10 h-6 rounded-full transition-colors duration-200 shrink-0 ${formData.isAllDay ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                    <div
                      className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-200 ${
                        formData.isAllDay ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-2 space-y-1">
                {isAnniversary ? (
                  <div className="flex items-center justify-center h-[56px] gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-[14px]">
                    <Sparkles size={16} />
                    <span>하루 종일 기념해요!</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center h-[56px] px-4 gap-3">
                      <Clock size={18} className="text-gray-400 dark:text-gray-600 shrink-0" />
                      <div className="flex-1 flex items-center justify-between gap-3">
                        <span className="text-[14px] font-bold text-gray-400 dark:text-gray-500 shrink-0">시작</span>
                        <input
                          type={formData.isAllDay ? 'date' : 'datetime-local'}
                          name="start"
                          value={formData.isAllDay ? formData.start.split('T')[0] : formData.start}
                          onChange={handleChange}
                          className="bg-transparent text-[14px] font-bold text-main dark:text-white outline-none text-right font-mono w-full"
                        />
                      </div>
                    </div>
                    <div className="h-[1px] bg-gray-100 dark:bg-gray-700/50 mx-4" />
                    <div className="flex items-center h-[56px] px-4 gap-3">
                      <Clock size={18} className="text-gray-400 dark:text-gray-600 shrink-0" />
                      <div className="flex-1 flex items-center justify-between gap-3">
                        <span className="text-[14px] font-bold text-gray-400 dark:text-gray-500 shrink-0">종료</span>
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

            {/* [추가] 색상 선택 섹션 */}
            <div className="space-y-3">
              <label className="block text-caption ml-1">색상</label>
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

            <RecurrenceOptions startDate={formData.start} value={recurrence} onChange={setRecurrence} />

            <div className="group relative">
              <label className="block text-caption ml-1 mb-2">푸시 알림</label>
              <div className="input-field rounded-xl">
                <Bell size={18} className="text-sub mr-4 group-focus-within:text-primary" />
                <select
                  name="notification"
                  value={formData.notification}
                  onChange={handleChange}
                  className="bg-transparent border-none outline-none w-full h-full text-body appearance-none"
                >
                  {NOTIFICATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {!isAnniversary && (
              <div className="space-y-3">
                <label className="block text-caption ml-1">상세 정보</label>
                <FormInput icon={<MapPin size={18} />} name="location" value={formData.location} onChange={handleChange} placeholder="장소 추가" />
                <FormTextarea icon={<AlignLeft size={18} />} name="content" value={formData.content} onChange={handleChange} placeholder="메모를 입력하세요" rows={3} />
              </div>
            )}

            {!isAnniversary && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => toast('파일 첨부 기능은 준비중입니다.')}
                  className="w-full h-[56px] bg-gray-50 dark:bg-gray-800/50 border-2 border-gray-100 dark:border-gray-700/50 rounded-xl flex items-center justify-center gap-2 text-sub dark:text-gray-500 cursor-not-allowed"
                >
                  <Camera size={20} />
                  <span className="text-[14px] font-bold">파일 첨부 (준비중)</span>
                </button>
              </div>
            )}
          </section>
        </form>
      </>
    </PageLayout>
  );
};

export default AddSchedule;
