import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { PenLine, Trash2, Home, Briefcase, GraduationCap, Dumbbell, Plane, Music, Heart, Star, Gift, Coffee, ShoppingCart, Gamepad2, ChevronDown, Check } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';

const CALENDAR_ICONS = [
  { id: 'home', component: Home, label: '집' },
  { id: 'work', component: Briefcase, label: '직장' },
  { id: 'study', component: GraduationCap, label: '공부' },
  { id: 'workout', component: Dumbbell, label: '운동' },
  { id: 'travel', component: Plane, label: '여행' },
  { id: 'music', component: Music, label: '음악' },
  { id: 'love', component: Heart, label: '연애' },
  { id: 'star', component: Star, label: '중요' },
  { id: 'gift', component: Gift, label: '기념일' },
  { id: 'food', component: Coffee, label: '약속' },
  { id: 'shopping', component: ShoppingCart, label: '쇼핑' },
  { id: 'game', component: Gamepad2, label: '취미' },
];

const COLOR_OPTIONS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#84cc16', // lime
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#007AFF', // primary
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#f43f5e', // rose
  '#64748b', // slate
  '#71717a', // zinc
];

interface CalendarData {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  isDefault?: boolean;
  customNames?: Record<string, string>;
}

interface EditCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  calendar: CalendarData | null;
  onDelete: () => void;
}

const EditCalendarModal: React.FC<EditCalendarModalProps> = ({ isOpen, onClose, calendar, onDelete }) => {
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(CALENDAR_ICONS[0].id);
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[7]); // Default blue
  const [isColorDropdownOpen, setIsColorDropdownOpen] = useState(false);
  const colorDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (calendar) {
      const userId = auth.currentUser?.uid;
      const displayName = (userId && calendar.customNames?.[userId]) || calendar.name;
      setName(displayName);
      if (calendar.icon) {
        setSelectedIcon(calendar.icon);
      }
      if (calendar.color) {
        setSelectedColor(calendar.color);
      }
    }
  }, [calendar]);

  // [추가] 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorDropdownRef.current && !colorDropdownRef.current.contains(event.target as Node)) {
        setIsColorDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen || !calendar) return null;

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('캘린더 이름을 입력해주세요.');
      return;
    }
    try {
      const userId = auth.currentUser?.uid;
      const calendarRef = doc(db, 'calendars', calendar.id);

      const updateData: any = { icon: selectedIcon, color: selectedColor };
      if (userId) {
        updateData[`customNames.${userId}`] = name;
      } else {
        updateData.name = name;
      }

      await updateDoc(calendarRef, updateData);
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
      <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-4xl pt-6 pb-8 px-8 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xl font-black text-[#191F28] dark:text-white">캘린더 수정</h3>
          <div className="flex items-center">
            {!calendar.isDefault && (
              <button onClick={onDelete} className="p-2 text-[#8B95A1] hover:text-red-500 rounded-full transition-colors" title="캘린더 삭제">
                <Trash2 size={20} />
              </button>
            )}
          </div>
        </div>
        <p className="text-[#8B95A1] dark:text-gray-500 text-[13px] mb-6 font-medium leading-relaxed">캘린더의 이름과 아이콘, 색상을 변경합니다.</p>

        <div className="space-y-6">
          <div className="flex items-center h-[58px] bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus-within:border-[#007AFF] focus-within:bg-white dark:focus-within:bg-gray-700 rounded-xl px-5 transition-all">
            <PenLine size={18} className="text-[#8B95A1] mr-3" />
            <input value={name} onChange={(e) => setName(e.target.value)} type="text" className="w-full bg-transparent outline-none font-bold text-[#191F28] dark:text-white" />
          </div>

          <div className="flex items-center justify-between">
            <label className="block text-[13px] font-black text-[#8B95A1] ml-1">캘린더 아이콘</label>
            <div className="relative" ref={colorDropdownRef}>
              <button
                type="button"
                onClick={() => setIsColorDropdownOpen(!isColorDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm active:scale-95 transition-all"
              >
                <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: selectedColor }} />
                <span className="text-[12px] font-bold text-[#8B95A1] dark:text-gray-300"></span>
                <ChevronDown size={14} className="text-[#8B95A1]" />
              </button>
              {isColorDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 p-3 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 w-[240px]">
                  <div className="grid grid-cols-5 gap-2">
                    {COLOR_OPTIONS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => {
                          setSelectedColor(color);
                          setIsColorDropdownOpen(false);
                        }}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                        style={{ backgroundColor: color }}
                      >
                        {selectedColor === color && <Check size={14} className="text-white" strokeWidth={3} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 px-1">
            {CALENDAR_ICONS.map(({ id, component: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedIcon(id)}
                className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center border-2`}
                style={{
                  borderColor: selectedIcon === id ? selectedColor : 'transparent',
                  backgroundColor: selectedIcon === id ? `${selectedColor}20` : 'transparent',
                }}
              >
                <Icon size={20} style={{ color: selectedColor, opacity: selectedIcon === id ? 1 : 0.4 }} />
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button onClick={onClose} className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-[#8B95A1] dark:text-gray-300 font-bold rounded-xl">
            취소
          </button>
          <button onClick={handleSave} className="flex-1 py-4 bg-[#007AFF] text-white font-bold rounded-xl shadow-lg shadow-[#007AFF]/30 dark:shadow-[#007AFF]/20">
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditCalendarModal;
