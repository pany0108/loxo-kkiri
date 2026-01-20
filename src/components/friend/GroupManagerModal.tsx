import React, { useEffect, useRef, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { FolderPlus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { db } from '../../firebase'; // Corrected import path

interface Friend {
  uid: string;
  name: string;
  group?: string;
}

interface FriendGroup {
  id: string;
  name: string;
}

interface GroupManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialGroups: FriendGroup[];
  onSave: (newGroups: FriendGroup[]) => Promise<void>;
  friends: Friend[];
  user: any;
}

/**
 * 친구 그룹 관리 모달 컴포넌트
 * - 그룹 추가, 수정, 삭제 기능을 제공합니다.
 * - 그룹 삭제 시 해당 그룹에 속한 친구들은 '미분류' 상태가 됩니다.
 */
const GroupManagerModal: React.FC<GroupManagerModalProps> = ({ isOpen, onClose, initialGroups, onSave, friends, user }) => {
  const [groups, setGroups] = useState<FriendGroup[]>(initialGroups);
  const groupInputsContainerRef = useRef<HTMLDivElement>(null);
  const prevGroupsLengthRef = useRef(initialGroups.length);

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (isOpen) {
      setGroups(initialGroups);
      prevGroupsLengthRef.current = initialGroups.length;
    }
  }, [isOpen, initialGroups]);

  // 새 그룹 추가 시 자동으로 포커스 및 스크롤 이동
  useEffect(() => {
    if (isOpen && groups.length > prevGroupsLengthRef.current) {
      const inputs = groupInputsContainerRef.current?.querySelectorAll<HTMLInputElement>('input');
      if (inputs && inputs.length > 0) {
        const lastInput = inputs[inputs.length - 1];
        lastInput.focus();
        lastInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
    prevGroupsLengthRef.current = groups.length;
  }, [groups, isOpen]);

  /** 그룹 이름 변경 핸들러 */
  const handleGroupChange = (id: string, newName: string) => {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, name: newName } : g)));
  };

  /** 새 그룹 추가 핸들러 */
  const handleAddGroup = () => {
    const newGroup: FriendGroup = { id: `group_${Date.now()}`, name: '' };
    setGroups((prev) => [...prev, newGroup]);
  };

  /** 그룹 삭제 핸들러 */
  const handleDeleteGroup = async (groupId: string) => {
    if (!user) return;
    const updatedFriends = friends.map((f) => {
      if (f.group === groupId) {
        const { group, ...rest } = f;
        return rest;
      }
      return f;
    });
    try {
      await updateDoc(doc(db, 'users', user.uid), { friendsList: updatedFriends });
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
    } catch (error) {
      toast.error('그룹 삭제 중 오류가 발생했습니다.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-4xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
        <h3 className="text-xl font-black text-main dark:text-white mb-4">그룹 관리</h3>
        <div ref={groupInputsContainerRef} className="space-y-2 mb-6 max-h-60 overflow-y-auto">
          {groups.map((group) => (
            <div key={group.id} className="flex items-center gap-2">
              <input
                value={group.name}
                placeholder="그룹 이름 입력"
                onChange={(e) => handleGroupChange(group.id, e.target.value)}
                className="flex-1 h-12 bg-gray-50 dark:bg-gray-700 rounded-xl px-4 font-bold text-sm text-main dark:text-white min-w-0 placeholder:text-sub dark:placeholder:text-gray-500"
              />
              <button onClick={() => handleDeleteGroup(group.id)} className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-xl">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={handleAddGroup}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed rounded-xl text-sub hover:bg-gray-50 dark:hover:bg-gray-700/50 mb-6"
        >
          <FolderPlus size={16} />
          <span className="text-sm font-bold">새 그룹 추가</span>
        </button>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-sub dark:text-gray-300 font-bold rounded-xl">
            취소
          </button>
          <button onClick={() => onSave(groups)} className="flex-1 py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 dark:shadow-blue-900/50">
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupManagerModal;
