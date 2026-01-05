import React from 'react';
import { X, Trash2, ArrowRight, Copy } from 'lucide-react';

interface DeleteRecurringModalProps {
  onClose: () => void;
  onDeleteOne: () => void;
  onDeleteFollowing: () => void;
  onDeleteAll: () => void;
}

const DeleteRecurringModal = ({ onClose, onDeleteOne, onDeleteFollowing, onDeleteAll }: DeleteRecurringModalProps) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full sm:w-[400px] bg-white rounded-t-[32px] sm:rounded-[32px] p-6 pb-10 sm:pb-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-[18px] font-black text-gray-900">반복 일정 삭제</h3>
          <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        <p className="text-[14px] text-gray-500 font-medium mb-6 leading-relaxed">
          이 일정은 반복되는 일정입니다.
          <br />
          어떻게 삭제하시겠습니까?
        </p>

        <div className="space-y-3">
          <button
            onClick={onDeleteOne}
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-blue-50 border border-transparent hover:border-blue-200 rounded-[20px] transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-400 group-hover:text-blue-600 transition-colors">
                <Trash2 size={18} />
              </div>
              <span className="text-[14px] font-bold text-gray-700 group-hover:text-blue-600">이 일정만 삭제</span>
            </div>
          </button>

          <button
            onClick={onDeleteFollowing}
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-blue-50 border border-transparent hover:border-blue-200 rounded-[20px] transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-400 group-hover:text-blue-600 transition-colors">
                <ArrowRight size={18} />
              </div>
              <div className="text-left">
                <span className="block text-[14px] font-bold text-gray-700 group-hover:text-blue-600">이 일정 포함 향후 일정 삭제</span>
                <span className="text-[11px] text-gray-400 font-medium">이 날짜 이후의 모든 반복이 사라집니다.</span>
              </div>
            </div>
          </button>

          <button
            onClick={onDeleteAll}
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-[20px] transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-400 group-hover:text-red-500 transition-colors">
                <Copy size={18} />
              </div>
              <span className="text-[14px] font-bold text-gray-700 group-hover:text-red-600">모든 일정 삭제</span>
            </div>
          </button>
        </div>

        <div className="mt-4 text-center">
          <button onClick={onClose} className="text-[13px] font-bold text-gray-400 hover:text-gray-600 p-2">
            취소
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteRecurringModal;
