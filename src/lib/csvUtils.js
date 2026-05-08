import moment from "moment";

/**
 * Convert an array of objects to a CSV string and trigger download.
 * @param {object[]} rows - Data rows
 * @param {string[]} columns - Column keys to include (in order)
 * @param {string[]} headers - Human-readable header labels (same order as columns)
 * @param {string} filename - Filename without extension (date will be appended)
 */
export function downloadCSV(rows, columns, headers, filename) {
  const date = moment().format("YYYY-MM-DD");
  const safeVal = (v) => {
    if (v === null || v === undefined) return "";
    const str = String(v).replace(/"/g, '""');
    return str.includes(",") || str.includes("\n") || str.includes('"') ? `"${str}"` : str;
  };
  const headerRow = headers.map(safeVal).join(",");
  const dataRows = rows.map(row =>
    columns.map(col => safeVal(row[col])).join(",")
  );
  const csv = [headerRow, ...dataRows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}-${date}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download a blank CSV template with just headers.
 */
export function downloadTemplate(columns, headers, filename) {
  downloadCSV([], columns, headers, `${filename}-template`);
}

/**
 * Parse a CSV file into an array of objects.
 * Returns { headers, rows } where rows are plain objects keyed by header.
 */
export function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 1) return { headers: [], rows: [] };

  const parseRow = (line) => {
    const result = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  };

  const headers = parseRow(lines[0]).map(h => h.trim());
  const rows = lines.slice(1).filter(l => l.trim()).map((line, idx) => {
    const vals = parseRow(line);
    const obj = { _rowIndex: idx + 2 };
    headers.forEach((h, i) => { obj[h] = vals[i]?.trim() || ""; });
    return obj;
  });
  return { headers, rows };
}

/**
 * Export data as Excel (.xlsx) using a simple XML-based approach.
 * Falls back gracefully if needed.
 */
export function downloadXLSX(rows, columns, headers, filename) {
  const date = moment().format("YYYY-MM-DD");
  // Build a basic XML spreadsheet
  const escape = (v) => {
    if (v === null || v === undefined) return "";
    return String(v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  };

  const headerCells = headers.map(h => `<Cell><Data ss:Type="String">${escape(h)}</Data></Cell>`).join("");
  const dataRowsXml = rows.map(row =>
    `<Row>${columns.map(col => `<Cell><Data ss:Type="String">${escape(row[col])}</Data></Cell>`).join("")}</Row>`
  ).join("");

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Sheet1">
  <Table>
   <Row>${headerCells}</Row>
   ${dataRowsXml}
  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}-${date}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}