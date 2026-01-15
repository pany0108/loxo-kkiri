import React from 'react';
import { Check } from 'lucide-react';

interface FormCheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

const FormCheckbox: React.FC<FormCheckboxProps> = ({ label, checked, className, ...props }) => {
  return (
    <label className={`flex items-center gap-2 cursor-pointer group ${className || ''}`}>
      <div className="relative">
        <input type="checkbox" className="sr-only" checked={checked} {...props} />
        <div
          className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${
            checked ? 'bg-primary border-primary' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 group-hover:border-primary'
          }`}
        >
          {checked && <Check size={14} className="text-white" strokeWidth={4} />}
        </div>
      </div>
      <span className={`text-sm font-bold transition-colors ${checked ? 'text-main dark:text-gray-200' : 'text-sub'}`}>{label}</span>
    </label>
  );
};

export default FormCheckbox;
