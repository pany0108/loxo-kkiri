import React, { useEffect, useState } from 'react';
import { MapPin, Search, X } from 'lucide-react';

interface LocationSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (location: string) => void;
  initialLocation?: string;
}

/**
 * 장소 선택 모달 컴포넌트
 * - 구글 맵을 사용하여 장소를 검색하고 선택할 수 있습니다.
 */
const LocationSelectModal: React.FC<LocationSelectModalProps> = ({ isOpen, onClose, onSelect, initialLocation = '' }) => {
  const [keyword, setKeyword] = useState(initialLocation);
  const [mapUrl, setMapUrl] = useState('');

  // 모달 열릴 때 초기값 설정 및 지도 업데이트
  useEffect(() => {
    if (isOpen) {
      setKeyword(initialLocation);
      if (initialLocation) {
        updateMap(initialLocation);
      } else {
        setMapUrl('');
      }
    }
  }, [isOpen, initialLocation]);

  /** 지도 URL 업데이트 함수 */
  const updateMap = (query: string) => {
    if (!query) return;
    // 구글 맵 임베드 (API 키 없이 사용하는 iframe 방식)
    setMapUrl(`https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`);
  };

  /** 검색 핸들러 */
  const handleSearch = () => {
    updateMap(keyword);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[70vh] max-h-[600px] animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3 shrink-0">
          <div className="flex-1 flex items-center bg-gray-100 dark:bg-gray-700 rounded-xl px-4 h-12 transition-all focus-within:ring-2 focus-within:ring-primary/50">
            <Search size={20} className="text-gray-400 mr-2 shrink-0" />
            <input
              className="flex-1 bg-transparent outline-none text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400"
              placeholder="장소 검색 (예: 강남역)"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              autoFocus
            />
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 bg-gray-100 dark:bg-gray-900 relative w-full">
          {mapUrl ? (
            <iframe title="map" width="100%" height="100%" src={mapUrl} frameBorder="0" scrolling="no" marginHeight={0} marginWidth={0} className="w-full h-full" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 dark:text-gray-600">
              <MapPin size={48} className="mb-3 opacity-20" />
              <p className="text-sm font-bold">장소를 검색하여 지도를 확인하세요</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-gray-700 shrink-0 bg-white dark:bg-gray-800">
          <button
            onClick={() => {
              if (keyword) onSelect(keyword);
              else onClose();
            }}
            className="w-full py-4 bg-primary text-white font-bold rounded-xl active:scale-95 transition-all shadow-lg shadow-primary/20 hover:bg-primary/90"
          >
            {keyword ? `''(으)로 설정` : '취소'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationSelectModal;
