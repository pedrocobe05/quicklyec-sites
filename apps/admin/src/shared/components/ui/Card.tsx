import { HTMLAttributes, PropsWithChildren } from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends PropsWithChildren, HTMLAttributes<HTMLElement> {}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <section
      {...props}
      className={cn(
        'rounded-3xl border border-white/60 bg-white/85 p-4 shadow-panel backdrop-blur sm:p-5 lg:p-6',
        className,
      )}
    >
      {children}
    </section>
  );
}
