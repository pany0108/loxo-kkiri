import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { Crosshair, Loader2, MapPin, Search, X } from 'lucide-react';

import { AdvancedMarker } from 'components';
import { LIBRARIES } from 'utils';

/** 구글 맵 컨테이너 스타일 */
const containerStyle = {
  width: '100%',
  height: '100%',
};

/** 기본 지도 중심 좌표 (서울 시청) */
const defaultCenter = {
  lat: 37.5665, // 서울 시청
  lng: 126.978,
};

interface LocationSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (location: string) => void;
  initialLocation?: string;
}

/**
 * 위치 선택 모달 컴포넌트
 * - Google Maps를 사용하여 장소를 검색하거나 지도에서 직접 선택할 수 있습니다.
 * - 현재 위치(Geolocation) 찾기 기능을 제공합니다.
 *
 * @component
 * @param {LocationSelectModalProps} props
 * @param {boolean} props.isOpen - 모달 열림 여부
 * @param {function} props.onClose - 모달 닫기 핸들러
 * @param {function} props.onSelect - 위치 선택 완료 핸들러 (주소 문자열 반환)
 * @param {string} [props.initialLocation] - 초기 검색어 또는 주소
 * @returns {JSX.Element | null} 위치 선택 모달
 */
const LocationSelectModal: React.FC<LocationSelectModalProps> = ({ isOpen, onClose, onSelect, initialLocation = '' }) => {
  // --------------------------------------------------------------------------------
  // State Management
  // --------------------------------------------------------------------------------
  const [keyword, setKeyword] = useState(initialLocation); // 검색어 상태
  const [center, setCenter] = useState(defaultCenter); // 지도 중심 좌표
  const [markerPosition, setMarkerPosition] = useState(defaultCenter); // 마커 위치 좌표
  const [isLoadingLocation, setIsLoadingLocation] = useState(false); // 장소 검색 로딩 상태
  const [isLocating, setIsLocating] = useState(false); // 현재 위치(GPS) 로딩 상태
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null); // Google Map 인스턴스

  // --------------------------------------------------------------------------------
  // Hooks & Refs
  // --------------------------------------------------------------------------------
  const mapRef = useRef<google.maps.Map | null>(null);

  // Google Maps API 로드
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: 'AIzaSyD-e_Nh3dflo_xgW4CcIySthA9i8L46rUk',
    libraries: LIBRARIES,
    language: 'ko',
  });

  // --------------------------------------------------------------------------------
  // Handlers (Helper Functions)
  // --------------------------------------------------------------------------------

  /**
   * 현재 위치(Geolocation)를 가져와 지도 중심과 마커를 이동시킵니다.
   * @param {boolean} isManual - 사용자 버튼 클릭에 의한 요청인지 여부 (에러 알림 제어용)
   */
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
          alert('위치 정보를 가져오는 데 실패했습니다. 브라우저의 위치 권한을 확인해주세요.');
        }
        setIsLocating(false);
      },
      { enableHighAccuracy: true }, // 정확도 높임
    );
  }, []);

  /**
   * Geocoder를 사용한 백업 검색 핸들러 (Place API 실패 시 사용)
   */
  const fallbackToGeocoder = useCallback(() => {
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
  }, [keyword]);

  // --------------------------------------------------------------------------------
  // Effects
  // --------------------------------------------------------------------------------

  // 모달 열릴 때 초기화 및 위치 자동 요청
  useEffect(() => {
    if (isOpen) {
      if (initialLocation) {
        setKeyword(initialLocation);
      } else {
        // 초기 위치가 없으면 내 위치 자동 요청
        fetchCurrentLocation(false);
      }
    }
  }, [isOpen, initialLocation, fetchCurrentLocation]);

  // --------------------------------------------------------------------------------
  // Handlers (Map Interaction)
  // --------------------------------------------------------------------------------

  /** 지도 로드 완료 핸들러 */
  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setMapInstance(map);
  }, []);

  /** 지도 언마운트 핸들러 */
  const onUnmount = useCallback(() => {
    mapRef.current = null;
    setMapInstance(null);
  }, []);

  /**
   * 장소 검색 핸들러
   * - Google Places API (New)를 우선 시도하고, 실패 시 Legacy API 또는 Geocoder로 폴백합니다.
   */
  const handleSearch = async () => {
    if (!keyword || !mapRef.current || !window.google) return;

    setIsLoadingLocation(true);

    // 1. Google Maps Places API (New) 시도
    // @ts-ignore: google.maps.places.Place 타입 정의가 없을 수 있음
    if (window.google.maps.places?.Place?.searchByText) {
      try {
        // @ts-ignore
        const { places } = await window.google.maps.places.Place.searchByText({
          textQuery: keyword,
          fields: ['displayName', 'location', 'formattedAddress'],
        });

        if (places && places.length > 0) {
          const place = places[0];
          if (place.location) {
            const newPos = { lat: place.location.lat(), lng: place.location.lng() };
            setCenter(newPos);
            setMarkerPosition(newPos);
            setKeyword(place.displayName || place.formattedAddress || keyword);
          }
        } else {
          fallbackToGeocoder();
        }
      } catch (error) {
        console.error('Place search failed:', error);
        fallbackToGeocoder();
      } finally {
        setIsLoadingLocation(false);
      }
      return;
    }

    // 2. Fallback: Legacy PlacesService (구형 브라우저/API 버전 대응)
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

  /**
   * 지도 클릭 핸들러
   * - 클릭한 위치로 마커를 이동하고, 해당 위치의 장소 정보를 가져옵니다.
   * @param {google.maps.MapMouseEvent} e - 지도 클릭 이벤트 객체
   */
  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng || !window.google || !mapRef.current) return;

    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    const newPos = { lat, lng };
    setMarkerPosition(newPos);

    // @ts-ignore
    const placeId = e.placeId;

    if (placeId) {
      // POI(장소 아이콘) 클릭 시 상세 정보 조회
      // @ts-ignore
      if (window.google.maps.places?.Place) {
        // @ts-ignore
        const place = new window.google.maps.places.Place({ id: placeId });
        place
          .fetchFields({ fields: ['displayName'] })
          .then(() => {
            if (place.displayName) {
              setKeyword(place.displayName);
            }
          })
          .catch((err: any) => {
            console.error('Failed to fetch place details:', err);
            fallbackToGeocoder();
          });
      } else {
        const service = new window.google.maps.places.PlacesService(mapRef.current);
        service.getDetails({ placeId: placeId }, (place, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && place && place.name) {
            setKeyword(place.name);
          }
        });
      }
    } else {
      // 일반 지도 영역 클릭 시 역지오코딩
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: newPos }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          setKeyword(results[0].formatted_address);
        }
      });
    }
  }, [fallbackToGeocoder]);

  /**
   * 마커 드래그 종료 핸들러
   * - 드래그한 위치로 마커를 업데이트하고 주소를 가져옵니다.
   * @param {google.maps.MapMouseEvent} e - 마커 드래그 이벤트 객체
   */
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

  // --------------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------------
  if (!isOpen) return null;

  return (
    /* 모달 전체 컨테이너 */
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
                disableDefaultUI: true,
                clickableIcons: true,
                gestureHandling: 'greedy', // 한 손가락 조작 허용
                mapId: '3ee6e463dfd708817a22a110',
              }}
            >
              <AdvancedMarker position={markerPosition} map={mapInstance} draggable={true} onDragEnd={handleMarkerDragEnd} />
            </GoogleMap>

            {/* 내 위치 버튼 (수동 요청) */}
            <button
              onClick={() => fetchCurrentLocation(true)}
              disabled={isLocating}
              className="absolute bottom-[125px] right-[10px] p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors z-10"
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
