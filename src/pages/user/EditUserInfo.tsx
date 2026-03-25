import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { AlertCircle, Calendar, CheckCircle2, Loader2, Save, Smartphone, Trash2, User } from 'lucide-react';
import toast from 'react-hot-toast';

import { auth, db } from '../../firebase';
import { ConfirmModal, FormInput, PageFooter, PageHeader, PageLayout, PageTitle } from 'components';
import { deleteUserAccountAndData, updateUserBirthdaySchedule } from 'services';

/**
 * 사용자 개인 정보를 수정하는 페이지 컴포넌트입니다.
 * Firestore의 유저 데이터와 Firebase Auth 프로필(DisplayName)을 동기화하여 업데이트합니다.
 * @returns {JSX.Element} 개인 정보 수정 화면
 */
const EditUserInfo = () => {
  const navigate = useNavigate();

  // --- 상태 관리 ---
  const [formData, setFormData] = useState({
    lastName: '',
    firstName: '',
    phone: '',
    birthDate: '',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLeapMonth, setIsLeapMonth] = useState(false);
  const [isLunar, setIsLunar] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  /**
   * 안드로이드 하드웨어 뒤로가기 버튼 처리
   */
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listener: any;
    let isMounted = true;

    const setupListener = async () => {
      listener = await App.addListener('backButton', () => {
        navigate(-1);
      });
      if (!isMounted && listener) {
        listener.remove();
      }
    };
    setupListener();

    return () => {
      isMounted = false;
      if (listener) listener.remove();
    };
  }, [navigate]);

  /**
   * 컴포넌트 마운트 시 Firestore에서 현재 로그인된 사용자의 정보를 불러옵니다.
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);

          const data = userSnap.exists() ? userSnap.data() : {};

          let fName = data.firstName || '';
          let lName = data.lastName || '';

          // 구글 로그인 등으로 가입하여 성/이름이 분리되지 않은 경우, name이나 displayName에서 추출
          if (!fName && !lName) {
            const displayName = data.name || user.displayName || '';
            if (displayName.includes(' ')) {
              const parts = displayName.split(' ');
              lName = parts[0];
              fName = parts.slice(1).join(' ');
            } else if (displayName.length >= 2) {
              lName = displayName.substring(0, 1);
              fName = displayName.substring(1);
            } else {
              fName = displayName;
            }
          }

          setFormData({
            lastName: lName,
            firstName: fName,
            phone: data.phone || '',
            birthDate: data.birthDate || '',
          });
          setIsLeapMonth(data.isLeapMonth || false);
          setIsLunar(data.birthDateType === 'lunar');
        } catch (error) {
          // 데이터 로드 실패 시 조용히 처리하거나 에러 UI 표시
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

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
  const handleFieldChange = (name: string, value: string) => {
    const finalValue = name === 'phone' ? formatPhone(value) : value;
    setFormData((prev) => ({ ...prev, [name]: finalValue }));
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
      await setDoc(userRef, {
        lastName: formData.lastName,
        firstName: formData.firstName,
        name: fullName, // 검색 및 표시 편의를 위한 전체 이름 필드
        phone: formData.phone.replace(/[^\d]/g, ''),
        birthDate: formData.birthDate,
        isLeapMonth: isLunar && isLeapMonth,
        birthDateType: isLunar ? 'lunar' : 'solar',
      }, { merge: true });

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

  /** 회원 탈퇴 확정 핸들러 */
  const handleDeleteAccountConfirm = async () => {
    const user = auth.currentUser;
    if (!user) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    setIsSaving(true);
    try {
      // Firestore 데이터 삭제 및 Firebase Auth 계정 삭제 (userService.ts 내부에서 처리됨)
      await deleteUserAccountAndData(user);

      toast.success('회원 탈퇴가 완료되었습니다. 이용해주셔서 감사합니다.');
      navigate('/'); // 로그아웃 후 메인 페이지로 이동
    } catch (error: any) {
      console.error('회원 탈퇴 오류:', error);
      if (error.code === 'auth/requires-recent-login') {
        toast.error('보안을 위해 다시 로그인한 후 시도해주세요.');
        await signOut(auth);
        navigate('/login');
      } else {
        toast.error('회원 탈퇴 중 오류가 발생했습니다.');
      }
    } finally {
      setIsSaving(false);
      setIsDeleteModalOpen(false);
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
      {/* <p className="text-center text-[11px] text-[#8B95A1] dark:text-gray-600 font-bold mt-4 tracking-tight">회원님의 정보는 암호화되어 안전하게 보호됩니다.</p> */}
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
                <FormInput name="lastName" value={formData.lastName} onChange={(e) => handleFieldChange('lastName', e.target.value)} placeholder="성" />
              </div>
              <div className="col-span-2">
                <FormInput name="firstName" value={formData.firstName} onChange={(e) => handleFieldChange('firstName', e.target.value)} placeholder="이름" />
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
              onChange={(e) => handleFieldChange('phone', e.target.value)}
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
                onChange={(e) => handleFieldChange('birthDate', e.target.value)}
                placeholder="YYYY/MM/DD"
                className="bg-transparent border-none outline-none w-full h-full text-[15px] font-bold text-main dark:text-white placeholder:text-sub"
              />
            </div>
          </section>

          {/* 회원 탈퇴 버튼 */}
          <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-800 flex justify-center">
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="text-sm font-bold text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors flex items-center gap-2"
            >
              <Trash2 size={14} />
              회원 탈퇴하기
            </button>
          </div>

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

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteAccountConfirm}
        icon={<AlertCircle size={32} />}
        iconContainerClassName="bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400"
        title="회원 탈퇴"
        message={
          <>
            정말로 탈퇴하시겠습니까?
            <br />
            모든 데이터가 영구적으로 삭제되며, 복구할 수 없습니다.
          </>
        }
        confirmText="탈퇴하기"
        confirmButtonClassName="bg-red-500"
        isLoading={isSaving}
      />
    </PageLayout>
  );
};

export default EditUserInfo;
