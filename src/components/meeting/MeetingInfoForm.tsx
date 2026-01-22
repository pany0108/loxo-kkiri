import React, { useState, useEffect } from 'react';
import { AlignLeft, Expand, ExternalLink, Map, MapPin, Maximize2, Minus, Pencil, Plus, Send, Shrink } from 'lucide-react';

import { FormInput, FormTextarea } from 'components';

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
 * - 장소가 입력되면 임베디드 지도를 통해 위치를 미리 보여줍니다.
 *
 * @component
 * @param {MeetingInfoFormProps} props
 * @param {string} props.title - 약속 제목
 * @param {string} props.description - 약속 설명/메모
 * @param {string} props.location - 약속 장소
 * @param {function} props.onTitleChange - 제목 변경 핸들러
 * @param {function} props.onDescriptionChange - 설명 변경 핸들러
 * @param {function} props.onLocationChange - 장소 변경 핸들러
 * @param {function} [props.onMapClick] - 지도 클릭 핸들러 (지도 모달 열기 등)
 * @returns {JSX.Element} 약속 정보 입력 폼
 */
const MeetingInfoForm: React.FC<MeetingInfoFormProps> = ({ title, description, location, onTitleChange, onDescriptionChange, onLocationChange, onMapClick }) => {
  // --------------------------------------------------------------------------------
  // State Management
  // --------------------------------------------------------------------------------
  const [isMapLoading, setIsMapLoading] = useState(true); // 지도 로딩 상태
  const [zoom, setZoom] = useState(15); // 지도 줌 레벨
  const [isMapExpanded, setIsMapExpanded] = useState(false); // 지도 확장 여부

  // --------------------------------------------------------------------------------
  // Effects
  // --------------------------------------------------------------------------------

  /**
   * 장소나 줌 레벨이 변경되면 지도 로딩 상태를 초기화합니다.
   */
  useEffect(() => {
    if (location) {
      setIsMapLoading(true);
    }
  }, [location, zoom]);

  // --------------------------------------------------------------------------------
  // Handlers
  // --------------------------------------------------------------------------------

  /**
   * 지도 줌 인 핸들러
   * @param {React.MouseEvent} e - 마우스 이벤트
   */
  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoom((prev) => Math.min(prev + 1, 20));
  };

  /**
   * 지도 줌 아웃 핸들러
   * @param {React.MouseEvent} e - 마우스 이벤트
   */
  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoom((prev) => Math.max(prev - 1, 1));
  };

  /**
   * 구글 지도 외부 링크 열기 핸들러
   * @param {React.MouseEvent} e - 마우스 이벤트
   */
  const handleOpenGoogleMaps = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`, '_blank');
  };

  // --------------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------------
  return (
    <section className="space-y-4">
      {/* 제목 입력 필드 */}
      <div>
        <div className="flex items-center gap-2 px-1 mb-2">
          <Pencil size={18} className="text-sub dark:text-gray-500" />
          <label className="text-caption">어떤 약속인가요?</label>
        </div>
        <FormInput
          icon={<Send size={20} />}
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="예: 강남역 저녁 모임"
        />
      </div>

      {/* 설명(메모) 입력 필드 */}
      <div>
        <div className="flex items-center gap-2 px-1 mb-2">
          <AlignLeft size={18} className="text-sub dark:text-gray-500" />
          <label className="text-caption">메모를 남겨주세요</label>
        </div>
        <FormTextarea
          icon={<AlignLeft size={20} />}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="장소나 준비물 등을 적어주세요"
          rows={3}
        />
      </div>

      {/* 장소 입력 필드 */}
      <div>
        <div className="flex items-center gap-2 px-1 mb-2">
          <MapPin size={18} className="text-sub dark:text-gray-500" />
          <label className="text-caption">어디서 만나나요?</label>
        </div>
        <FormInput
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
      </div>

      {/* 지도 미리보기 영역 (장소가 있을 때만 표시) */}
      {location && (
        <div className={`w-full ${isMapExpanded ? 'h-96' : 'h-48'} rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 relative bg-gray-100 dark:bg-gray-800 group transition-all duration-300 ease-in-out`}>
          {/* 로딩 상태 표시 */}
          {isMapLoading && (
            <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center z-10">
              <MapPin className="text-gray-400 dark:text-gray-500 w-8 h-8 animate-bounce opacity-50" />
            </div>
          )}

          {/* Google Maps Embed API (iframe) */}
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

          {/* 지도 클릭 오버레이 (확대 아이콘) */}
          {onMapClick && (
            <div onClick={onMapClick} className="absolute inset-0 bg-black/0 hover:bg-black/5 transition-colors cursor-pointer flex items-center justify-center z-20">
              <div className="bg-white/90 dark:bg-gray-800/90 p-2 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity transform scale-90 group-hover:scale-100">
                <Maximize2 size={20} className="text-gray-600 dark:text-gray-300" />
              </div>
            </div>
          )}

          {/* 구글 지도 외부 링크 버튼 (좌측 상단) */}
          <button
            type="button"
            onClick={handleOpenGoogleMaps}
            className="absolute top-2 left-2 p-1.5 bg-white/90 dark:bg-gray-800/90 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 transition-colors z-30"
            title="구글 지도에서 보기"
          >
            <ExternalLink size={16} />
          </button>

          {/* 지도 컨트롤 버튼 그룹 (우측 하단) */}
          <div className="absolute bottom-2 right-2 flex flex-col gap-1 z-30">
            {/* 확장/축소 토글 버튼 */}
            <button
              type="button"
              onClick={() => setIsMapExpanded(!isMapExpanded)}
              className="p-1.5 bg-white/90 dark:bg-gray-800/90 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 transition-colors"
              title={isMapExpanded ? '지도 축소' : '지도 확대'}
            >
              {isMapExpanded ? <Shrink size={16} /> : <Expand size={16} />}
            </button>
            {/* 줌 인 버튼 */}
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1.5 bg-white/90 dark:bg-gray-800/90 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 transition-colors"
              title="줌 인"
            >
              <Plus size={16} />
            </button>
            {/* 줌 아웃 버튼 */}
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1.5 bg-white/90 dark:bg-gray-800/90 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 transition-colors"
              title="줌 아웃"
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
