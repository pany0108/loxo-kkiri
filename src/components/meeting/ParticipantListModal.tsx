import React from 'react';
import { X } from 'lucide-react';

interface Participant {
  uid: string;
  name?: string;
  photoURL?: string;
}

interface ParticipantListModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: Participant[];
}

/**
 * 참여자 목록 모달 컴포넌트
 * @param {boolean} isOpen - 모달 열림 여부
 * @param {function} onClose - 모달 닫기 핸들러
 * @param {Participant[]} participants - 참여자 목록 데이터
 */
const ParticipantListModal: React.FC<ParticipantListModalProps> = ({ isOpen, onClose, participants }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 w-full max-w-xs rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-lg font-black text-main dark:text-white">참여자 목록</h4>
          <button onClick={onClose} className="text-sub dark:text-gray-500 hover:text-main dark:hover:text-gray-300">
            <X size={20} />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1">
          {participants.map((user) => (
            <div key={user.uid} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden flex items-center justify-center border border-gray-100 dark:border-gray-600">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-sub dark:text-gray-400">{user.name?.[0]}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-main dark:text-gray-200 truncate">{user.name || '알 수 없음'}</p>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-full mt-6 py-3 bg-gray-100 dark:bg-gray-700 text-main dark:text-gray-200 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          닫기
        </button>
      </div>
    </div>
  );
};

export default ParticipantListModal;
