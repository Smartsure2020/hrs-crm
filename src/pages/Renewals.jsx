import React, { useState } from "react";
import { base44 } from "@/api/client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, CalendarClock } from "lucide-react";
import moment from "moment";

const STATUS_COLORS = {
  active: "bg-green-100 text-green-700",
  expired: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
  pending: "bg-yellow-100 text-yellow-700",
};

export default function Renewals() {
  const [search, setSearch] = useState("");

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const { data: policies = [], isLoading } = useQuery({
    queryKey: ["renewals", user?.email],
    queryFn: async () => {
      const isAdmin = user?.role === "admin" || user?.role === "admin_staff";
      const all = isAdmin
        ? await base44.entities.Policy.list("-renewal_date")
        : await base44.entities.Policy.filter({ assigned_broker: user?.email }, "-renewal_date");
      // Only show policies with a renewal date
      return all.filter(p => p.renewal_date);
    },
    enabled: !!user,
  });

  const filtered = policies.filter(p => {
    const q = search.toLowerCase();
    return (
      p.client_name?.toLowerCase().includes(q) ||
      p.policy_number?.toLowerCase().includes(q) ||
      p.insurer?.toLowerCase().includes(q)
    );
  });

  const getDaysUntil = (date) => moment(date).diff(moment().startOf("day"), "days");

  const getRenewalBadge = (days) => {
    if (days < 0) return <Badge className="bg-red-100 text-red-700 text-[10px]">Overdue</Badge>;
    if (days <= 30) return <Badge className="bg-orange-100 text-orange-700 text-[10px]">Due in {days}d</Badge>;
    if (days <= 60) return <Badge className="bg-yellow-100 text-yellow-700 text-[10px]">Due in {days}d</Badge>;
    return <Badge className="bg-green-100 text-green-700 text-[10px]">Due in {days}d</Badge>;
  };

  // Sort: overdue first, then soonest
  const sorted = [...filtered].sort((a, b) => moment(a.renewal_date).diff(moment(b.renewal_date)));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-[#1a2744]">Renewals</h2>
          <p className="text-sm text-gray-500 mt-0.5">Track upcoming and overdue policy renewals</p>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          className="pl-9"
          placeholder="Search by client, policy number or insurer..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-[#1a2744] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CalendarClock className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No renewals found</p>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Client</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Policy #</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Insurer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Renewal Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Countdown</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sorted.map(p => {
                const days = getDaysUntil(p.renewal_date);
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{p.client_name || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{p.policy_number}</td>
                    <td className="px-4 py-3 text-gray-600">{p.insurer}</td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{p.policy_type?.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-gray-600">{moment(p.renewal_date).format("D MMM YYYY")}</td>
                    <td className="px-4 py-3">
                      <Badge className={`text-[10px] ${STATUS_COLORS[p.status] || STATUS_COLORS.active}`}>
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{getRenewalBadge(days)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}