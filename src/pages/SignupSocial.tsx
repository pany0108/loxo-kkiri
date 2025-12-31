import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { doc, setDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Smartphone, Calendar, Sparkles, CheckCircle2, Loader2 } from 'lucide-react';

/**
 * 소셜 로그인(구글 등) 직후 추가 정보를 입력받는 페이지 컴포넌트입니다.
 * - 소셜 계정에서 제공하지 않는 필수 정보(생년월일, 전화번호)를 수집합니다.
 * - 모바일 환경에서의 리다이렉트 데이터 유실을 방지하기 위해 LocalStorage를 활용합니다.
 * * @returns {JSX.Element} 추가 정보 입력 화면
 */
const SignupSocial = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // --- 상태 관리 ---

  /**
   * 사용자 데이터 초기화
   * location.state(직접 이동) 또는 LocalStorage(리다이렉트 복귀)에서 데이터를 복구합니다.
   */
  const [userData] = useState(() => {
    if (location.state?.uid) {
      // 전달받은 데이터가 있으면 로컬 스토리지에 백업 후 사용
      localStorage.setItem('pendingSignup', JSON.stringify(location.state));
      return location.state;
    }
    const saved = localStorage.getItem('pendingSignup');
    return saved ? JSON.parse(saved) : null;
  });

  const [formData, setFormData] = useState({ phone: '', birthDate: '', authCode: '' });
  const [isAuthSent, setIsAuthSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // userData 구조 분해 할당 (없을 경우를 대비해 빈 객체 기본값 처리)
  const { uid, email, lastName, firstName } = userData || {};

  /**
   * 데이터 유실 방지 Effect
   * 필수 데이터(uid)가 없으면 로그인 페이지로 리다이렉트합니다.
   */
  useEffect(() => {
    if (!uid) {
      const timer = setTimeout(() => {
        alert('인증 정보가 만료되었습니다. 다시 로그인해주세요.');
        navigate('/login', { replace: true });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [uid, navigate]);

  // 필수 데이터가 로딩되지 않았을 때 로딩 화면 표시
  if (!uid) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  // --- 헬퍼 함수 ---

  /**
   * 휴대폰 번호 포맷팅 (010-0000-0000)
   */
  const formatPhone = (value: string) => {
    const nums = value.replace(/[^\d]/g, '');
    if (nums.length <= 3) return nums;
    if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
    return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7, 11)}`;
  };

  /**
   * 생년월일 포맷팅 (YYYY/MM/DD)
   */
  const formatBirth = (value: string) => {
    const nums = value.replace(/[^\d]/g, '');
    if (nums.length <= 4) return nums;
    if (nums.length <= 6) return `${nums.slice(0, 4)}/${nums.slice(4)}`;
    return `${nums.slice(0, 4)}/${nums.slice(4, 6)}/${nums.slice(6, 8)}`;
  };

  /**
   * 입력 필드 변경 핸들러
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'phone') formattedValue = formatPhone(value);
    if (name === 'birthDate') formattedValue = formatBirth(value);

    setFormData((prev) => ({ ...prev, [name]: formattedValue }));
  };

  /**
   * 휴대폰 인증번호 발송 시뮬레이션
   */
  const handleSendAuth = () => {
    if (!formData.phone || formData.phone.length < 13) {
      alert('올바른 휴대폰 번호를 입력해주세요.');
      return;
    }
    setIsAuthSent(true);
    alert('인증번호가 발송되었습니다.');
  };

  /**
   * 인증번호 확인 시뮬레이션 (고정값: 1234)
   */
  const handleVerify = () => {
    if (formData.authCode === '1234') {
      setIsVerified(true);
    } else {
      alert('인증번호가 일치하지 않습니다.');
    }
  };

  /**
   * 최종 가입 완료 핸들러
   * Firestore에 사용자 정보를 저장하고 메인 캘린더로 이동합니다.
   */
  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isVerified) return alert('본인인증을 완료해주세요.');

    setIsLoading(true);
    try {
      await setDoc(doc(db, 'users', uid), {
        uid,
        email,
        name: `${lastName}${firstName}`,
        lastName,
        firstName,
        phone: formData.phone,
        birthDate: formData.birthDate,
        createdAt: new Date().toISOString(),
      });

      // [수정] 소셜 로그인 시 기본 캘린더 자동 생성
      await addDoc(collection(db, 'calendars'), {
        name: '내 캘린더',
        ownerId: uid,
        members: [uid],
        isDefault: true,
        color: '#3b82f6', // 기본 파란색
        createdAt: new Date().toISOString(),
      });

      // 가입 완료 후 임시 데이터 삭제 (보안 및 정합성 유지)
      localStorage.removeItem('pendingSignup');

      alert('회원가입이 완료되었습니다! ✨');
      navigate('/calendar', { replace: true });
    } catch (error) {
      alert('저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white font-['Pretendard']">
      <div className="px-8 pt-20 pb-12 max-w-md mx-auto w-full">
        <div className="mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 rounded-xl mb-6">
            <Sparkles className="text-blue-600 w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 leading-[1.3]">
            반가워요,{' '}
            <span className="text-blue-600">
              {lastName}
              {firstName}님!
            </span>
            <br />딱 두 가지만 더 알려주세요.
          </h2>
        </div>

        <form onSubmit={handleComplete} className="space-y-8">
          <div className="space-y-6">
            {/* 생년월일 입력 */}
            <div className="group">
              <label className="block text-[13px] font-black text-gray-400 ml-1 mb-2">생년월일</label>
              <div className="flex items-center h-[60px] bg-gray-50 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white rounded-[20px] px-5 transition-all">
                <Calendar size={20} className="text-gray-300 mr-4 group-focus-within:text-blue-600" />
                <input
                  name="birthDate"
                  type="tel"
                  inputMode="numeric"
                  value={formData.birthDate}
                  placeholder="YYYY/MM/DD"
                  className="bg-transparent border-none outline-none w-full h-full text-[15px] font-bold text-gray-800"
                  onChange={handleChange}
                  required
                  maxLength={10}
                />
              </div>
            </div>

            {/* 휴대폰 인증 */}
            <div className="space-y-3">
              <label className="block text-[13px] font-black text-gray-400 ml-1">휴대폰 인증</label>
              <div className="flex gap-2">
                <div
                  className={`flex-[2.5] flex items-center h-[60px] bg-gray-50 border-2 border-transparent rounded-[20px] px-5 transition-all ${
                    isVerified ? 'bg-blue-50 border-blue-100' : 'focus-within:border-blue-500 focus-within:bg-white'
                  }`}
                >
                  <Smartphone size={20} className={isVerified ? 'text-blue-500 mr-4' : 'text-gray-300 mr-4'} />
                  <input
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    value={formData.phone}
                    placeholder="010-0000-0000"
                    className="bg-transparent border-none outline-none w-full h-full text-[15px] font-bold text-gray-800"
                    onChange={handleChange}
                    required
                    readOnly={isVerified}
                  />
                  {isVerified && <CheckCircle2 size={20} className="text-blue-500 ml-2" />}
                </div>
                <button
                  type="button"
                  onClick={handleSendAuth}
                  disabled={isVerified}
                  className="flex-1 h-[60px] bg-gray-900 text-white rounded-[20px] text-[13px] font-black disabled:opacity-50"
                >
                  {isAuthSent ? '재발송' : '인증요청'}
                </button>
              </div>

              {/* 인증번호 입력 (발송 후 노출) */}
              {isAuthSent && !isVerified && (
                <div className="flex gap-2 animate-in fade-in slide-in-from-top-1">
                  <div className="flex-[2.5] flex items-center h-[60px] bg-gray-50 border-2 border-blue-500 rounded-[20px] px-5 focus-within:bg-white">
                    <input
                      name="authCode"
                      type="tel"
                      inputMode="numeric"
                      value={formData.authCode}
                      placeholder="인증번호 4자리"
                      className="bg-transparent border-none outline-none w-full h-full text-[15px] font-bold text-gray-800 placeholder:text-gray-300"
                      onChange={(e) => setFormData({ ...formData, authCode: e.target.value })}
                      maxLength={4}
                    />
                  </div>
                  <button type="button" onClick={handleVerify} className="flex-1 h-[60px] bg-blue-600 text-white rounded-[20px] text-[15px] font-black">
                    확인
                  </button>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !isVerified}
            className={`w-full h-[62px] rounded-[24px] font-black text-[17px] shadow-lg transition-all flex items-center justify-center gap-2
            ${isVerified ? 'bg-blue-600 text-white shadow-blue-100 active:scale-[0.98]' : 'bg-gray-100 text-gray-400 shadow-none'}`}
          >
            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : '슈퍼 스케줄러 시작하기'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SignupSocial;
