import type { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  'focus-visible:ring-ring/40 inline-flex items-center justify-center gap-2 rounded-full text-[13.5px] font-bold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        outline:
          'border-border bg-surface text-secondary-foreground hover:bg-muted border text-[12.5px]',
        ghost: 'text-secondary-foreground hover:bg-muted',
        link: 'text-primary rounded-none underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-auto w-full px-4 py-[13px]',
        sm: 'h-auto w-full px-4 py-[11px] text-[12.5px]',
        icon: 'size-9 w-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;
