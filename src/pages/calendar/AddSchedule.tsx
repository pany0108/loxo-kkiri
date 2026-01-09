import React from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MapPin, AlignLeft, Clock, Camera, Bell, Sparkles, ChevronDown, Plus, Check, Loader2, History } from 'lucide-react';
import dayjs from 'dayjs';
import { PageLayout, RecurrenceOptions, PageHeader, PageFooter } from 'components';
import { useAddSchedule } from 'hooks';

const NOTIFICATION_OPTIONS = [
  { label: '알림 안함', value: 'none' },
  { label: '정시', value: '0' },
  { label: '5분 전', value: '5' },
  { label: '10분 전', value: '10' },
  { label: '30분 전', value: '30' },
  { label: '1시간 전', value: '60' },
  { label: '1일 전', value: '1440' },
];

const AddSchedule = () => {
  const navigate = useNavigate();
  const { state, refs, handlers } = useAddSchedule();
  const { formData, recurrence, isCalListOpen, isSubmitting, scheduleSearchResults, showSuggestions, myCalendars, selectedCalendar } = state;
  const { dropdownRef, titleInputRef } = refs;
  const { setRecurrence, setIsCalListOpen, setShowSuggestions, handleChange, handleCalendarSelect, handleSuggestionClick, handleToggle, handleSubmit } = handlers;

  const renderFooter = () => (
    <PageFooter>
      <button
        type="submit"
        form="add-schedule-form" // [추가] form 속성으로 외부 form과 연결
        disabled={!formData.title || isSubmitting}
        className={`w-full h-[62px] rounded-[24px] font-black text-[17px] shadow-lg transition-all flex items-center justify-center gap-2
                ${
                  formData.title && !isSubmitting
                    ? 'bg-blue-600 text-white shadow-blue-100 dark:shadow-blue-900/50 active:scale-[0.98]'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed shadow-none'
                }`}
      >
        {isSubmitting ? <Loader2 className="animate-spin" /> : <span>일정 등록하기</span>}
      </button>
    </PageFooter>
  );

  return (
    // [수정] PageLayout으로 전체 구조 변경
    <PageLayout title="새 일정 등록" onBack={() => navigate(-1)} footer={renderFooter()}>
      <>
        <PageHeader icon={<Sparkles className="text-blue-600 w-6 h-6" />}>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-[1.3] tracking-tight">
            새로운 <span className="text-blue-600">일정</span>을<br />
            등록해볼까요?
          </h2>
        </PageHeader>

        {/* [수정] form에 id 추가 */}
        <form id="add-schedule-form" onSubmit={handleSubmit} className="space-y-6">
          <section className="space-y-4">
            <div ref={titleInputRef} className="group relative">
              <label className="block text-[13px] font-black text-gray-400 dark:text-gray-500 ml-1 mb-2">일정 제목</label>
              <div className="flex items-center h-[60px] bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-gray-800 rounded-[20px] px-5 transition-all">
                <input
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  onFocus={() => formData.title && scheduleSearchResults.length > 0 && setShowSuggestions(true)}
                  placeholder="무엇을 하나요?"
                  className="bg-transparent border-none outline-none w-full h-full text-[16px] font-bold text-gray-800 dark:text-white placeholder:text-gray-300"
                  required
                  autoComplete="off"
                />
              </div>
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
              <label className="block text-[13px] font-black text-gray-400 dark:text-gray-500 ml-1 mb-2">캘린더</label>
              <button
                type="button"
                onClick={() => setIsCalListOpen(!isCalListOpen)}
                className="w-full flex items-center justify-between h-[60px] bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-gray-800 rounded-[20px] px-5 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedCalendar?.color || '#ccc' }} />
                  <span className="text-[15px] font-bold text-gray-800 dark:text-gray-200">{selectedCalendar?.name || '캘린더 선택...'}</span>
                </div>
                <ChevronDown size={20} className={`text-gray-400 dark:text-gray-500 transition-transform duration-200 ${isCalListOpen ? 'rotate-180' : ''}`} />
              </button>

              {isCalListOpen && (
                <div className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-gray-800 rounded-[24px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-black/50 border border-gray-100 dark:border-gray-700 p-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                  {myCalendars.map((cal) => (
                    <button
                      key={cal.id}
                      type="button"
                      onClick={() => handleCalendarSelect(cal)}
                      className={`w-full flex items-center justify-between p-4 rounded-[18px] transition-all ${
                        selectedCalendar?.id === cal.id
                          ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cal.color }} />
                        <span className="text-[14px] font-bold">{cal.name}</span>
                      </div>
                      {selectedCalendar?.id === cal.id && <Check size={16} className="text-blue-600 dark:text-blue-300" />}
                    </button>
                  ))}
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
                    className="w-full flex items-center gap-3 p-4 text-gray-500 dark:text-gray-400 font-bold text-[13px] hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-[18px] transition-colors"
                  >
                    <Plus size={16} /> 새 캘린더 만들기
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <label className="text-[13px] font-black text-gray-400 dark:text-gray-500">시간 설정</label>
                <div onClick={handleToggle} className="flex items-center gap-2 cursor-pointer group">
                  <span className={`text-[12px] font-bold transition-colors ${formData.isAllDay ? 'text-emerald-600' : 'text-gray-400'}`}>종일</span>
                  <div className={`relative w-10 h-6 rounded-full transition-colors duration-200 shrink-0 ${formData.isAllDay ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                    <div
                      className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-200 ${
                        formData.isAllDay ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-[24px] p-2 space-y-1">
                <div className="flex items-center h-[56px] px-4 gap-3">
                  <Clock size={18} className="text-gray-400 dark:text-gray-600 shrink-0" />
                  <div className="flex-1 flex items-center justify-between gap-3">
                    <span className="text-[14px] font-bold text-gray-400 dark:text-gray-500 shrink-0">시작</span>
                    <input
                      type={formData.isAllDay ? 'date' : 'datetime-local'}
                      name="start"
                      value={formData.isAllDay ? formData.start.split('T')[0] : formData.start}
                      onChange={handleChange}
                      className="bg-transparent text-[14px] font-bold text-gray-800 dark:text-white outline-none text-right font-mono w-full"
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
                      className="bg-transparent text-[14px] font-bold text-gray-800 dark:text-white outline-none text-right font-mono w-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            <RecurrenceOptions startDate={formData.start} value={recurrence} onChange={setRecurrence} />

            <div className="group relative">
              <label className="block text-[13px] font-black text-gray-400 dark:text-gray-500 ml-1 mb-2">푸시 알림</label>
              <div className="flex items-center h-[60px] bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-gray-800 rounded-[20px] px-5 transition-all">
                <Bell size={18} className="text-gray-300 mr-4 group-focus-within:text-blue-600" />
                <select
                  name="notification"
                  value={formData.notification}
                  onChange={handleChange}
                  className="bg-transparent border-none outline-none w-full h-full text-[15px] font-bold text-gray-800 dark:text-gray-200 appearance-none"
                >
                  {NOTIFICATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-[13px] font-black text-gray-400 dark:text-gray-500 ml-1">상세 정보</label>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-[24px] p-2 space-y-1">
                <div className="flex items-center h-[56px] px-4 gap-4">
                  <MapPin size={18} className="text-gray-300 dark:text-gray-600 shrink-0" />
                  <input
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="장소 추가"
                    className="bg-transparent outline-none w-full text-[14px] font-bold text-gray-800 dark:text-gray-200 placeholder:text-gray-300"
                  />
                </div>
                <div className="h-[1px] bg-gray-100 dark:bg-gray-700/50 mx-4" />
                <div className="flex items-start p-4 gap-4">
                  <AlignLeft size={18} className="text-gray-300 dark:text-gray-600 mt-0.5 shrink-0" />
                  <textarea
                    name="content"
                    value={formData.content}
                    onChange={handleChange}
                    placeholder="메모를 입력하세요"
                    rows={3}
                    className="bg-transparent outline-none w-full text-[14px] font-bold text-gray-800 dark:text-gray-200 placeholder:text-gray-300 resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => toast('파일 첨부 기능은 준비중입니다.')}
                className="w-full h-[56px] bg-gray-50 dark:bg-gray-800/50 border-2 border-gray-100 dark:border-gray-700/50 rounded-[20px] flex items-center justify-center gap-2 text-gray-400 dark:text-gray-500 cursor-not-allowed"
              >
                <Camera size={20} />
                <span className="text-[14px] font-bold">파일 첨부 (준비중)</span>
              </button>
            </div>
          </section>
        </form>
      </>
    </PageLayout>
  );
};

export default AddSchedule;
