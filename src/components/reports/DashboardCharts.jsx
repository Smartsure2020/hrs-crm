import React from "react";
import { base44 } from "@/api/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from "recharts";
import moment from "moment";

const COLORS = ["#1a2744", "#4a90d9", "#e88c3a", "#2ecc71", "#9b59b6", "#e74c3c", "#1abc9c", "#f39c12"];

const STAGE_LABELS = {
  lead_received: "Lead", contacted: "Contacted", quote_requested: "Quote Req.",
  quotes_received: "Quotes Rcvd", quote_sent: "Quote Sent", follow_up: "Follow Up",
  policy_bound: "Bound", lost: "Lost",
  lead: "Lead", quoting: "Quoting", won: "Won",
};

export default function DashboardCharts({ user }) {
  const isAdmin = user?.role === "admin";

  const { data: deals = [], isLoading: loadingDeals } = useQuery({
    queryKey: ["deals-report"],
    queryFn: () => base44.entities.Deal.list("-created_at", 1000),
    enabled: !!user,
  });

  const { data: policies = [] } = useQuery({
    queryKey: ["policies-report"],
    queryFn: () => base44.entities.Policy.list("-created_at", 1000),
    enabled: !!user,
  });

  const { data: brokers = [] } = useQuery({
    queryKey: ["brokers"],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user && isAdmin,
  });

  const pipelineData = Object.entries(STAGE_LABELS).map(([stage, label]) => ({
    name: label,
    count: deals.filter(d => d.stage === stage).length,
    value: deals.filter(d => d.stage === stage).reduce((s, d) => s + (d.estimated_premium || 0), 0)
  })).filter(d => d.count > 0);

  const dealsWon = deals.filter(d => ["won", "policy_bound"].includes(d.stage)).length;
  const dealsLost = deals.filter(d => d.stage === "lost").length;
  const conversionRate = deals.length > 0 ? Math.round((dealsWon / deals.length) * 100) : 0;

  const monthlyData = [];
  for (let i = 5; i >= 0; i--) {
    const m = moment().subtract(i, "months");
    const monthDeals = deals.filter(d =>
      ["won", "policy_bound"].includes(d.stage) &&
      moment(d.created_at).isSame(m, "month")
    );
    monthlyData.push({
      name: m.format("MMM"),
      premium: monthDeals.reduce((s, d) => s + (d.estimated_premium || 0), 0),
      count: monthDeals.length
    });
  }

  const brokerPerformance = brokers.map(b => {
    const brokerDeals = deals.filter(d => d.assigned_broker === b.email);
    const won = brokerDeals.filter(d => ["won", "policy_bound"].includes(d.stage));
    return {
      name: b.full_name || b.email,
      total: brokerDeals.length,
      won: won.length,
      premium: won.reduce((s, d) => s + (d.estimated_premium || 0), 0),
      conversion: brokerDeals.length > 0 ? Math.round((won.length / brokerDeals.length) * 100) : 0
    };
  }).sort((a, b) => b.premium - a.premium);

  const policyTypeData = {};
  policies.forEach(p => {
    const type = p.policy_type || "other";
    policyTypeData[type] = (policyTypeData[type] || 0) + 1;
  });
  const pieData = Object.entries(policyTypeData).map(([name, value]) => ({
    name: name.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
    value
  }));

  const totalPremium = policies.filter(p => p.status === "active").reduce((s, p) => s + (p.premium || 0), 0);
  const renewals30 = policies.filter(p => moment(p.renewal_date).isBetween(moment(), moment().add(30, "days"))).length;
  const renewals90 = policies.filter(p => moment(p.renewal_date).isBetween(moment(), moment().add(90, "days"))).length;

  if (loadingDeals) return <div className="flex justify-center py-16"><RefreshCw className="w-5 h-5 animate-spin text-gray-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Deals Won</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{dealsWon}</p>
          <p className="text-xs text-gray-400 mt-1">Conversion: {conversionRate}%</p>
        </Card>
        <Card className="border-0 shadow-sm p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Deals Lost</p>
          <p className="text-2xl font-bold text-red-500 mt-1">{dealsLost}</p>
          <p className="text-xs text-gray-400 mt-1">of {deals.length} total deals</p>
        </Card>
        <Card className="border-0 shadow-sm p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Total Premium</p>
          <p className="text-2xl font-bold text-[#1a2744] mt-1">R{totalPremium.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">Active policies</p>
        </Card>
        <Card className="border-0 shadow-sm p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Renewals Due</p>
          <p className="text-2xl font-bold text-orange-500 mt-1">{renewals30}</p>
          <p className="text-xs text-gray-400 mt-1">Next 30 days ({renewals90} in 90d)</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[#1a2744]">Pipeline Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={pipelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => `R${v.toLocaleString()}`} />
                <Bar dataKey="value" fill="#1a2744" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[#1a2744]">Monthly Premium Bound</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => `R${v.toLocaleString()}`} />
                <Line type="monotone" dataKey="premium" stroke="#4a90d9" strokeWidth={2} dot={{ r: 4, fill: "#4a90d9" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[#1a2744]">Policy Type Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-[#1a2744]">Broker Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {brokerPerformance.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No data yet</p>}
                {brokerPerformance.map((broker, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1a2744] to-[#4a90d9] flex items-center justify-center text-white text-xs font-semibold">
                        {broker.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{broker.name}</p>
                        <p className="text-xs text-gray-400">{broker.total} deals · {broker.conversion}% conversion</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm text-[#1a2744]">R{broker.premium.toLocaleString()}</p>
                      <p className="text-xs text-emerald-600">{broker.won} won</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}