import React, { useState, useEffect } from "react";
import { base44, PAGE_SIZE } from "@/api/client";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/shared/Pagination";
import { Search, RefreshCw, ShieldAlert, Download } from "lucide-react";
import moment from "moment";
import { downloadCSV } from "@/lib/csvUtils";

const ACTION_LABELS = {
  view_client: "View Client",
  edit_client: "Edit Client",
  create_client: "Create Client",
  delete_record: "Delete Record",
  submit_form: "Submit Form",
  export_data: "Export Data",
  import_data: "Import Data",
  download_file: "Download File",
  login: "Login",
  logout: "Logout",
  role_change: "Role Change",
  permission_change: "Permission Change",
  generate_report: "Generate Report",
  view_page: "View Page",
};

const ACTION_COLORS = {
  view_client: "bg-blue-100 text-blue-700",
  edit_client: "bg-yellow-100 text-yellow-700",
  create_client: "bg-emerald-100 text-emerald-700",
  delete_record: "bg-red-100 text-red-700",
  submit_form: "bg-indigo-100 text-indigo-700",
  export_data: "bg-purple-100 text-purple-700",
  import_data: "bg-cyan-100 text-cyan-700",
  download_file: "bg-teal-100 text-teal-700",
  login: "bg-emerald-100 text-emerald-700",
  logout: "bg-gray-100 text-gray-600",
  role_change: "bg-orange-100 text-orange-700",
  permission_change: "bg-orange-100 text-orange-700",
  generate_report: "bg-violet-100 text-violet-700",
  view_page: "bg-gray-100 text-gray-500",
};

export default function AuditLogs() {
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Debounce search — reset to page 0 on new term
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(0); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 0 when server-side filters change
  useEffect(() => { setPage(0); }, [actionFilter]);

  const isPrivileged = user?.role === "admin" || user?.role === "admin_staff";

  const { data: pageResult, isLoading, refetch } = useQuery({
    queryKey: ["audit-logs", page, actionFilter, debouncedSearch],
    queryFn: () => {
      const filters = {};
      if (actionFilter !== "all") filters.action = actionFilter;
      return base44.entities.AuditLog.paginate(page, filters, "-created_at", debouncedSearch || null);
    },
    enabled: !!user && isPrivileged,
    placeholderData: keepPreviousData,
  });

  const logs  = pageResult?.data  ?? [];
  const total = pageResult?.total ?? 0;

  // Date range is applied client-side on the current page (range queries not supported server-side)
  const filtered = logs.filter(log => {
    const matchFrom = !dateFrom || moment(log.created_at).isSameOrAfter(moment(dateFrom), "day");
    const matchTo   = !dateTo   || moment(log.created_at).isSameOrBefore(moment(dateTo),   "day");
    return matchFrom && matchTo;
  });

  const handleExport = () => {
    downloadCSV(
      filtered,
      ["created_at", "user_name", "user_role", "action", "record_type", "record_name", "details"],
      ["Timestamp", "User", "Role", "Action", "Record Type", "Record", "Details"],
      "audit-log"
    );
  };

  if (!user) {
    return <div className="flex items-center justify-center h-full"><RefreshCw className="w-5 h-5 animate-spin text-gray-400" /></div>;
  }

  if (!isPrivileged) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <ShieldAlert className="w-10 h-10 text-red-400" />
        <p className="text-gray-500 font-medium">Access Denied</p>
        <p className="text-sm text-gray-400">Audit Logs are only visible to Admin roles.</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#1a2744]">Audit Logs</h2>
          <p className="text-sm text-gray-400">{total.toLocaleString()} log entr{total !== 1 ? "ies" : "y"} · read-only</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 border-0 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by user, action, details..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {Object.entries(ACTION_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">From</span>
            <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0); }} className="w-[140px]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">To</span>
            <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0); }} className="w-[140px]" />
          </div>
          {(search || actionFilter !== "all" || dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setActionFilter("all"); setDateFrom(""); setDateTo(""); setPage(0); }}>
              Clear
            </Button>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80">
                <TableHead className="font-medium text-xs w-44">Timestamp</TableHead>
                <TableHead className="font-medium text-xs">User</TableHead>
                <TableHead className="font-medium text-xs">Role</TableHead>
                <TableHead className="font-medium text-xs">Action</TableHead>
                <TableHead className="font-medium text-xs hidden md:table-cell">Record</TableHead>
                <TableHead className="font-medium text-xs hidden lg:table-cell">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(6).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <div className="h-8 bg-gray-100 rounded animate-pulse" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16 text-gray-400">
                    <ShieldAlert className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No audit log entries found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(log => (
                  <TableRow key={log.id} className="hover:bg-gray-50/60">
                    <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                      {moment(log.created_at).format("MMM D, YYYY HH:mm")}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{log.user_name}</p>
                        <p className="text-xs text-gray-400">{log.user_email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-gray-500 capitalize">{log.user_role}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${ACTION_COLORS[log.action] || "bg-gray-100 text-gray-600"}`}>
                        {ACTION_LABELS[log.action] || log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div>
                        {log.record_type && <span className="text-xs text-gray-400 uppercase tracking-wide">{log.record_type} · </span>}
                        <span className="text-sm text-gray-700">{log.record_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-gray-500 max-w-xs truncate">
                      {log.details}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} isLoading={isLoading} />
      </Card>
    </div>
  );
}
