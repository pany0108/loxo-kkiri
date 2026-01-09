import React, { useState } from 'react';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactElement;
  rightContent?: React.ReactNode;
  label?: string;
  error?: string;
  success?: boolean;
  containerClassName?: string;
  inputRef?: React.Ref<HTMLInputElement>;
}

const FormInput: React.FC<FormInputProps> = ({ icon, rightContent, label, error, success, containerClassName, inputRef, ...props }) => {
  const [showPassword, setShowPassword] = useState(false);
  const hasError = !!error;
  const isPassword = props.type === 'password';

  const borderClass = hasError
    ? 'border-red-400 bg-white dark:bg-gray-800'
    : success
    ? 'border-emerald-400 bg-white dark:bg-gray-800'
    : 'border-transparent focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-gray-800';

  const iconColorClass = hasError ? 'text-red-400' : success ? 'text-emerald-500' : 'text-gray-300 dark:text-gray-600 group-focus-within:text-blue-600';

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
        className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 transition-colors"
        aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
      >
        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    );
  }

  return (
    <div className={`group relative ${containerClassName || ''}`}>
      {label && <label className="block text-[13px] font-black text-gray-400 dark:text-gray-500 ml-1 mb-2">{label}</label>}
      <div className={`flex items-center h-[60px] bg-gray-50 dark:bg-gray-800/50 rounded-[20px] px-5 transition-all duration-300 ${borderClass}`}>
        {icon && <div className="mr-4">{React.cloneElement(icon, { className: `${iconColorClass} ${icon.props.className || ''}` })}</div>}
        <input
          ref={inputRef}
          {...inputProps}
          className={`bg-transparent border-none outline-none w-full h-full text-[15px] font-bold text-gray-800 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-500 ${
            props.className || ''
          }`}
        />
        {finalRightContent && <div className="ml-2">{finalRightContent}</div>}
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
