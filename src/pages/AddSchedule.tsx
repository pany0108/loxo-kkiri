import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { ChevronLeft, MapPin, AlignLeft, Calendar, Clock, Camera } from 'lucide-react';
import ColorPalette from '../components/calendar/ColorPalette';

const AddSchedule = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // [수정] 전달받은 데이터 추출 (CalendarMain에서 보낸 정보)
  const receivedData = location.state as {
    start?: string;
    end?: string;
    allDay?: boolean;
  } | null;

  // 상태 관리 - 초기값을 전달받은 데이터로 설정
  const [formData, setFormData] = useState({
    title: '',
    isAllDay: receivedData?.allDay || false,
    // 날짜 포맷팅: datetime-local 입력창은 'YYYY-MM-DDTHH:mm' 형식을 요구합니다.
    start: receivedData?.start ? dayjs(receivedData.start).format('YYYY-MM-DDTHH:mm') : dayjs().format('YYYY-MM-DDTHH:mm'),
    end: receivedData?.end ? dayjs(receivedData.end).format('YYYY-MM-DDTHH:mm') : dayjs().add(1, 'hour').format('YYYY-MM-DDTHH:mm'),
    location: '',
    content: '',
    color: '#3b82f6', // 기본 색상 추가
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 3. 색상 변경 핸들러 추가
  const handleColorChange = (color: string) => {
    setFormData((prev) => ({ ...prev, color }));
  };

  const handleToggle = () => {
    setFormData((prev) => {
      const nextIsAllDay = !prev.isAllDay;
      return {
        ...prev,
        isAllDay: nextIsAllDay,
        // 종일 모드를 켜고 끌 때 시간을 정규화 (선택 사항)
        start: dayjs(prev.start).format('YYYY-MM-DDTHH:mm'),
        end: dayjs(prev.end).format('YYYY-MM-DDTHH:mm'),
      };
    });
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 유효성 검사
    if (!formData.title) {
      alert('제목을 입력해주세요.');
      return;
    }
    if (dayjs(formData.end).isBefore(dayjs(formData.start))) {
      alert('종료 시간이 시작보다 빠를 수 없습니다.');
      return;
    }

    console.log('등록 데이터:', formData);
    alert('일정이 등록되었습니다!');
    navigate('/calendar');
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-10">
      {/* 상단 네비게이션 바 */}
      <nav className="bg-white px-4 py-3 flex items-center border-b sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ChevronLeft size={24} />
        </button>
        <h1 className="flex-1 text-center font-bold text-lg mr-6">일정 추가</h1>
      </nav>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* 제목 입력 */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <input
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="제목을 입력하세요"
            className="w-full text-xl font-semibold outline-none border-none placeholder-gray-300"
            required
          />
        </div>

        {/* 색상 팔레트 */}
        <div className="bg-white rounded-2xl shadow-sm px-4">
          <ColorPalette selectedColor={formData.color} onSelectColor={handleColorChange} />
        </div>

        {/* 시간 설정 */}
        <div className="bg-white rounded-2xl shadow-sm divide-y">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Clock size={20} className="text-gray-400" />
              <span className="font-medium">종일</span>
            </div>
            <button type="button" onClick={handleToggle} className={`w-12 h-6 rounded-full transition-colors relative ${formData.isAllDay ? 'bg-blue-500' : 'bg-gray-200'}`}>
              <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.isAllDay ? 'translate-x-6' : ''}`} />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">시작</span>
              <input
                type={formData.isAllDay ? 'date' : 'datetime-local'}
                name="start"
                value={formData.isAllDay ? formData.start.split('T')[0] : formData.start}
                onChange={handleChange}
                className="bg-gray-100 px-3 py-2 rounded-lg outline-none"
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">종료</span>
              <input
                type={formData.isAllDay ? 'date' : 'datetime-local'}
                name="end"
                value={formData.isAllDay ? formData.end.split('T')[0] : formData.end}
                onChange={handleChange}
                className="bg-gray-100 px-3 py-2 rounded-lg outline-none"
              />
            </div>
          </div>
        </div>

        {/* 장소 및 메모 */}
        <div className="bg-white rounded-2xl shadow-sm p-2">
          <div className="flex items-center gap-3 p-3 border-b border-gray-50">
            <MapPin size={20} className="text-gray-400" />
            <input name="location" value={formData.location} onChange={handleChange} placeholder="장소 추가" className="flex-1 outline-none text-sm" />
          </div>
          <div className="flex items-start gap-3 p-3">
            <AlignLeft size={20} className="text-gray-400 mt-1" />
            <textarea name="content" value={formData.content} onChange={handleChange} placeholder="메모 추가" rows={3} className="flex-1 outline-none text-sm resize-none" />
          </div>
        </div>

        {/* 사진 첨부 (UI만 구현) */}
        <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 cursor-pointer active:bg-gray-50 transition-colors">
          <Camera size={20} className="text-gray-400" />
          <span className="text-sm text-gray-500 font-medium">사진 첨부</span>
        </div>

        {/* 제출 버튼 */}
        <button type="submit" className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-100 active:scale-[0.98] transition-all mt-4">
          등록하기
        </button>
      </form>
    </div>
  );
};

export default AddSchedule;
