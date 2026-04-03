import { forwardRef, SelectHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';
import { formControlClassName } from '../forms/controlStyles';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(formControlClassName, className)} {...props}>
      {children}
    </select>
  ),
);

Select.displayName = 'Select';
