'use client';

import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

// On a pointer-coarse device the control itself grows to a 44×44 hit area while
// the visible box stays 16px, drawn by a `before:` layer. This mirrors Switch,
// and it is a real size change rather than a pseudo-element overlay because a
// pseudo-element does not enlarge the element's own hit rectangle.
const touchTargetClasses =
  'touch:relative touch:h-11 touch:w-11 touch:rounded-none touch:border-0 touch:bg-transparent touch:shadow-none touch:before:absolute touch:before:start-1/2 touch:before:top-1/2 touch:before:h-4 touch:before:w-4 touch:before:-translate-x-1/2 touch:before:-translate-y-1/2 touch:before:rounded-sm touch:before:border touch:before:border-primary touch:before:content-[""] touch:rtl:before:translate-x-1/2 touch:data-[state=checked]:bg-transparent touch:data-[state=checked]:before:bg-primary';

function Checkbox({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>): React.ReactElement {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        'peer border-primary focus-visible:ring-ring data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground h-4 w-4 shrink-0 rounded-sm border shadow focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        touchTargetClasses,
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className={cn(
          'flex items-center justify-center text-current',
          'touch:absolute touch:inset-0',
        )}
      >
        <Check className="h-4 w-4" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
