import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import { ChevronLeft, MapPin, AlignLeft, Clock, Camera, Bell, X, Check, Image as ImageIcon, Paperclip, BookOpen, Sparkles } from 'lucide-react';
import { RecurrenceOptions, RecurrenceSettings, ColorPalette } from '../components';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const NOTIFICATION_OPTIONS = [
  { label: '알림 안함', value: 'none' },
  { label: '정시', value: '0' }, // AddSchedule과 옵션 통일
  { label: '5분 전', value: '5' }, // AddSchedule과 옵션 통일
  { label: '10분 전', value: '10' },
  { label: '30분 전', value: '30' },
  { label: '1시간 전', value: '60' },
  { label: '1일 전', value: '1440' },
];

interface Attachment {
  name: string;
  type: 'image' | 'doc';
  url?: string;
}

const ScheduleEdit = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const eventData = location.state;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const reviewFileInputRef = useRef<HTMLInputElement>(null);

  // 초기 상태 설정
  const [formData, setFormData] = useState({
    title: eventData?.title || '',
    calendarId: '1',
    isAllDay: eventData?.allDay || false,
    start: eventData?.start ? dayjs(eventData.start).format('YYYY-MM-DDTHH:mm') : dayjs().format('YYYY-MM-DDTHH:mm'),
    end: eventData?.end ? dayjs(eventData.end).format('YYYY-MM-DDTHH:mm') : dayjs().add(1, 'hour').format('YYYY-MM-DDTHH:mm'),
    location: eventData?.location || '',
    content: eventData?.content || '',
    color: eventData?.color || '#3b82f6',
    // [수정] 이전 설정값 불러오기 (없으면 'none')
    notification: eventData?.notification || 'none',
    attendees: eventData?.attendees || ['나'],
    review: eventData?.review || '',
    reviewImages: eventData?.reviewImages || [],
  });

  const [attachments, setAttachments] = useState<Attachment[]>(eventData?.files || [{ name: 'menu.pdf', type: 'doc' }]);

  const [recurrence, setRecurrence] = useState<RecurrenceSettings>(
    eventData?.recurrence || {
      frequency: 'none',
      interval: 1,
      daysOfWeek: [],
      monthlyType: 'date',
      endType: 'none',
      endDate: dayjs().add(1, 'month').format('YYYY-MM-DD'),
      endCount: 10,
    },
  );

  const isShared = formData.attendees.length > 1;
  const isPastEvent = dayjs().isAfter(formData.end);

  // --- 핸들러 ---

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggleAllDay = () => {
    setFormData((prev) => {
      const nextIsAllDay = !prev.isAllDay;
      return {
        ...prev,
        isAllDay: nextIsAllDay,
        start: nextIsAllDay ? dayjs(prev.start).format('YYYY-MM-DD') : dayjs(prev.start).format('YYYY-MM-DDT09:00'),
        end: nextIsAllDay ? dayjs(prev.end).format('YYYY-MM-DD') : dayjs(prev.end).format('YYYY-MM-DDT10:00'),
      };
    });
  };

  const handleColorChange = (color: string) => {
    setFormData((prev) => ({ ...prev, color }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map((file) => ({
        name: file.name,
        type: file.type.startsWith('image/') ? 'image' : 'doc',
        url: URL.createObjectURL(file),
      })) as Attachment[];

      setAttachments((prev) => [...prev, ...newFiles]);
    }
  };

  const handleFileRemove = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleReviewImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setFormData((prev) => ({ ...prev, reviewImages: [...(prev.reviewImages || []), url] }));
    }
  };

  const handleSave = async () => {
    try {
      if (location.state?.id || location.pathname.split('/').pop()) {
        const docId = location.state?.id || location.pathname.split('/').pop();

        await updateDoc(doc(db, 'schedules', docId), {
          ...formData,
          recurrence,
          // attachments 등은 파일 업로드 로직 필요 (현재는 생략)
        });

        alert('수정되었습니다!');
        navigate(-1); // 뒤로 가기
      }
    } catch (error) {
      console.error('수정 실패:', error);
      alert('수정 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white font-['Pretendard']">
      {/* 상단 네비게이션 */}
      <nav className="px-6 pt-6 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-40">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors">
          <ChevronLeft size={28} />
        </button>
        <button onClick={handleSave} className="p-2 -mr-2 text-blue-600 hover:text-blue-700 transition-colors">
          <Check size={28} strokeWidth={3} />
        </button>
      </nav>

      <div className="flex-1 px-6 pt-4 pb-12 overflow-y-auto w-full">
        <header className="mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 rounded-xl mb-6">
            <Sparkles className="text-blue-600 w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 leading-[1.3] tracking-tight">
            일정을 <span className="text-blue-600">수정</span>해볼까요?
          </h2>
        </header>

        <form className="space-y-6">
          <section className="space-y-4">
            <div className="group relative">
              <label className="block text-[13px] font-black text-gray-400 ml-1 mb-2">일정 제목</label>
              <div className="flex items-center h-[60px] bg-gray-50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white rounded-[20px] px-5 transition-all">
                <input
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="무엇을 하나요?"
                  className="bg-transparent border-none outline-none w-full h-full text-[16px] font-bold text-gray-800 placeholder:text-gray-300"
                />
              </div>
            </div>

            <div className="py-2">
              <label className="block text-[13px] font-black text-gray-400 ml-1 mb-3">태그 색상</label>
              <div className="bg-gray-50 rounded-[20px] p-4 border-2 border-transparent">
                <ColorPalette selectedColor={formData.color} onSelectColor={handleColorChange} />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <label className="text-[13px] font-black text-gray-400">시간 설정</label>
                <div onClick={handleToggleAllDay} className="flex items-center gap-2 cursor-pointer group">
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

              <div className="bg-gray-50 rounded-[24px] p-2 space-y-1 border border-gray-100">
                <div className="flex items-center h-[56px] px-4 gap-4">
                  <Clock size={18} className="text-gray-400 shrink-0" />
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-[13px] font-bold text-gray-400">시작</span>
                    <input
                      type={formData.isAllDay ? 'date' : 'datetime-local'}
                      name="start"
                      value={formData.isAllDay ? formData.start.split('T')[0] : formData.start}
                      onChange={handleChange}
                      className="bg-transparent text-[14px] font-bold text-gray-800 outline-none text-right font-mono"
                    />
                  </div>
                </div>
                <div className="h-[1px] bg-gray-200 mx-4" />
                <div className="flex items-center h-[56px] px-4 gap-4">
                  <Clock size={18} className="text-gray-400 shrink-0" />
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-[13px] font-bold text-gray-400">종료</span>
                    <input
                      type={formData.isAllDay ? 'date' : 'datetime-local'}
                      name="end"
                      value={formData.isAllDay ? formData.end.split('T')[0] : formData.end}
                      onChange={handleChange}
                      className="bg-transparent text-[14px] font-bold text-gray-800 outline-none text-right font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            <RecurrenceOptions startDate={formData.start} value={recurrence} onChange={setRecurrence} />

            <div className="space-y-3">
              <label className="block text-[13px] font-black text-gray-400 ml-1">상세 정보</label>

              <div className="flex items-center h-[56px] bg-white border-2 border-gray-100 rounded-[20px] px-4 gap-4 focus-within:border-blue-500 transition-all">
                <MapPin size={18} className="text-gray-400" />
                <input
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="bg-transparent outline-none w-full text-[14px] font-bold text-gray-800 placeholder:text-gray-300"
                  placeholder="장소"
                />
              </div>

              <div className="flex items-center h-[56px] bg-white border-2 border-gray-100 rounded-[20px] px-4 gap-4 focus-within:border-blue-500 transition-all relative">
                <Bell size={18} className="text-gray-400" />
                <select
                  name="notification"
                  value={formData.notification}
                  onChange={handleChange}
                  className="bg-transparent outline-none w-full text-[14px] font-bold text-gray-800 appearance-none z-10"
                >
                  {NOTIFICATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-start bg-white border-2 border-gray-100 rounded-[24px] p-4 gap-4 focus-within:border-blue-500 transition-all">
                <AlignLeft size={18} className="text-gray-400 mt-1" />
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  rows={3}
                  className="bg-transparent outline-none w-full text-[14px] font-medium text-gray-800 resize-none placeholder:text-gray-300 leading-relaxed"
                  placeholder="메모"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between px-1 mb-2">
                <label className="text-[13px] font-black text-gray-400">첨부파일</label>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }}
                  className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors"
                >
                  + 추가
                </button>
                <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleFileChange} />
              </div>
              <div className="space-y-2">
                {attachments.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-[16px] border border-gray-100">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {file.type === 'image' ? <ImageIcon size={16} className="text-purple-500" /> : <Paperclip size={16} className="text-blue-500" />}
                      <span className="text-[13px] font-bold text-gray-700 truncate">{file.name}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleFileRemove(idx);
                      }}
                      className="text-gray-300 hover:text-red-500"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {!isShared && isPastEvent && (
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <BookOpen size={20} className="text-emerald-500" />
                  <h3 className="text-[16px] font-black text-gray-900">후기 작성</h3>
                </div>
                <div className="bg-white border-2 border-dashed border-emerald-100 rounded-[28px] p-5 space-y-4 focus-within:border-emerald-400 transition-colors">
                  <textarea
                    placeholder="후기를 작성해주세요."
                    className="w-full text-[14px] font-medium text-gray-700 outline-none min-h-[100px] bg-transparent resize-none placeholder:text-gray-300 leading-relaxed"
                    value={formData.review}
                    onChange={(e) => setFormData({ ...formData, review: e.target.value })}
                  />
                  {formData.reviewImages && formData.reviewImages.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                      {formData.reviewImages.map((src: string, i: number) => (
                        <div key={i} className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-gray-100 relative">
                          <img src={src} alt="review" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-end border-t border-emerald-50 pt-3">
                    <input type="file" accept="image/*" className="hidden" ref={reviewFileInputRef} onChange={handleReviewImageAdd} />
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        reviewFileInputRef.current?.click();
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[12px] font-bold hover:bg-emerald-100 transition-colors"
                    >
                      <Camera size={14} /> 사진 추가
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </form>
      </div>
    </div>
  );
};

export default ScheduleEdit;
