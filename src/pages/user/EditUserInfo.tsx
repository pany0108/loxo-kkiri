import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Save, Smartphone, Calendar, Loader2, CheckCircle2, Sparkles, ShieldCheck } from 'lucide-react';
import dayjs from 'dayjs';
import { TopNav } from 'components';
import { auth, db } from 'firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc, writeBatch } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';

/**
 * 사용자 개인 정보를 수정하는 페이지 컴포넌트입니다.
 * Firestore의 유저 데이터와 Firebase Auth 프로필(DisplayName)을 동기화하여 업데이트합니다.
 * * @returns {JSX.Element} 개인 정보 수정 화면
 */
const EditUserInfo = () => {
  const navigate = useNavigate();
  const authCodeRef = useRef<HTMLInputElement>(null); // [추가]

  // --- 상태 관리 ---
  const [formData, setFormData] = useState({
    lastName: '',
    firstName: '',
    phone: '',
    birthDate: '',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPhoneEditing, setIsPhoneEditing] = useState(false);
  const [isAuthSent, setIsAuthSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false); // 휴대폰 번호 인증 여부
  const [authCode, setAuthCode] = useState('');
  const [isLeapMonth, setIsLeapMonth] = useState(false); // [추가] 윤달 여부 상태
  const [isLunar, setIsLunar] = useState(false); // [추가] 양력/음력 상태

  /**
   * 컴포넌트 마운트 시 Firestore에서 현재 로그인된 사용자의 정보를 불러옵니다.
   */
  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const data = userSnap.data();
            setFormData({
              lastName: data.lastName || '',
              firstName: data.firstName || '',
              phone: data.phone || '',
              birthDate: data.birthDate || '',
            });
            // 초기 로드 시 기존 번호는 인증된 것으로 간주
            setOriginalPhone(data.phone || '');
            setIsVerified(!!data.phone); // 전화번호가 있으면 인증된 것으로 시작
            setIsAuthSent(false); // 인증번호 발송 상태 초기화
            setIsPhoneEditing(false); // 수정 모드 초기화
            setIsLeapMonth(data.isLeapMonth || false); // [추가] 윤달 여부 설정
            setIsLunar(data.birthDateType === 'lunar'); // [추가] 생일 타입 설정
          }
        } catch (error) {
          // 데이터 로드 실패 시 조용히 처리하거나 에러 UI 표시
        }
      }
      setIsLoading(false);
    };

    fetchUserData();
  }, []);

  // [추가] 인증번호 발송 후 입력 필드에 자동으로 포커스
  useEffect(() => {
    if (isPhoneEditing && isAuthSent && !isVerified) {
      // isAuthSent가 true로 바뀌고 컴포넌트가 리렌더링된 후 포커스를 줍니다.
      setTimeout(() => {
        authCodeRef.current?.focus();
      }, 100); // 애니메이션 시간을 고려하여 약간의 딜레이를 줍니다.
    }
  }, [isPhoneEditing, isAuthSent, isVerified]);

  // [추가] DB에서 불러온 초기 휴대폰 번호 (변경 여부 확인용)
  const [originalPhone, setOriginalPhone] = useState('');

  /**
   * [추가] 휴대폰 번호 자동 포맷팅 (010-0000-0000)
   */
  const formatPhone = (value: string) => {
    const nums = value.replace(/[^\d]/g, '');
    if (nums.length <= 3) return nums;
    if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
    return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7, 11)}`;
  };

  /**
   * 입력 필드 값 변경 핸들러
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === 'authCode') {
      setAuthCode(value);
      return; // authCode는 별도 상태이므로 여기서 종료
    }

    const finalValue = name === 'phone' ? formatPhone(value) : value;

    if (name === 'phone') {
      // 휴대폰 번호가 변경되면 인증 상태 초기화
      if (finalValue !== originalPhone) {
        setIsVerified(false);
        setIsAuthSent(false);
      } else {
        // 원래 번호로 돌아오면 다시 인증된 상태로
        setIsVerified(true);
      }
    }
    setFormData((prev) => ({ ...prev, [name]: finalValue }));
  };

  /**
   * [추가] 휴대폰 인증번호 발송 시뮬레이션
   */
  const handleSendAuth = () => {
    if (!formData.phone || formData.phone.length < 13) {
      toast.error('올바른 휴대폰 번호를 입력해주세요.');
      return;
    }
    setIsAuthSent(true);
    toast.success('인증번호가 발송되었습니다. (테스트 번호: 1234)');
  };

  /**
   * [추가] 인증번호 확인 시뮬레이션 (고정값: 1234)
   */
  const handleVerify = () => {
    if (authCode === '1234') {
      setIsVerified(true);
      setIsPhoneEditing(false); // 인증 완료 후 수정 모드 종료
      toast.success('휴대폰 번호가 인증되었습니다.');
    } else {
      toast.error('인증번호가 일치하지 않습니다.');
    }
  };

  /**
   * 변경된 정보를 저장하는 핸들러
   * 1. Firestore의 'users' 컬렉션 문서 업데이트 (성, 이름, 전체 이름, 전화번호, 생년월일)
   * 2. Firebase Auth 프로필의 DisplayName 업데이트
   */
  const handleSave = async () => {
    if (!auth.currentUser) return;

    // [임시] 휴대폰 인증 비활성화
    // if (formData.phone !== originalPhone && !isVerified) {
    //   toast.error('변경하신 휴대폰 번호를 인증해주세요.');
    //   return;
    // }

    setIsSaving(true);

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const fullName = `${formData.lastName}${formData.firstName}`;

      // Firestore 데이터 업데이트
      await updateDoc(userRef, {
        lastName: formData.lastName,
        firstName: formData.firstName,
        name: fullName, // 검색 및 표시 편의를 위한 전체 이름 필드
        phone: formData.phone,
        birthDate: formData.birthDate,
        isLeapMonth: isLunar && isLeapMonth, // [추가] 윤달 여부 저장
        birthDateType: isLunar ? 'lunar' : 'solar', // [추가] 생일 타입 저장
      });

      // Auth 프로필 동기화
      await updateProfile(auth.currentUser, {
        displayName: fullName,
      });

      // [추가] 생일 일정 업데이트 로직
      const birthdayScheduleQuery = query(collection(db, 'schedules'), where('userId', '==', auth.currentUser.uid), where('title', '==', '내 생일'));
      const birthdayScheduleSnapshot = await getDocs(birthdayScheduleQuery);

      if (formData.birthDate) {
        const birthDate = dayjs(formData.birthDate, 'YYYY/MM/DD').format('YYYY-MM-DD');
        const birthdayData = {
          title: '내 생일',
          isAllDay: true,
          start: birthDate,
          isLeapMonth: isLunar && isLeapMonth,
          isLunar: isLunar,
          color: '#ec4899',
          attendees: [auth.currentUser.uid],
          userId: auth.currentUser.uid,
          recurrence: {
            frequency: 'yearly',
            interval: 1,
          },
        };

        if (birthdayScheduleSnapshot.empty) {
          // 기존 생일 일정이 없으면 새로 생성
          const defaultCalendarQuery = query(collection(db, 'calendars'), where('ownerId', '==', auth.currentUser.uid), where('isDefault', '==', true));
          const defaultCalendarSnapshot = await getDocs(defaultCalendarQuery);
          if (!defaultCalendarSnapshot.empty) {
            const calendarId = defaultCalendarSnapshot.docs[0].id;
            await addDoc(collection(db, 'schedules'), { ...birthdayData, calendarId, createdAt: new Date().toISOString() });
          }
        } else {
          // 기존 생일 일정이 있으면 업데이트
          const batch = writeBatch(db);
          birthdayScheduleSnapshot.forEach((doc) => {
            batch.update(doc.ref, birthdayData);
          });
          await batch.commit();
        }
      } else {
        // 생년월일 필드가 비워졌으면 기존 생일 일정 삭제
        if (!birthdayScheduleSnapshot.empty) {
          const batch = writeBatch(db);
          birthdayScheduleSnapshot.forEach((doc) => batch.delete(doc.ref));
          await batch.commit();
        }
      }

      toast.success('개인 정보가 안전하게 변경되었습니다. ✨');
      navigate(-1);
    } catch (error) {
      toast.error('저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
        <p className="text-gray-400 font-bold">정보를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-950 font-['Pretendard']">
      {/* [수정] 상단 네비게이션을 TopNav 컴포넌트로 교체 */}
      <TopNav title="개인 정보 수정" />

      {/* [수정] TopNav가 fixed이므로 콘텐츠가 가려지지 않도록 pt-[76px]로 상단 패딩 조정 */}
      <div className="flex-1 px-6 pt-[calc(76px+env(safe-area-inset-top))] pb-32 overflow-y-auto w-full">
        {/* 헤더 섹션 */}
        <header className="mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-xl mb-6">
            <Sparkles className="text-blue-600 w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-[1.3] tracking-tight">
            내 소중한 <span className="text-blue-600 dark:text-blue-400">정보</span>를<br />
            관리해볼까요?
          </h2>
        </header>

        {/* 입력 폼 섹션 */}
        <div className="space-y-8">
          {/* 이름 필드 (성/이름 분리) */}
          <section className="space-y-3">
            <label className="block text-[13px] font-black text-gray-400 dark:text-gray-500 ml-1">이름</label>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <div className="flex items-center h-[60px] bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-gray-800 rounded-[20px] px-5 transition-all">
                  <input
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="성"
                    className="bg-transparent border-none outline-none w-full h-full text-[15px] font-bold text-gray-800 dark:text-white placeholder:text-gray-300"
                  />
                </div>
              </div>
              <div className="col-span-2">
                <div className="flex items-center h-[60px] bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-gray-800 rounded-[20px] px-5 transition-all">
                  <input
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="이름"
                    className="bg-transparent border-none outline-none w-full h-full text-[15px] font-bold text-gray-800 dark:text-white placeholder:text-gray-300"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 휴대폰 번호 */}
          {/* 휴대폰 번호 입력 (인증 절차 임시 비활성화) */}
          <section className="space-y-3">
            <label className="block text-[13px] font-black text-gray-400 dark:text-gray-500 ml-1">휴대폰 번호</label>
            <div className="flex items-center h-[60px] bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-gray-800 rounded-[20px] px-5 transition-all">
              <Smartphone size={20} className="text-gray-300 dark:text-gray-600 mr-4" />
              <input
                name="phone"
                type="tel"
                inputMode="numeric"
                value={formData.phone}
                placeholder="010-0000-0000"
                className="bg-transparent border-none outline-none w-full h-full text-[15px] font-bold text-gray-800 dark:text-white"
                onChange={handleChange}
                required
              />
            </div>
          </section>
          {/* <section className="space-y-3"> // 기존 인증 UI 주석
            <label className="block text-[13px] font-black text-gray-400 dark:text-gray-500 ml-1">휴대폰 번호 인증</label>
            <div className="flex gap-2">
              <div
                className={`flex-[2.5] flex items-center h-[60px] bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent rounded-[20px] px-5 transition-all ${
                  isVerified
                    ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20'
                    : 'focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-gray-800'
                }`}
              >
                <Smartphone size={20} className={isVerified ? 'text-blue-500 dark:text-blue-400 mr-4' : 'text-gray-300 dark:text-gray-600 mr-4'} />
                <input
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  value={formData.phone}
                  placeholder="010-0000-0000"
                  className="bg-transparent border-none outline-none w-full h-full text-[15px] font-bold text-gray-800 dark:text-white"
                  onChange={handleChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault(); // 폼 전체 제출 방지
                      if (isVerified) return; // 이미 인증되었으면 실행 안함
                      handleSendAuth();
                    }
                  }}
                  readOnly={!isPhoneEditing}
                  required
                />
                {isVerified && !isPhoneEditing && <CheckCircle2 size={20} className="text-blue-500 ml-2" />}
              </div>
              {isPhoneEditing ? (
                <button
                  type="button"
                  onClick={handleSendAuth}
                  disabled={isVerified}
                  className="flex-1 h-[60px] bg-gray-900 text-white rounded-[20px] text-[13px] font-black active:scale-[0.95] disabled:opacity-50"
                >
                  {isAuthSent ? '재발송' : '인증요청'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsPhoneEditing(true)}
                  className="flex-1 h-[60px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-[20px] text-[13px] font-black active:scale-[0.95]"
                >
                  수정
                </button>
              )}
            </div>

            {isPhoneEditing && isAuthSent && !isVerified && (
              <div className="flex gap-2 animate-in fade-in slide-in-from-top-1">
                <div className="flex-[2.5] flex items-center h-[60px] bg-gray-50 dark:bg-gray-800 border-2 border-blue-500 rounded-[20px] px-5 focus-within:bg-white dark:focus-within:bg-gray-800">
                  <ShieldCheck size={20} className="text-blue-600 mr-4" />
                  <input
                    ref={authCodeRef}
                    name="authCode"
                    type="tel"
                    inputMode="numeric"
                    pattern="\d*"
                    value={authCode}
                    placeholder="인증번호 4자리"
                    className="bg-transparent border-none outline-none w-full h-full text-[15px] font-bold text-gray-800 dark:text-white placeholder:text-gray-300"
                    onChange={handleChange}
                    maxLength={4}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleVerify();
                      }
                    }}
                  />
                </div>
                <button type="button" onClick={handleVerify} className="flex-1 h-[60px] bg-blue-600 text-white rounded-[20px] text-[15px] font-black active:scale-[0.95]">
                  확인
                </button>
              </div>
            )}
          </section> */}

          {/* 생년월일 */}
          <section className="space-y-3">
            {/* [추가] 양력/음력 선택 토글 */}
            <div className="flex items-center justify-between px-1">
              <label className="block text-[13px] font-black text-gray-400 dark:text-gray-500">생년월일</label>
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setIsLunar(false)}
                  className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${
                    !isLunar ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  양력
                </button>
                <button
                  type="button"
                  onClick={() => setIsLunar(true)}
                  className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${
                    isLunar ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  음력
                </button>
              </div>
            </div>
            <div className="flex items-center h-[60px] bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-gray-800 rounded-[20px] px-5 transition-all">
              <Calendar size={18} className="text-gray-300 mr-4" />
              <input
                name="birthDate"
                value={formData.birthDate}
                onChange={handleChange}
                placeholder="YYYY/MM/DD"
                className="bg-transparent border-none outline-none w-full h-full text-[15px] font-bold text-gray-800 dark:text-white placeholder:text-gray-300"
              />
            </div>
          </section>

          {/* 안내 메시지 카드 */}
          <div className="bg-blue-50/50 dark:bg-blue-500/10 rounded-[24px] p-5 border border-blue-100 dark:border-blue-500/20 flex gap-3 animate-in fade-in zoom-in-95 duration-500">
            <CheckCircle2 className="text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" size={18} />
            <p className="text-[13px] text-blue-700 dark:text-blue-300 font-bold leading-relaxed">
              변경하신 정보는 실명 인증이 필요한 서비스나 <br />
              일정 공유 시 본인 확인용으로 사용됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* 하단 고정 저장 버튼 */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-t border-gray-50 dark:border-gray-800 z-50 px-6 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <button
          onClick={handleSave}
          disabled={isSaving} // [임시] 휴대폰 인증 비활성화
          className={`w-full h-[62px] rounded-[24px] font-black text-[17px] shadow-lg transition-all flex items-center justify-center gap-2 ${
            isSaving
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed shadow-none'
              : 'bg-blue-600 text-white shadow-blue-100 dark:shadow-blue-900/50 active:scale-[0.98]'
          }`} // [임시] 휴대폰 인증 비활성화: || (formData.phone !== originalPhone && !isVerified)
        >
          {isSaving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Save size={18} />
              <span>저장하기</span>
            </>
          )}
        </button>
        <p className="text-center text-[11px] text-gray-300 dark:text-gray-600 font-bold mt-4 tracking-tight">회원님의 정보는 암호화되어 안전하게 보호됩니다.</p>
      </footer>
    </div>
  );
};

export default EditUserInfo;
