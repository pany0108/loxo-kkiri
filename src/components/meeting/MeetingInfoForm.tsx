import { FormInput, FormTextarea } from 'components';
import { AlignLeft, Map, MapPin, Send } from 'lucide-react';
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
    </section>
  );
};

export default MeetingInfoForm;
