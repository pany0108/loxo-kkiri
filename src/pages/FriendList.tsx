import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, User, ChevronRight, Check, Loader2, MoreVertical, Edit2, Trash2, AlertCircle } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, onSnapshot, updateDoc, query, collection, where, getDocs, arrayUnion, arrayRemove } from 'firebase/firestore';

interface Friend {
  uid: string;
  name: string;
  email: string;
  statusMessage?: string;
}

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

  // 1. 실시간 데이터 구독
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

  // 2. [기능] 친구 추가 핸들러
  const handleAddFriend = async () => {
    if (!newFriendEmail.trim() || !auth.currentUser) return;
    if (newFriendEmail === auth.currentUser.email) {
      alert('자기 자신은 추가할 수 없습니다.');
      return;
    }

    setIsAdding(true);
    try {
      const q = query(collection(db, 'users'), where('email', '==', newFriendEmail.trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        alert('사용자를 찾을 수 없습니다.');
        return;
      }

      const targetUserDoc = querySnapshot.docs[0];
      const targetUserData = targetUserDoc.data();

      if (friends.some((f) => f.uid === targetUserDoc.id)) {
        alert('이미 친구입니다.');
        return;
      }

      const myRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(myRef, {
        friendsList: arrayUnion({
          uid: targetUserDoc.id,
          name: targetUserData.name,
          email: targetUserData.email,
          statusMessage: targetUserData.statusMessage || '',
        }),
      });

      alert(`${targetUserData.name}님을 친구로 추가했습니다! ✨`);
      setNewFriendEmail('');
      setIsAddModalOpen(false);
    } catch (error) {
      alert('오류가 발생했습니다.');
    } finally {
      setIsAdding(false);
    }
  };

  // 3. [기능] 친구 이름(별명) 수정
  const handleEditSave = async () => {
    if (!selectedFriend || !editName.trim()) return;
    try {
      const myRef = doc(db, 'users', auth.currentUser!.uid);
      const updatedList = friends.map((f) => (f.uid === selectedFriend.uid ? { ...f, name: editName.trim() } : f));
      await updateDoc(myRef, { friendsList: updatedList });
      setIsEditModalOpen(false);
      setIsMenuOpen(false);
    } catch (e) {
      alert('수정 중 오류가 발생했습니다.');
    }
  };

  const closeAddModal = () => {
    setNewFriendEmail(''); // 입력값 초기화
    setIsAddModalOpen(false); // 모달 닫기
  };

  const handleKeyDownAction = (e: React.KeyboardEvent<HTMLInputElement>, action: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };

  // 4. [기능] 친구 삭제
  const handleDeleteConfirm = async () => {
    if (!selectedFriend) return;
    try {
      const myRef = doc(db, 'users', auth.currentUser!.uid);
      await updateDoc(myRef, { friendsList: arrayRemove(selectedFriend) });
      setIsDeleteModalOpen(false);
      setIsMenuOpen(false);
    } catch (e) {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const filteredFriends = friends.filter((f) => f.name.includes(searchTerm)).sort((a, b) => a.name.localeCompare(b.name, 'ko'));

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 font-['Pretendard'] pb-[100px] relative">
      <header className="sticky top-0 bg-white/90 backdrop-blur-md z-40 px-6 pt-6 pb-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">친구</h1>
          <button className="p-2.5 bg-gray-900 text-white rounded-full shadow-lg active:scale-90" onClick={() => setIsAddModalOpen(true)}>
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
        {!searchTerm && (
          <section>
            <h2 className="text-[12px] font-bold text-gray-400 mb-3 px-1">내 프로필</h2>
            <div
              className="bg-white p-4 rounded-[28px] border border-gray-100 flex items-center justify-between active:scale-[0.99] transition-transform cursor-pointer"
              onClick={() => navigate('/profile')}
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-[56px] h-[56px] bg-gradient-to-br from-blue-500 to-blue-600 rounded-[22px] flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-100">
                  <User size={26} strokeWidth={2.5} />
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
                      <div className="w-[48px] h-[48px] rounded-[18px] bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg shrink-0">{friend.name[0]}</div>
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

      {/* 1. 하단 액션 메뉴 (더보기) */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setIsMenuOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-t-[32px] p-6 animate-in slide-in-from-bottom duration-300 shadow-2xl">
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

      {/* 2. 이름 수정 팝업 */}
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

      {/* 3. 삭제 확인 팝업 */}
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

      {/* 4. 친구 추가 모달 */}
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
