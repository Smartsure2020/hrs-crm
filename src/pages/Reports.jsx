import React, { useState, useEffect } from "react";
import { base44 } from "@/api/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, BarChart3, ShieldAlert, ChevronRight } from "lucide-react";
import ClientReport from "@/components/reports/ClientReport";
import DashboardCharts from "@/components/reports/DashboardCharts";
import InsurerReport from "@/components/reports/InsurerReport";

const REPORTS = [
  {
    id: "client_report",
    name: "Client Report",
    description: "Full client data export with filtering by advisor, type, date range, and tags.",
    category: "Clients",
  },
  {
    id: "dashboard_charts",
    name: "Pipeline & Performance Charts",
    description: "Visual charts for pipeline distribution, monthly premiums, broker performance, and renewals.",
    category: "Pipeline",
  },
  {
    id: "insurer_report",
    name: "Insurer Report",
    description: "Policies per insurer, monthly premium totals by insurer, and broker breakdown. Includes pie and bar charts.",
    category: "Policies",
  },
];

export default function Reports() {
  const [user, setUser] = useState(null);
  const [activeReport, setActiveReport] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isPrivileged = user?.role === "admin" || user?.role === "manager";

  if (!user) {
    return <div className="flex items-center justify-center h-full"><RefreshCw className="w-5 h-5 animate-spin text-gray-400" /></div>;
  }

  if (!isPrivileged) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <ShieldAlert className="w-10 h-10 text-red-400" />
        <p className="text-gray-500 font-medium">Access Denied</p>
        <p className="text-sm text-gray-400">Reports are only available to Admin and Manager roles.</p>
      </div>
    );
  }

  const report = REPORTS.find(r => r.id === activeReport);

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#1a2744]">Reports</h2>
          <p className="text-sm text-gray-400">Generate and export structured reports</p>
        </div>
        {activeReport && (
          <Button variant="outline" size="sm" onClick={() => setActiveReport(null)}>
            ← Back to Reports
          </Button>
        )}
      </div>

      {!activeReport ? (
        /* Report selection menu */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {REPORTS.map(r => (
            <Card
              key={r.id}
              className="border-0 shadow-sm p-5 cursor-pointer hover:shadow-md hover:ring-1 hover:ring-[#1a2744]/20 transition-all group"
              onClick={() => setActiveReport(r.id)}
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 bg-[#1a2744]/10 rounded-lg flex items-center justify-center mb-3">
                  <BarChart3 className="w-5 h-5 text-[#1a2744]" />
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#1a2744] transition-colors mt-1" />
              </div>
              <p className="font-semibold text-sm text-[#1a2744]">{r.name}</p>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">{r.description}</p>
              <span className="inline-block mt-3 px-2 py-0.5 rounded text-[10px] bg-blue-50 text-blue-600 font-medium">{r.category}</span>
            </Card>
          ))}
          {/* Placeholder for future reports */}
          <Card className="border-2 border-dashed border-gray-200 p-5 flex flex-col items-center justify-center text-center gap-2 min-h-[140px]">
            <BarChart3 className="w-6 h-6 text-gray-200" />
            <p className="text-xs text-gray-300 font-medium">More reports coming soon</p>
          </Card>
        </div>
      ) : activeReport === "client_report" ? (
        <ClientReport user={user} />
      ) : activeReport === "dashboard_charts" ? (
        <DashboardCharts user={user} />
      ) : activeReport === "insurer_report" ? (
        <InsurerReport user={user} />
      ) : null}
    </div>
  );
}