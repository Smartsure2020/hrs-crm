import React, { useState } from "react";
import { base44 } from "@/api/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

const COLORS = ["#1a2744","#4a90d9","#e88c3a","#2ecc71","#9b59b6","#e74c3c","#1abc9c","#f39c12","#3498db","#2c3e50","#e67e22","#16a085","#8e44ad","#c0392b","#27ae60","#d35400","#7f8c8d","#2980b9","#c0392b","#f1c40f"];

const INSURERS = [
  "ONE","ALPHA","HOLLARD","CIB","SANTAM","ECHELON","PROTOCOL","INFINITI",
  "TRANQUILE/KING PRICE","PALADIN","TRA","AC&E","CROSS COUNTRY","ITOO",
  "DISCOVERY","MOMENTUM","BRYTE","GENLIB","GUARDRISK","MARABILIS"
];

const STATUS_COLORS = {
  active: "bg-emerald-100 text-emerald-700",
  pending: "bg-yellow-100 text-yellow-700",
  cancelled: "bg-gray-100 text-gray-600",
  expired: "bg-red-100 text-red-700",
};

export default function InsurerReport({ user }) {
  const [brokerFilter, setBrokerFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedInsurer, setSelectedInsurer] = useState("all");

  const { data: policies = [], isLoading } = useQuery({
    queryKey: ["policies-insurer-report"],
    queryFn: () => base44.entities.Policy.list("-created_at", 1000),
    enabled: !!user,
  });

  const { data: brokers = [] } = useQuery({
    queryKey: ["brokers-report"],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user,
  });

  const filtered = policies.filter(p => {
    const matchBroker = brokerFilter === "all" || p.assigned_broker === brokerFilter;
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchInsurer = selectedInsurer === "all" || p.insurer === selectedInsurer;
    return matchBroker && matchStatus && matchInsurer;
  });

  // Insurer summary table data
  const insurerSummary = INSURERS.map(insurer => {
    const ins = filtered.filter(p => p.insurer === insurer);
    return {
      insurer,
      count: ins.length,
      monthly: ins.reduce((s, p) => s + (p.monthly_premium || 0), 0),
      annual: ins.reduce((s, p) => s + (p.premium || (p.monthly_premium || 0) * 12), 0),
      active: ins.filter(p => p.status === "active").length,
    };
  }).filter(r => r.count > 0).sort((a, b) => b.monthly - a.monthly);

  // Pie chart: policies per insurer
  const pieData = insurerSummary.map(r => ({ name: r.insurer, value: r.count }));

  // Bar chart: monthly premium per insurer
  const barData = insurerSummary.map(r => ({ name: r.insurer, monthly: r.monthly }));

  // Broker breakdown per insurer
  const brokerBreakdown = brokers.map(b => {
    const bPolicies = filtered.filter(p => p.assigned_broker === b.email);
    const byInsurer = INSURERS.map(ins => ({
      insurer: ins,
      count: bPolicies.filter(p => p.insurer === ins).length,
      monthly: bPolicies.filter(p => p.insurer === ins).reduce((s, p) => s + (p.monthly_premium || 0), 0),
    })).filter(r => r.count > 0);
    return { broker: b.full_name || b.email, total: bPolicies.length, monthly: bPolicies.reduce((s, p) => s + (p.monthly_premium || 0), 0), byInsurer };
  }).filter(b => b.total > 0).sort((a, b) => b.monthly - a.monthly);

  const totalMonthly = filtered.reduce((s, p) => s + (p.monthly_premium || 0), 0);
  const topInsurer = insurerSummary[0]?.insurer || "—";

  if (isLoading) return <div className="flex justify-center py-16"><RefreshCw className="w-5 h-5 animate-spin text-gray-400" /></div>;

  return (
    <div className="space-y-6">
      {/* Summary KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Total Policies</p>
          <p className="text-2xl font-bold text-[#1a2744] mt-1">{filtered.length}</p>
        </Card>
        <Card className="border-0 shadow-sm p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Total Monthly Premium</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">R{totalMonthly.toLocaleString()}</p>
        </Card>
        <Card className="border-0 shadow-sm p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Top Insurer</p>
          <p className="text-lg font-bold text-[#1a2744] mt-1 truncate">{topInsurer}</p>
          <p className="text-xs text-gray-400">{insurerSummary[0]?.count || 0} policies</p>
        </Card>
        <Card className="border-0 shadow-sm p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Active Policies</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{filtered.filter(p => p.status === "active").length}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm p-4">
        <div className="flex flex-wrap gap-3">
          <Select value={selectedInsurer} onValueChange={setSelectedInsurer}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Insurers" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Insurers</SelectItem>
              {INSURERS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={brokerFilter} onValueChange={setBrokerFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Brokers" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brokers</SelectItem>
              {brokers.map(b => <SelectItem key={b.email} value={b.email}>{b.full_name || b.email}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[#1a2744]">Policies by Insurer</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}>
                    {pieData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[#1a2744]">Monthly Premium by Insurer</CardTitle>
          </CardHeader>
          <CardContent>
            {barData.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `R${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={90} />
                  <Tooltip formatter={v => `R${v.toLocaleString()}`} />
                  <Bar dataKey="monthly" fill="#1a2744" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Insurer Summary Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-[#1a2744]">Policies Per Insurer</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80">
                  <TableHead className="text-xs font-medium">Insurer</TableHead>
                  <TableHead className="text-xs font-medium text-center">Total Policies</TableHead>
                  <TableHead className="text-xs font-medium text-center">Active</TableHead>
                  <TableHead className="text-xs font-medium text-right">Monthly Premium</TableHead>
                  <TableHead className="text-xs font-medium text-right">Annual Premium</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {insurerSummary.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-gray-400 text-sm">No policies found</TableCell>
                  </TableRow>
                ) : insurerSummary.map(row => (
                  <TableRow key={row.insurer} className="hover:bg-blue-50/20">
                    <TableCell className="font-semibold text-sm text-[#1a2744]">{row.insurer}</TableCell>
                    <TableCell className="text-center text-sm">{row.count}</TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">{row.active}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm text-emerald-700">R{row.monthly.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-sm text-gray-600">R{row.annual.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {insurerSummary.length > 0 && (
                  <TableRow className="bg-gray-50 font-semibold">
                    <TableCell className="text-sm">Total</TableCell>
                    <TableCell className="text-center text-sm">{filtered.length}</TableCell>
                    <TableCell className="text-center text-sm">{filtered.filter(p => p.status === "active").length}</TableCell>
                    <TableCell className="text-right text-sm text-emerald-700">R{totalMonthly.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-sm">R{insurerSummary.reduce((s, r) => s + r.annual, 0).toLocaleString()}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Broker Breakdown */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-[#1a2744]">Broker Breakdown by Insurer</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {brokerBreakdown.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">No data</p>
            ) : brokerBreakdown.map((b, i) => (
              <div key={i} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1a2744] to-[#4a90d9] flex items-center justify-center text-white text-xs font-semibold">
                      {b.broker?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{b.broker}</p>
                      <p className="text-xs text-gray-400">{b.total} policies</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm text-emerald-700">R{b.monthly.toLocaleString()}/mo</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 ml-11">
                  {b.byInsurer.map((ins, j) => (
                    <span key={j} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-medium">
                      {ins.insurer} <span className="text-blue-400">·</span> {ins.count} <span className="text-blue-400">·</span> R{ins.monthly.toLocaleString()}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}