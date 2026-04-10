import MarkdownIt from 'markdown-it';

const md = new MarkdownIt();

export const convertToHtml = (content: string): Buffer => {
  const htmlBody = md.render(content);
  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generated Document</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; color: #333; }
    h1, h2, h3 { margin-top: 1.5em; }
    code { background: #f4f4f4; padding: 0.2em 0.4em; border-radius: 3px; font-size: 0.9em; }
    pre { background: #f4f4f4; padding: 1em; border-radius: 6px; overflow-x: auto; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    th, td { border: 1px solid #ddd; padding: 0.5em 1em; text-align: left; }
    th { background: #f8f8f8; }
    blockquote { border-left: 4px solid #ddd; margin: 1em 0; padding: 0.5em 1em; color: #666; }
  </style>
</head>
<body>
${htmlBody}
</body>
</html>`;
  return Buffer.from(fullHtml, 'utf-8');
};
