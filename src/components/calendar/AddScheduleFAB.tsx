import React from 'react';
import { Plus } from 'lucide-react';

interface AddScheduleFABProps {
  onClick: () => void;
}

const AddScheduleFAB: React.FC<AddScheduleFABProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="absolute right-6 bottom-6 w-[56px] h-[56px] bg-[#007AFF] dark:bg-[#007AFF] text-white dark:text-gray-900 rounded-full shadow-[0_8px_30px_rgba(0,122,255,0.3)] flex items-center justify-center z-40 active:scale-90 transition-transform hover:bg-[#0062cc]"
    >
      <Plus size={24} strokeWidth={3} />
    </button>
  );
};

export default AddScheduleFAB;
