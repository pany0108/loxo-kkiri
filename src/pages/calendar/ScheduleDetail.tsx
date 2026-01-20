import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { arrayUnion, collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import dayjs from 'dayjs';
import {
  AlignLeft,
  Bell,
  BookOpen,
  Briefcase,
  Calendar as CalendarIcon,
  Clock,
  Coffee,
  Copy,
  Dumbbell,
  Edit2,
  Gamepad2,
  Gift,
  GraduationCap,
  Heart,
  Home,
  MapPin,
  MessageCircle,
  MoreVertical,
  Music,
  Plane,
  ShoppingCart,
  Star,
  Trash2,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { auth, db } from '../../firebase';
import { ConfirmModal, DeleteRecurringModal, ImagePreviewModal, PageHeader, PageLayout, RecurrenceSettings } from 'components';
import { useCalendar } from 'contexts';

/**
 * 페이지 이동 시 전달되는 상태 데이터 인터페이스
 */
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
  isAnniversary?: boolean;
  isLunar?: boolean;
  isLeapMonth?: boolean;
  fromView?: string;
}

/**
 * 일정 상세 정보 데이터 인터페이스
 */
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
  isAnniversary?: boolean;
  isLunar?: boolean;
  isLeapMonth?: boolean;
}

/**
 * 참석자 프로필 인터페이스
 */
interface AttendeeProfile {
  uid: string;
  name: string;
  photoURL?: string;
}

/**
 * 공유 후기 데이터 인터페이스
 */
interface ReviewData {
  uid: string;
  content: string;
  createdAt: any;
  updatedAt?: any;
}

/**
 * 캘린더 아이콘 매핑 객체
 */
const ICON_MAP: Record<string, React.ElementType> = {
  home: Home,
  work: Briefcase,
  study: GraduationCap,
  workout: Dumbbell,
  travel: Plane,
  music: Music,
  love: Heart,
  star: Star,
  gift: Gift,
  food: Coffee,
  shopping: ShoppingCart,
  game: Gamepad2,
};

/**
 * 일정 상세 페이지 컴포넌트
 * - 일정의 상세 정보 표시 (제목, 시간, 장소, 메모 등)
 * - 반복 일정 처리 및 삭제/수정/복사 기능
 * - 공유 일정의 경우 후기 작성 및 채팅방 이동 기능 제공
 *
 * @returns {JSX.Element} 일정 상세 화면
 */
const ScheduleDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { myCalendars } = useCalendar();

  const initialState = (location.state as LocationState) || null;

  // --- State ---
  const [data, setData] = useState<ScheduleDetailData>({
    title: initialState?.title || '로딩 중...',
    start: initialState?.start ? dayjs(initialState.start) : dayjs(),
    end: initialState?.end ? dayjs(initialState.end) : dayjs().add(1, 'hour'),
    location: initialState?.location || '',
    content: initialState?.content || '',
    color: initialState?.color || '#007AFF',
    calendarId: initialState?.calendarId || '',
    notification: initialState?.notification || 'none',
    allDay: initialState?.allDay || false,
    attendees: [] as AttendeeProfile[],
    recurrence: initialState?.recurrence,
    files: initialState?.files || [],
    userId: undefined,
    review: initialState?.review || '',
    reviewImages: initialState?.reviewImages || [],
    isAnniversary: initialState?.isAnniversary || false,
    isLunar: initialState?.isLunar || false,
    isLeapMonth: initialState?.isLeapMonth || false,
  });

  const [previewState, setPreviewState] = useState<{
    isOpen: boolean;
    images: string[];
    index: number;
  }>({ isOpen: false, images: [], index: 0 });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSimpleDeleteModalOpen, setIsSimpleDeleteModalOpen] = useState(false);
  const [isReviewDeleteModalOpen, setIsReviewDeleteModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [sharedReviews, setSharedReviews] = useState<ReviewData[]>([]);
  const [myReviewText, setMyReviewText] = useState('');

  const menuRef = useRef<HTMLDivElement>(null);

  const scheduleCalendar = myCalendars.find((c) => c.id === data.calendarId);
  const isShared = data.attendees.length > 1;
  const isPastEvent = dayjs().startOf('day').isAfter(data.end);

  // --- Effects ---

  // 메뉴 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 일정 데이터 실시간 구독 및 초기화
  useEffect(() => {
    if (!id) return;

    const unsubscribe = onSnapshot(doc(db, 'schedules', id), async (docSnap) => {
      if (docSnap.exists()) {
        const dbData = docSnap.data();
        // 참석자 정보 조회
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
              return { uid, name: '알 수 없음', photoURL: undefined };
            }
          }),
        );

        // 반복 일정 날짜 보정 로직
        const isRecurring = dbData.recurrence && dbData.recurrence.frequency !== 'none';
        const displayStart = isRecurring && initialState?.start ? dayjs(initialState.start) : dayjs(dbData.start);
        let displayEnd;

        if (isRecurring && initialState?.start) {
          if (initialState.end) {
            displayEnd = dayjs(initialState.end);
          } else {
            const originalDuration = dayjs(dbData.end || dbData.start).diff(dayjs(dbData.start));
            displayEnd = dayjs(initialState.start).add(originalDuration);
          }
        } else {
          displayEnd = dayjs(dbData.end || dbData.start);
        }

        setData({
          title: dbData.title,
          start: displayStart,
          end: displayEnd,
          location: dbData.location || '',
          content: dbData.content || '',
          color: dbData.color || '#007AFF',
          calendarId: dbData.calendarId,
          notification: dbData.notification || 'none',
          allDay: dbData.isAllDay || false,
          attendees: attendeeProfiles,
          recurrence: dbData.recurrence,
          userId: dbData.userId,
          files: dbData.files || [],
          review: dbData.review || '',
          reviewImages: dbData.reviewImages || [],
          isAnniversary: dbData.isAnniversary || false,
          isLunar: dbData.isLunar || false,
          isLeapMonth: dbData.isLeapMonth || false,
        });
      } else {
        navigate('/calendar');
      }
    });

    return () => unsubscribe();
  }, [id, navigate, initialState]);

  // 공유 일정인 경우 리뷰 데이터 구독
  useEffect(() => {
    if (!id || !isShared) return;

    const q = query(collection(db, 'schedules', id, 'reviews'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reviews = snapshot.docs.map((doc) => ({
        uid: doc.id,
        ...doc.data(),
      })) as ReviewData[];
      setSharedReviews(reviews);

      const myReview = reviews.find((r) => r.uid === auth.currentUser?.uid);
      if (myReview) {
        setMyReviewText(myReview.content);
      }
    });

    return () => unsubscribe();
  }, [id, isShared]);

  // 안드로이드 하드웨어 뒤로가기 버튼 처리
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
  }, []);

  // --- Handlers ---

  /** 공유 후기 저장 핸들러 */
  const handleSharedReviewSubmit = async () => {
    if (!id || !auth.currentUser || !myReviewText.trim()) return;
    try {
      await setDoc(
        doc(db, 'schedules', id, 'reviews', auth.currentUser.uid),
        {
          content: myReviewText,
          uid: auth.currentUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      toast.success('후기가 저장되었습니다.');
    } catch (error) {
      console.error('후기 저장 실패:', error);
      toast.error('후기 저장 중 오류가 발생했습니다.');
    }
  };

  /** 공유 후기 삭제 요청 핸들러 (모달 오픈) */
  const handleSharedReviewDelete = async () => {
    if (!id || !auth.currentUser) return;

    const myReview = sharedReviews.find((r) => r.uid === auth.currentUser?.uid);
    if (!myReview) {
      toast.error('삭제할 후기가 없습니다.');
      return;
    }

    setIsReviewDeleteModalOpen(true);
  };

  /** 공유 후기 삭제 확정 핸들러 */
  const confirmSharedReviewDelete = async () => {
    if (!id || !auth.currentUser) return;

    try {
      await deleteDoc(doc(db, 'schedules', id, 'reviews', auth.currentUser.uid));
      setMyReviewText('');
      toast.success('후기가 삭제되었습니다.');
    } catch (error) {
      console.error('후기 삭제 실패:', error);
      toast.error('후기 삭제에 실패했습니다.');
    } finally {
      setIsReviewDeleteModalOpen(false);
    }
  };

  /** 뒤로가기 핸들러 (이전 캘린더 뷰 상태 유지) */
  const handleBack = useCallback(() => {
    if (data.start) {
      navigate('/calendar', {
        state: {
          targetDate: data.start.toISOString(),
          targetView: initialState?.fromView,
        },
      });
    } else {
      navigate(-1);
    }
  }, [data.start, initialState?.fromView, navigate]);

  /** 삭제 버튼 클릭 핸들러 (반복 일정 여부에 따라 분기) */
  const handleDeleteClick = async () => {
    if (!data.recurrence || data.recurrence.frequency === 'none') {
      setIsSimpleDeleteModalOpen(true);
      return;
    }
    setIsDeleteModalOpen(true);
  };

  /** 전체 일정 삭제 핸들러 */
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

  /** 현재 일정만 삭제 핸들러 (반복 예외 처리) */
  const deleteOnlyThis = async () => {
    try {
      if (id) {
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

  /** 향후 일정 모두 삭제 핸들러 */
  const deleteFollowing = async () => {
    try {
      if (id) {
        const newEndDate = data.start.subtract(1, 'day').format('YYYY-MM-DD');

        await updateDoc(doc(db, 'schedules', id), {
          'recurrence.endType': 'date',
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

  /** 일정 수정 페이지로 이동 핸들러 */
  const handleEdit = () => {
    const safeData = {
      id,
      ...data,
      start: data.start.toISOString(),
      end: data.end.toISOString(),
    };
    navigate(`/schedule/edit/${id}`, { state: safeData });
  };

  /** 일정 복사 핸들러 */
  const handleCopy = () => {
    if (!data) return;

    const today = dayjs();
    const originalStart = dayjs(data.start);
    const originalEnd = dayjs(data.end);

    const newStart = today.hour(originalStart.hour()).minute(originalStart.minute()).second(0);
    const duration = originalEnd.diff(originalStart);
    const newEnd = newStart.add(duration);

    const { attendees, review, reviewImages, userId, ...copiedData } = data;

    const finalCopiedData = {
      ...copiedData,
      start: newStart.toISOString(),
      end: newEnd.toISOString(),
      location: '',
      content: '',
      recurrence: undefined,
    };

    toast.success('일정이 복사되었습니다. 날짜를 확인하고 저장하세요.');
    navigate('/add-schedule', { state: finalCopiedData });
  };

  /** 날짜 포맷팅 헬퍼 함수 */
  const formatDate = (date: dayjs.Dayjs, isAllDay: boolean) => {
    if (isAllDay) return date.format('YYYY년 M월 D일 (ddd)');
    return date.format('YYYY년 M월 D일 (ddd) A h:mm');
  };

  /** 알림 설정 라벨 반환 함수 */
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
        onBack={handleBack}
        extraNav={
          <div className="relative" ref={menuRef}>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-[#8B95A1] dark:text-gray-500 hover:text-[#191F28] dark:hover:text-white transition-colors">
              <MoreVertical size={24} />
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                {auth.currentUser?.uid === data.userId && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      handleEdit();
                    }}
                    className="w-full px-4 py-3 text-left text-[14px] font-medium text-main dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors"
                  >
                    <Edit2 size={16} /> 일정 수정
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleCopy();
                  }}
                  className="w-full px-4 py-3 text-left text-[14px] font-medium text-main dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors"
                >
                  <Copy size={16} /> 일정 복사
                </button>
                {auth.currentUser?.uid === data.userId && (
                  <>
                    <div className="h-[1px] bg-gray-100 dark:bg-gray-700 my-1 mx-2" />
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        handleDeleteClick();
                      }}
                      className="w-full px-4 py-3 text-left text-[14px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2.5 transition-colors rounded-b-xl"
                    >
                      <Trash2 size={16} /> 일정 삭제
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        }
      >
        {/* 헤더 영역 */}
        <PageHeader className="mb-8 mt-4">
          {data.recurrence && data.recurrence.frequency !== 'none' && (
            <div className="mb-2">
              <span className="text-[12px] font-bold text-primary bg-primary/20 px-2 py-1 rounded-lg">반복 일정</span>
            </div>
          )}
          <div className="flex relative pl-4">
            <div className="absolute left-0 top-1 bottom-1 w-[5px] rounded-full" style={{ backgroundColor: data.color }} />
            <h1 className="text-2xl font-black text-main dark:text-white leading-tight">{data.title}</h1>
          </div>
        </PageHeader>

        {/* 상세 정보 영역 */}
        <div className="space-y-8">
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
                <Clock size={20} className="text-sub dark:text-gray-400" />
              </div>
              <div className="flex-1 py-1">
                <p className="text-[15px] font-bold text-main dark:text-white mb-1">
                  {formatDate(data.start, data.allDay)}
                  {data.allDay && (
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded ml-2">종일</span>
                  )}
                </p>
                {!data.allDay && <p className="text-[13px] font-medium text-sub dark:text-gray-500">~ {formatDate(data.end, data.allDay)}</p>}
              </div>
            </div>

            {scheduleCalendar && (
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
                  <CalendarIcon size={20} className="text-sub dark:text-gray-400" />
                </div>
                <div className="flex-1 flex items-center gap-3">
                  {scheduleCalendar.icon && ICON_MAP[scheduleCalendar.icon] ? (
                    React.createElement(ICON_MAP[scheduleCalendar.icon], { size: 18, style: { color: scheduleCalendar.color } })
                  ) : (
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: scheduleCalendar.color }} />
                  )}
                  <span className="text-[15px] font-bold text-main dark:text-white">
                    {(scheduleCalendar as any).customNames?.[auth.currentUser?.uid || ''] || scheduleCalendar.name}
                  </span>
                </div>
              </div>
            )}

            {isShared && !data.isAnniversary && (
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
                  <Users size={20} className="text-sub dark:text-gray-400" />
                </div>
                <div className="flex-1 flex items-center justify-between">
                  <div className="flex flex-col">
                    <p className="text-[15px] font-bold text-main dark:text-white">{data.attendees.map((a) => a.name).join(', ')}</p>
                    <p className="text-[12px] text-gray-500">{data.attendees.length}명 참여 중</p>
                  </div>
                  <button
                    onClick={() => navigate(`/chat/${id}`)}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    <MessageCircle size={20} />
                  </button>
                </div>
              </div>
            )}

            {data.location && (
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
                  <MapPin size={20} className="text-sub dark:text-gray-400" />
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-bold text-main dark:text-white">{data.location}</p>
                </div>
              </div>
            )}

            {data.content && (
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
                  <AlignLeft size={20} className="text-sub dark:text-gray-400" />
                </div>
                <div className="flex-1 py-2">
                  <p className="text-[14px] font-medium text-sub dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{data.content}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
                <Bell size={20} className="text-sub dark:text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-bold text-main dark:text-white">{getNotificationLabel(data.notification)}</p>
              </div>
            </div>
          </div>

          <div className="h-[1px] bg-gray-100 dark:bg-gray-800 my-6" />

          {/* 지난 일정 후기 영역 */}
          {isPastEvent && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 pb-10">
              <div className="flex items-center gap-2 px-1">
                <BookOpen size={20} className="text-emerald-500" />
                <h3 className="text-[16px] font-black text-main dark:text-white">{isShared ? '우리의 추억' : '오늘의 기록'}</h3>
              </div>

              {isShared ? (
                <div className="space-y-6">
                  <div className="space-y-6">
                    {sharedReviews.length > 0 ? (
                      sharedReviews.map((review) => {
                        const author = data.attendees.find((a) => a.uid === review.uid);
                        const isMe = review.uid === auth.currentUser?.uid;

                        const dateStr = review.createdAt ? dayjs(review.createdAt.toDate ? review.createdAt.toDate() : review.createdAt).format('YYYY.MM.DD') : '';

                        return (
                          <div key={review.uid} className="flex gap-4 group">
                            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden shrink-0 border border-gray-100 dark:border-gray-600 mt-1">
                              {author?.photoURL ? (
                                <img src={author.photoURL} alt={author.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-400">{author?.name?.[0]}</div>
                              )}
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[14px] font-bold text-main dark:text-white">{author?.name}</span>
                                  {isMe && <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 rounded">나</span>}
                                  <span className="text-[11px] text-gray-400 font-medium">{dateStr}</span>
                                </div>
                                {isMe && (
                                  <button onClick={handleSharedReviewDelete} className="text-gray-300 hover:text-red-500 transition-colors p-1">
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                              <p className="text-[14px] text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{review.content}</p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-6 text-center text-gray-400 text-sm bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                        아직 작성된 후기가 없습니다.
                        <br />
                        가장 먼저 추억을 남겨보세요!
                      </div>
                    )}
                  </div>

                  <div className="mt-6">
                    <div className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[20px] p-1.5 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all shadow-sm">
                      <textarea
                        value={myReviewText}
                        onChange={(e) => setMyReviewText(e.target.value)}
                        maxLength={500}
                        placeholder="이 날의 추억을 기록해보세요..."
                        className="w-full h-24 resize-none bg-transparent border-none focus:ring-0 p-3 text-[14px] text-main dark:text-white placeholder:text-gray-400"
                      />
                      <div className="flex justify-between items-center px-3 pb-2 pt-1">
                        <span className="text-[11px] text-gray-400">{myReviewText.length} / 500</span>
                        <button
                          onClick={handleSharedReviewSubmit}
                          disabled={!myReviewText.trim()}
                          className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-all ${
                            myReviewText.trim() ? 'bg-primary text-white hover:bg-blue-600 shadow-sm' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {sharedReviews.some((r) => r.uid === auth.currentUser?.uid) ? '수정' : '등록'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : data.review ? (
                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-[24px] p-6 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Edit2 size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[14px] font-medium text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{data.review}</p>
                    </div>
                    <button onClick={handleEdit} className="text-gray-300 hover:text-primary transition-colors">
                      <Edit2 size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={handleEdit}
                  className="py-10 text-center bg-gray-50 dark:bg-gray-800/50 rounded-[24px] border border-dashed border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                >
                  <div className="w-12 h-12 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm group-hover:scale-110 transition-transform">
                    <Edit2 size={20} className="text-gray-400 group-hover:text-primary" />
                  </div>
                  <p className="text-[14px] font-bold text-gray-500 group-hover:text-gray-700 dark:text-gray-400">
                    아직 기록이 없습니다.
                    <br />
                    <span className="text-[12px] font-normal text-gray-400">터치하여 오늘의 하루를 기록해보세요.</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </PageLayout>

      {/* 반복 일정 삭제 옵션 모달 */}
      {isDeleteModalOpen && (
        <DeleteRecurringModal onClose={() => setIsDeleteModalOpen(false)} onDeleteOne={deleteOnlyThis} onDeleteFollowing={deleteFollowing} onDeleteAll={deleteEntireSchedule} />
      )}

      {/* 일반 일정 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={isSimpleDeleteModalOpen}
        onClose={() => setIsSimpleDeleteModalOpen(false)}
        onConfirm={deleteEntireSchedule}
        icon={<Trash2 size={32} />}
        iconContainerClassName="bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400"
        title="일정 삭제"
        message={
          <>
            정말 이 일정을 삭제하시겠습니까?
            <br />
            삭제된 일정은 복구할 수 없습니다.
          </>
        }
        confirmText="삭제하기"
        confirmButtonClassName="bg-red-500"
      />

      {/* 후기 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={isReviewDeleteModalOpen}
        onClose={() => setIsReviewDeleteModalOpen(false)}
        onConfirm={confirmSharedReviewDelete}
        icon={<Trash2 size={32} />}
        iconContainerClassName="bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400"
        title="후기 삭제"
        message={
          <>
            정말 후기를 삭제하시겠습니까?
            <br />
            삭제된 후기는 복구할 수 없습니다.
          </>
        }
        confirmText="삭제하기"
        confirmButtonClassName="bg-red-500"
      />

      {previewState.isOpen && (
        <ImagePreviewModal images={previewState.images} initialIndex={previewState.index} onClose={() => setPreviewState((prev) => ({ ...prev, isOpen: false }))} />
      )}
    </>
  );
};

export default ScheduleDetail;
