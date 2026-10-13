// Vite/Vitest raw file imports (tests read migration SQL and the Prisma schema as text).
declare module '*?raw' {
  const content: string;
  export default content;
}
