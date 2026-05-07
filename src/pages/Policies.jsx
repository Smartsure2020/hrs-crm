import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Plus, Search, Shield, RefreshCw, AlertTriangle, Clock, Download, Upload, FileDown } from "lucide-react";

const INSURERS = [
  "ONE","ALPHA","HOLLARD","CIB","SANTAM","ECHELON","PROTOCOL","INFINITI",
  "TRANQUILE/KING PRICE","PALADIN","TRA","AC&E","CROSS COUNTRY","ITOO",
  "DISCOVERY","MOMENTUM","BRYTE","GENLIB","GUARDRISK","MARABILIS","STRATYS","OTHER"
];
import moment from "moment";
import PolicyFormModal from "@/components/policies/PolicyFormModal";
import CSVImportModal from "@/components/shared/CSVImportModal";
import { downloadCSV, downloadTemplate } from "@/lib/csvUtils";
import { logAudit } from "@/lib/auditLogger";

const STATUS_COLORS = {
  active: "bg-emerald-100 text-emerald-700",
  pending: "bg-yellow-100 text-yellow-700",
  expired: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-600",
};

export default function Policies() {
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [renewalFilter, setRenewalFilter] = useState("all");
  const [insurerFilter, setInsurerFilter] = useState("all");
  const [brokerFilter, setBrokerFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editPolicy, setEditPolicy] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === "admin";
  const canImportExport = isAdmin || user?.role === "manager";

  const POLICY_COLUMNS = ["policy_number", "client_name", "insurer", "policy_type", "premium", "status", "start_date", "renewal_date", "broker_name", "notes"];
  const POLICY_HEADERS = ["Policy Number", "Client Name", "Insurer", "Type", "Premium (R)", "Status", "Start Date", "Renewal Date", "Broker", "Notes"];

  const handleExport = () => {
    const rows = filtered.map(p => ({
      ...p,
      start_date: p.start_date ? moment(p.start_date).format("YYYY-MM-DD") : "",
      renewal_date: p.renewal_date ? moment(p.renewal_date).format("YYYY-MM-DD") : "",
    }));
    downloadCSV(rows, POLICY_COLUMNS, POLICY_HEADERS, "policies");
    logAudit(user, "export_data", { record_type: "Policy", record_name: "Policies List", details: `Exported ${filtered.length} records` });
  };

  const handleImport = async (validRows) => {
    let success = 0;
    const skipped = [];
    for (const row of validRows) {
      try {
        await base44.entities.Policy.create({
          policy_number: row["Policy Number"] || row["policy_number"],
          client_name: row["Client Name"] || row["client_name"],
          insurer: row["Insurer"] || row["insurer"] || "",
          policy_type: row["Type"] || row["policy_type"] || "other",
          premium: parseFloat(row["Premium (R)"] || row["premium"] || 0) || 0,
          status: row["Status"] || row["status"] || "active",
          start_date: row["Start Date"] || row["start_date"] || "",
          renewal_date: row["Renewal Date"] || row["renewal_date"] || "",
          notes: row["Notes"] || row["notes"] || "",
        });
        success++;
      } catch (e) {
        skipped.push({ row: row._rowIndex, reason: e.message || "Failed to create" });
      }
    }
    queryClient.invalidateQueries({ queryKey: ["policies"] });
    logAudit(user, "import_data", { record_type: "Policy", record_name: "Policies Import", details: `Imported ${success}, skipped ${skipped.length}` });
    return { success, skipped };
  };

  const { data: policies = [], isLoading } = useQuery({
    queryKey: ["policies", user?.email],
    queryFn: () => isAdmin
      ? base44.entities.Policy.list("-created_date", 500)
      : base44.entities.Policy.filter({ assigned_broker: user?.email }, "-created_date", 500),
    enabled: !!user,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list", user?.email],
    queryFn: () => isAdmin
      ? base44.entities.Client.list("-created_date", 500)
      : base44.entities.Client.filter({ assigned_broker: user?.email }, "-created_date", 500),
    enabled: !!user,
  });

  const { data: allBrokers = [] } = useQuery({
    queryKey: ["brokers-policies"],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user && isAdmin,
  });

  const filtered = policies.filter(p => {
    const matchSearch = !search || p.policy_number?.toLowerCase().includes(search.toLowerCase()) ||
      p.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.insurer?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchInsurer = insurerFilter === "all" || p.insurer === insurerFilter;
    const matchBroker = brokerFilter === "all" || p.assigned_broker === brokerFilter;
    let matchRenewal = true;
    if (renewalFilter === "30") matchRenewal = moment(p.renewal_date).isBetween(moment(), moment().add(30, "days"));
    else if (renewalFilter === "60") matchRenewal = moment(p.renewal_date).isBetween(moment(), moment().add(60, "days"));
    else if (renewalFilter === "90") matchRenewal = moment(p.renewal_date).isBetween(moment(), moment().add(90, "days"));
    else if (renewalFilter === "overdue") matchRenewal = moment(p.renewal_date).isBefore(moment());
    return matchSearch && matchStatus && matchInsurer && matchBroker && matchRenewal;
  });

  const renewalsNext30 = policies.filter(p => moment(p.renewal_date).isBetween(moment(), moment().add(30, "days"))).length;

  if (!user) {
    return <div className="flex items-center justify-center h-full"><RefreshCw className="w-5 h-5 animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#1a2744]">Policies & Renewals</h2>
          <p className="text-sm text-gray-400">{filtered.length} polic{filtered.length !== 1 ? "ies" : "y"} · {renewalsNext30} renewing in 30 days</p>
        </div>
        <div className="flex items-center gap-2">
          {canImportExport && (
            <>
              <Button variant="outline" size="sm" onClick={() => downloadTemplate(POLICY_COLUMNS, POLICY_HEADERS, "policies")} title="Download CSV Template">
                <FileDown className="w-3.5 h-3.5 mr-1.5" /> Template
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
                <Upload className="w-3.5 h-3.5 mr-1.5" /> Import
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="w-3.5 h-3.5 mr-1.5" /> Export
              </Button>
            </>
          )}
          <Button onClick={() => { setEditPolicy(null); setShowForm(true); }} className="bg-[#1a2744] hover:bg-[#243556]">
            <Plus className="w-4 h-4 mr-2" /> New Policy
          </Button>
        </div>
      </div>

      <Card className="p-4 border-0 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search policies..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={insurerFilter} onValueChange={setInsurerFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Insurers" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Insurers</SelectItem>
              {INSURERS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
            </SelectContent>
          </Select>
          {isAdmin && (
            <Select value={brokerFilter} onValueChange={setBrokerFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Brokers" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brokers</SelectItem>
                {allBrokers.map(b => <SelectItem key={b.email} value={b.email}>{b.full_name || b.email}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={renewalFilter} onValueChange={setRenewalFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Renewals</SelectItem>
              <SelectItem value="30">Next 30 Days</SelectItem>
              <SelectItem value="60">Next 60 Days</SelectItem>
              <SelectItem value="90">Next 90 Days</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80">
                <TableHead className="font-medium text-xs">Policy #</TableHead>
                <TableHead className="font-medium text-xs">Client</TableHead>
                <TableHead className="font-medium text-xs hidden md:table-cell">Insurer</TableHead>
                <TableHead className="font-medium text-xs hidden md:table-cell">Type</TableHead>
                <TableHead className="font-medium text-xs hidden lg:table-cell">Monthly</TableHead>
              <TableHead className="font-medium text-xs">Annual</TableHead>
                <TableHead className="font-medium text-xs hidden lg:table-cell">Renewal</TableHead>
                <TableHead className="font-medium text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-gray-400">
                    <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />No policies found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(policy => {
                  const renewalDays = moment(policy.renewal_date).diff(moment(), "days");
                  const isRenewalSoon = renewalDays >= 0 && renewalDays <= 30;
                  const isOverdue = renewalDays < 0;
                  return (
                    <TableRow
                      key={policy.id}
                      className="cursor-pointer hover:bg-blue-50/30 transition-colors"
                      onClick={() => { setEditPolicy(policy); setShowForm(true); }}
                    >
                      <TableCell className="font-medium text-sm">{policy.policy_number}</TableCell>
                      <TableCell className="text-sm text-gray-600">{policy.client_name}</TableCell>
                      <TableCell className="text-sm text-gray-600 hidden md:table-cell">{policy.insurer}</TableCell>
                      <TableCell className="text-xs text-gray-500 hidden md:table-cell capitalize">{policy.policy_type?.replace(/_/g," ")}</TableCell>
                      <TableCell className="font-medium text-sm hidden lg:table-cell">R{policy.monthly_premium?.toLocaleString() || "—"}</TableCell>
                      <TableCell className="font-medium text-sm">R{policy.premium?.toLocaleString() || 0}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className={`text-xs flex items-center gap-1 ${isOverdue ? "text-red-500" : isRenewalSoon ? "text-orange-500" : "text-gray-400"}`}>
                          {isOverdue && <AlertTriangle className="w-3 h-3" />}
                          {isRenewalSoon && <Clock className="w-3 h-3" />}
                          {policy.renewal_date ? moment(policy.renewal_date).format("MMM D, YYYY") : "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${STATUS_COLORS[policy.status] || STATUS_COLORS.active}`}>{policy.status}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <PolicyFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditPolicy(null); }}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["policies"] })}
        user={user}
        policy={editPolicy}
        clients={clients}
      />

      <CSVImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        entityName="Policies"
        columns={POLICY_COLUMNS}
        headers={POLICY_HEADERS}
        requiredFields={["policy_number", "client_name", "insurer", "policy_type"]}
        onImport={handleImport}
        templateFilename="policies"
      />
    </div>
  );
}