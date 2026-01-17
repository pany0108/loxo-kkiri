import React, { useState } from 'react';
import { AlertCircle, Eye, EyeOff, X } from 'lucide-react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactElement;
  rightContent?: React.ReactNode;
  label?: string;
  error?: string;
  success?: boolean;
  containerClassName?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  onClear?: () => void;
}

const FormInput: React.FC<FormInputProps> = ({ icon, rightContent, label, error, success, containerClassName, inputRef, onClear, ...props }) => {
  const [showPassword, setShowPassword] = useState(false);
  const hasError = !!error;
  const isPassword = props.type === 'password';

  const borderClass = hasError ? 'border-red-400' : success ? 'border-emerald-400' : 'border-transparent focus-within:border-primary';

  const iconColorClass = hasError ? 'text-red-400' : success ? 'text-emerald-500' : 'text-sub dark:text-gray-600 group-focus-within:text-primary';

  // `type="password"`일 경우, props와 rightContent를 동적으로 설정합니다.
  const inputProps = { ...props };
  let finalRightContent = rightContent;

  if (isPassword) {
    inputProps.type = showPassword ? 'text' : 'password';
    inputProps.autoCapitalize = 'none';
    inputProps.autoCorrect = 'off';
    inputProps.spellCheck = 'false';

    finalRightContent = (
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="text-sub dark:text-gray-500 hover:text-main dark:hover:text-gray-400 transition-colors"
        aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
      >
        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    );
  }

  const hasValue = props.value !== undefined && props.value !== null && String(props.value).length > 0;
  const showClear = !!onClear && hasValue && !props.disabled && !props.readOnly;

  return (
    <div className={`group relative ${containerClassName || ''}`}>
      {label && <label className="block text-caption ml-1 mb-2">{label}</label>}
      <div className={`flex items-center h-[60px] bg-gray-50 dark:bg-gray-800/50 rounded-xl px-5 transition-all duration-300 border-2 ${borderClass}`}>
        {icon && <div className="mr-4">{React.cloneElement(icon, { className: `${iconColorClass} ${icon.props.className || ''}` })}</div>}
        <input
          ref={inputRef}
          {...inputProps}
          className={`bg-transparent border-none outline-none w-full h-full text-body placeholder:text-sub dark:placeholder:text-gray-500 ${props.className || ''}`}
        />
        {(showClear || finalRightContent) && (
          <div className="flex items-center gap-2 ml-2">
            {showClear && (
              <button
                type="button"
                onClick={onClear}
                className="text-sub hover:text-main dark:text-gray-500 dark:hover:text-gray-300 transition-colors p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                aria-label="입력 초기화"
                tabIndex={-1}
              >
                <X size={16} />
              </button>
            )}
            {finalRightContent}
          </div>
        )}
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

export default FormInput;
