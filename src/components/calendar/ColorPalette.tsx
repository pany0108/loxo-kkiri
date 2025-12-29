import React from 'react';

// 색상 아이템 타입 정의
interface ColorItem {
  name: string;
  value: string;
}

const COLORS: ColorItem[] = [
  { name: 'Blue (Default)', value: '#3b82f6' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Yellow', value: '#f59e0b' },
  { name: 'Green', value: '#10b981' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Gray', value: '#64748b' },
];

// Props 인터페이스 정의
interface ColorPaletteProps {
  selectedColor: string;
  onSelectColor: (color: string) => void;
}

const ColorPalette: React.FC<ColorPaletteProps> = ({ selectedColor, onSelectColor }) => {
  return (
    <div className="flex flex-col gap-3 py-4">
      <label className="text-sm font-bold text-gray-700 px-1">범주 색상 선택</label>
      <div className="flex flex-wrap gap-3 px-1">
        {COLORS.map((color) => (
          <button
            key={color.value}
            type="button"
            onClick={() => onSelectColor(color.value)}
            className={`
              relative w-8 h-8 rounded-full transition-all duration-200 
              hover:scale-110 active:scale-95
              ${selectedColor === color.value ? 'ring-2 ring-offset-2 ring-gray-400' : ''}
            `}
            style={{ backgroundColor: color.value }}
            title={color.name}
          >
            {selectedColor === color.value && <span className="absolute inset-0 flex items-center justify-center text-white text-xs">✓</span>}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ColorPalette;
