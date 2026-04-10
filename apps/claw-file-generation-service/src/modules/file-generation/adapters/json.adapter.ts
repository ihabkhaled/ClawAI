export const convertToJson = (content: string): Buffer => {
  try {
    const parsed: unknown = JSON.parse(content);
    return Buffer.from(JSON.stringify(parsed, null, 2), 'utf-8');
  } catch {
    // If content isn't valid JSON, wrap it as a JSON string
    return Buffer.from(JSON.stringify({ content }, null, 2), 'utf-8');
  }
};
