import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Crosshair, Loader2, MapPin, Search, X } from 'lucide-react';
import { GoogleMap, useJsApiLoader, MarkerF } from '@react-google-maps/api';

// 구글 맵 스타일
const containerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: 37.5665, // 서울 시청
  lng: 126.978,
};

// "places" 라이브러리 필수
const LIBRARIES: ('places' | 'geometry' | 'drawing' | 'visualization')[] = ['places'];

interface LocationSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (location: string) => void;
  initialLocation?: string;
}

const LocationSelectModal: React.FC<LocationSelectModalProps> = ({ isOpen, onClose, onSelect, initialLocation = '' }) => {
  const [keyword, setKeyword] = useState(initialLocation);
  const [center, setCenter] = useState(defaultCenter);
  const [markerPosition, setMarkerPosition] = useState(defaultCenter);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false); // 검색 로딩
  const [isLocating, setIsLocating] = useState(false); // GPS 로딩

  // API 키 로드
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: 'AIzaSyD-e_Nh3dflo_xgW4CcIySthA9i8L46rUk', // 본인의 API 키 유지
    libraries: LIBRARIES,
    language: 'ko',
  });

  const mapRef = useRef<google.maps.Map | null>(null);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  // -----------------------------------------------------------
  // 1. 현재 위치 가져오는 함수 (공통 로직)
  // isManual: 버튼을 눌러서 실행했는지 여부 (자동 실행 시 에러 알림 방지용)
  // -----------------------------------------------------------
  const fetchCurrentLocation = useCallback((isManual = false) => {
    if (!navigator.geolocation) {
      if (isManual) alert('위치 정보를 사용할 수 없습니다.');
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newPos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCenter(newPos);
        setMarkerPosition(newPos);

        // 좌표 -> 주소 변환 (역 지오코딩)
        // 구글 맵 API가 로드된 상태여야 Geocoder 사용 가능
        if (window.google) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: newPos }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
              setKeyword(results[0].formatted_address);
            }
          });
        }
        setIsLocating(false);
      },
      (error) => {
        console.error('Location Error:', error);
        if (isManual) {
          // 버튼 클릭시에만 에러 메시지 표시
          alert('위치 정보를 가져오는 데 실패했습니다. 브라우저의 위치 권한을 확인해주세요.');
        }
        setIsLocating(false);
      },
      { enableHighAccuracy: true }, // 정확도 높임
    );
  }, []);

  // -----------------------------------------------------------
  // 2. 모달 열릴 때 초기화 및 위치 자동 요청
  // -----------------------------------------------------------
  useEffect(() => {
    if (isOpen) {
      if (initialLocation) {
        setKeyword(initialLocation);
        // 초기 위치가 있으면 검색 실행 로직을 여기에 추가하거나,
        // handleSearch를 useEffect 밖으로 빼서 호출할 수도 있습니다.
      } else {
        // ★ 초기 위치가 없으면 내 위치 자동 요청 ★
        fetchCurrentLocation(false);
      }
    }
  }, [isOpen, initialLocation, fetchCurrentLocation]);

  /**
   * 검색 핸들러
   */
  const handleSearch = async () => {
    if (!keyword || !mapRef.current || !window.google) return;

    setIsLoadingLocation(true);

    const service = new window.google.maps.places.PlacesService(mapRef.current);
    const request = {
      query: keyword,
      fields: ['name', 'geometry', 'formatted_address'],
    };

    service.findPlaceFromQuery(request, (results, status) => {
      setIsLoadingLocation(false);
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results && results[0]) {
        const place = results[0];
        const location = place.geometry?.location;

        if (location) {
          const newPos = { lat: location.lat(), lng: location.lng() };
          setCenter(newPos);
          setMarkerPosition(newPos);
          setKeyword(place.name || place.formatted_address || keyword);
        }
      } else {
        fallbackToGeocoder();
      }
    });
  };

  /** 백업 검색 핸들러 */
  const fallbackToGeocoder = () => {
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: keyword }, (results, status) => {
      setIsLoadingLocation(false);
      if (status === 'OK' && results && results[0]) {
        const { lat, lng } = results[0].geometry.location;
        const newPos = { lat: lat(), lng: lng() };
        setCenter(newPos);
        setMarkerPosition(newPos);
        setKeyword(results[0].formatted_address);
      } else {
        alert('장소를 찾을 수 없습니다.');
      }
    });
  };

  /** 지도 클릭 핸들러 */
  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng || !window.google || !mapRef.current) return;

    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    const newPos = { lat, lng };
    setMarkerPosition(newPos);

    // @ts-ignore
    const placeId = e.placeId;

    if (placeId) {
      const service = new window.google.maps.places.PlacesService(mapRef.current);
      service.getDetails({ placeId: placeId }, (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place && place.name) {
          setKeyword(place.name);
        }
      });
    } else {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: newPos }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          setKeyword(results[0].formatted_address);
        }
      });
    }
  }, []);

  /** 마커 드래그 종료 핸들러 */
  const handleMarkerDragEnd = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng || !window.google) return;

    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    const newPos = { lat, lng };
    setMarkerPosition(newPos);

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: newPos }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        setKeyword(results[0].formatted_address);
      }
    });
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-white dark:bg-gray-900 animate-in fade-in duration-200 flex flex-col">
      {/* 상단 검색바 */}
      <div className="p-4 pt-[calc(1rem+env(safe-area-inset-top))] border-b border-gray-100 dark:border-gray-700 flex items-center gap-3 shrink-0 bg-white dark:bg-gray-900 z-10">
        <div className="flex-1 flex items-center bg-gray-100 dark:bg-gray-700 rounded-xl px-4 h-12 transition-all focus-within:ring-2 focus-within:ring-blue-500/50">
          <Search size={20} className="text-gray-400 mr-2 shrink-0" />
          <input
            className="flex-1 bg-transparent outline-none text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400"
            placeholder="장소 검색 (예: 롯데월드)"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            autoFocus
          />
          {isLoadingLocation && <Loader2 size={16} className="animate-spin text-blue-500" />}
        </div>
        <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
          <X size={24} />
        </button>
      </div>

      {/* 지도 영역 */}
      <div className="flex-1 bg-gray-100 dark:bg-gray-900 relative w-full min-h-0">
        {isLoaded ? (
          <>
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={center}
              zoom={15}
              onLoad={onLoad}
              onUnmount={onUnmount}
              onClick={handleMapClick}
              options={{
                disableDefaultUI: false,
                zoomControl: true,
                streetViewControl: false,
                mapTypeControl: false,
                clickableIcons: true,
                gestureHandling: 'greedy', // 한 손가락 조작 허용
              }}
            >
              <MarkerF position={markerPosition} draggable={true} onDragEnd={handleMarkerDragEnd} />
            </GoogleMap>

            {/* 내 위치 버튼 (수동 요청) */}
            <button
              onClick={() => fetchCurrentLocation(true)}
              disabled={isLocating}
              className="absolute bottom-6 right-4 p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors z-10"
              title="내 위치로 이동"
            >
              {isLocating ? <Loader2 size={24} className="animate-spin" /> : <Crosshair size={24} />}
            </button>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 dark:text-gray-600">
            <Loader2 size={48} className="mb-3 animate-spin text-blue-500 opacity-50" />
            <p className="text-sm font-bold">지도를 불러오는 중...</p>
          </div>
        )}

        {isLoaded && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-gray-800/90 px-4 py-2 rounded-full shadow-lg text-xs font-medium z-10 pointer-events-none text-gray-600 dark:text-gray-300 whitespace-nowrap">
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              건물을 클릭하면 이름이, 빈 곳을 누르면 주소가 입력됩니다
            </span>
          </div>
        )}
      </div>

      {/* 하단 버튼 */}
      <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-gray-100 dark:border-gray-700 shrink-0 bg-white dark:bg-gray-800 z-10">
        <button
          onClick={() => {
            if (keyword) onSelect(keyword);
            else onClose();
          }}
          className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl active:scale-95 transition-all shadow-lg shadow-blue-600/20 hover:bg-blue-700 flex justify-center items-center gap-2"
        >
          <MapPin size={18} />
          {keyword ? `'${keyword}'(으)로 설정` : '취소'}
        </button>
      </div>
    </div>
  );
};

export default LocationSelectModal;
