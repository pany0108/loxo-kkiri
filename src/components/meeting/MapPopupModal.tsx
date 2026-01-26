import React, { useCallback, useEffect, useState } from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { Loader2, X } from 'lucide-react';

import { AdvancedMarker } from 'components';
import { LIBRARIES } from 'utils';

interface MapPopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: string;
}

/**
 * 지도 팝업 모달 컴포넌트
 * - 주소를 받아 지오코딩 후 지도에 마커를 표시합니다.
 * @param {boolean} isOpen - 모달 열림 여부
 * @param {function} onClose - 모달 닫기 핸들러
 * @param {string} location - 표시할 주소
 */
const MapPopupModal: React.FC<MapPopupModalProps> = ({ isOpen, onClose, location }) => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script-popup',
    googleMapsApiKey: 'AIzaSyD-e_Nh3dflo_xgW4CcIySthA9i8L46rUk', // TODO: 환경변수로 분리
    libraries: LIBRARIES,
    language: 'ko',
  });

  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);

  useEffect(() => {
    if (location && isLoaded && window.google) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: location }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const { lat, lng } = results[0].geometry.location;
          setCenter({ lat: lat(), lng: lng() });
        }
      });
    }
  }, [location, isLoaded]);

  const onLoad = useCallback((map: google.maps.Map) => setMapInstance(map), []);
  const onUnmount = useCallback(() => setMapInstance(null), []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-lg font-black text-main dark:text-white truncate pr-4">{location}</h4>
          <button onClick={onClose} className="text-sub dark:text-gray-500 hover:text-main dark:hover:text-gray-300 shrink-0">
            <X size={20} />
          </button>
        </div>
        <div className="h-80 w-full rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-700">
          {isLoaded && center ? (
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={center}
              zoom={16}
              onLoad={onLoad}
              onUnmount={onUnmount}
              options={{ disableDefaultUI: true, mapId: '3ee6e463dfd708817a22a110' }}
            >
              <AdvancedMarker position={center} map={mapInstance} title={location} />
            </GoogleMap>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-full mt-6 py-3 bg-gray-100 dark:bg-gray-700 text-main dark:text-gray-200 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          닫기
        </button>
      </div>
    </div>
  );
};

export default MapPopupModal;
