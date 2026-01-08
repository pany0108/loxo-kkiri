import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { MapPin, AlignLeft, Clock, MessageCircle, BookOpen, Trash2, Sparkles, Edit2, Bell, Calendar as CalendarIcon, Copy, ChevronLeft } from 'lucide-react';
import { auth } from '../../firebase'; // Import auth to check current user
import { PageLayout, RecurrenceSettings, DeleteRecurringModal, ImagePreviewModal, SimpleDeleteModal } from 'components';
import { doc, deleteDoc, updateDoc, arrayUnion, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../../firebase'; // Corrected import path for db
import { useCalendar } from 'contexts';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

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
  fromView?: string; // [추가] 캘린더에서 어떤 뷰에서 왔는지 식별
}

// [추가] ScheduleDetail 컴포넌트의 data 상태 타입을 정의합니다.
interface ScheduleDetailData {
  title: string;
  start: dayjs.Dayjs;
  end: dayjs.Dayjs;
  location: string;
  content: string;
  color: string;
  calendarId: string;
  notification: string;
  allDay: boolean;
  attendees: AttendeeProfile[];
  recurrence?: RecurrenceSettings;
  files: { name: string; type: string; url?: string }[];
  userId?: string;
  review: string;
  reviewImages: string[];
}

// [추가] 참석자 프로필 타입 정의
interface AttendeeProfile {
  uid: string;
  name: string;
  photoURL?: string;
}

const ScheduleDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { myCalendars } = useCalendar();

  // 캘린더에서 넘겨준 데이터 (여기에 클릭한 1월 3일, 4일 등의 정보가 들어있음)
  const initialState = location.state as LocationState | null;

  const [data, setData] = useState<ScheduleDetailData>({
    title: initialState?.title || '로딩 중...',
    start: initialState?.start ? dayjs(initialState.start) : dayjs(),
    end: initialState?.end ? dayjs(initialState.end) : dayjs().add(1, 'hour'),
    location: initialState?.location || '',
    content: initialState?.content || '',
    color: initialState?.color || '#3b82f6',
    calendarId: initialState?.calendarId || '',
    notification: initialState?.notification || 'none',
    allDay: initialState?.allDay || false,
    attendees: [] as AttendeeProfile[],
    recurrence: initialState?.recurrence,
    files: initialState?.files || [],
    userId: undefined, // [추가] userId 초기값 설정
    review: initialState?.review || '',
    reviewImages: initialState?.reviewImages || [],
  });

  const [previewState, setPreviewState] = useState<{
    isOpen: boolean;
    images: string[];
    index: number;
  }>({ isOpen: false, images: [], index: 0 });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSimpleDeleteModalOpen, setIsSimpleDeleteModalOpen] = useState(false);
  const scheduleCalendar = myCalendars.find((c) => c.id === data.calendarId);

  // DB 실시간 구독
  useEffect(() => {
    if (!id) return;

    const unsubscribe = onSnapshot(doc(db, 'schedules', id), async (docSnap) => {
      if (docSnap.exists()) {
        const dbData = docSnap.data();
        // [추가] 참석자 UID를 이름으로 변환
        const attendeeProfiles: AttendeeProfile[] = await Promise.all(
          (dbData.attendees || []).map(async (uid: string) => {
            try {
              const userDoc = await getDoc(doc(db, 'users', uid));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                return { uid, name: userData.name || '알 수 없음', photoURL: userData.photoURL };
              }
              return { uid, name: '알 수 없음', photoURL: undefined };
            } catch {
              // In case of error, return a placeholder
              return { uid, name: '알 수 없음', photoURL: undefined };
            }
          }),
        );
        // [핵심 수정] 반복 일정 처리 로직
        const isRecurring = dbData.recurrence && dbData.recurrence.frequency !== 'none';
        // 1. 반복 일정이고, 2. 캘린더에서 클릭해서 들어온 정보(initialState)가 있다면?
        // => DB의 원본 날짜(1월 2일) 대신 클릭한 날짜(1월 3일, 4일...)를 사용한다.
        const displayStart = isRecurring && initialState?.start ? dayjs(initialState.start) : dayjs(dbData.start);
        let displayEnd;

        if (isRecurring && initialState?.start) {
          // 반복 일정의 특정 발생(occurrence)을 보는 경우
          if (initialState.end) {
            // FullCalendar가 전달한 인스턴스의 종료 시간을 사용
            displayEnd = dayjs(initialState.end);
          } else {
            // end가 없으면(예: 종일 일정), 원본 이벤트의 기간(duration)을 계산하여 적용
            const originalDuration = dayjs(dbData.end || dbData.start).diff(dayjs(dbData.start));
            displayEnd = dayjs(initialState.start).add(originalDuration);
          }
        } else {
          // 반복 일정이 아니거나, 직접 접근한 경우 DB의 종료 시간 사용
          displayEnd = dayjs(dbData.end || dbData.start);
        }

        setData({
          title: dbData.title,
          start: displayStart, // 보정된 날짜 사용
          end: displayEnd, // 보정된 종료 날짜 사용
          location: dbData.location || '',
          content: dbData.content || '',
          color: dbData.color || '#3b82f6',
          calendarId: dbData.calendarId,
          notification: dbData.notification || 'none',
          allDay: dbData.isAllDay || false,
          attendees: attendeeProfiles,
          recurrence: dbData.recurrence,
          userId: dbData.userId, // [추가] userId 할당
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
  // [수정] '지난 일정' 여부 판단 로직 개선
  // 종일 일정의 경우, 해당 날짜가 완전히 지나야 '지난 일정'으로 판단합니다.
  // 예를 들어 1월 8일 일정은 1월 9일 00:00부터 후기 작성이 가능합니다.
  const isPastEvent = dayjs().startOf('day').isAfter(data.end);

  // [추가] 뒤로가기 핸들러. 일정의 월로 캘린더를 이동시킵니다.
  const handleBack = useCallback(() => {
    if (data.start) {
      // [수정] 뒤로 갈 때, 원래 있던 뷰(주/일) 정보도 함께 전달
      navigate('/calendar', {
        state: {
          targetDate: data.start.toISOString(),
          targetView: initialState?.fromView,
        },
      });
    } else {
      navigate(-1); // Fallback
    }
  }, [data.start, initialState?.fromView, navigate]);

  // [추가] 안드로이드 뒤로가기 버튼 처리
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const listenerPromise = CapacitorApp.addListener('backButton', () => {
      handleBack();
    });

    return () => {
      listenerPromise.then((listener: PluginListenerHandle) => listener.remove());
    };
  }, [handleBack]);

  const handleDeleteClick = async () => {
    // 1. 반복 일정이 아니면 바로 삭제 컨펌
    if (!data.recurrence || data.recurrence.frequency === 'none') {
      setIsSimpleDeleteModalOpen(true);
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

  /**
   * [추가] 일정 복사 핸들러
   * 현재 일정 정보를 바탕으로 새 일정 생성 페이지로 이동합니다.
   * 날짜는 오늘로, 시간과 기간은 원본 일정과 동일하게 설정합니다.
   */
  const handleCopy = () => {
    if (!data) return;

    const today = dayjs();
    const originalStart = dayjs(data.start);
    const originalEnd = dayjs(data.end);

    // 원본의 시간(시, 분)을 가져와 오늘 날짜에 적용
    const newStart = today.hour(originalStart.hour()).minute(originalStart.minute()).second(0);

    // 원본 일정의 기간(duration)을 계산
    const duration = originalEnd.diff(originalStart);
    // 오늘 날짜의 시작 시간에 기간을 더해 종료 시간 계산
    const newEnd = newStart.add(duration);

    // 새 일정 생성 페이지로 전달할 데이터
    const { attendees, review, reviewImages, userId, ...copiedData } = data;

    const finalCopiedData = {
      ...copiedData,
      start: newStart.toISOString(), // 오늘 날짜 + 원본 시간
      end: newEnd.toISOString(),
      location: '', // [수정] 장소는 복사하지 않음
      content: '', // [수정] 메모는 복사하지 않음
      // 복사된 일정은 반복이 아니도록 초기화
      recurrence: undefined,
    };

    toast.success('일정이 복사되었습니다. 날짜를 확인하고 저장하세요.');
    navigate('/add-schedule', { state: finalCopiedData });
  };

  const renderFooter = () => (
    <footer className="pt-8 mt-8 border-t border-gray-100 dark:border-gray-800 flex flex-col items-center gap-4">
      <button
        type="button"
        onClick={handleCopy}
        className="w-full text-center text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors py-3 flex items-center justify-center gap-2"
      >
        <Copy size={14} /> 이 일정 복사하기
      </button>
      {/* [추가] 일정 소유자만 삭제 버튼이 보이도록 수정 */}
      {auth.currentUser?.uid === data.userId && (
        <button
          type="button"
          onClick={handleDeleteClick}
          className="w-full text-center text-sm font-bold text-red-500 dark:text-red-500/80 hover:text-red-700 dark:hover:text-red-400 transition-colors py-3"
        >
          이 일정 삭제하기
        </button>
      )}
    </footer>
  );

  // const handleViewAllMedia = () => {
  //   navigate(`/schedule/${id}/media`, {
  //     state: {
  //       media: chatMedia,
  //       files: data.files,
  //       title: data.title,
  //     },
  //   });
  // };

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
    <>
      <PageLayout
        title="일정 상세"
        onBack={handleBack}
        extraNav={
          auth.currentUser?.uid === data.userId && (
            <div className="flex items-center gap-1">
              <button onClick={handleEdit} className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                <Edit2 size={22} />
              </button>
            </div>
          )
        }
      >
        {/* 타이틀 및 상세 정보 */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-xl">
              <Sparkles className="text-blue-600 w-6 h-6" />
            </div>

            {data.recurrence && data.recurrence.frequency !== 'none' && (
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

            {/* [추가] 캘린더 정보 */}
            {scheduleCalendar && (
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
                  <CalendarIcon size={20} className="text-gray-500 dark:text-gray-400" />
                </div>
                {/* [수정] 클릭 기능이 제거됨에 따라, 다른 항목과 일관성을 위해 UI를 단순화합니다. */}
                <div className="flex-1 flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: scheduleCalendar.color }} />
                  <span className="text-[15px] font-bold text-gray-900 dark:text-white">{scheduleCalendar.name}</span>
                </div>
              </div>
            )}

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

            {/* 알림 정보 */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
                <Bell size={20} className="text-gray-500 dark:text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-bold text-gray-900 dark:text-white">{getNotificationLabel(data.notification)}</p>
              </div>
            </div>

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
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[14px] font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <MessageCircle size={18} className="text-blue-600 dark:text-blue-400" /> 공유 멤버 및 채팅
                </h3>
                <div className="flex -space-x-2">
                  {' '}
                  {/* [수정] attendee 타입 명시 */}
                  {data.attendees.map((attendee: AttendeeProfile) => (
                    <div
                      key={attendee.uid}
                      title={attendee.name}
                      className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/20 border-2 border-white dark:border-gray-800 flex items-center justify-center text-[10px] font-bold text-blue-600 dark:text-blue-300 overflow-hidden"
                    >
                      {attendee.photoURL ? <img src={attendee.photoURL} alt={attendee.name} className="w-full h-full object-cover" /> : attendee.name[0] || '?'}
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

        {/* [수정] 복사 및 삭제 버튼을 스크롤 가능한 콘텐츠 영역 하단으로 이동 */}
        {renderFooter()}
      </PageLayout>

      {/* [추가] 반복 일정 삭제 모달 */}
      {isDeleteModalOpen && (
        <DeleteRecurringModal onClose={() => setIsDeleteModalOpen(false)} onDeleteOne={deleteOnlyThis} onDeleteFollowing={deleteFollowing} onDeleteAll={deleteEntireSchedule} />
      )}

      <SimpleDeleteModal
        isOpen={isSimpleDeleteModalOpen}
        onClose={() => setIsSimpleDeleteModalOpen(false)}
        onConfirm={deleteEntireSchedule}
        title="일정 삭제"
        message={
          <>
            정말 이 일정을 삭제하시겠습니까?
            <br />
            삭제된 일정은 복구할 수 없습니다.
          </>
        }
      />

      {previewState.isOpen && (
        <ImagePreviewModal images={previewState.images} initialIndex={previewState.index} onClose={() => setPreviewState((prev) => ({ ...prev, isOpen: false }))} />
      )}
    </>
  );
};

export default ScheduleDetail;
