import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';
import { formControlClassName } from '../forms/controlStyles';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, autoComplete = 'off', autoCorrect = 'off', spellCheck = false, ...props }, ref) => (
    <input
      ref={ref}
      autoComplete={autoComplete}
      autoCorrect={autoCorrect}
      spellCheck={spellCheck}
      className={cn(formControlClassName, className)}
      {...props}
    />
  ),
);

Input.displayName = 'Input';
