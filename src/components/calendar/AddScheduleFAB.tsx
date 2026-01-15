import React from 'react';
import { Plus } from 'lucide-react';

interface AddScheduleFABProps {
  onClick: () => void;
}

const AddScheduleFAB: React.FC<AddScheduleFABProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="absolute right-6 bottom-6 w-[56px] h-[56px] bg-primary text-white rounded-full shadow-lg shadow-primary/30 flex items-center justify-center z-40 active:scale-95 transition-transform hover:bg-primary/90"
    >
      <Plus size={24} strokeWidth={3} />
    </button>
  );
};

export default AddScheduleFAB;
