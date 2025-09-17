'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OptionProps {
  value: string;
  children: React.ReactNode;
}

interface SelectProps extends React.PropsWithChildren {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function Select({ 
  children, 
  value, 
  onValueChange, 
  placeholder = 'Select...',
  disabled = false,
  className 
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState(placeholder);
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (value) {
      // Find the option text for the current value
      const option = selectRef.current?.querySelector(`[data-value="${value}"]`);
      if (option) {
        setDisplayValue(option.textContent || value);
      } else {
        setDisplayValue(value);
      }
    } else {
      setDisplayValue(placeholder);
    }
  }, [value, placeholder, children]);

  const handleSelect = (selectedValue: string, selectedText: string) => {
    onValueChange?.(selectedValue);
    setDisplayValue(selectedText);
    setIsOpen(false);
  };

  return (
    <div ref={selectRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm",
          "hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
          disabled && "opacity-50 cursor-not-allowed",
          isOpen && "ring-2 ring-blue-500 border-blue-500"
        )}
      >
        <span className={cn(
          "truncate",
          (!value || displayValue === placeholder) && "text-gray-500"
        )}>
          {displayValue}
        </span>
        <ChevronDown 
          className={cn(
            "h-4 w-4 text-gray-400 transition-transform", 
            isOpen && "rotate-180"
          )} 
        />
      </button>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          <div className="py-1 max-h-60 overflow-auto">
            {React.Children.map(children, (child) => {
              if (React.isValidElement<OptionProps>(child) && child.type === 'option') {
                const optionValue = child.props.value;
                const optionText = typeof child.props.children === 'string' 
                  ? child.props.children 
                  : child.props.value;
                return (
                  <button
                    key={optionValue}
                    type="button"
                    onClick={() => handleSelect(optionValue, optionText)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none",
                      value === optionValue && "bg-blue-50 text-blue-600"
                    )}
                    data-value={optionValue}
                  >
                    {optionText}
                  </button>
                );
              }
              return child;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Legacy components for backward compatibility
export function SelectTrigger({ children, className = '' }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={`border rounded px-2 py-2 ${className}`}>{children}</div>;
}

export function SelectValue({ placeholder }: { placeholder?: string }) { 
  return <span>{placeholder}</span>; 
}

export function SelectContent({ children, className = '' }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={`border rounded p-2 bg-white shadow ${className}`}>{children}</div>;
}

export function SelectItem({ children, value, onClick }: React.PropsWithChildren<{ value: string; onClick?: () => void }>) {
  return <div onClick={onClick} data-value={value} className="px-2 py-1 hover:bg-gray-100 cursor-pointer text-sm">{children}</div>;
}

export default Select;