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
import { Plus, Search, Shield, RefreshCw, AlertTriangle, Clock } from "lucide-react";
import moment from "moment";
import PolicyFormModal from "@/components/policies/PolicyFormModal";

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
  const [showForm, setShowForm] = useState(false);
  const [editPolicy, setEditPolicy] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === "admin";

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

  const filtered = policies.filter(p => {
    const matchSearch = !search || p.policy_number?.toLowerCase().includes(search.toLowerCase()) ||
      p.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.insurer?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    let matchRenewal = true;
    if (renewalFilter === "30") matchRenewal = moment(p.renewal_date).isBetween(moment(), moment().add(30, "days"));
    else if (renewalFilter === "60") matchRenewal = moment(p.renewal_date).isBetween(moment(), moment().add(60, "days"));
    else if (renewalFilter === "90") matchRenewal = moment(p.renewal_date).isBetween(moment(), moment().add(90, "days"));
    else if (renewalFilter === "overdue") matchRenewal = moment(p.renewal_date).isBefore(moment());
    return matchSearch && matchStatus && matchRenewal;
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
        <Button onClick={() => { setEditPolicy(null); setShowForm(true); }} className="bg-[#1a2744] hover:bg-[#243556]">
          <Plus className="w-4 h-4 mr-2" /> New Policy
        </Button>
      </div>

      <Card className="p-4 border-0 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search policies..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={renewalFilter} onValueChange={setRenewalFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
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
                <TableHead className="font-medium text-xs">Premium</TableHead>
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
    </div>
  );
}