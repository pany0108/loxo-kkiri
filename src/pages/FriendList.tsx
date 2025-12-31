import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Search, UserPlus, User, ChevronRight, Check, Loader2, MoreVertical, Edit2, Trash2, AlertCircle } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, onSnapshot, updateDoc, query, collection, where, getDocs, arrayUnion, arrayRemove } from 'firebase/firestore';
import ImagePreviewModal from '../components/ImagePreviewModal';

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
  const [friends, setFriends] = useState<Friend[]>([]);
  const [myInfo, setMyInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // 친구 추가 모달 상태
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newFriendEmail, setNewFriendEmail] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // 더보기 메뉴 및 수정/삭제 팝업 상태
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // 바텀시트 스와이프 제어 Ref
  const sheetTouchStartY = useRef<number | null>(null);
  const sheetTouchEndY = useRef<number | null>(null);
  const minSheetSwipeDistance = 50;

  /**
   * 컴포넌트 마운트 시 Firestore의 내 문서(users/{uid})를 구독합니다.
   * 친구 목록이나 내 정보가 변경되면 실시간으로 상태를 업데이트합니다.
   */
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMyInfo(data);
        setFriends(data.friendsList || []);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
    if (!newFriendEmail.trim() || !auth.currentUser) return;

    // 자기 자신 추가 방지
    if (newFriendEmail === auth.currentUser.email) {
      toast.error('자기 자신은 친구로 추가할 수 없습니다.');
      return;
    }

    setIsAdding(true);
    try {
      // 이메일로 유저 검색
      const q = query(collection(db, 'users'), where('email', '==', newFriendEmail.trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast.error('존재하지 않는 이메일입니다.');
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
      setNewFriendEmail('');
      setIsAddModalOpen(false);
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
    setNewFriendEmail('');
    setIsAddModalOpen(false);
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-['Pretendard'] pb-[100px] relative">
      {/* 헤더 및 검색바 */}
      <header className="sticky top-0 bg-white/90 backdrop-blur-md z-40 px-6 pt-6 pb-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">친구</h1>
          <button className="p-2.5 bg-gray-900 text-white rounded-full shadow-lg active:scale-90" onClick={() => setIsAddModalOpen(true)} aria-label="친구 추가">
            <UserPlus size={20} />
          </button>
        </div>
        <div className="relative mt-2">
          <div className="flex items-center bg-gray-100 rounded-[20px] px-4 py-3.5 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
            <Search size={18} className="text-gray-400 mr-3 shrink-0" />
            <input
              type="text"
              value={searchTerm}
              placeholder="친구 이름 검색"
              className="flex-1 bg-transparent outline-none text-gray-900 text-[15px] font-medium"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </header>

      <div className="px-6 space-y-6 mt-4">
        {/* 내 프로필 섹션 (검색 시 숨김) */}
        {!searchTerm && (
          <section>
            <h2 className="text-[12px] font-bold text-gray-400 mb-3 px-1">내 프로필</h2>
            <div
              className="bg-white p-4 rounded-[28px] border border-gray-100 flex items-center justify-between active:scale-[0.99] transition-transform cursor-pointer"
              onClick={() => navigate('/profile')}
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div
                  className="w-[56px] h-[56px] rounded-[22px] shrink-0 shadow-lg shadow-blue-100 overflow-hidden"
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
                    <span className="text-[17px] font-black text-gray-900">{myInfo?.name || '사용자'}</span>
                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-md">ME</span>
                  </div>
                  <p className="text-[13px] font-medium text-gray-500 mt-0.5 truncate">{myInfo?.statusMessage || '상태 메시지가 없습니다.'}</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-300 shrink-0" />
            </div>
          </section>
        )}

        {/* 친구 목록 섹션 */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-[12px] font-bold text-gray-400">
              친구 <span className="text-blue-600">{filteredFriends.length}</span>
            </h2>
          </div>
          <div className="bg-white rounded-[32px] border border-gray-100 overflow-hidden shadow-sm">
            {filteredFriends.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {filteredFriends.map((friend) => (
                  <div key={friend.uid} className="group flex items-center justify-between p-4 pl-5 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4 overflow-hidden flex-1">
                      <div className="w-[48px] h-[48px] rounded-[18px] shrink-0 cursor-pointer" onClick={() => friend.photoURL && setPreviewImage(friend.photoURL)}>
                        {friend.photoURL ? (
                          <img src={friend.photoURL} alt={friend.name} className="w-full h-full object-cover rounded-[18px]" />
                        ) : (
                          <div className="w-full h-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg rounded-[18px]">{friend.name[0]}</div>
                        )}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[16px] font-bold text-gray-900 truncate">{friend.name}</span>
                        <p className="text-[12px] font-medium truncate text-gray-500">{friend.statusMessage || '상태 메시지 없음'}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedFriend(friend);
                        setIsMenuOpen(true);
                      }}
                      className="p-2 text-gray-300 hover:text-gray-600 active:bg-gray-100 rounded-full transition-all"
                    >
                      <MoreVertical size={20} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center">
                <p className="text-gray-400 text-sm font-bold">검색 결과가 없어요.</p>
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
            className="relative w-full max-w-md bg-white rounded-t-[32px] p-6 animate-in slide-in-from-bottom duration-300 shadow-2xl"
            onTouchStart={onSheetTouchStart}
            onTouchMove={onSheetTouchMove}
            onTouchEnd={onSheetTouchEnd}
          >
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
            <h3 className="text-[14px] font-black text-gray-400 mb-4 px-2 tracking-tight">{selectedFriend?.name}님 관리</h3>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setEditName(selectedFriend?.name || '');
                  setIsEditModalOpen(true);
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 rounded-[22px] transition-colors"
              >
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <Edit2 size={20} />
                </div>
                <span className="font-bold text-gray-700">이름 수정하기</span>
              </button>
              <button
                onClick={() => {
                  setIsDeleteModalOpen(true);
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-4 p-4 hover:bg-red-50 rounded-[22px] transition-colors"
              >
                <div className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center">
                  <Trash2 size={20} />
                </div>
                <span className="font-bold text-red-500">친구 삭제하기</span>
              </button>
            </div>
            <button onClick={() => setIsMenuOpen(false)} className="w-full mt-4 py-4 font-bold text-gray-400">
              취소
            </button>
          </div>
        </div>
      )}

      {/* 이름 수정 모달 */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-gray-900 mb-2">이름 수정</h3>
            <p className="text-gray-400 text-[13px] mb-6 font-medium leading-relaxed">내가 알아보기 쉬운 이름으로 변경해보세요.</p>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              type="text"
              enterKeyHint="done"
              onKeyDown={(e) => handleKeyDownAction(e, handleEditSave)}
              className="w-full h-[58px] bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-[18px] px-5 font-bold text-gray-800 outline-none mb-6 transition-all"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setIsEditModalOpen(false)} className="flex-1 py-4 bg-gray-100 text-gray-500 font-bold rounded-[20px]">
                취소
              </button>
              <button onClick={handleEditSave} className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-[20px] shadow-lg shadow-blue-100">
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
          <div className="relative w-full max-w-[320px] bg-white rounded-[32px] p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">친구 삭제</h3>
            <p className="text-gray-400 text-[14px] mb-8 font-medium leading-relaxed">
              정말 <span className="text-gray-900 font-bold">'{selectedFriend?.name}'</span>님을
              <br />
              친구 목록에서 삭제할까요?
            </p>
            <div className="flex flex-col gap-2">
              <button onClick={handleDeleteConfirm} className="w-full py-4 bg-red-500 text-white font-bold rounded-[20px] active:scale-95 transition-all">
                삭제하기
              </button>
              <button onClick={() => setIsDeleteModalOpen(false)} className="w-full py-4 text-gray-400 font-bold hover:text-gray-600">
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 이미지 미리보기 모달 */}
      {previewImage && <ImagePreviewModal images={[previewImage]} initialIndex={0} onClose={() => setPreviewImage(null)} />}

      {/* 친구 추가 모달 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeAddModal} />
          <div className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-gray-900 mb-1">새 친구 찾기</h3>
            <p className="text-gray-400 text-[13px] mb-6 font-medium leading-relaxed">친구의 이메일 주소를 정확히 입력해주세요.</p>
            <div className="bg-gray-50 rounded-[20px] p-2 mb-6 border border-gray-100 focus-within:border-blue-500 focus-within:bg-white transition-all">
              <input
                type="email"
                value={newFriendEmail}
                onChange={(e) => setNewFriendEmail(e.target.value)}
                enterKeyHint="send"
                onKeyDown={(e) => handleKeyDownAction(e, handleAddFriend)}
                placeholder="example@email.com"
                className="w-full bg-transparent outline-none p-3 text-[15px] font-bold"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button onClick={closeAddModal} className="flex-1 py-3.5 rounded-[20px] bg-gray-100 text-gray-500 font-bold text-[14px]">
                취소
              </button>
              <button
                onClick={handleAddFriend}
                disabled={isAdding || !newFriendEmail.includes('@')}
                className="flex-1 py-3.5 rounded-[20px] bg-blue-600 text-white font-bold text-[14px] flex items-center justify-center gap-2 active:scale-95 disabled:bg-blue-300"
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
