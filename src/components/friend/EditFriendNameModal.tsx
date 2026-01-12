import React, { useState, useEffect } from 'react';

interface EditFriendNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialName: string;
  onSave: (newName: string) => void;
}

const EditFriendNameModal: React.FC<EditFriendNameModalProps> = ({ isOpen, onClose, initialName, onSave }) => {
  const [name, setName] = useState(initialName);

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
    }
  }, [isOpen, initialName]);

  const handleSaveClick = () => {
    if (name.trim()) {
      onSave(name.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveClick();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-4xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
        <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">이름 수정</h3>
        <p className="text-gray-400 dark:text-gray-500 text-[13px] mb-6 font-medium leading-relaxed">내가 알아보기 쉬운 이름으로 변경해보세요.</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          type="text"
          enterKeyHint="done"
          onKeyDown={handleKeyDown}
          className="w-full h-[58px] bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-700 rounded-xl px-5 font-bold text-gray-800 dark:text-white outline-none mb-6 transition-all"
          autoFocus
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 font-bold rounded-xl">
            취소
          </button>
          <button onClick={handleSaveClick} className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-100 dark:shadow-blue-900/50">
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditFriendNameModal;
