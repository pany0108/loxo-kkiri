import React from 'react';
import { Send, AlignLeft, MapPin } from 'lucide-react';
import { FormInput, FormTextarea } from 'components';

interface MeetingInfoFormProps {
  title: string;
  description: string;
  location: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onLocationChange: (value: string) => void;
}

const MeetingInfoForm: React.FC<MeetingInfoFormProps> = ({ title, description, location, onTitleChange, onDescriptionChange, onLocationChange }) => {
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

      <FormInput label="장소 (선택)" icon={<MapPin size={20} />} value={location} onChange={(e) => onLocationChange(e.target.value)} placeholder="예: 강남역 2번 출구" />
    </section>
  );
};

export default MeetingInfoForm;
