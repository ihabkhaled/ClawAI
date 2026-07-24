import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon(): ImageResponse {
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
          width: 84,
          height: 84,
          borderRadius: 42,
          border: '8px solid white',
        }}
      />
    </div>,
    { ...size },
  );
}
