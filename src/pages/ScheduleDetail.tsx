import React, { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import { ChevronLeft, MapPin, AlignLeft, Clock, MessageCircle, BookOpen, Paperclip, Trash2, Sparkles, Edit2, FileText, Palette } from 'lucide-react';
import { RecurrenceSettings } from '../components';
import ImagePreviewModal from '../components/ImagePreviewModal'; // [추가]

interface LocationState {
  title?: string;
  start?: string | Date;
  end?: string | Date;
  location?: string;
  content?: string;
  color?: string;
  allDay?: boolean;
  attendees?: string[];
  recurrence?: RecurrenceSettings;
  review?: string;
  reviewImages?: string[];
}

const ScheduleDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  const eventData = location.state as LocationState | null;

  // [수정] 이미지 프리뷰 상태를 더 구체적으로 관리 (어떤 리스트의 몇 번째 이미지인지)
  const [previewState, setPreviewState] = useState<{
    isOpen: boolean;
    images: string[];
    index: number;
  }>({ isOpen: false, images: [], index: 0 });

  const [data] = useState({
    title: eventData?.title || '일정 제목 없음',
    start: eventData?.start ? dayjs(eventData.start) : dayjs(),
    end: eventData?.end ? dayjs(eventData.end) : dayjs().add(1, 'hour'),
    location: eventData?.location || '',
    content: eventData?.content || '',
    color: eventData?.color || '#3b82f6',
    allDay: eventData?.allDay || false,
    attendees: eventData?.attendees || ['나'],
    recurrence: eventData?.recurrence,
    files: [{ name: 'menu.pdf', type: 'doc' }],
    review: eventData?.review || '오랜만에 정말 즐거운 시간을 보냈다. 다음에도 또 가고 싶다!',
    reviewImages: eventData?.reviewImages || ['https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=150&h=150&fit=crop'],
  });

  const [chatMedia] = useState([
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=150&h=150&fit=crop',
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=150&h=150&fit=crop',
    'https://images.unsplash.com/photo-1526779218846-2731da2fbbf9?w=150&h=150&fit=crop', // 예시 이미지 추가
  ]);

  const isShared = data.attendees.length > 1;
  const isPastEvent = dayjs().isAfter(data.end);

  const handleDelete = () => {
    if (window.confirm('정말 이 일정을 삭제하시겠습니까?')) {
      navigate('/calendar');
    }
  };

  const handleEdit = () => {
    const safeData = {
      ...eventData,
      ...data,
      start: dayjs(data.start).toISOString(),
      end: dayjs(data.end).toISOString(),
    };
    navigate(`/schedule/edit/${id}`, { state: safeData });
  };

  // [추가] 전체보기 페이지로 이동
  const handleViewAllMedia = () => {
    navigate(`/schedule/${id}/media`, {
      state: {
        media: chatMedia,
        files: data.files,
        title: data.title,
      },
    });
  };

  // [추가] 이미지 클릭 시 모달 열기 헬퍼
  const openPreview = (images: string[], index: number) => {
    setPreviewState({ isOpen: true, images, index });
  };

  const formatDate = (date: dayjs.Dayjs, isAllDay: boolean) => {
    if (isAllDay) return date.format('YYYY년 M월 D일 (ddd)');
    return date.format('YYYY년 M월 D일 (ddd) A h:mm');
  };

  return (
    <div className="flex flex-col min-h-screen bg-white font-['Pretendard']">
      <nav className="px-6 pt-6 pb-2 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-40">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors">
          <ChevronLeft size={28} />
        </button>
        <div className="flex gap-1">
          <button onClick={handleEdit} className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
            <Edit2 size={22} />
          </button>
          <button onClick={handleDelete} className="p-2 -mr-2 text-gray-400 hover:text-red-600 transition-colors">
            <Trash2 size={22} />
          </button>
        </div>
      </nav>

      <div className="flex-1 px-6 pt-4 pb-12 overflow-y-auto w-full">
        {/* 타이틀 및 상세 정보 (기존과 동일) */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-50 rounded-xl">
              <Sparkles className="text-blue-600 w-5 h-5" />
            </div>
            <span className="text-[12px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">{data.recurrence?.frequency !== 'none' ? '반복 일정' : '일반 일정'}</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 leading-tight mb-4">{data.title}</h1>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: data.color }} />
            <span className="text-[13px] font-bold text-gray-500">태그 색상</span>
          </div>
        </div>

        <div className="space-y-8">
          {/* ... 상세 정보 섹션 (기존 코드 유지) ... */}
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
                <Clock size={20} className="text-gray-500" />
              </div>
              <div className="flex-1 py-1">
                <p className="text-[15px] font-bold text-gray-900 mb-1">{formatDate(data.start, data.allDay)}</p>
                {!data.allDay && <p className="text-[13px] font-medium text-gray-400">~ {formatDate(data.end, data.allDay)}</p>}
                {data.allDay && <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded ml-2">종일</span>}
              </div>
            </div>
            {data.location && (
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
                  <MapPin size={20} className="text-gray-500" />
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-bold text-gray-900">{data.location}</p>
                </div>
              </div>
            )}
            {data.content && (
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
                  <AlignLeft size={20} className="text-gray-500" />
                </div>
                <div className="flex-1 py-2">
                  <p className="text-[14px] font-medium text-gray-600 leading-relaxed whitespace-pre-wrap">{data.content}</p>
                </div>
              </div>
            )}
            {data.files.length > 0 && (
              <div className="pl-14">
                <div className="flex gap-2 flex-wrap">
                  {data.files.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-[14px] border border-gray-100">
                      <Paperclip size={14} className="text-blue-500" />
                      <span className="text-[12px] font-bold text-gray-700">{file.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="h-[1px] bg-gray-100" />

          {/* 공유 일정 채팅/미디어 */}
          {isShared && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[14px] font-bold text-gray-900 flex items-center gap-2">
                  <MessageCircle size={18} className="text-blue-600" /> 공유 멤버 및 채팅
                </h3>
                <div className="flex -space-x-2">
                  {data.attendees.map((user, i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-blue-600">
                      {user[0]}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => navigate(`/chat/${id}`)}
                className="w-full h-[60px] bg-[#EBF4FF] rounded-[20px] flex items-center justify-between px-6 active:scale-[0.98] transition-all border border-blue-100 group"
              >
                <div className="flex flex-col items-start">
                  <span className="text-[15px] font-black text-blue-600">채팅방 입장하기</span>
                  <span className="text-[11px] font-medium text-blue-400">일정 조율 및 사진 공유</span>
                </div>
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                  <ChevronLeft size={20} className="text-blue-600 rotate-180 ml-0.5" />
                </div>
              </button>

              {/* 공유 미디어 갤러리 */}
              <div>
                <div className="flex items-center justify-between px-1 mb-3">
                  <span className="text-[13px] font-bold text-gray-500">공유된 사진/문서</span>
                  <button onClick={handleViewAllMedia} className="text-[11px] font-bold text-gray-400 hover:text-gray-600">
                    전체보기
                  </button>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {chatMedia.map((src: string, i: number) => (
                    <div
                      key={i}
                      onClick={() => openPreview(chatMedia, i)} // [수정] 클릭 시 전체보기 모달 열기
                      className="relative w-20 h-20 shrink-0 rounded-[16px] overflow-hidden border border-gray-100 shadow-sm cursor-pointer"
                    >
                      <img src={src} alt="shared" className="w-full h-full object-cover" />
                    </div>
                  ))}
                  <button
                    onClick={handleViewAllMedia}
                    className="w-20 h-20 shrink-0 rounded-[16px] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-300 gap-1 hover:border-blue-300 hover:text-blue-500 transition-colors"
                  >
                    <FileText size={20} />
                    <span className="text-[10px] font-bold">More</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 개인 일정 후기 */}
          {!isShared && isPastEvent && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen size={20} className="text-emerald-500" />
                <h3 className="text-[16px] font-black text-gray-900">오늘의 기록</h3>
              </div>

              {data.review ? (
                <div className="bg-white border border-gray-100 rounded-[24px] p-5 shadow-sm space-y-4">
                  <p className="text-[14px] font-medium text-gray-700 leading-relaxed whitespace-pre-wrap">{data.review}</p>
                  {data.reviewImages && data.reviewImages.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                      {data.reviewImages.map((src: string, i: number) => (
                        <div
                          key={i}
                          onClick={() => openPreview(data.reviewImages!, i)} // [수정] 클릭 시 모달 열기
                          className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-gray-100 cursor-zoom-in active:scale-95 transition-transform"
                        >
                          <img src={src} alt="review" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div onClick={handleEdit} className="py-8 text-center bg-gray-50 rounded-[24px] border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors">
                  <p className="text-[13px] font-bold text-gray-400">
                    작성된 후기가 없습니다.
                    <br />
                    눌러서 후기를 작성해보세요!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* [수정] 공통 이미지 프리뷰 모달 사용 */}
      {previewState.isOpen && (
        <ImagePreviewModal images={previewState.images} initialIndex={previewState.index} onClose={() => setPreviewState((prev) => ({ ...prev, isOpen: false }))} />
      )}
    </div>
  );
};

export default ScheduleDetail;
