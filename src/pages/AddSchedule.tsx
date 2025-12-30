import React, { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { ChevronLeft, MapPin, AlignLeft, Clock, Camera, Bell, Sparkles, X } from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const receivedData = location.state as {
    start?: string;
    end?: string;
    allDay?: boolean;
  } | null;

  const getInitialDate = (dateStr?: string, isAllDay?: boolean) => {
    if (!dateStr) return dayjs().format('YYYY-MM-DDTHH:mm');
    return isAllDay ? dayjs(dateStr).format('YYYY-MM-DD') : dayjs(dateStr).format('YYYY-MM-DDTHH:mm');
  };

  const [formData, setFormData] = useState({
    title: '',
    isAllDay: receivedData?.allDay ?? false,
    start: getInitialDate(receivedData?.start, receivedData?.allDay),
    end: getInitialDate(receivedData?.end || receivedData?.start, receivedData?.allDay),
    location: '',
    content: '',
    color: '#3b82f6',
    notification: 'none',
  });

  const [attachments, setAttachments] = useState<string[]>([]);

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
        start: nextIsAllDay ? dayjs(prev.start).format('YYYY-MM-DD') : dayjs(prev.start).format('YYYY-MM-DDT09:00'),
        end: nextIsAllDay ? dayjs(prev.end).format('YYYY-MM-DD') : dayjs(prev.end).format('YYYY-MM-DDT18:00'),
      };
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newPreviews = files.map((file) => URL.createObjectURL(file));
      setAttachments((prev) => [...prev, ...newPreviews]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
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
    console.log('등록 데이터:', { ...formData, attachments });
    alert('일정이 등록되었습니다!');
    navigate('/calendar');
  };

  return (
    <div className="flex flex-col min-h-screen bg-white font-['Pretendard']">
      {/* 상단 네비게이션 */}
      <div className="px-6 pt-6 flex items-center sticky top-0 bg-white/80 backdrop-blur-md z-40">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
          <ChevronLeft size={28} />
        </button>
      </div>

      <div className="flex-1 px-6 pt-4 pb-12 overflow-y-auto w-full">
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

              <div className="bg-gray-50 rounded-[24px] p-2 space-y-1">
                <div className="flex items-center h-[56px] px-4 gap-4">
                  <Clock size={18} className="text-gray-300 shrink-0" />
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-[14px] font-bold text-gray-400 shrink-0">시작</span>
                    <input
                      type={formData.isAllDay ? 'date' : 'datetime-local'}
                      name="start"
                      value={formData.isAllDay ? formData.start.split('T')[0] : formData.start}
                      onChange={handleChange}
                      className="bg-transparent text-[15px] font-bold text-gray-800 outline-none text-right w-full font-mono"
                    />
                  </div>
                </div>
                <div className="h-[1px] bg-gray-100 mx-4" />
                <div className="flex items-center h-[56px] px-4 gap-4">
                  <Clock size={18} className="text-gray-300 shrink-0" />
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-[14px] font-bold text-gray-400 shrink-0">종료</span>
                    <input
                      type={formData.isAllDay ? 'date' : 'datetime-local'}
                      name="end"
                      value={formData.isAllDay ? formData.end.split('T')[0] : formData.end}
                      onChange={handleChange}
                      className="bg-transparent text-[15px] font-bold text-gray-800 outline-none text-right w-full font-mono"
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
                  <MapPin size={18} className="text-gray-300 shrink-0" />
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
                  <AlignLeft size={18} className="text-gray-300 mt-0.5 shrink-0" />
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

            {/* 사진 첨부 기능 */}
            <div className="space-y-3">
              <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-[56px] bg-white border-2 border-gray-100 rounded-[20px] flex items-center justify-center gap-2 text-gray-400 hover:bg-gray-50 hover:text-blue-500 hover:border-blue-100 transition-all active:scale-[0.98]"
              >
                <Camera size={20} />
                <span className="text-[14px] font-bold">사진 첨부하기</span>
              </button>

              {/* 첨부파일 미리보기 */}
              {attachments.length > 0 && (
                <div className="flex gap-2 overflow-x-auto py-1 px-1">
                  {attachments.map((src, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-gray-100 shadow-sm group">
                      <img src={src} alt={`attachment-${i}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeAttachment(i)}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 transition-opacity opacity-0 group-hover:opacity-100"
                      >
                        <X size={12} strokeWidth={3} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 등록 버튼 */}
          <div className="pt-6">
            <button
              type="submit"
              className={`w-full h-[62px] rounded-[24px] font-black text-[17px] shadow-lg transition-all flex items-center justify-center gap-2
                ${formData.title ? 'bg-blue-600 text-white shadow-blue-100 active:scale-[0.98]' : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'}`}
            >
              <span>일정 등록하기</span>
              {attachments.length > 0 && (
                <span className="bg-white/20 px-2 py-0.5 rounded-lg text-[11px] font-bold flex items-center gap-1">
                  <Camera size={10} fill="currentColor" /> {attachments.length}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSchedule;
