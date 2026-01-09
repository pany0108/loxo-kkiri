import React from 'react';
import { X, ChevronLeft, Check } from 'lucide-react';

interface NotificationHeaderProps {
  isSelectionMode: boolean;
  selectedCount: number;
  onCancelSelection: () => void;
  onMarkSelectedAsRead: () => void;
  onDeleteSelected: () => void;
  onSelectAll: () => void;
  isAllInFilterSelected: boolean;
  filteredNotificationsCount: number;
  onBack: () => void;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  unreadCount: number;
  tabs: { id: string; label: string }[];
}

const NotificationHeader: React.FC<NotificationHeaderProps> = ({
  isSelectionMode,
  selectedCount,
  onCancelSelection,
  onMarkSelectedAsRead,
  onDeleteSelected,
  onSelectAll,
  isAllInFilterSelected,
  filteredNotificationsCount,
  onBack,
  activeFilter,
  onFilterChange,
  unreadCount,
  tabs,
}) => {
  return (
    <div className="fixed top-0 right-0 left-0 px-6 pt-[calc(1.5rem+env(safe-area-inset-top))] bg-white/80 dark:bg-gray-950/80 backdrop-blur-md z-40 border-b border-transparent dark:border-gray-800">
      {isSelectionMode ? (
        <>
          <nav className="relative flex items-center justify-center pb-4 animate-in fade-in duration-200">
            <button onClick={onCancelSelection} className="absolute left-0 p-2 -ml-2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
              <X size={28} />
            </button>
            <div className="flex flex-col items-center">
              <h1 className="text-xl font-black text-gray-900 dark:text-white">{selectedCount}개 선택됨</h1>
            </div>
            <div className="absolute right-0 flex items-center gap-2">
              {selectedCount > 0 && (
                <>
                  <button onClick={onMarkSelectedAsRead} className="p-2 text-blue-600 dark:text-blue-400 text-sm font-bold hover:bg-blue-50 rounded-lg">
                    모두읽음
                  </button>
                  <button onClick={onDeleteSelected} className="p-2 text-red-500 text-sm font-bold hover:bg-red-50 rounded-lg">
                    삭제
                  </button>
                </>
              )}
            </div>
          </nav>
          <div className="pb-4 animate-in fade-in duration-200">
            <button onClick={onSelectAll} disabled={filteredNotificationsCount === 0} className="flex items-center gap-2 group disabled:opacity-50">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  isAllInFilterSelected ? 'border-blue-600' : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                {isAllInFilterSelected && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />}
              </div>
              <span className="text-sm font-bold text-gray-600 dark:text-gray-300">{isAllInFilterSelected ? '전체 해제' : '전체 선택'}</span>
            </button>
          </div>
        </>
      ) : (
        <>
          <nav className="flex items-center justify-between pb-4">
            <div className="flex items-center gap-2">
              <button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                <ChevronLeft size={28} />
              </button>
              <h1 className="text-lg font-black text-gray-900 dark:text-white">알림 센터</h1>
            </div>
            <button
              onClick={() => onFilterChange(activeFilter === 'unread' ? 'all' : 'unread')}
              className={`relative px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeFilter === 'unread' ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
              }`}
            >
              읽지 않음
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 text-[9px] font-black text-white bg-red-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-950">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </nav>
          <div className="pb-4">
            <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-[16px]">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onFilterChange(tab.id)}
                  className={`flex-1 py-2.5 rounded-[12px] text-[13px] font-bold transition-all ${
                    activeFilter === tab.id ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationHeader;
