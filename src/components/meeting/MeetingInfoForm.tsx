import { FormInput, FormTextarea } from 'components';
import { AlignLeft, Map, MapPin, Maximize2, Minus, Plus, Send } from 'lucide-react';
import React from 'react';

interface MeetingInfoFormProps {
  title: string;
  description: string;
  location: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onMapClick?: () => void;
}

/**
 * 약속 기본 정보 입력 폼 컴포넌트
 * - 제목, 메모, 장소를 입력받습니다.
 * @param {string} title - 약속 제목
 * @param {string} description - 약속 설명/메모
 * @param {string} location - 약속 장소
 * @param {function} onTitleChange - 제목 변경 핸들러
 * @param {function} onDescriptionChange - 설명 변경 핸들러
 * @param {function} onLocationChange - 장소 변경 핸들러
 * @param {function} [onMapClick] - 지도 버튼 클릭 핸들러
 */
const MeetingInfoForm: React.FC<MeetingInfoFormProps> = ({ title, description, location, onTitleChange, onDescriptionChange, onLocationChange, onMapClick }) => {
  const [isMapLoading, setIsMapLoading] = React.useState(true);
  const [zoom, setZoom] = React.useState(15);

  React.useEffect(() => {
    if (location) {
      setIsMapLoading(true);
    }
  }, [location, zoom]);

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoom((prev) => Math.min(prev + 1, 20));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoom((prev) => Math.max(prev - 1, 1));
  };

  return (
    <section className="space-y-4">
      <FormInput label="약속 제목" icon={<Send size={20} />} value={title} onChange={(e) => onTitleChange(e.target.value)} placeholder="예: 강남역 저녁 모임" />

      <FormTextarea
        label="메모 (선택)"
        icon={<AlignLeft size={20} />}
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        placeholder="장소나 준비물 등을 적어주세요"
        rows={3}
      />

      <FormInput
        label="장소 (선택)"
        icon={<MapPin size={20} />}
        value={location}
        onChange={(e) => onLocationChange(e.target.value)}
        placeholder="예: 강남역 2번 출구"
        rightContent={
          onMapClick && (
            <button
              type="button"
              onClick={onMapClick}
              className="p-2 text-sub dark:text-gray-500 hover:text-primary dark:hover:text-blue-400 transition-colors"
              title="지도에서 선택"
            >
              <Map size={18} />
            </button>
          )
        }
      />

      {location && (
        <div className="w-full h-48 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 relative bg-gray-100 dark:bg-gray-800 group">
          {isMapLoading && (
            <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center z-10">
              <MapPin className="text-gray-400 dark:text-gray-500 w-8 h-8 animate-bounce opacity-50" />
            </div>
          )}
          <iframe
            key={`${location}_${zoom}`}
            title="Location Preview"
            width="100%"
            height="100%"
            frameBorder="0"
            style={{ border: 0, opacity: isMapLoading ? 0 : 1, transition: 'opacity 0.3s ease-in-out' }}
            loading="lazy"
            src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyD-e_Nh3dflo_xgW4CcIySthA9i8L46rUk&q=${encodeURIComponent(location)}&zoom=${zoom}&language=ko`}
            allowFullScreen
            onLoad={() => setIsMapLoading(false)}
          />
          {onMapClick && (
            <div onClick={onMapClick} className="absolute inset-0 bg-black/0 hover:bg-black/5 transition-colors cursor-pointer flex items-center justify-center z-20">
              <div className="bg-white/90 dark:bg-gray-800/90 p-2 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity transform scale-90 group-hover:scale-100">
                <Maximize2 size={20} className="text-gray-600 dark:text-gray-300" />
              </div>
            </div>
          )}
          <div className="absolute bottom-2 right-2 flex flex-col gap-1 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1.5 bg-white/90 dark:bg-gray-800/90 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 transition-colors"
            >
              <Plus size={16} />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1.5 bg-white/90 dark:bg-gray-800/90 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 transition-colors"
            >
              <Minus size={16} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default MeetingInfoForm;
