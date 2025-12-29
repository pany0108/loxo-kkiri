import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { ChevronLeft, MapPin, AlignLeft, Clock, Camera, Bell, MessageCircle, BookOpen, Paperclip, X, Trash2, Sparkles } from 'lucide-react';
import ColorPalette from '../components/calendar/ColorPalette';

const ScheduleDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [formData, setFormData] = useState({
    title: '맛있는 저녁 식사',
    isAllDay: false,
    start: '2025-12-31T19:00',
    end: '2025-12-31T21:00',
    location: '강남역 5번 출구',
    content: '가족들과 연말 모임',
    color: '#3b82f6',
    notification: '30',
    attendees: ['나', '엄마', '아빠'],
    files: [{ name: 'reservation.pdf', type: 'doc' }],
    review: '',
  });

  const isShared = formData.attendees.length > 1;
  const isPastEvent = dayjs().isAfter(dayjs(formData.end));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="flex flex-col min-h-screen bg-white font-['Pretendard']">
      {/* 상단 네비게이션 */}
      <nav className="px-6 pt-6 pb-2 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-40">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
          <ChevronLeft size={28} />
        </button>
        <h1 className="text-[17px] font-black text-gray-900">일정 상세</h1>
        <button className="p-2 text-red-400 hover:text-red-600 transition-colors">
          <Trash2 size={22} />
        </button>
      </nav>

      <div className="flex-1 px-6 pt-4 pb-32 overflow-y-auto w-full">
        {/* 헤더 섹션 */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 rounded-xl mb-6">
            <Sparkles className="text-blue-600 w-6 h-6" />
          </div>
          <div className="group relative">
            <input
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full text-2xl font-black text-gray-900 outline-none border-none bg-transparent placeholder:text-gray-300"
            />
            <div className="h-[2px] w-full bg-gray-50 mt-2" />
          </div>
        </div>

        <div className="space-y-6">
          {/* 색상 팔레트 */}
          <div className="py-2">
            <label className="block text-[13px] font-black text-gray-400 ml-1 mb-3">태그 색상</label>
            <div className="bg-gray-50 rounded-[20px] p-4">
              <ColorPalette selectedColor={formData.color} onSelectColor={(c) => setFormData({ ...formData, color: c })} />
            </div>
          </div>

          {/* 기간 설정 */}
          <div className="space-y-3">
            <label className="text-[13px] font-black text-gray-400 ml-1">시간 설정</label>
            <div className="bg-gray-50 rounded-[24px] p-2 space-y-1">
              <div className="flex items-center h-[56px] px-4 gap-4">
                <Clock size={18} className="text-gray-300" />
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-[14px] font-bold text-gray-400">시작</span>
                  <input
                    type="datetime-local"
                    name="start"
                    value={formData.start}
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
                    type="datetime-local"
                    name="end"
                    value={formData.end}
                    onChange={handleChange}
                    className="bg-transparent text-[14px] font-black text-gray-700 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 알림 설정 */}
          <div className="group relative">
            <label className="block text-[13px] font-black text-gray-400 ml-1 mb-2">푸시 알림</label>
            <div className="flex items-center h-[60px] bg-gray-50 rounded-[20px] px-5 transition-all focus-within:bg-white focus-within:border-2 focus-within:border-blue-500">
              <Bell size={18} className="text-gray-300 mr-4" />
              <select
                name="notification"
                value={formData.notification}
                onChange={handleChange}
                className="bg-transparent border-none outline-none w-full h-full text-[15px] font-bold text-gray-800 appearance-none"
              >
                <option value="30">30분 전</option>
                <option value="60">1시간 전</option>
              </select>
            </div>
          </div>

          {/* 상세 정보 (장소, 메모) */}
          <div className="space-y-3">
            <label className="block text-[13px] font-black text-gray-400 ml-1">상세 정보</label>
            <div className="bg-gray-50 rounded-[24px] p-2">
              <div className="flex items-center h-[56px] px-4 gap-4">
                <MapPin size={18} className="text-gray-300" />
                <input name="location" value={formData.location} onChange={handleChange} className="bg-transparent outline-none w-full text-[14px] font-bold text-gray-800" />
              </div>
              <div className="h-[1px] bg-gray-100 mx-4" />
              <div className="flex items-start p-4 gap-4">
                <AlignLeft size={18} className="text-gray-300 mt-0.5" />
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  rows={3}
                  className="bg-transparent outline-none w-full text-[14px] font-bold text-gray-800 resize-none"
                />
              </div>
            </div>
          </div>

          {/* 첨부파일 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <label className="text-[13px] font-black text-gray-400">첨부파일</label>
              <label className="text-[12px] font-black text-blue-600 cursor-pointer">
                추가하기 <input type="file" className="hidden" />
              </label>
            </div>
            <div className="space-y-2">
              {formData.files.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-50 px-5 py-4 rounded-[18px] border border-transparent hover:border-blue-100 transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <Paperclip size={16} className="text-blue-500" />
                    <span className="text-[13px] font-bold text-gray-700 truncate">{file.name}</span>
                  </div>
                  <X size={16} className="text-gray-300 cursor-pointer hover:text-gray-900" />
                </div>
              ))}
            </div>
          </div>

          {/* 하단 인터랙션 영역 (채팅 또는 후기) */}
          <div className="pt-4">
            {isShared ? (
              <button
                onClick={() => navigate(`/chat/${id}`)}
                className="w-full h-[62px] bg-blue-50 text-blue-600 rounded-[24px] font-black text-[15px] flex items-center justify-center gap-3 border-2 border-blue-100 active:scale-[0.98] transition-all shadow-sm shadow-blue-50"
              >
                <MessageCircle size={20} className="fill-blue-600/10" />
                가족 채팅방 입장하기
              </button>
            ) : (
              isPastEvent && (
                <div className="bg-white border-2 border-dashed border-blue-100 rounded-[28px] p-6 space-y-4">
                  <div className="flex items-center gap-2 text-blue-600">
                    <BookOpen size={20} />
                    <h3 className="font-black text-[16px]">오늘의 기록 (후기)</h3>
                  </div>
                  <textarea
                    placeholder="소중한 추억을 기록해보세요."
                    className="w-full text-[14px] font-medium text-gray-700 outline-none min-h-[100px] bg-transparent resize-none placeholder:text-gray-300"
                    value={formData.review}
                    onChange={(e) => setFormData({ ...formData, review: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <button className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-blue-500 transition-colors">
                      <Camera size={20} />
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* 수정 완료 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-gray-50">
        <button
          onClick={() => {
            alert('수정되었습니다!');
            navigate(-1);
          }}
          className="w-full h-[62px] bg-blue-600 text-white rounded-[24px] font-black text-[17px] shadow-lg shadow-blue-100 active:scale-[0.98] transition-all"
        >
          수정 완료
        </button>
      </div>
    </div>
  );
};

export default ScheduleDetail;
