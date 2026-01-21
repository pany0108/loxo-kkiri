import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Calendar, CheckCircle2, Loader2, Save, Smartphone, User } from 'lucide-react';
import toast from 'react-hot-toast';

import { auth, db } from '../../firebase';
import { FormInput, PageFooter, PageHeader, PageLayout, PageTitle } from 'components';
import { updateUserBirthdaySchedule } from 'services';

/**
 * 사용자 개인 정보를 수정하는 페이지 컴포넌트입니다.
 * Firestore의 유저 데이터와 Firebase Auth 프로필(DisplayName)을 동기화하여 업데이트합니다.
 * @returns {JSX.Element} 개인 정보 수정 화면
 */
const EditUserInfo = () => {
  const navigate = useNavigate();
  const authCodeRef = useRef<HTMLInputElement>(null);

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
  const [isLeapMonth, setIsLeapMonth] = useState(false);
  const [isLunar, setIsLunar] = useState(false);

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
            setOriginalPhone(data.phone?.replace(/[^\d]/g, '') || '');
            setIsVerified(!!data.phone); // 전화번호가 있으면 인증된 것으로 시작
            setIsAuthSent(false); // 인증번호 발송 상태 초기화
            setIsPhoneEditing(false); // 수정 모드 초기화
            setIsLeapMonth(data.isLeapMonth || false);
            setIsLunar(data.birthDateType === 'lunar');
          }
        } catch (error) {
          // 데이터 로드 실패 시 조용히 처리하거나 에러 UI 표시
        }
      }
      setIsLoading(false);
    };

    fetchUserData();
  }, []);

  // 인증번호 발송 후 입력 필드에 자동으로 포커스
  useEffect(() => {
    if (isPhoneEditing && isAuthSent && !isVerified) {
      // isAuthSent가 true로 바뀌고 컴포넌트가 리렌더링된 후 포커스를 줍니다.
      setTimeout(() => {
        authCodeRef.current?.focus();
      }, 100); // 애니메이션 시간을 고려하여 약간의 딜레이를 줍니다.
    }
  }, [isPhoneEditing, isAuthSent, isVerified]);

  // DB에서 불러온 초기 휴대폰 번호 (변경 여부 확인용)
  const [originalPhone, setOriginalPhone] = useState('');

  /**
   * 휴대폰 번호 자동 포맷팅 (010-0000-0000)
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
      if (finalValue.replace(/[^\d]/g, '') !== originalPhone) {
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
   * 휴대폰 인증번호 발송 시뮬레이션
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
   * 인증번호 확인 시뮬레이션 (고정값: 1234)
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

    setIsSaving(true);

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const fullName = `${formData.lastName}${formData.firstName}`;

      // 전화번호에서 하이픈을 제거하고 숫자만 저장하여 데이터 정합성을 보장합니다.
      await updateDoc(userRef, {
        lastName: formData.lastName,
        firstName: formData.firstName,
        name: fullName, // 검색 및 표시 편의를 위한 전체 이름 필드
        phone: formData.phone.replace(/[^\d]/g, ''),
        birthDate: formData.birthDate,
        isLeapMonth: isLunar && isLeapMonth,
        birthDateType: isLunar ? 'lunar' : 'solar',
      });

      // Auth 프로필 동기화
      await updateProfile(auth.currentUser, {
        displayName: fullName,
      });

      // 생일 일정 업데이트 로직을 서비스로 분리
      await updateUserBirthdaySchedule(auth.currentUser, {
        birthDate: formData.birthDate,
        isLunar,
        isLeapMonth,
      });

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

  const renderFooter = () => (
    <PageFooter zIndex={50}>
      <button onClick={handleSave} disabled={isSaving} className="btn-primary">
        {isSaving ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <Save size={18} />
            <span>저장하기</span>
          </>
        )}
      </button>
      <p className="text-center text-[11px] text-[#8B95A1] dark:text-gray-600 font-bold mt-4 tracking-tight">회원님의 정보는 암호화되어 안전하게 보호됩니다.</p>
    </PageFooter>
  );

  return (
    <PageLayout title="개인 정보 수정" footer={renderFooter()}>
      <>
        <PageHeader className="mb-10" icon={<User className="text-primary w-6 h-6" />}>
          <PageTitle>
            내 소중한 <span className="text-primary dark:text-blue-400">정보</span>를<br />
            관리해볼까요?
          </PageTitle>
        </PageHeader>

        {/* 입력 폼 섹션 */}
        <div className="space-y-8">
          {/* 이름 필드 (성/이름 분리) */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-1 mb-2">
              <User size={18} className="text-sub dark:text-gray-500" />
              <label className="text-caption">성함이 어떻게 되시나요?</label>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <FormInput name="lastName" value={formData.lastName} onChange={handleChange} placeholder="성" />
              </div>
              <div className="col-span-2">
                <FormInput name="firstName" value={formData.firstName} onChange={handleChange} placeholder="이름" />
              </div>
            </div>
          </section>

          {/* 휴대폰 번호 */}
          {/* 휴대폰 번호 입력 (인증 절차 임시 비활성화) */}
          <div>
            <div className="flex items-center gap-2 px-1 mb-2">
              <Smartphone size={18} className="text-sub dark:text-gray-500" />
              <label className="text-caption">연락처를 알려주세요</label>
            </div>
            <FormInput
              icon={<Smartphone size={20} />}
              name="phone"
              type="tel"
              inputMode="numeric"
              value={formatPhone(formData.phone)}
              placeholder="010-0000-0000"
              onChange={handleChange}
              required
            />
          </div>

          {/* 생년월일 */}
          <section className="space-y-3">
            {/* 양력/음력 선택 토글 */}
            <div className="flex items-center justify-between px-1 mb-2">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-sub dark:text-gray-500" />
                <label className="text-caption">생일은 언제인가요?</label>
              </div>
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setIsLunar(false)}
                  className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${
                    !isLunar ? 'bg-white dark:bg-gray-700 text-primary dark:text-blue-400 shadow-sm' : 'text-sub dark:text-gray-500'
                  }`}
                >
                  양력
                </button>
                <button
                  type="button"
                  onClick={() => setIsLunar(true)}
                  className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${
                    isLunar ? 'bg-white dark:bg-gray-700 text-primary dark:text-blue-400 shadow-sm' : 'text-sub dark:text-gray-500'
                  }`}
                >
                  음력
                </button>
              </div>
            </div>
            <div className="flex items-center h-[60px] bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus-within:border-primary focus-within:bg-white dark:focus-within:bg-gray-800 rounded-[20px] px-5 transition-all">
              <Calendar size={18} className="text-sub mr-4" />
              <input
                name="birthDate"
                value={formData.birthDate}
                onChange={handleChange}
                placeholder="YYYY/MM/DD"
                className="bg-transparent border-none outline-none w-full h-full text-[15px] font-bold text-main dark:text-white placeholder:text-sub"
              />
            </div>
          </section>

          {/* 안내 메시지 카드 */}
          <div className="bg-primary/10 dark:bg-blue-500/10 rounded-[24px] p-5 border border-primary/20 dark:border-blue-500/20 flex gap-3 animate-in fade-in zoom-in-95 duration-500">
            <CheckCircle2 className="text-primary dark:text-blue-400 shrink-0 mt-0.5" size={18} />
            <p className="text-[13px] text-primary dark:text-blue-300 font-bold leading-relaxed">
              변경하신 정보는 실명 인증이 필요한 서비스나 <br />
              일정 공유 시 본인 확인용으로 사용됩니다.
            </p>
          </div>
        </div>
      </>
    </PageLayout>
  );
};

export default EditUserInfo;
