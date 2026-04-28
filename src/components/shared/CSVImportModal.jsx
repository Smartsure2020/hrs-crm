import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Upload, AlertTriangle, CheckCircle2, FileText, Download } from "lucide-react";
import { parseCSV, downloadTemplate } from "@/lib/csvUtils";

/**
 * Generic CSV Import Modal.
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - entityName: string (display name, e.g. "Clients")
 *  - columns: string[] (field keys expected in CSV)
 *  - headers: string[] (display names for those columns)
 *  - requiredFields: string[] (column keys that are required)
 *  - onImport: (rows: object[]) => Promise<{ success: number, skipped: {row, reason}[] }>
 *  - templateFilename: string
 */
export default function CSVImportModal({
  open, onClose, entityName, columns, headers, requiredFields = [], onImport, templateFilename
}) {
  const [step, setStep] = useState("upload"); // upload | preview | result
  const [parsedData, setParsedData] = useState(null);
  const [rowErrors, setRowErrors] = useState({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef();

  const reset = () => {
    setStep("upload");
    setParsedData(null);
    setRowErrors({});
    setResult(null);
    setImporting(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const { headers: csvHeaders, rows } = parseCSV(e.target.result);
      // Validate rows
      const errors = {};
      rows.forEach((row, idx) => {
        const missing = requiredFields.filter(f => !row[f]);
        if (missing.length > 0) errors[idx] = `Missing required fields: ${missing.join(", ")}`;
      });
      setRowErrors(errors);
      setParsedData({ csvHeaders, rows });
      setStep("preview");
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setImporting(true);
    const validRows = parsedData.rows.filter((_, idx) => !rowErrors[idx]);
    const res = await onImport(validRows, parsedData.rows);
    setResult(res);
    setStep("result");
    setImporting(false);
  };

  const validRows = parsedData ? parsedData.rows.filter((_, idx) => !rowErrors[idx]) : [];
  const errorRows = parsedData ? parsedData.rows.filter((_, idx) => !!rowErrors[idx]) : [];
  const previewRows = parsedData ? parsedData.rows.slice(0, 5) : [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import {entityName} from CSV</DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadTemplate(columns, headers, templateFilename)}
              >
                <Download className="w-3.5 h-3.5 mr-1.5" /> Download Template
              </Button>
              <span className="text-xs text-gray-400">Download a blank CSV with the correct column headers</span>
            </div>
            <div
              className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center cursor-pointer hover:border-[#1a2744]/40 hover:bg-gray-50 transition-colors"
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
            >
              <Upload className="w-8 h-8 mx-auto mb-3 text-gray-300" />
              <p className="font-medium text-gray-600 text-sm">Click to upload or drag & drop</p>
              <p className="text-xs text-gray-400 mt-1">CSV files only</p>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => handleFile(e.target.files[0])} />
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-600 mb-1.5">Expected columns:</p>
              <div className="flex flex-wrap gap-1.5">
                {headers.map((h, i) => (
                  <span key={i} className={`px-2 py-0.5 rounded text-xs ${requiredFields.includes(columns[i]) ? "bg-[#1a2744] text-white" : "bg-white border border-gray-200 text-gray-600"}`}>
                    {h}{requiredFields.includes(columns[i]) ? " *" : ""}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">* Required fields</p>
            </div>
          </div>
        )}

        {step === "preview" && parsedData && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="font-medium text-emerald-700">{validRows.length} valid rows</span>
              </div>
              {errorRows.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <span className="font-medium text-orange-700">{errorRows.length} rows with errors (will be skipped)</span>
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Preview (first 5 rows):</p>
              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="text-xs w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-400 font-medium">#</th>
                      {headers.map((h, i) => <th key={i} className="px-3 py-2 text-left text-gray-500 font-medium whitespace-nowrap">{h}</th>)}
                      <th className="px-3 py-2 text-left text-gray-400 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {previewRows.map((row, idx) => (
                      <tr key={idx} className={rowErrors[idx] ? "bg-red-50" : "bg-white"}>
                        <td className="px-3 py-2 text-gray-400">{row._rowIndex}</td>
                        {columns.map((col, ci) => (
                          <td key={ci} className={`px-3 py-2 ${!row[col] && requiredFields.includes(col) ? "text-red-500 font-medium" : "text-gray-700"}`}>
                            {row[col] || <span className="text-gray-300 italic">—</span>}
                          </td>
                        ))}
                        <td className="px-3 py-2">
                          {rowErrors[idx]
                            ? <span className="text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{rowErrors[idx]}</span>
                            : <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />OK</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedData.rows.length > 5 && (
                <p className="text-xs text-gray-400 mt-2">… and {parsedData.rows.length - 5} more rows</p>
              )}
            </div>

            {errorRows.length > 0 && (
              <div className="bg-orange-50 border border-orange-100 rounded-lg p-3">
                <p className="text-xs font-medium text-orange-700 mb-1">Rows with errors (will be skipped):</p>
                {errorRows.map((row, idx) => {
                  const origIdx = parsedData.rows.indexOf(row);
                  return (
                    <p key={idx} className="text-xs text-orange-600">Row {row._rowIndex}: {rowErrors[origIdx]}</p>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button variant="outline" onClick={() => { reset(); }}>Back</Button>
              <Button
                onClick={handleImport}
                disabled={validRows.length === 0 || importing}
                className="bg-[#1a2744] hover:bg-[#243556]"
              >
                {importing ? "Importing…" : `Import ${validRows.length} Record${validRows.length !== 1 ? "s" : ""}`}
              </Button>
            </div>
          </div>
        )}

        {step === "result" && result && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-800">Import Complete</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-emerald-600">{result.success}</p>
                <p className="text-sm text-emerald-700 mt-1">Successfully imported</p>
              </div>
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-orange-500">{result.skipped?.length || 0}</p>
                <p className="text-sm text-orange-700 mt-1">Skipped</p>
              </div>
            </div>
            {result.skipped?.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                <p className="text-xs font-medium text-gray-600">Skipped rows:</p>
                {result.skipped.map((s, i) => (
                  <p key={i} className="text-xs text-gray-500">Row {s.row}: {s.reason}</p>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button onClick={handleClose} className="bg-[#1a2744] hover:bg-[#243556]">Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}