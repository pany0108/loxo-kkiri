import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Users, Send, AlignLeft, Sparkles, CheckCircle2, MapPin } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import { auth, db } from '../firebase';
import { doc } from 'firebase/firestore';
import { useFirestoreDoc } from '../hooks/useFirestore';
import { onAuthStateChanged } from 'firebase/auth';

dayjs.locale('ko');

/**
 * 친구 데이터 인터페이스
 */
interface Friend {
  id: string;
  name: string;
}

/**
 * 약속 제안 생성 페이지 (Step 1) 컴포넌트입니다.
 * - 약속의 기본 정보(제목, 메모)를 입력합니다.
 * - 초대할 친구를 선택하고, 후보 날짜를 캘린더에서 다중 선택합니다.
 * * @returns {JSX.Element} 약속 생성 초기 화면
 */
const ProposeMeetingCreate = () => {
  const navigate = useNavigate();

  // --- 상태 관리 ---

  // 약속 기본 정보
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');

  // [수정] 친구 목록 DB 연동
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const userDocRef = useMemo(() => (user ? doc(db, 'users', user.uid) : null), [user]);
  const { data: userData } = useFirestoreDoc<any>(userDocRef);

  const friendsList: Friend[] = useMemo(() => {
    if (!userData?.friendsList) return [];
    return userData.friendsList.map((f: any) => ({ id: f.uid, name: f.name }));
  }, [userData]);

  const [invitedFriends, setInvitedFriends] = useState<Friend[]>([]);

  // 캘린더 및 날짜 선택 상태
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [selectedDates, setSelectedDates] = useState<string[]>([]);

  // 기존 내 일정 데이터 (날짜별 점 표시용)
  const myExistingSchedules = [dayjs().date(5).format('YYYY-MM-DD'), dayjs().date(12).format('YYYY-MM-DD'), dayjs().date(20).format('YYYY-MM-DD')];

  /**
   * 날짜 선택 토글 핸들러
   * 이미 선택된 날짜라면 배열에서 제거하고, 없다면 추가합니다.
   * @param {string} dateStr - YYYY-MM-DD 형식의 날짜 문자열
   */
  const toggleDate = (dateStr: string) => {
    setSelectedDates((prev) => (prev.includes(dateStr) ? prev.filter((d) => d !== dateStr) : [...prev, dateStr]));
  };

  /**
   * 친구 초대 토글 핸들러
   * @param {Friend} friend - 선택한 친구 객체
   */
  const toggleFriend = (friend: Friend) => {
    setInvitedFriends((prev) => (prev.find((f) => f.id === friend.id) ? prev.filter((f) => f.id !== friend.id) : [...prev, friend]));
  };

  /**
   * 현재 월의 달력 그리드 생성 함수
   * - 매월 1일의 요일을 계산하여 앞쪽 빈칸을 null로 채웁니다.
   * - 해당 월의 마지막 날짜까지 배열을 생성합니다.
   */
  const generateDates = () => {
    const startOfMonth = currentMonth.startOf('month');
    const endOfMonth = currentMonth.endOf('month');
    const dates = [];

    // 시작 요일만큼 빈칸 채우기
    for (let i = 0; i < startOfMonth.day(); i++) dates.push(null);

    // 날짜 채우기
    for (let i = 1; i <= endOfMonth.date(); i++) dates.push(startOfMonth.date(i).format('YYYY-MM-DD'));

    return dates;
  };

  /**
   * 다음 단계 이동 핸들러
   * 입력된 데이터를 state로 전달하며 상세 설정 페이지로 이동합니다.
   */
  const handleNext = () => {
    // 버튼의 disabled 속성으로 유효성을 제어하므로 별도 alert 불필요
    const calendarName = `나와 ${invitedFriends.map((f) => f.name).join(', ')}의 약속`;

    navigate('/propose/detail', {
      state: { title, description, location, invitedFriends, selectedDates, calendarName },
    });
  };

  /**
   * 폼 유효성 검사 (제목, 친구 1명 이상, 날짜 1개 이상 선택 필수)
   */
  const isValid = title.length > 0 && invitedFriends.length > 0 && selectedDates.length > 0;

  return (
    <div className="flex flex-col min-h-screen bg-white font-['Pretendard']">
      {/* 상단 네비게이션 */}
      <nav className="px-6 pt-6 flex items-center sticky top-0 bg-white/80 backdrop-blur-md z-40">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-400 hover:text-gray-900 transition-colors" aria-label="뒤로 가기">
          <ChevronLeft size={28} />
        </button>
      </nav>

      <div className="flex-1 px-6 pt-4 pb-32 overflow-y-auto w-full">
        {/* 헤더 섹션 */}
        <header className="mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 rounded-xl mb-6">
            <Sparkles className="text-blue-600 w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 leading-[1.3] tracking-tight">
            어떤 <span className="text-blue-600">약속</span>을<br />
            만들어볼까요?
          </h2>
        </header>

        <div className="space-y-8">
          {/* 1. 약속 정보 입력 섹션 */}
          <section className="space-y-4">
            {/* 제목 입력 */}
            <div className="group relative">
              <label className="block text-[13px] font-black text-gray-400 ml-1 mb-2">약속 제목</label>
              <div className="flex items-center h-[60px] bg-gray-50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white rounded-[20px] px-5 transition-all">
                <Send size={20} className="text-gray-300 mr-4 group-focus-within:text-blue-600" />
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 강남역 저녁 모임"
                  className="bg-transparent border-none outline-none w-full h-full text-[16px] font-bold text-gray-800 placeholder:text-gray-300"
                />
              </div>
            </div>

            {/* 메모 입력 */}
            <div className="group relative">
              <label className="block text-[13px] font-black text-gray-400 ml-1 mb-2">메모 (선택)</label>
              <div className="flex items-start bg-gray-50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white rounded-[24px] p-5 transition-all">
                <AlignLeft size={20} className="text-gray-300 mr-4 mt-1 group-focus-within:text-blue-600" />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="장소나 준비물 등을 적어주세요"
                  rows={3}
                  className="bg-transparent border-none outline-none w-full text-[15px] font-bold text-gray-800 placeholder:text-gray-300 resize-none"
                />
              </div>
            </div>

            {/* 장소 입력 */}
            <div className="group relative">
              <label className="block text-[13px] font-black text-gray-400 ml-1 mb-2">장소 (선택)</label>
              <div className="flex items-center h-[60px] bg-gray-50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white rounded-[20px] px-5 transition-all">
                <MapPin size={20} className="text-gray-300 mr-4 group-focus-within:text-blue-600" />
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="예: 강남역 2번 출구"
                  className="bg-transparent border-none outline-none w-full h-full text-[16px] font-bold text-gray-800 placeholder:text-gray-300"
                />
              </div>
            </div>
          </section>

          {/* 2. 친구 초대 섹션 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Users size={18} className="text-gray-400" />
              <label className="text-[13px] font-black text-gray-400">누구와 함께하나요?</label>
            </div>

            <div className="bg-gray-50 rounded-[24px] p-4 border-2 border-transparent">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {friendsList.map((friend) => {
                  const isSelected = invitedFriends.some((f) => f.id === friend.id);
                  return (
                    <button
                      key={friend.id}
                      onClick={() => toggleFriend(friend)}
                      className={`
                        flex items-center gap-1.5 px-4 py-2.5 rounded-[16px] text-[13px] font-bold transition-all whitespace-nowrap border-2
                        ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200' : 'bg-white border-white text-gray-500 hover:bg-gray-100'}
                      `}
                    >
                      {friend.name}
                      {isSelected && <CheckCircle2 size={14} className="text-blue-200" />}
                    </button>
                  );
                })}
              </div>
              {invitedFriends.length > 0 && <p className="text-[11px] font-bold text-blue-600 mt-2 ml-1">총 {invitedFriends.length}명 선택됨</p>}
            </div>
          </section>

          {/* 3. 캘린더 날짜 선택 섹션 */}
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <CalendarIcon size={18} className="text-gray-400" />
                <label className="text-[13px] font-black text-gray-400">날짜 선택</label>
              </div>

              {/* 범례 표시 */}
              <div className="flex gap-3 text-[10px] font-bold bg-gray-50 px-3 py-1 rounded-full">
                <span className="flex items-center gap-1.5 text-gray-500">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>내 일정
                </span>
                <span className="flex items-center gap-1.5 text-blue-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>선택됨
                </span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-[32px] p-6 border-2 border-transparent">
              {/* 달력 헤더 (월 이동) */}
              <div className="flex items-center justify-between mb-6 px-2">
                <button
                  onClick={() => setCurrentMonth(currentMonth.subtract(1, 'month'))}
                  className="p-2 bg-white rounded-xl text-gray-400 hover:text-gray-900 shadow-sm transition-all active:scale-95"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-[16px] font-black text-gray-900">{currentMonth.format('YYYY년 MM월')}</span>
                <button
                  onClick={() => setCurrentMonth(currentMonth.add(1, 'month'))}
                  className="p-2 bg-white rounded-xl text-gray-400 hover:text-gray-900 shadow-sm transition-all active:scale-95"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* 달력 그리드 */}
              <div className="grid grid-cols-7 gap-y-3 gap-x-1 text-center">
                {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
                  <span key={d} className="text-[11px] font-black text-gray-300 mb-2">
                    {d}
                  </span>
                ))}

                {generateDates().map((date, idx) => {
                  if (!date) return <div key={`empty-${idx}`} />;

                  const isSelected = selectedDates.includes(date);
                  const hasMySchedule = myExistingSchedules.includes(date);

                  return (
                    <button
                      key={date}
                      onClick={() => toggleDate(date)}
                      className={`
                        relative w-full aspect-square flex flex-col items-center justify-center rounded-[14px] transition-all duration-200
                        ${isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105 z-10' : 'bg-white text-gray-700 hover:bg-gray-100'}
                      `}
                    >
                      <span className={`text-[13px] font-bold ${isSelected ? 'text-white' : 'text-gray-700'}`}>{dayjs(date).date()}</span>
                      {hasMySchedule && !isSelected && <div className="absolute bottom-2 w-1 h-1 rounded-full bg-red-400 ring-2 ring-white" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* 하단 고정 버튼 */}
      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-gray-50 z-20">
        <button
          onClick={handleNext}
          disabled={!isValid}
          className={`
            w-full h-[62px] rounded-[24px] font-black text-[17px] shadow-lg transition-all flex items-center justify-center
            ${isValid ? 'bg-blue-600 text-white shadow-blue-100 active:scale-[0.98]' : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'}
          `}
        >
          {selectedDates.length > 0 ? `다음 단계로 (${selectedDates.length}일 선택)` : '날짜를 선택해주세요'}
        </button>
      </footer>
    </div>
  );
};

export default ProposeMeetingCreate;
