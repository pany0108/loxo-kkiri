import React, { useCallback, useEffect, useState } from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { AlignLeft, Expand, ExternalLink, Loader2, MapPin, Minus, Plus, Shrink } from 'lucide-react';

import { LIBRARIES } from 'utils';
import AdvancedMarker from '../common/AdvancedMarker';

interface MeetingInfoCardProps {
  title: string;
  description?: string;
  location?: string;
}

/**
 * 약속 초대장 정보 카드 컴포넌트
 *
 * 약속의 제목, 설명, 장소 정보를 카드 형태로 표시합니다.
 * 장소 정보가 존재하는 경우, Google Maps API를 사용하여 해당 위치를 지도에 표시합니다.
 * 지도 확장/축소 및 줌 컨트롤 기능을 제공합니다.
 *
 * @component
 * @param {MeetingInfoCardProps} props
 * @param {string} props.title - 약속 제목
 * @param {string} [props.description] - 약속 설명 (옵션)
 * @param {string} [props.location] - 약속 장소 주소 (옵션)
 * @returns {JSX.Element} 렌더링된 약속 정보 카드
 */
const MeetingInfoCard: React.FC<MeetingInfoCardProps> = ({ title, description, location }) => {
  // --------------------------------------------------------------------------------
  // State Management
  // --------------------------------------------------------------------------------
  const [isMapLoading, setIsMapLoading] = useState(true); // 지도 로딩 상태
  const [zoom, setZoom] = useState(15); // 지도 줌 레벨
  const [isMapExpanded, setIsMapExpanded] = useState(false); // 지도 확장 여부
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null); // 지도 중심 좌표
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null); // Google Map 인스턴스

  // --------------------------------------------------------------------------------
  // Hooks (Google Maps API Loader)
  // --------------------------------------------------------------------------------
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: 'AIzaSyD-e_Nh3dflo_xgW4CcIySthA9i8L46rUk', // TODO: 환경변수로 분리 권장
    libraries: LIBRARIES,
    language: 'ko',
  });

  // --------------------------------------------------------------------------------
  // Effects
  // --------------------------------------------------------------------------------

  /**
   * 장소(location)가 변경되거나 API가 로드되었을 때 지오코딩을 수행하여 좌표를 설정합니다.
   */
  useEffect(() => {
    if (location && isLoaded && window.google) {
      setIsMapLoading(true);
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: location }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const { lat, lng } = results[0].geometry.location;
          setCenter({ lat: lat(), lng: lng() });
        }
        setIsMapLoading(false);
      });
    }
  }, [location, isLoaded]);

  // --------------------------------------------------------------------------------
  // Handlers
  // --------------------------------------------------------------------------------

  /**
   * 지도가 로드되었을 때 호출되는 콜백
   * @param {google.maps.Map} map - 로드된 지도 인스턴스
   */
  const onLoad = useCallback((map: google.maps.Map) => {
    setMapInstance(map);
  }, []);

  /**
   * 지도가 언마운트될 때 호출되는 콜백
   */
  const onUnmount = useCallback(() => {
    setMapInstance(null);
  }, []);

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
    if (location) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`, '_blank');
    }
  };

  // --------------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------------
  return (
    /* 카드 전체 컨테이너 */
    <div className="bg-gray-50 dark:bg-gray-800 rounded-3xl p-6 mb-10 border border-gray-100 dark:border-gray-700/50 shadow-card">
      {/* 상단 뱃지 영역 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-bold text-primary dark:text-blue-300 bg-primary/10 dark:bg-blue-900/50 px-2 py-1 rounded-md">INVITATION</span>
      </div>

      {/* 약속 제목 */}
      <h3 className="text-[19px] font-black text-main dark:text-white mb-3">{title}</h3>

      <div className="space-y-3">
        {/* 약속 설명 영역 */}
        <div className="flex items-start gap-2.5">
          <AlignLeft size={16} className="text-sub dark:text-gray-500 mt-0.5 shrink-0" />
          <p className="text-[14px] font-medium text-sub dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{description || '설명 없음'}</p>
        </div>

        {/* 장소 정보 및 지도 영역 (장소가 있을 때만 렌더링) */}
        {location && (
          <div className="space-y-3">
            {/* 장소 텍스트 표시 */}
            <div className="flex items-start gap-2.5">
              <MapPin size={16} className="text-sub dark:text-gray-500 mt-0.5 shrink-0" />
              <p className="text-[14px] font-medium text-sub dark:text-gray-300 leading-relaxed">{location}</p>
            </div>

            {/* 지도 컨테이너 */}
            <div className={`w-full ${isMapExpanded ? 'h-80' : 'h-40'} rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 relative bg-gray-100 dark:bg-gray-800 group transition-all duration-300 ease-in-out`}>
              {/* 로딩 상태 또는 데이터 준비 안 됨 */}
              {isMapLoading || !isLoaded || !center ? (
                <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center z-10">
                  <Loader2 className="text-gray-400 dark:text-gray-500 w-8 h-8 animate-spin opacity-50" />
                </div>
              ) : (
                /* Google Map 컴포넌트 */
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={center}
                  zoom={zoom}
                  onLoad={onLoad}
                  onUnmount={onUnmount}
                  options={{
                    disableDefaultUI: true, // 기본 UI 컨트롤 숨김
                    clickableIcons: true,
                    gestureHandling: 'greedy',
                    mapId: '3ee6e463dfd708817a22a110', // Map ID (스타일 적용)
                  }}
                >
                  {/* 커스텀 마커 (AdvancedMarkerElement 사용) */}
                  <AdvancedMarker position={center} map={mapInstance} title="약속 장소" />
                </GoogleMap>
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
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingInfoCard;
