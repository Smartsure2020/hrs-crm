import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Download, FileSpreadsheet, Eye } from "lucide-react";
import moment from "moment";
import { downloadCSV, downloadXLSX } from "@/lib/csvUtils";
import { logAudit } from "@/lib/auditLogger";

const COLUMNS = [
  "id", "client_type", "broker_name", "client_name", "initials",
  "first_name", "surname", "company_name", "company_reg",
  "id_number", "email", "phone", "notes",
  "created_date"
];

const HEADERS = [
  "Client Code", "Type", "Advisor Name", "Client Display Name", "Initials",
  "Firstname", "Lastname", "Organisation Name", "Company Registration Number",
  "ID Number", "Client Email", "Cell Number", "Notes",
  "Created Date"
];

const clean = (v) => (v === null || v === undefined || v === "null" || v === "undefined") ? "" : v;

export default function ClientReport({ user }) {
  const [advisorFilter, setAdvisorFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [previewing, setPreviewing] = useState(false);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients-report"],
    queryFn: () => base44.entities.Client.list("-created_date", 2000),
    enabled: !!user,
  });

  const { data: brokers = [] } = useQuery({
    queryKey: ["brokers-report"],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user,
  });

  const filtered = clients.filter(c => {
    const matchAdvisor = advisorFilter === "all" || c.assigned_broker === advisorFilter;
    const matchType = typeFilter === "all" || c.client_type === typeFilter;
    const matchFrom = !dateFrom || moment(c.created_date).isSameOrAfter(moment(dateFrom), "day");
    const matchTo = !dateTo || moment(c.created_date).isSameOrBefore(moment(dateTo), "day");
    return matchAdvisor && matchType && matchFrom && matchTo;
  });

  const exportRows = filtered.map(c => {
    const row = {};
    COLUMNS.forEach(col => {
      if (col === "created_date") {
        row[col] = c.created_date ? moment(c.created_date).format("YYYY-MM-DD") : "";
      } else {
        row[col] = clean(c[col]);
      }
    });
    return row;
  });

  const handleExportCSV = () => {
    downloadCSV(exportRows, COLUMNS, HEADERS, "client-report");
    logAudit(user, "generate_report", { record_type: "Client", record_name: "Client Report", details: `CSV export, ${filtered.length} records` });
  };

  const handleExportXLSX = () => {
    downloadXLSX(exportRows, COLUMNS, HEADERS, "client-report");
    logAudit(user, "generate_report", { record_type: "Client", record_name: "Client Report", details: `XLSX export, ${filtered.length} records` });
  };

  const handlePreview = () => {
    setPreviewing(true);
    logAudit(user, "generate_report", { record_type: "Client", record_name: "Client Report", details: `Preview, ${filtered.length} records` });
  };

  if (isLoading) return <div className="flex justify-center py-16"><RefreshCw className="w-5 h-5 animate-spin text-gray-400" /></div>;

  return (
    <div className="space-y-5">
      <Card className="border-0 shadow-sm p-5">
        <h3 className="font-semibold text-[#1a2744] text-sm mb-4">Client Report — Filters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Advisor Name</label>
            <Select value={advisorFilter} onValueChange={setAdvisorFilter}>
              <SelectTrigger><SelectValue placeholder="All Advisors" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Advisors</SelectItem>
                {brokers.map(b => <SelectItem key={b.email} value={b.email}>{b.full_name || b.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Client Type</label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
                <SelectItem value="body_corporate">Body Corporate</SelectItem>
                <SelectItem value="motor_trader">Motor Trader</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Created From</label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Created To</label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4 pt-4 border-t">
          <span className="text-sm text-gray-500 font-medium">{filtered.length} record{filtered.length !== 1 ? "s" : ""} match filters</span>
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={handlePreview}>
              <Eye className="w-3.5 h-3.5 mr-1.5" /> Preview
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={filtered.length === 0}>
              <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
            </Button>
            <Button size="sm" onClick={handleExportXLSX} disabled={filtered.length === 0} className="bg-emerald-600 hover:bg-emerald-700">
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" /> Export Excel
            </Button>
          </div>
        </div>
      </Card>

      {previewing && (
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">Report Preview — {filtered.length} records</p>
            <Button variant="ghost" size="sm" onClick={() => setPreviewing(false)}>Hide Preview</Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80">
                  {HEADERS.map((h, i) => (
                    <TableHead key={i} className="font-medium text-xs whitespace-nowrap">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={HEADERS.length} className="text-center py-8 text-gray-400">No records match the selected filters</TableCell>
                  </TableRow>
                ) : (
                  filtered.slice(0, 50).map(c => (
                    <TableRow key={c.id} className="hover:bg-gray-50/50">
                      {COLUMNS.map((col, ci) => (
                        <TableCell key={ci} className="text-xs text-gray-700 whitespace-nowrap">
                          {col === "created_date"
                            ? (c.created_date ? moment(c.created_date).format("YYYY-MM-DD") : "")
                            : clean(c[col]) || ""}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
                {filtered.length > 50 && (
                  <TableRow>
                    <TableCell colSpan={HEADERS.length} className="text-center text-xs text-gray-400 py-3">
                      Showing 50 of {filtered.length} records. Export to see all data.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}