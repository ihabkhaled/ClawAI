/** SpreadsheetML namespaces and fixed parts (F3b, ADR-108). */
export const XLSX_MAIN_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
export const XLSX_REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
export const XLSX_PACKAGE_REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';
export const XLSX_XML_HEADER = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${String.fromCharCode(10)}`;

/** Two cell styles: 0 normal, 1 bold (the header row). */
export const XLSX_STYLES = `${XLSX_XML_HEADER}<styleSheet xmlns="${XLSX_MAIN_NS}"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
