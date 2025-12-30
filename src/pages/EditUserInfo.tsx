import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Save, Smartphone, Calendar, Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';

const EditUserInfo = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    lastName: '',
    firstName: '',
    phone: '',
    birthDate: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
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
        }
      }
      setIsLoading(false);
    };

    fetchUserData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setIsSaving(true);

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const fullName = `${formData.lastName}${formData.firstName}`; //

      await updateDoc(userRef, {
        lastName: formData.lastName,
        firstName: formData.firstName,
        name: fullName, // 실명 필드 동시 업데이트
        phone: formData.phone,
        birthDate: formData.birthDate,
      });

      // Auth 프로필의 displayName도 업데이트
      await updateProfile(auth.currentUser, {
        displayName: fullName,
      });

      alert('개인 정보가 안전하게 변경되었습니다. ✨');
      navigate(-1);
    } catch (error) {
      /* 에러 처리 동일 */
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
        <p className="text-gray-400 font-bold">정보를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white font-['Pretendard']">
      {/* 1. 상단 네비게이션 */}
      <nav className="px-6 pt-6 flex items-center sticky top-0 bg-white/80 backdrop-blur-md z-40">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors active:scale-90">
          <ChevronLeft size={28} />
        </button>
      </nav>

      <div className="flex-1 px-6 pt-4 pb-32 overflow-y-auto w-full">
        {/* 2. 헤더 섹션 (Signup.tsx 스타일 참고) */}
        <div className="mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 rounded-xl mb-6">
            <Sparkles className="text-blue-600 w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 leading-[1.3] tracking-tight">
            내 소중한 <span className="text-blue-600">정보</span>를<br />
            관리해볼까요?
          </h2>
        </div>

        {/* 3. 입력 폼 섹션 */}
        <div className="space-y-8">
          {/* 이름 필드 (성/이름 분리) */}
          <div className="space-y-3">
            <label className="block text-[13px] font-black text-gray-400 ml-1">이름</label>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <div className="flex items-center h-[60px] bg-gray-50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white rounded-[20px] px-5 transition-all">
                  <input
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="성"
                    className="bg-transparent border-none outline-none w-full h-full text-[15px] font-bold text-gray-800 placeholder:text-gray-300"
                  />
                </div>
              </div>
              <div className="col-span-2">
                <div className="flex items-center h-[60px] bg-gray-50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white rounded-[20px] px-5 transition-all">
                  <input
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="이름"
                    className="bg-transparent border-none outline-none w-full h-full text-[15px] font-bold text-gray-800 placeholder:text-gray-300"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 휴대폰 번호 (Smartphone 아이콘 포함) */}
          <div className="space-y-3">
            <label className="block text-[13px] font-black text-gray-400 ml-1">휴대폰 번호</label>
            <div className="flex items-center h-[60px] bg-gray-50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white rounded-[20px] px-5 transition-all">
              <Smartphone size={18} className="text-gray-300 mr-4 group-focus-within:text-blue-600" />
              <input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="010-0000-0000"
                className="bg-transparent border-none outline-none w-full h-full text-[15px] font-bold text-gray-800 placeholder:text-gray-300"
              />
            </div>
          </div>

          {/* 생년월일 (Calendar 아이콘 포함) */}
          <div className="space-y-3">
            <label className="block text-[13px] font-black text-gray-400 ml-1">생년월일</label>
            <div className="flex items-center h-[60px] bg-gray-50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white rounded-[20px] px-5 transition-all">
              <Calendar size={18} className="text-gray-300 mr-4" />
              <input
                name="birthDate"
                value={formData.birthDate}
                onChange={handleChange}
                placeholder="YYYY/MM/DD"
                className="bg-transparent border-none outline-none w-full h-full text-[15px] font-bold text-gray-800 placeholder:text-gray-300"
              />
            </div>
          </div>

          {/* 안내 메시지 카드 (MeetingVoting.tsx 스타일 참고) */}
          <div className="bg-blue-50/50 rounded-[24px] p-5 border border-blue-100 flex gap-3 animate-in fade-in zoom-in-95 duration-500">
            <CheckCircle2 className="text-blue-500 shrink-0 mt-0.5" size={18} />
            <p className="text-[13px] text-blue-700 font-bold leading-relaxed">
              변경하신 정보는 실명 인증이 필요한 서비스나 <br />
              일정 공유 시 본인 확인용으로 사용됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* 4. 하단 고정 저장 버튼 (AddSchedule.tsx 스타일 참고) */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-gray-50 z-50">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full h-[62px] bg-blue-600 text-white rounded-[24px] font-black text-[17px] shadow-lg shadow-blue-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:bg-blue-300"
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
        <p className="text-center text-[11px] text-gray-300 font-bold mt-4 tracking-tight">회원님의 정보는 암호화되어 안전하게 보호됩니다.</p>
      </div>
    </div>
  );
};

export default EditUserInfo;
