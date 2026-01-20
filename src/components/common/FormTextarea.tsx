import React from 'react';
import { AlertCircle } from 'lucide-react';

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  icon?: React.ReactElement;
  label?: string;
  error?: string;
  success?: boolean;
  containerClassName?: string;
  textareaRef?: React.Ref<HTMLTextAreaElement>;
}

/**
 * 커스텀 텍스트 영역(Textarea) 컴포넌트
 * - 아이콘, 라벨, 에러 메시지, 성공 상태 등을 지원합니다.
 *
 * @param {FormTextareaProps} props
 * @returns {JSX.Element}
 */
const FormTextarea: React.FC<FormTextareaProps> = ({ icon, label, error, success, containerClassName, textareaRef, className, ...props }) => {
  const hasError = !!error;

  const borderClass = hasError ? 'border-red-400' : success ? 'border-emerald-400' : 'border-transparent focus-within:border-primary';

  const iconColorClass = hasError ? 'text-red-400' : success ? 'text-emerald-500' : 'text-sub dark:text-gray-600 group-focus-within:text-primary';

  return (
    <div className={`group relative ${containerClassName || ''}`}>
      {label && <label className="block text-caption ml-1 mb-2">{label}</label>}
      <div className={`flex items-start bg-gray-50 dark:bg-gray-800/50 rounded-xl px-5 py-4 transition-all duration-300 border-2 ${borderClass}`}>
        {icon && (
          <div className="mr-4 mt-0.5">
            {React.cloneElement(icon, {
              className: `${iconColorClass} ${icon.props.className || ''}`,
            })}
          </div>
        )}
        <textarea
          ref={textareaRef}
          className={`bg-transparent border-none outline-none w-full text-body placeholder:text-sub dark:placeholder:text-gray-500 resize-none ${className || ''}`}
          {...props}
        />
      </div>
      {hasError && (
        <div className="flex items-center gap-1 ml-4 mt-1.5 animate-in fade-in duration-200">
          <AlertCircle size={12} className="text-red-500" />
          <p className="text-[11px] text-red-500 font-bold">{error}</p>
        </div>
      )}
    </div>
  );
};

export default FormTextarea;
