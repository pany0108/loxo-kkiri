import React, { useState, useEffect, useRef } from 'react';
import { FolderPlus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

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

const GroupManagerModal: React.FC<GroupManagerModalProps> = ({ isOpen, onClose, initialGroups, onSave, friends, user }) => {
  const [groups, setGroups] = useState<FriendGroup[]>(initialGroups);
  const groupInputsContainerRef = useRef<HTMLDivElement>(null);
  const prevGroupsLengthRef = useRef(initialGroups.length);

  useEffect(() => {
    if (isOpen) {
      setGroups(initialGroups);
      prevGroupsLengthRef.current = initialGroups.length;
    }
  }, [isOpen, initialGroups]);

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

  const handleGroupChange = (id: string, newName: string) => {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, name: newName } : g)));
  };

  const handleAddGroup = () => {
    const newGroup: FriendGroup = { id: `group_${Date.now()}`, name: '' };
    setGroups((prev) => [...prev, newGroup]);
  };

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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
        <h3 className="text-xl font-black text-[#191F28] dark:text-white mb-4">그룹 관리</h3>
        <div ref={groupInputsContainerRef} className="space-y-2 mb-6 max-h-60 overflow-y-auto">
          {groups.map((group) => (
            <div key={group.id} className="flex items-center gap-2">
              <input
                value={group.name}
                placeholder="그룹 이름 입력"
                onChange={(e) => handleGroupChange(group.id, e.target.value)}
                className="flex-1 h-12 bg-gray-50 dark:bg-gray-700 rounded-xl px-4 font-bold text-sm text-[#191F28] dark:text-white min-w-0 placeholder:text-[#8B95A1] dark:placeholder:text-gray-500"
              />
              <button onClick={() => handleDeleteGroup(group.id)} className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-xl">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={handleAddGroup}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed rounded-xl text-[#8B95A1] hover:bg-gray-50 dark:hover:bg-gray-700/50 mb-6"
        >
          <FolderPlus size={16} />
          <span className="text-sm font-bold">새 그룹 추가</span>
        </button>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-[#8B95A1] dark:text-gray-300 font-bold rounded-[20px]">
            취소
          </button>
          <button onClick={() => onSave(groups)} className="flex-1 py-4 bg-[#007AFF] text-white font-bold rounded-[20px] shadow-lg shadow-[#007AFF]/20 dark:shadow-blue-900/50">
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupManagerModal;
