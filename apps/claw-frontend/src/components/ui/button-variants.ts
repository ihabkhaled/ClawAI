import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';

// Shared button sizing is mobile-first. Visual controls can stay compact on
// desktop, but coarse/small-screen hit areas must remain comfortably tappable.
export const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-fast ease-quint-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        unstyled: '',
      },
      size: {
        default: 'h-10 px-4 py-2 max-md:min-h-11',
        sm: 'h-9 rounded-md px-3 max-md:min-h-11',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10 max-md:min-h-11 max-md:min-w-11',
        'icon-sm': 'h-8 w-8 max-md:min-h-11 max-md:min-w-11',
        'icon-xs': 'h-7 w-7 rounded-sm max-md:min-h-11 max-md:min-w-11',
        unstyled: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;
