import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Check, PenLine, Trash2 } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const COLORS = [
  '#3b82f6',
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#84cc16',
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  '#0ea5e9',
  '#6366f1',
  '#8b5cf6',
  '#d946ef',
  '#ec4899',
  '#f43f5e',
  '#64748b',
];

interface CalendarData {
  id: string;
  name: string;
  color: string;
  isDefault?: boolean;
}

interface EditCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  calendar: CalendarData | null;
  onDelete: () => void;
}

const EditCalendarModal: React.FC<EditCalendarModalProps> = ({ isOpen, onClose, calendar, onDelete }) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('');

  useEffect(() => {
    if (calendar) {
      setName(calendar.name);
      setColor(calendar.color);
    }
  }, [calendar]);

  if (!isOpen || !calendar) return null;

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('캘린더 이름을 입력해주세요.');
      return;
    }
    try {
      const calendarRef = doc(db, 'calendars', calendar.id);
      await updateDoc(calendarRef, { name, color });
      toast.success('캘린더가 수정되었습니다.');
      onClose();
    } catch (error) {
      toast.error('수정 중 오류가 발생했습니다.');
      console.error('Error updating calendar:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-[32px] pt-6 pb-8 px-8 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xl font-black text-gray-900 dark:text-white">캘린더 수정</h3>
          <div className="flex items-center">
            {!calendar.isDefault && (
              <button onClick={onDelete} className="p-2 text-gray-400 hover:text-red-500 rounded-full transition-colors" title="캘린더 삭제">
                <Trash2 size={20} />
              </button>
            )}
          </div>
        </div>
        <p className="text-gray-400 dark:text-gray-500 text-[13px] mb-6 font-medium leading-relaxed">캘린더의 이름과 색상을 변경합니다.</p>

        <div className="space-y-6">
          <div className="flex items-center h-[58px] bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-gray-700 rounded-[18px] px-5 transition-all">
            <PenLine size={18} className="text-gray-400 mr-3" />
            <input value={name} onChange={(e) => setName(e.target.value)} type="text" className="w-full bg-transparent outline-none font-bold text-gray-800 dark:text-white" />
          </div>

          <div className="flex flex-wrap gap-3 px-1">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full transition-all flex items-center justify-center ${
                  color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
              >
                {color === c && <Check size={14} className="text-white" strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button onClick={onClose} className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 font-bold rounded-[20px]">
            취소
          </button>
          <button onClick={handleSave} className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-[20px] shadow-lg shadow-blue-100 dark:shadow-blue-900/50">
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditCalendarModal;
