import { ImageResponse } from 'next/og';

// A dedicated maskable PWA icon at /icon-maskable — kept as a plain Route
// Handler (not the icon.tsx special convention, which is already claimed by
// the static icon.svg) so manifest.ts can reference a raster icon with a
// generous safe-zone margin for OS icon masking.
export function GET(): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3B82F6',
      }}
    >
      <div
        style={{
          width: 280,
          height: 280,
          borderRadius: 140,
          border: '18px solid white',
        }}
      />
    </div>,
    { width: 512, height: 512 },
  );
}
