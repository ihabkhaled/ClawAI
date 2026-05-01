export const SANDBOX_DEFAULT_WALL_CLOCK_MS = 5_000;
export const SANDBOX_HEAP_MB = 128;
export const SANDBOX_CODE_RANGE_MB = 64;

export const BANNED_FS_PATH_PATTERNS: ReadonlyArray<RegExp> = [
  /\.\.[\\/]/,
  /\/etc\//,
  /\/sys\//,
  /\/proc\//,
  /\/boot\//,
  /C:[\\/]Windows/i,
  /C:[\\/]Program Files/i,
  /\.ssh[\\/]/,
  /\.aws[\\/]/,
  /\/\.env\b/,
];

export const BANNED_TERMINAL_PATTERNS: ReadonlyArray<RegExp> = [
  /;\s*rm\s+-rf/,
  /\$\([^)]+\)/,
  /`[^`]+`/,
  /\|\s*sh\b/,
  /curl[^|]*\|\s*(sh|bash|zsh)/,
  /wget[^|]*\|\s*(sh|bash|zsh)/,
];

export const BANNED_BROWSER_DOMAINS: ReadonlyArray<RegExp> = [
  /accounts\.google\.com/i,
  /login\.microsoftonline\.com/i,
  /login\.live\.com/i,
  /banking|bank/i,
];
