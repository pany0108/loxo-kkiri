import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { ChevronLeft, MapPin, AlignLeft, Clock, MessageCircle, BookOpen, Trash2, Sparkles, Edit2, Bell } from 'lucide-react';
import { RecurrenceSettings, DeleteRecurringModal, ImagePreviewModal } from '../components';
import { doc, deleteDoc, updateDoc, arrayUnion, onSnapshot, getDoc } from 'firebase/firestore'; // getDoc 추가
import { db } from '../firebase'; // auth 추가

interface LocationState {
  id?: string;
  title?: string;
  start?: string | Date;
  end?: string | Date;
  location?: string;
  content?: string;
  color?: string;
  notification?: string;
  calendarId?: string;
  allDay?: boolean;
  attendees?: string[];
  recurrence?: RecurrenceSettings;
  review?: string;
  reviewImages?: string[];
  files?: { name: string; type: string; url?: string }[];
}

const ScheduleDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  // 캘린더에서 넘겨준 데이터 (여기에 클릭한 1월 3일, 4일 등의 정보가 들어있음)
  const initialState = location.state as LocationState | null;

  const [data, setData] = useState({
    title: initialState?.title || '로딩 중...',
    start: initialState?.start ? dayjs(initialState.start) : dayjs(),
    end: initialState?.end ? dayjs(initialState.end) : dayjs().add(1, 'hour'),
    location: initialState?.location || '',
    content: initialState?.content || '',
    color: initialState?.color || '#3b82f6',
    calendarId: initialState?.calendarId || '',
    notification: initialState?.notification || 'none',
    allDay: initialState?.allDay || false,
    attendees: initialState?.attendees || ['나'],
    recurrence: initialState?.recurrence,
    files: initialState?.files || [],
    review: initialState?.review || '',
    reviewImages: initialState?.reviewImages || [],
  });

  const [previewState, setPreviewState] = useState<{
    isOpen: boolean;
    images: string[];
    index: number;
  }>({ isOpen: false, images: [], index: 0 });

  const [chatMedia] = useState([
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=150&h=150&fit=crop',
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=150&h=150&fit=crop',
    'https://images.unsplash.com/photo-1526779218846-2731da2fbbf9?w=150&h=150&fit=crop',
  ]);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // DB 실시간 구독
  useEffect(() => {
    if (!id) return;

    const unsubscribe = onSnapshot(doc(db, 'schedules', id), async (docSnap) => {
      if (docSnap.exists()) {
        const dbData = docSnap.data();
        // [추가] 참석자 UID를 이름으로 변환
        const attendeeNames = await Promise.all(
          (dbData.attendees || []).map(async (uid: string) => {
            try {
              const userDoc = await getDoc(doc(db, 'users', uid));
              return userDoc.exists() ? userDoc.data().name : '?';
            } catch {
              // In case of error, return a placeholder
              return '?';
            }
          }),
        );
        // [핵심 수정] 반복 일정 처리 로직
        const isRecurring = dbData.recurrence && dbData.recurrence.frequency !== 'none';
        // 1. 반복 일정이고, 2. 캘린더에서 클릭해서 들어온 정보(initialState)가 있다면?
        // => DB의 원본 날짜(1월 2일) 대신 클릭한 날짜(1월 3일, 4일...)를 사용한다.
        const displayStart = isRecurring && initialState?.start ? dayjs(initialState.start) : dayjs(dbData.start);
        const displayEnd = isRecurring && initialState?.end ? dayjs(initialState.end) : dayjs(dbData.end);
        setData({
          title: dbData.title,
          start: displayStart, // 보정된 날짜 사용
          end: displayEnd, // 보정된 날짜 사용
          location: dbData.location || '',
          content: dbData.content || '',
          color: dbData.color || '#3b82f6',
          calendarId: dbData.calendarId,
          notification: dbData.notification || 'none',
          allDay: dbData.isAllDay || false,
          attendees: attendeeNames,
          recurrence: dbData.recurrence,
          files: dbData.files || [],
          review: dbData.review || '',
          reviewImages: dbData.reviewImages || [],
        });
      } else {
        toast.error('삭제된 일정입니다.');
        navigate('/calendar');
      }
    });

    return () => unsubscribe();
    // 의존성 배열에 initialState를 추가하여, 처음에 받은 날짜 정보를 기억하게 함
  }, [id, navigate, initialState]);

  const isShared = data.attendees.length > 1;
  const isPastEvent = dayjs().isAfter(data.end);

  const handleDeleteClick = async () => {
    // 1. 반복 일정이 아니면 바로 삭제 컨펌
    if (!data.recurrence || data.recurrence.frequency === 'none') {
      if (window.confirm('정말 이 일정을 삭제하시겠습니까?')) {
        deleteEntireSchedule();
      }
      return;
    }

    // 2. 반복 일정이면 모달 띄우기
    setIsDeleteModalOpen(true);
  };

  // 1. 전체 삭제 (문서 자체 삭제)
  const deleteEntireSchedule = async () => {
    try {
      if (id) {
        await deleteDoc(doc(db, 'schedules', id));
        toast.success('일정이 삭제되었습니다.');
        navigate('/calendar');
      }
    } catch (error) {
      console.error('삭제 실패:', error);
      toast.error('삭제 중 오류가 발생했습니다.');
    }
  };

  // 2. 이 일정만 삭제 (exceptions 배열에 현재 날짜 추가)
  const deleteOnlyThis = async () => {
    try {
      if (id) {
        // 현재 보고 있는 날짜(start)를 문자열로 변환 (YYYY-MM-DD)
        const dateToDelete = data.start.format('YYYY-MM-DD');

        await updateDoc(doc(db, 'schedules', id), {
          'recurrence.exceptions': arrayUnion(dateToDelete),
        });

        toast.success('해당 날짜의 일정이 삭제되었습니다.');
        navigate('/calendar');
      }
    } catch (error) {
      console.error('개별 삭제 실패:', error);
      toast.error('삭제 중 오류가 발생했습니다.');
    }
  };

  // 3. 향후 일정 모두 삭제 (endDate를 어제로 수정)
  const deleteFollowing = async () => {
    try {
      if (id) {
        // 현재 날짜의 하루 전을 종료일로 설정
        const newEndDate = data.start.subtract(1, 'day').format('YYYY-MM-DD');

        await updateDoc(doc(db, 'schedules', id), {
          'recurrence.endType': 'date', // 종료 타입을 날짜로 강제 변경
          'recurrence.endDate': newEndDate,
        });

        toast.success('이후 일정이 모두 삭제되었습니다.');
        navigate('/calendar');
      }
    } catch (error) {
      console.error('향후 일정 삭제 실패:', error);
      toast.error('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleEdit = () => {
    // 수정 시에는 현재 보고 있는 날짜가 아닌, 원본 데이터의 ID로 이동
    // (반복 일정 수정 시 정책에 따라 다르지만, 여기서는 원본 수정으로 간주)
    const safeData = {
      id,
      ...data,
      start: data.start.toISOString(),
      end: data.end.toISOString(),
    };
    navigate(`/schedule/edit/${id}`, { state: safeData });
  };

  const formatDate = (date: dayjs.Dayjs, isAllDay: boolean) => {
    if (isAllDay) return date.format('YYYY년 M월 D일 (ddd)');
    return date.format('YYYY년 M월 D일 (ddd) A h:mm');
  };

  const getNotificationLabel = (value: string) => {
    switch (value) {
      case 'none':
        return '알림 안함';
      case '0':
        return '이벤트 시작 정각';
      case '5':
        return '5분 전';
      case '10':
        return '10분 전';
      case '30':
        return '30분 전';
      case '60':
        return '1시간 전';
      case '1440':
        return '1일 전';
      default:
        return '알림 없음';
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-950 font-['Pretendard']">
      <nav className="px-6 pt-6 pb-2 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-gray-950/80 backdrop-blur-md z-40">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
          <ChevronLeft size={28} />
        </button>
        <div className="flex gap-1">
          <button onClick={handleEdit} className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            <Edit2 size={22} />
          </button>
          <button onClick={handleDeleteClick} className="p-2 -mr-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-500 transition-colors">
            <Trash2 size={22} />
          </button>
        </div>
      </nav>

      <div className="flex-1 px-6 pt-4 pb-12 overflow-y-auto w-full">
        {/* 타이틀 및 상세 정보 */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-50 dark:bg-blue-500/10 rounded-xl">
              <Sparkles className="text-blue-600 dark:text-blue-400 w-5 h-5" />
            </div>

            {data.recurrence?.frequency !== 'none' && (
              <span className="text-[12px] font-bold text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded-lg">반복 일정</span>
            )}
          </div>

          <div className="flex relative pl-4">
            <div className="absolute left-0 top-1 bottom-1 w-[5px] rounded-full" style={{ backgroundColor: data.color }} />
            <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">{data.title}</h1>
          </div>
        </div>

        <div className="space-y-8">
          {/* 상세 정보 섹션 */}
          <div className="space-y-5">
            {/* 시간 */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
                <Clock size={20} className="text-gray-500 dark:text-gray-400" />
              </div>
              <div className="flex-1 py-1">
                <p className="text-[15px] font-bold text-gray-900 dark:text-white mb-1">
                  {formatDate(data.start, data.allDay)}
                  {data.allDay && (
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded ml-2">종일</span>
                  )}
                </p>
                {!data.allDay && <p className="text-[13px] font-medium text-gray-400 dark:text-gray-500">~ {formatDate(data.end, data.allDay)}</p>}
              </div>
            </div>

            {/* 장소 */}
            {data.location && (
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
                  <MapPin size={20} className="text-gray-500 dark:text-gray-400" />
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-bold text-gray-900 dark:text-white">{data.location}</p>
                </div>
              </div>
            )}

            {/* 알림 정보 */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
                <Bell size={20} className="text-gray-500 dark:text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-bold text-gray-900 dark:text-white">{getNotificationLabel(data.notification)}</p>
              </div>
            </div>

            {/* 메모 */}
            {data.content && (
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
                  <AlignLeft size={20} className="text-gray-500 dark:text-gray-400" />
                </div>
                <div className="flex-1 py-2">
                  <p className="text-[14px] font-medium text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{data.content}</p>
                </div>
              </div>
            )}

            {/* 첨부파일 */}
            {/* {data.files && data.files.length > 0 && (
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
            )} */}
          </div>

          <div className="h-[1px] bg-gray-100 dark:bg-gray-800" />

          {/* 공유 일정 채팅/미디어 */}
          {isShared && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[14px] font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <MessageCircle size={18} className="text-blue-600 dark:text-blue-400" /> 공유 멤버 및 채팅
                </h3>
                <div className="flex -space-x-2">
                  {data.attendees.map((user, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/20 border-2 border-white dark:border-gray-800 flex items-center justify-center text-[10px] font-bold text-blue-600 dark:text-blue-300"
                    >
                      {user[0]}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => navigate(`/chat/${id}`)}
                className="w-full h-[60px] bg-[#EBF4FF] dark:bg-blue-500/10 rounded-[20px] flex items-center justify-between px-6 active:scale-[0.98] transition-all border border-blue-100 dark:border-blue-900/50 group"
              >
                <div className="flex flex-col items-start">
                  <span className="text-[15px] font-black text-blue-600 dark:text-blue-300">채팅방 입장하기</span>
                  <span className="text-[11px] font-medium text-blue-400 dark:text-blue-500">일정 조율 및 사진 공유</span>
                </div>
                <div className="w-10 h-10 bg-white dark:bg-blue-500/20 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                  <ChevronLeft size={20} className="text-blue-600 dark:text-blue-300 rotate-180 ml-0.5" />
                </div>
              </button>

              {/* [주석 처리] 공유 미디어 갤러리 (기능 준비중) */}
              {/*
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
                      onClick={() => openPreview(chatMedia, i)}
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
              */}
            </div>
          )}

          {/* 개인 일정 후기 */}
          {!isShared && isPastEvent && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen size={20} className="text-emerald-500" />
                <h3 className="text-[16px] font-black text-gray-900 dark:text-white">오늘의 기록</h3>
              </div>

              {data.review ? (
                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-[24px] p-5 shadow-sm space-y-4">
                  <p className="text-[14px] font-medium text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{data.review}</p>
                  {/* [주석 처리] 후기 사진 (기능 준비중) */}
                  {/* {data.reviewImages && data.reviewImages.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                      {data.reviewImages.map((src: string, i: number) => (
                        <div
                          key={i}
                          onClick={() => openPreview(data.reviewImages!, i)}
                          className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-gray-100 cursor-zoom-in active:scale-95 transition-transform"
                        >
                          <img src={src} alt="review" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )} */}
                </div>
              ) : (
                <div
                  onClick={handleEdit}
                  className="py-8 text-center bg-gray-50 dark:bg-gray-800/50 rounded-[24px] border border-gray-100 dark:border-gray-700/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <p className="text-[13px] font-bold text-gray-400 dark:text-gray-500">
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

      {/* [추가] 반복 일정 삭제 모달 */}
      {isDeleteModalOpen && (
        <DeleteRecurringModal onClose={() => setIsDeleteModalOpen(false)} onDeleteOne={deleteOnlyThis} onDeleteFollowing={deleteFollowing} onDeleteAll={deleteEntireSchedule} />
      )}

      {previewState.isOpen && (
        <ImagePreviewModal images={previewState.images} initialIndex={previewState.index} onClose={() => setPreviewState((prev) => ({ ...prev, isOpen: false }))} />
      )}
    </div>
  );
};

export default ScheduleDetail;
