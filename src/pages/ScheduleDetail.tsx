import React, { useState, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import { ChevronLeft, MapPin, AlignLeft, Clock, Camera, Bell, MessageCircle, BookOpen, Paperclip, X, Trash2, Sparkles, Users, Image as ImageIcon, FileText } from 'lucide-react';
import ColorPalette from '../components/calendar/ColorPalette';

// 캘린더 선택 옵션 Mock
const CALENDAR_OPTIONS = [
  { id: '1', name: '가족 공유 캘린더', color: '#3b82f6' },
  { id: '2', name: '개인 캘린더', color: '#10b981' },
  { id: '3', name: '업무용', color: '#8b5cf6' },
];

const NOTIFICATION_OPTIONS = [
  { label: '알림 안함', value: 'none' },
  { label: '10분 전', value: '10' },
  { label: '30분 전', value: '30' },
  { label: '1시간 전', value: '60' },
  { label: '1일 전', value: '1440' },
];

interface LocationState {
  title?: string;
  start?: string | Date;
  end?: string | Date;
  location?: string;
  content?: string;
  color?: string;
  allDay?: boolean; // [추가] 종일 여부
  attendees?: string[];
}

const ScheduleDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  const eventData = location.state as LocationState | null;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const reviewFileInputRef = useRef<HTMLInputElement>(null);

  // [상태] 폼 데이터 초기화
  const [formData, setFormData] = useState({
    title: eventData?.title || '새 일정',
    calendarId: '1',
    isAllDay: eventData?.allDay || false, // [추가] 종일 상태
    start: eventData?.start ? dayjs(eventData.start).format('YYYY-MM-DDTHH:mm') : dayjs().format('YYYY-MM-DDTHH:mm'),
    end: eventData?.end ? dayjs(eventData.end).format('YYYY-MM-DDTHH:mm') : dayjs().add(1, 'hour').format('YYYY-MM-DDTHH:mm'),
    location: eventData?.location || '',
    content: eventData?.content || '',
    color: eventData?.color || '#3b82f6',
    notification: '30',
    files: [{ name: 'menu.pdf', type: 'doc' }],
    attendees: eventData?.attendees || ['나'],
    review: '',
    reviewImages: [] as string[],
  });

  const [chatMedia] = useState([
    'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=150&h=150&fit=crop',
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=150&h=150&fit=crop',
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=150&h=150&fit=crop',
  ]);

  const isShared = formData.attendees.length > 1;
  const isPastEvent = dayjs().isAfter(dayjs(formData.end));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // [추가] 종일 <-> 시간 토글 핸들러
  const handleToggleAllDay = () => {
    setFormData((prev) => {
      const nextIsAllDay = !prev.isAllDay;
      return {
        ...prev,
        isAllDay: nextIsAllDay,
        // 종일이면 날짜만(YYYY-MM-DD), 시간이면 시분초 포함
        start: nextIsAllDay ? dayjs(prev.start).format('YYYY-MM-DD') : dayjs(prev.start).format('YYYY-MM-DDT09:00'),
        end: nextIsAllDay ? dayjs(prev.end).format('YYYY-MM-DD') : dayjs(prev.end).format('YYYY-MM-DDT10:00'),
      };
    });
  };

  const handleFileRemove = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
    }));
  };

  const handleReviewImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setFormData((prev) => ({ ...prev, reviewImages: [...prev.reviewImages, url] }));
    }
  };

  const handleDelete = () => {
    if (window.confirm('정말 이 일정을 삭제하시겠습니까?')) {
      alert('삭제되었습니다.');
      navigate('/calendar');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white font-['Pretendard']">
      {/* 1. 상단 네비게이션 */}
      <nav className="px-6 pt-6 pb-2 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-40">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors">
          <ChevronLeft size={28} />
        </button>
        <h1 className="text-[17px] font-black text-gray-900">일정 상세</h1>
        <button onClick={handleDelete} className="p-2 -mr-2 text-red-400 hover:text-red-600 transition-colors">
          <Trash2 size={22} />
        </button>
      </nav>

      <div className="flex-1 px-6 pt-4 pb-32 overflow-y-auto w-full">
        {/* 2. 타이틀 & 캘린더 선택 */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-50 rounded-xl">
              <Sparkles className="text-blue-600 w-5 h-5" />
            </div>
            <div className="relative group">
              <select
                name="calendarId"
                value={formData.calendarId}
                onChange={handleChange}
                className="appearance-none bg-gray-50 text-gray-600 text-[12px] font-bold px-3 py-1.5 rounded-lg pr-8 outline-none border-2 border-transparent focus:border-blue-200"
              >
                {CALENDAR_OPTIONS.map((cal) => (
                  <option key={cal.id} value={cal.id}>
                    {cal.name}
                  </option>
                ))}
              </select>
              <ChevronLeft size={12} className="absolute right-2 top-1/2 -translate-y-1/2 -rotate-90 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="group relative">
            <input
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full text-2xl font-black text-gray-900 outline-none border-none bg-transparent placeholder:text-gray-300 decoration-blue-200 underline-offset-4 focus:underline"
            />
          </div>
        </div>

        <div className="space-y-8">
          {/* 3. 기본 정보 수정 영역 */}
          <div className="space-y-5">
            {/* [복구] 시간 설정 (종일 토글 포함) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <label className="text-[13px] font-black text-gray-400">시간 설정</label>

                {/* 종일 스위치 */}
                <div onClick={handleToggleAllDay} className="flex items-center gap-2 cursor-pointer group">
                  <span className={`text-[12px] font-bold transition-colors ${formData.isAllDay ? 'text-blue-600' : 'text-gray-400'}`}>종일</span>
                  <div className={`relative w-10 h-6 rounded-full transition-colors duration-200 shrink-0 ${formData.isAllDay ? 'bg-blue-600' : 'bg-gray-200'}`}>
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

            {/* 장소 & 알림 & 내용 */}
            <div className="space-y-3">
              {/* 장소 */}
              <div className="flex items-center h-[56px] bg-white border-2 border-gray-100 rounded-[20px] px-4 gap-4 focus-within:border-blue-500 transition-all">
                <MapPin size={18} className="text-gray-400" />
                <input
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="bg-transparent outline-none w-full text-[14px] font-bold text-gray-800 placeholder:text-gray-300"
                  placeholder="장소를 입력하세요"
                />
              </div>

              {/* 알림 */}
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
                <ChevronLeft size={16} className="absolute right-4 text-gray-300 -rotate-90" />
              </div>

              {/* 내용 */}
              <div className="flex items-start bg-white border-2 border-gray-100 rounded-[24px] p-4 gap-4 focus-within:border-blue-500 transition-all">
                <AlignLeft size={18} className="text-gray-400 mt-1" />
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  rows={3}
                  className="bg-transparent outline-none w-full text-[14px] font-medium text-gray-800 resize-none placeholder:text-gray-300 leading-relaxed"
                  placeholder="상세 내용을 입력하세요"
                />
              </div>
            </div>

            {/* 첨부파일 (수정/삭제 가능) */}
            <div>
              <div className="flex items-center justify-between px-1 mb-2">
                <label className="text-[13px] font-black text-gray-400">첨부파일</label>
                <button onClick={() => fileInputRef.current?.click()} className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                  + 추가
                </button>
                <input type="file" className="hidden" ref={fileInputRef} />
              </div>
              <div className="space-y-2">
                {formData.files.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-[16px] border border-gray-100">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {file.type === 'image' ? <ImageIcon size={16} className="text-purple-500" /> : <Paperclip size={16} className="text-blue-500" />}
                      <span className="text-[13px] font-bold text-gray-700 truncate">{file.name}</span>
                    </div>
                    <button onClick={() => handleFileRemove(idx)} className="text-gray-300 hover:text-red-500">
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="h-[1px] bg-gray-100" />

          {/* ============================================================
              4. 조건부 영역 (채팅 vs 후기)
          ============================================================ */}

          {/* CASE A: 공유 일정 (1명 이상) -> 채팅 및 갤러리 */}
          {isShared && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[16px] font-black text-gray-900 flex items-center gap-2">
                  <MessageCircle size={20} className="text-blue-600" />
                  일정 공유 멤버
                </h3>
                <div className="flex -space-x-2">
                  {formData.attendees.map((user: string, i: number) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-blue-600">
                      {user[0]}
                    </div>
                  ))}
                </div>
              </div>

              {/* 채팅방 입장 버튼 */}
              <button
                onClick={() => navigate(`/chat/${id}`)}
                className="w-full h-[64px] bg-[#EBF4FF] rounded-[24px] flex items-center justify-between px-6 active:scale-[0.98] transition-all border border-blue-100 group"
              >
                <div className="flex flex-col items-start">
                  <span className="text-[15px] font-black text-blue-600">채팅방 입장하기</span>
                  <span className="text-[11px] font-medium text-blue-400">일정 조율 및 사진 공유</span>
                </div>
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                  <ChevronLeft size={20} className="text-blue-600 rotate-180 ml-0.5" />
                </div>
              </button>

              {/* 공유된 미디어 갤러리 (미리보기) */}
              <div>
                <div className="flex items-center justify-between px-1 mb-3">
                  <span className="text-[13px] font-bold text-gray-500">공유된 사진/문서</span>
                  <button className="text-[11px] font-bold text-gray-400 hover:text-gray-600">전체보기</button>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {chatMedia.map((src, i) => (
                    <div key={i} className="relative w-24 h-24 shrink-0 rounded-[18px] overflow-hidden border border-gray-100 shadow-sm">
                      <img src={src} alt="shared" className="w-full h-full object-cover" />
                    </div>
                  ))}
                  <button className="w-24 h-24 shrink-0 rounded-[18px] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-300 gap-1 hover:border-blue-300 hover:text-blue-500 transition-colors">
                    <FileText size={20} />
                    <span className="text-[10px] font-bold">More</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CASE B: 개인 일정 & 완료됨 -> 후기 작성 */}
          {!isShared && isPastEvent && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen size={20} className="text-emerald-500" />
                <h3 className="text-[16px] font-black text-gray-900">오늘의 기록 (후기)</h3>
              </div>

              <div className="bg-white border-2 border-dashed border-emerald-100 rounded-[28px] p-5 space-y-4 focus-within:border-emerald-400 transition-colors">
                <textarea
                  placeholder="이 일정은 어떠셨나요? 소중한 추억을 기록해보세요."
                  className="w-full text-[14px] font-medium text-gray-700 outline-none min-h-[120px] bg-transparent resize-none placeholder:text-gray-300 leading-relaxed"
                  value={formData.review}
                  onChange={(e) => setFormData({ ...formData, review: e.target.value })}
                />

                {/* 후기 이미지 리스트 */}
                {formData.reviewImages.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                    {formData.reviewImages.map((src, i) => (
                      <div key={i} className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-gray-100 relative group">
                        <img src={src} alt="review" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end border-t border-emerald-50 pt-3">
                  <input type="file" accept="image/*" className="hidden" ref={reviewFileInputRef} onChange={handleReviewImageAdd} />
                  <button
                    onClick={() => reviewFileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[12px] font-bold hover:bg-emerald-100 transition-colors"
                  >
                    <Camera size={14} />
                    사진 추가
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CASE C: 개인 일정 & 예정됨 -> 안내 문구 */}
          {!isShared && !isPastEvent && (
            <div className="py-8 text-center bg-gray-50 rounded-[24px] border border-gray-100">
              <BookOpen size={24} className="mx-auto text-gray-300 mb-2" />
              <p className="text-[13px] font-bold text-gray-400">일정이 완료되면 후기를 작성할 수 있어요.</p>
            </div>
          )}
        </div>
      </div>

      {/* 5. 수정 완료 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-gray-50 z-50">
        <button
          onClick={() => {
            alert('수정 내용이 저장되었습니다.');
            navigate('/calendar');
          }}
          className="w-full h-[62px] bg-blue-600 text-white rounded-[24px] font-black text-[17px] shadow-lg shadow-blue-100 active:scale-[0.98] transition-all"
        >
          저장하기
        </button>
      </div>
    </div>
  );
};

export default ScheduleDetail;
