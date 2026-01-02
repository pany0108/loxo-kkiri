import React, { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Search, UserPlus, User, ChevronRight, Check, Loader2, MoreVertical, Edit2, Trash2, AlertCircle, X, Users } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, updateDoc, query, collection, where, getDocs, arrayUnion, arrayRemove } from 'firebase/firestore';
import ImagePreviewModal from '../components/ImagePreviewModal';
import { useFirestoreDoc } from '../hooks/useFirestore';

/**
 * 친구 데이터 인터페이스
 */
interface Friend {
  uid: string;
  name: string;
  email: string;
  statusMessage?: string;
  photoURL?: string;
}

/**
 * 친구 목록 관리 컴포넌트입니다.
 * - Firestore 실시간 리스너를 통해 친구 목록 동기화
 * - 이메일 검색을 통한 친구 추가
 * - 친구 별명 수정 및 목록 삭제 기능 제공
 * * @returns {JSX.Element} 친구 목록 관리 화면
 */
const FriendList = () => {
  const navigate = useNavigate();

  // --- 상태 관리 ---
  const [searchTerm, setSearchTerm] = useState('');

  // 친구 추가 모달 상태
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newFriendInput, setNewFriendInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addFriendMethod, setAddFriendMethod] = useState<'email' | 'phone'>('email');

  // 더보기 메뉴 및 수정/삭제 팝업 상태
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [profilePopupFriend, setProfilePopupFriend] = useState<Friend | null>(null);

  // 바텀시트 스와이프 제어 Ref
  const sheetTouchStartY = useRef<number | null>(null);
  const sheetTouchEndY = useRef<number | null>(null);
  const minSheetSwipeDistance = 50;

  const user = auth.currentUser;
  const userDocRef = useMemo(() => (user ? doc(db, 'users', user.uid) : null), [user]);
  const { data: myInfo, loading: isLoading } = useFirestoreDoc<any>(userDocRef);

  // myInfo 데이터가 변경될 때마다 friends 목록을 파생시킵니다.
  const friends: Friend[] = myInfo?.friendsList || [];

  /**
   * [추가] 바텀시트 스와이프 핸들러
   */
  const onSheetTouchStart = (e: React.TouchEvent) => {
    sheetTouchEndY.current = null;
    sheetTouchStartY.current = e.targetTouches[0].clientY;
  };

  const onSheetTouchMove = (e: React.TouchEvent) => {
    sheetTouchEndY.current = e.targetTouches[0].clientY;
  };

  const onSheetTouchEnd = () => {
    if (!sheetTouchStartY.current || !sheetTouchEndY.current) return;
    const distance = sheetTouchEndY.current - sheetTouchStartY.current;
    if (distance > minSheetSwipeDistance) {
      setIsMenuOpen(false);
    }
  };

  /**
   * 이메일로 사용자를 검색하여 친구 목록에 추가합니다.
   * - 자기 자신 추가 불가
   * - 이미 등록된 친구 중복 추가 불가
   * - 존재하지 않는 이메일 처리
   */
  const handleAddFriend = async () => {
    if (!newFriendInput.trim() || !auth.currentUser) return;

    const searchField = addFriendMethod;
    const searchValue = newFriendInput.trim();

    // 자기 자신 추가 방지
    if (searchField === 'email' && searchValue === auth.currentUser.email) {
      toast.error('자기 자신은 친구로 추가할 수 없습니다.');
      return;
    }
    if (searchField === 'phone' && searchValue === myInfo?.phone) {
      toast.error('자기 자신은 친구로 추가할 수 없습니다.');
      return;
    }

    setIsAdding(true);
    try {
      // 이메일 또는 휴대폰 번호로 유저 검색
      const q = query(collection(db, 'users'), where(searchField, '==', searchValue));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast.error(`존재하지 않는 ${searchField === 'email' ? '이메일' : '휴대폰 번호'}입니다.`);
        return;
      }

      const targetUserDoc = querySnapshot.docs[0];
      const targetUserData = targetUserDoc.data();

      // 이미 친구인지 확인
      if (friends.some((f) => f.uid === targetUserDoc.id)) {
        toast('이미 친구 목록에 있습니다.', { icon: '⚠️' });
        return;
      }

      // 내 친구 목록에 추가 (arrayUnion)
      const myRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(myRef, {
        friendsList: arrayUnion({
          uid: targetUserDoc.id,
          name: targetUserData.name,
          email: targetUserData.email,
          statusMessage: targetUserData.statusMessage || '',
          photoURL: targetUserData.photoURL || '',
        }),
      });

      // 성공 처리
      toast.success(`${targetUserData.name}님을 친구로 추가했습니다.`);
      closeAddModal();
    } catch (error) {
      console.error('친구 추가 오류:', error);
      toast.error('친구 추가 중 오류가 발생했습니다.');
    } finally {
      setIsAdding(false);
    }
  };

  /**
   * 선택한 친구의 표시 이름(별명)을 수정합니다.
   * Firestore의 배열 데이터를 업데이트합니다.
   */
  const handleEditSave = async () => {
    if (!selectedFriend || !editName.trim()) return;
    try {
      const myRef = doc(db, 'users', auth.currentUser!.uid);

      // 배열 내 특정 객체만 수정하여 전체 리스트 교체
      const updatedList = friends.map((f) => (f.uid === selectedFriend.uid ? { ...f, name: editName.trim() } : f));

      await updateDoc(myRef, { friendsList: updatedList });
      toast.success('이름이 수정되었습니다.');
      setIsEditModalOpen(false);
      setIsMenuOpen(false);
    } catch (e) {
      console.error('친구 이름 수정 오류:', e);
      toast.error('이름 수정 중 오류가 발생했습니다.');
    }
  };

  /**
   * 친구 추가 모달을 닫고 입력값을 초기화합니다.
   */
  const closeAddModal = () => {
    setNewFriendInput('');
    setIsAddModalOpen(false);
    setAddFriendMethod('email'); // 탭 초기화
  };

  /**
   * [추가] 휴대폰 번호 자동 포맷팅 (010-0000-0000)
   */
  const formatPhone = (value: string) => {
    const nums = value.replace(/[^\d]/g, '');
    if (nums.length <= 3) return nums;
    if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
    return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7, 11)}`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (addFriendMethod === 'phone') {
      setNewFriendInput(formatPhone(e.target.value));
    } else {
      setNewFriendInput(e.target.value);
    }
  };

  /**
   * 엔터 키 입력 시 지정된 액션을 실행합니다.
   * @param {React.KeyboardEvent} e - 키보드 이벤트
   * @param {() => void} action - 실행할 함수
   */
  const handleKeyDownAction = (e: React.KeyboardEvent<HTMLInputElement>, action: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };

  /**
   * 친구 목록에서 선택한 대상을 삭제합니다.
   */
  const handleDeleteConfirm = async () => {
    if (!selectedFriend) return;
    try {
      const myRef = doc(db, 'users', auth.currentUser!.uid);
      await updateDoc(myRef, { friendsList: arrayRemove(selectedFriend) });
      toast.success('친구를 삭제했습니다.');
      setIsDeleteModalOpen(false);
      setIsMenuOpen(false);
    } catch (e) {
      console.error('친구 삭제 오류:', e);
      toast.error('친구 삭제 중 오류가 발생했습니다.');
    }
  };

  /**
   * 검색어에 따라 친구 목록을 필터링하고 이름순으로 정렬합니다.
   */
  const filteredFriends = friends.filter((f) => f.name.includes(searchTerm)).sort((a, b) => a.name.localeCompare(b.name, 'ko'));

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950 font-['Pretendard'] pb-24">
      <div className="flex-1 px-6 pt-6 pb-32 overflow-y-auto w-full">
        {/* 헤더 섹션 */}
        <header className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-xl mb-6">
                <Users className="text-blue-600 w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-[1.3] tracking-tight">
                소중한 <span className="text-blue-600 dark:text-blue-400">친구</span>들과
                <br />
                일정을 함께 관리하세요
              </h2>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="p-2.5 bg-gray-900 text-white dark:bg-gray-700 rounded-full shadow-lg active:scale-90 transition-transform"
              aria-label="친구 추가"
            >
              <UserPlus size={20} />
            </button>
          </div>
        </header>

        {/* 검색바 */}
        <div className="relative mb-8">
          <div className="flex items-center bg-white dark:bg-gray-800 rounded-[20px] px-4 py-3.5 shadow-sm border border-gray-100 dark:border-gray-700/50 focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
            <Search size={18} className="text-gray-400 dark:text-gray-500 mr-3 shrink-0" />
            <input
              type="text"
              value={searchTerm}
              placeholder="친구 이름 검색"
              className="flex-1 bg-transparent outline-none text-gray-900 dark:text-white text-[15px] font-bold placeholder:text-gray-300 dark:placeholder:text-gray-600"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* 내 프로필 섹션 (검색 시 숨김) */}
        {!searchTerm && (
          <section>
            <h2 className="text-[12px] font-bold text-gray-400 dark:text-gray-500 mb-3 px-1">내 프로필</h2>
            <div
              className="bg-white dark:bg-gray-800 p-4 rounded-[28px] border border-gray-100 dark:border-gray-700 flex items-center justify-between active:scale-[0.99] transition-transform cursor-pointer"
              onClick={() => navigate('/profile')}
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div
                  className="w-[56px] h-[56px] rounded-[22px] shrink-0 shadow-lg shadow-blue-100 dark:shadow-blue-900/50 overflow-hidden"
                  onClick={(e) => {
                    if (myInfo?.photoURL) {
                      e.stopPropagation();
                      setPreviewImage(myInfo.photoURL);
                    }
                  }}
                >
                  {myInfo?.photoURL ? (
                    <img src={myInfo.photoURL} alt={myInfo.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
                      <User size={26} strokeWidth={2.5} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[17px] font-black text-gray-900 dark:text-white">{myInfo?.name || '사용자'}</span>
                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-md">ME</span>
                  </div>
                  <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400 mt-0.5 truncate">{myInfo?.statusMessage || '상태 메시지가 없습니다.'}</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-300 shrink-0" />
            </div>
          </section>
        )}

        {/* 친구 목록 섹션 */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-[12px] font-bold text-gray-400 dark:text-gray-500">
              친구 <span className="text-blue-600">{filteredFriends.length}</span>
            </h2>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-[32px] border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
            {filteredFriends.length > 0 ? (
              <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {filteredFriends.map((friend) => (
                  <div key={friend.uid} className="group flex items-center justify-between p-4 pl-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center gap-4 overflow-hidden flex-1 cursor-pointer" onClick={() => setProfilePopupFriend(friend)}>
                      <div
                        className="w-[48px] h-[48px] rounded-[18px] shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (friend.photoURL) {
                            setPreviewImage(friend.photoURL);
                          }
                        }}
                      >
                        {friend.photoURL ? (
                          <img src={friend.photoURL} alt={friend.name} className="w-full h-full object-cover rounded-[18px]" />
                        ) : (
                          <div className="w-full h-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-lg rounded-[18px]">
                            {friend.name[0]}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[16px] font-bold text-gray-900 dark:text-white truncate">{friend.name}</span>
                        <p className="text-[12px] font-medium truncate text-gray-500 dark:text-gray-400">{friend.statusMessage || '상태 메시지 없음'}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        // [추가] 메뉴 버튼 클릭 시 프로필 팝업이 열리지 않도록 이벤트 전파 중단
                        setSelectedFriend(friend);
                        setIsMenuOpen(true);
                      }}
                      className="p-2 text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 active:bg-gray-100 dark:active:bg-gray-700 rounded-full transition-all"
                    >
                      <MoreVertical size={20} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center">
                <p className="text-gray-400 dark:text-gray-500 text-sm font-bold">검색 결과가 없어요.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* 친구 관리 바텀시트 메뉴 */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setIsMenuOpen(false)} />
          <div
            className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-t-[32px] p-6 animate-in slide-in-from-bottom duration-300 shadow-2xl"
            onTouchStart={onSheetTouchStart}
            onTouchMove={onSheetTouchMove}
            onTouchEnd={onSheetTouchEnd}
          >
            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-6" />
            <h3 className="text-[14px] font-black text-gray-400 dark:text-gray-500 mb-4 px-2 tracking-tight">{selectedFriend?.name}님 관리</h3>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setEditName(selectedFriend?.name || '');
                  setIsEditModalOpen(true);
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-[22px] transition-colors"
              >
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                  <Edit2 size={20} />
                </div>
                <span className="font-bold text-gray-700 dark:text-gray-300">이름 수정하기</span>
              </button>
              <button
                onClick={() => {
                  setIsDeleteModalOpen(true);
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-4 p-4 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-[22px] transition-colors"
              >
                <div className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center">
                  <Trash2 size={20} />
                </div>
                <span className="font-bold text-red-500">친구 삭제하기</span>
              </button>
            </div>
            <button onClick={() => setIsMenuOpen(false)} className="w-full mt-4 py-4 font-bold text-gray-400 dark:text-gray-500">
              취소
            </button>
          </div>
        </div>
      )}

      {/* 이름 수정 모달 */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">이름 수정</h3>
            <p className="text-gray-400 dark:text-gray-500 text-[13px] mb-6 font-medium leading-relaxed">내가 알아보기 쉬운 이름으로 변경해보세요.</p>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              type="text"
              enterKeyHint="done"
              onKeyDown={(e) => handleKeyDownAction(e, handleEditSave)}
              className="w-full h-[58px] bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-700 rounded-[18px] px-5 font-bold text-gray-800 dark:text-white outline-none mb-6 transition-all"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setIsEditModalOpen(false)} className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 font-bold rounded-[20px]">
                취소
              </button>
              <button onClick={handleEditSave} className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-[20px] shadow-lg shadow-blue-100 dark:shadow-blue-900/50">
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsDeleteModalOpen(false)} />
          <div className="relative w-full max-w-[320px] bg-white dark:bg-gray-800 rounded-[32px] p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">친구 삭제</h3>
            <p className="text-gray-400 dark:text-gray-400 text-[14px] mb-8 font-medium leading-relaxed">
              정말 <span className="text-gray-900 dark:text-gray-200 font-bold">'{selectedFriend?.name}'</span>님을
              <br />
              친구 목록에서 삭제할까요?
            </p>
            <div className="flex flex-col gap-2">
              <button onClick={handleDeleteConfirm} className="w-full py-4 bg-red-500 text-white font-bold rounded-[20px] active:scale-95 transition-all">
                삭제하기
              </button>
              <button onClick={() => setIsDeleteModalOpen(false)} className="w-full py-4 text-gray-400 dark:text-gray-500 font-bold hover:text-gray-600 dark:hover:text-gray-300">
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 이미지 미리보기 모달 */}
      {previewImage && <ImagePreviewModal images={[previewImage]} initialIndex={0} onClose={() => setPreviewImage(null)} />}

      {/* [추가] 친구 프로필 팝업 */}
      {profilePopupFriend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setProfilePopupFriend(null)} />
          <div className="relative w-full max-w-xs bg-white dark:bg-gray-800 rounded-[32px] p-6 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setProfilePopupFriend(null)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              <X size={20} />
            </button>
            <div className="w-24 h-24 rounded-full mx-auto mb-4 overflow-hidden border-4 border-white dark:border-gray-700 shadow-lg">
              {profilePopupFriend.photoURL ? (
                <img src={profilePopupFriend.photoURL} alt={profilePopupFriend.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center text-4xl font-bold">
                  {profilePopupFriend.name[0]}
                </div>
              )}
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white">{profilePopupFriend.name}</h3>
            <p className="text-sm text-gray-400 dark:text-gray-500 font-medium mt-1 mb-4">{profilePopupFriend.email}</p>
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3">
              {profilePopupFriend.statusMessage || '상태 메시지가 없습니다.'}
            </p>
          </div>
        </div>
      )}

      {/* 친구 추가 모달 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeAddModal} />
          <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-[32px] p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-1">새 친구 찾기</h3>
            <p className="text-gray-400 dark:text-gray-500 text-[13px] mb-6 font-medium leading-relaxed">친구의 이메일 또는 휴대폰 번호로 추가하세요.</p>
            <div className="flex p-1 bg-gray-100 dark:bg-gray-700/50 rounded-xl mb-4">
              <button
                onClick={() => {
                  setAddFriendMethod('email');
                  setNewFriendInput('');
                }}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${addFriendMethod === 'email' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'text-gray-400'}`}
              >
                이메일
              </button>
              <button
                onClick={() => {
                  setAddFriendMethod('phone');
                  setNewFriendInput('');
                }}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${addFriendMethod === 'phone' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'text-gray-400'}`}
              >
                휴대폰 번호
              </button>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-[20px] p-2 mb-6 border border-gray-100 dark:border-gray-700/50 focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-gray-800 transition-all">
              <input
                type={addFriendMethod === 'email' ? 'email' : 'tel'}
                value={newFriendInput}
                onChange={handleInputChange}
                enterKeyHint="send"
                onKeyDown={(e) => handleKeyDownAction(e, handleAddFriend)}
                placeholder={addFriendMethod === 'email' ? 'example@email.com' : '010-0000-0000'}
                className="w-full bg-transparent outline-none p-3 text-[15px] font-bold dark:text-white"
                autoFocus
                maxLength={addFriendMethod === 'phone' ? 13 : undefined}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={closeAddModal} className="flex-1 py-3.5 rounded-[20px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 font-bold text-[14px]">
                취소
              </button>
              <button
                onClick={handleAddFriend}
                disabled={isAdding || !newFriendInput.trim()}
                className="flex-1 py-3.5 rounded-[20px] bg-blue-600 text-white font-bold text-[14px] flex items-center justify-center gap-2 active:scale-95 disabled:bg-blue-300 dark:disabled:bg-blue-800"
              >
                {isAdding ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Check size={16} strokeWidth={3} /> 추가하기
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FriendList;
