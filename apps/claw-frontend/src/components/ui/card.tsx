import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

// Card variants — added in the Phase 1 design-system foundation.
// - default: historical look (rounded, bordered, low elevation).
// - interactive: hoverable card surface used for clickable list cards. Lifts
//   on hover and snaps back on press for tactile feedback.
// - ghost: borderless / background-less surface used inside nested panels
//   where a second border would create visual noise.
const cardVariants = cva(
  "rounded-lg border bg-card text-card-foreground shadow-sm",
  {
    variants: {
      variant: {
        default: "",
        interactive:
          "cursor-pointer transition-all duration-normal ease-quint-out hover:shadow-panel hover:border-primary/20 hover:-translate-y-0.5 active:translate-y-0",
        ghost: "border-0 bg-transparent shadow-none",
        // Elevated: stronger resting shadow for hero / standout panels.
        elevated: "border-border/60 bg-surface-elevated shadow-panel",
        // Glass: frosted translucent surface for overlays on busy backgrounds.
        glass:
          "border-border/50 bg-surface-glass shadow-panel backdrop-blur-md backdrop-saturate-150 supports-[backdrop-filter]:bg-[hsl(var(--surface-glass))]",
        // Gradient: subtle brand wash that intensifies on hover (marketing/auth).
        gradient:
          "relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-br before:from-primary/5 before:to-accent before:opacity-0 before:transition-opacity hover:before:opacity-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export type CardVariantProps = VariantProps<typeof cardVariants>;

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & CardVariantProps
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(cardVariants({ variant, className }))}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className,
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  cardVariants,
};
