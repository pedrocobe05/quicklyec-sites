import { forwardRef, TextareaHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';
import { formControlClassName } from '../forms/controlStyles';

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, autoComplete = 'off', autoCorrect = 'off', spellCheck = false, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      formControlClassName,
      'h-auto min-h-[120px] resize-y py-3 leading-6',
      className,
    )}
    autoComplete={autoComplete}
    autoCorrect={autoCorrect}
    spellCheck={spellCheck}
    {...props}
  />
));

Textarea.displayName = 'Textarea';
