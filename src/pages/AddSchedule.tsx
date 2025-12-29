import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { ChevronLeft, MapPin, AlignLeft, Clock, Camera, Bell, Sparkles, Calendar as CalendarIcon } from 'lucide-react';
import ColorPalette from '../components/calendar/ColorPalette';

const NOTIFICATION_OPTIONS = [
  { label: '알림 안함', value: 'none' },
  { label: '정시', value: '0' },
  { label: '5분 전', value: '5' },
  { label: '10분 전', value: '10' },
  { label: '15분 전', value: '15' },
  { label: '30분 전', value: '30' },
  { label: '1시간 전', value: '60' },
  { label: '2시간 전', value: '120' },
  { label: '3시간 전', value: '180' },
  { label: '12시간 전', value: '720' },
  { label: '1일 전', value: '1440' },
];

const AddSchedule = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const receivedData = location.state as {
    start?: string;
    end?: string;
    allDay?: boolean;
  } | null;

  // 초기 날짜 포맷 결정 함수
  const getInitialDate = (dateStr?: string, isAllDay?: boolean) => {
    if (!dateStr) return dayjs().format('YYYY-MM-DDTHH:mm');
    // 종일 일정으로 넘어온 경우 시간 없이 날짜만, 아니면 시간 포함
    return isAllDay ? dayjs(dateStr).format('YYYY-MM-DD') : dayjs(dateStr).format('YYYY-MM-DDTHH:mm');
  };

  const [formData, setFormData] = useState({
    title: '',
    isAllDay: receivedData?.allDay ?? false, // 명시적으로 넘어온 값 사용
    start: getInitialDate(receivedData?.start, receivedData?.allDay),
    end: getInitialDate(receivedData?.end || receivedData?.start, receivedData?.allDay),
    location: '',
    content: '',
    color: '#3b82f6',
    notification: 'none',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      let nextData = { ...prev, [name]: value };
      if (name === 'start') {
        const newStart = dayjs(value);
        const currentEnd = dayjs(prev.end);
        if (currentEnd.isBefore(newStart)) {
          nextData.end = value;
        }
      }
      return nextData;
    });
  };

  const handleColorChange = (color: string) => {
    setFormData((prev) => ({ ...prev, color }));
  };

  const handleToggle = () => {
    setFormData((prev) => {
      const nextIsAllDay = !prev.isAllDay;
      return {
        ...prev,
        isAllDay: nextIsAllDay,
        // 종일로 변경 시 시간을 떼고, 시간제로 변경 시 기본 오전 9시/오후 6시 등을 붙여줌
        start: nextIsAllDay ? dayjs(prev.start).format('YYYY-MM-DD') : dayjs(prev.start).format('YYYY-MM-DDT09:00'),
        end: nextIsAllDay ? dayjs(prev.end).format('YYYY-MM-DD') : dayjs(prev.end).format('YYYY-MM-DDT18:00'),
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      alert('제목을 입력해주세요.');
      return;
    }
    if (dayjs(formData.end).isBefore(dayjs(formData.start))) {
      alert('종료 일자가 시작일보다 빠를 수 없습니다.');
      return;
    }
    console.log('등록 데이터:', formData);
    alert('일정이 등록되었습니다!');
    navigate('/calendar');
  };

  return (
    <div className="flex flex-col min-h-screen bg-white font-['Pretendard']">
      {/* 상단 네비게이션 */}
      <div className="px-4 pt-6 flex items-center sticky top-0 bg-white/80 backdrop-blur-md z-10">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
          <ChevronLeft size={28} />
        </button>
      </div>

      <div className="flex-1 px-8 pt-4 pb-12 overflow-y-auto max-w-md mx-auto w-full">
        {/* 헤더 섹션 */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 rounded-xl mb-6">
            <Sparkles className="text-blue-600 w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 leading-[1.3] tracking-tight">
            새로운 <span className="text-blue-600">일정</span>을<br />
            등록해볼까요?
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {/* 제목 입력 */}
            <div className="group relative">
              <label className="block text-[13px] font-black text-gray-400 ml-1 mb-2">일정 제목</label>
              <div className="flex items-center h-[60px] bg-gray-50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white rounded-[20px] px-5 transition-all">
                <input
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="무엇을 하나요?"
                  className="bg-transparent border-none outline-none w-full h-full text-[16px] font-bold text-gray-800 placeholder:text-gray-300"
                  required
                />
              </div>
            </div>

            {/* 색상 팔레트 */}
            <div className="py-2">
              <label className="block text-[13px] font-black text-gray-400 ml-1 mb-3">태그 색상</label>
              <div className="bg-gray-50 rounded-[20px] p-4 border-2 border-transparent">
                <ColorPalette selectedColor={formData.color} onSelectColor={handleColorChange} />
              </div>
            </div>

            {/* 시간 설정 섹션 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <label className="text-[13px] font-black text-gray-400">시간 설정</label>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-bold text-gray-500">종일</span>
                  <button type="button" onClick={handleToggle} className={`w-11 h-6 rounded-full transition-all relative ${formData.isAllDay ? 'bg-blue-600' : 'bg-gray-200'}`}>
                    <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ${formData.isAllDay ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-[24px] p-2 space-y-1">
                <div className="flex items-center h-[56px] px-4 gap-4">
                  <Clock size={18} className="text-gray-300" />
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-[14px] font-bold text-gray-400">시작</span>
                    <input
                      type={formData.isAllDay ? 'date' : 'datetime-local'}
                      name="start"
                      value={formData.isAllDay ? formData.start.split('T')[0] : formData.start}
                      onChange={handleChange}
                      className="bg-transparent text-[14px] font-black text-gray-700 outline-none"
                    />
                  </div>
                </div>
                <div className="h-[1px] bg-gray-100 mx-4" />
                <div className="flex items-center h-[56px] px-4 gap-4">
                  <Clock size={18} className="text-gray-300" />
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-[14px] font-bold text-gray-400">종료</span>
                    <input
                      type={formData.isAllDay ? 'date' : 'datetime-local'}
                      name="end"
                      value={formData.isAllDay ? formData.end.split('T')[0] : formData.end}
                      onChange={handleChange}
                      className="bg-transparent text-[14px] font-black text-gray-700 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 푸시 알림 */}
            <div className="group relative">
              <label className="block text-[13px] font-black text-gray-400 ml-1 mb-2">푸시 알림</label>
              <div className="flex items-center h-[60px] bg-gray-50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white rounded-[20px] px-5 transition-all">
                <Bell size={18} className="text-gray-300 mr-4 group-focus-within:text-blue-600" />
                <select
                  name="notification"
                  value={formData.notification}
                  onChange={handleChange}
                  className="bg-transparent border-none outline-none w-full h-full text-[15px] font-bold text-gray-800 appearance-none"
                >
                  {NOTIFICATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 장소 및 메모 */}
            <div className="space-y-3">
              <label className="block text-[13px] font-black text-gray-400 ml-1">상세 정보</label>
              <div className="bg-gray-50 rounded-[24px] p-2 space-y-1">
                <div className="flex items-center h-[56px] px-4 gap-4">
                  <MapPin size={18} className="text-gray-300" />
                  <input
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="장소 추가"
                    className="bg-transparent outline-none w-full text-[14px] font-bold text-gray-800 placeholder:text-gray-300"
                  />
                </div>
                <div className="h-[1px] bg-gray-100 mx-4" />
                <div className="flex items-start p-4 gap-4">
                  <AlignLeft size={18} className="text-gray-300 mt-0.5" />
                  <textarea
                    name="content"
                    value={formData.content}
                    onChange={handleChange}
                    placeholder="메모를 입력하세요"
                    rows={3}
                    className="bg-transparent outline-none w-full text-[14px] font-bold text-gray-800 placeholder:text-gray-300 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* 사진 첨부 버튼 */}
            <button
              type="button"
              className="w-full h-[56px] bg-white border-2 border-gray-100 rounded-[20px] flex items-center justify-center gap-3 text-gray-400 hover:bg-gray-50 transition-all active:scale-[0.98]"
            >
              <Camera size={20} />
              <span className="text-[14px] font-bold">사진 첨부하기</span>
            </button>
          </div>

          {/* 등록 버튼 */}
          <div className="pt-6">
            <button
              type="submit"
              className={`w-full h-[62px] rounded-[24px] font-black text-[17px] shadow-lg transition-all flex items-center justify-center
                ${formData.title ? 'bg-blue-600 text-white shadow-blue-100 active:scale-[0.98]' : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'}`}
            >
              일정 등록하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSchedule;
