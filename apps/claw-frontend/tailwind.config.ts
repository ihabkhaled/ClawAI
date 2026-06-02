import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  // Broadened content paths so dynamic / map-derived class names that live
  // OUTSIDE app + components (e.g. variant maps in constants, derived
  // classNames returned from hooks or utilities) are not purged in the
  // production build. Without this, status colors that come from
  // `src/constants/dashboard-status-styles.constants.ts` and similar files
  // can disappear in prod even though they show up in dev.
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/hooks/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
    "./src/utilities/**/*.{ts,tsx}",
    "./src/constants/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        surface: {
          shell: "hsl(var(--surface-shell))",
          panel: "hsl(var(--surface-panel))",
          "panel-subtle": "hsl(var(--surface-panel-subtle))",
          elevated: "hsl(var(--surface-elevated))",
          raised: "hsl(var(--surface-raised))",
        },
        overlay: "hsl(var(--overlay))",
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          surface: "hsl(var(--status-success-surface))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          surface: "hsl(var(--status-warning-surface))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
          surface: "hsl(var(--status-info-surface))",
        },
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        panel: "var(--shadow-panel)",
        floating: "var(--shadow-floating)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
      },
      // Page gutter + section/card gap scale. These map onto the CSS-token
      // story in globals.css so a `px-page-gutter md:px-page-gutter-md` reads
      // the same regardless of viewport. Component-level spacing falls back
      // to the default Tailwind scale (`p-2`, `gap-4`, etc.).
      spacing: {
        "page-gutter": "1.5rem",
        "page-gutter-md": "2rem",
        "page-gutter-lg": "2.5rem",
        "section-gap": "2rem",
        "card-gap": "1rem",
      },
      // Content widths — `max-w-content` becomes the canonical "reading and
      // settings page" width. `content-narrow` is for prose-heavy pages and
      // `content-wide` is for dashboards / wide tables.
      maxWidth: {
        content: "75rem", // 1200px
        "content-narrow": "52rem", // ~832px
        "content-wide": "90rem", // 1440px
      },
      transitionDuration: {
        instant: "100ms",
        fast: "150ms",
        normal: "250ms",
        slow: "400ms",
      },
      transitionTimingFunction: {
        "expo-out": "cubic-bezier(0.16, 1, 0.3, 1)",
        "quint-out": "cubic-bezier(0.22, 1, 0.36, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
