import React, { useEffect, useRef } from 'react';

interface AdvancedMarkerProps {
  position: google.maps.LatLngLiteral;
  map: google.maps.Map | null;
  draggable?: boolean;
  onDragEnd?: (e: google.maps.MapMouseEvent) => void;
  title?: string;
  content?: string | Element | Text;
}

/**
 * google.maps.Marker 중단(Deprecated) 경고를 피하기 위한 커스텀 마커 컴포넌트
 * - 라이브러리에서 공식 지원하기 전까지 AdvancedMarkerElement를 직접 생성하여 사용합니다.
 */
const AdvancedMarker: React.FC<AdvancedMarkerProps> = ({ position, map, draggable, onDragEnd, title = '선택된 위치', content }) => {
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  useEffect(() => {
    if (!map || !position) return;

    const marker = new google.maps.marker.AdvancedMarkerElement({
      map,
      position,
      gmpDraggable: draggable,
      title,
    });
    markerRef.current = marker;

    if (onDragEnd) {
      marker.addListener('dragend', (event: any) => {
        const newPosition = marker.position as google.maps.LatLng;
        onDragEnd({
          latLng: newPosition,
          domEvent: event,
          stop: () => {},
        } as unknown as google.maps.MapMouseEvent);
      });
    }

    if (content) {
      const infoWindow = new google.maps.InfoWindow({
        content,
      });
      infoWindowRef.current = infoWindow;

      marker.addListener('click', () => {
        infoWindow.open({ anchor: marker, map });
      });
    }

    return () => {
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
        infoWindowRef.current = null;
      }
      marker.map = null;
      markerRef.current = null;
    };
  }, [map, position, draggable, onDragEnd, title, content]);

  return null;
};

export default AdvancedMarker;
