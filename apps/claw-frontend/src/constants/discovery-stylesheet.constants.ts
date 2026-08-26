/**
 * Human-readable rendering for the discovery documents.
 *
 * Chrome 151 no longer ships its built-in XML pretty-printer, so a sitemap or
 * feed opened in the browser renders as one run-together wall of text: valid
 * XML that looks broken. Crawlers were always fine — they parse the markup, not
 * the presentation — but anybody checking the sitemap by eye had no way to tell
 * a healthy document from a damaged one.
 *
 * An `xml-stylesheet` processing instruction fixes that without touching a byte
 * of the data: XML parsers ignore the PI entirely, and browsers render this
 * table instead. Author XSLT is still supported where the built-in viewer is
 * not, so this works in exactly the browsers that need it.
 *
 * One stylesheet covers all three roots — `sitemapindex`, `urlset` and `rss` —
 * because they share a shape (a list of links with a date) and splitting them
 * would mean three files drifting apart.
 */
export const DISCOVERY_STYLESHEET_XSL = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:sm="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
  xmlns:dc="http://purl.org/dc/elements/1.1/">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>

  <xsl:template match="/">
    <html>
      <head>
        <title>ClawAI discovery</title>
        <meta name="robots" content="noindex"/>
        <style>
          :root { color-scheme: light dark; }
          body {
            margin: 0; padding: 2rem 1.5rem;
            font: 14px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
            background: #0b1020; color: #e6e9f2;
          }
          h1 { margin: 0 0 .25rem; font-size: 1.25rem; }
          p.sub { margin: 0 0 1.5rem; color: #93a0bf; }
          table { border-collapse: collapse; width: 100%; max-width: 72rem; }
          th, td {
            text-align: left; padding: .55rem .75rem;
            border-bottom: 1px solid #1e2740; vertical-align: top;
          }
          th { font-size: .72rem; letter-spacing: .08em; text-transform: uppercase; color: #93a0bf; }
          td.meta { color: #93a0bf; white-space: nowrap; font-variant-numeric: tabular-nums; }
          a { color: #7aa2ff; text-decoration: none; word-break: break-all; }
          a:hover { text-decoration: underline; }
          tr:hover td { background: #121a30; }
          @media (prefers-color-scheme: light) {
            body { background: #ffffff; color: #101828; }
            p.sub, th, td.meta { color: #667085; }
            th, td { border-bottom-color: #e4e7ec; }
            a { color: #1849a9; }
            tr:hover td { background: #f7f9fc; }
          }
        </style>
      </head>
      <body>
        <xsl:apply-templates/>
      </body>
    </html>
  </xsl:template>

  <xsl:template match="sm:sitemapindex">
    <h1>Sitemap index</h1>
    <p class="sub">
      <xsl:value-of select="count(sm:sitemap)"/>
      <xsl:text> child sitemaps. Each one lists the actual page URLs.</xsl:text>
    </p>
    <table>
      <tr><th>Sitemap</th></tr>
      <xsl:for-each select="sm:sitemap">
        <tr>
          <td>
            <a href="{sm:loc}"><xsl:value-of select="sm:loc"/></a>
          </td>
        </tr>
      </xsl:for-each>
    </table>
  </xsl:template>

  <xsl:template match="sm:urlset">
    <h1>Sitemap</h1>
    <p class="sub">
      <xsl:value-of select="count(sm:url)"/>
      <xsl:text> URLs.</xsl:text>
    </p>
    <table>
      <tr><th>URL</th><th>Languages</th><th>Last modified</th></tr>
      <xsl:for-each select="sm:url">
        <tr>
          <td><a href="{sm:loc}"><xsl:value-of select="sm:loc"/></a></td>
          <td class="meta"><xsl:value-of select="count(xhtml:link)"/></td>
          <td class="meta"><xsl:value-of select="sm:lastmod"/></td>
        </tr>
      </xsl:for-each>
    </table>
  </xsl:template>

  <xsl:template match="rss">
    <h1><xsl:value-of select="channel/title"/></h1>
    <p class="sub">
      <xsl:value-of select="count(channel/item)"/>
      <xsl:text> items. </xsl:text>
      <xsl:value-of select="channel/description"/>
    </p>
    <table>
      <tr><th>Item</th><th>Language</th><th>Category</th><th>Published</th></tr>
      <xsl:for-each select="channel/item">
        <tr>
          <td>
            <a href="{link}"><xsl:value-of select="title"/></a>
          </td>
          <td class="meta"><xsl:value-of select="dc:language"/></td>
          <td class="meta"><xsl:value-of select="category"/></td>
          <td class="meta"><xsl:value-of select="pubDate"/></td>
        </tr>
      </xsl:for-each>
    </table>
  </xsl:template>
</xsl:stylesheet>
`;
