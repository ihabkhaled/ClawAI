import { ImageResponse } from 'next/og';

export const alt = 'ClawAI — local-first AI orchestration';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Branded share-card: logo mark, product name, one-line description. No
// user data, no chat content, no generated output — a static asset built
// once per deploy from developer-controlled text only.
export default function OpengraphImage(): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0B1220',
        color: '#F8FAFC',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 96,
          height: 96,
          borderRadius: 24,
          backgroundColor: '#3B82F6',
          marginBottom: 32,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            border: '4px solid white',
          }}
        />
      </div>
      <div style={{ display: 'flex', fontSize: 64, fontWeight: 700 }}>ClawAI</div>
      <div style={{ display: 'flex', fontSize: 28, color: '#94A3B8', marginTop: 16 }}>
        Local-first AI orchestration
      </div>
    </div>,
    { ...size },
  );
}
