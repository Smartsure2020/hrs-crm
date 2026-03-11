import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Users, Briefcase, Shield, CheckSquare, Send,
  Clock, AlertTriangle, Plus, RefreshCw, UserCog
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import moment from "moment";

import StatCard from "@/components/dashboard/StatCard";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import UpcomingTasks from "@/components/dashboard/UpcomingTasks";
import QuickAddLeadModal from "@/components/shared/QuickAddLeadModal";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [showAddLead, setShowAddLead] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === "admin";
  const brokerFilter = isAdmin ? {} : { assigned_broker: user?.email };
  const taskFilter = isAdmin ? {} : { assigned_to: user?.email };

  const { data: clients = [] } = useQuery({
    queryKey: ["clients", user?.email],
    queryFn: () => isAdmin
      ? base44.entities.Client.list()
      : base44.entities.Client.filter(brokerFilter),
    enabled: !!user,
  });

  const { data: deals = [] } = useQuery({
    queryKey: ["deals", user?.email],
    queryFn: () => isAdmin
      ? base44.entities.Deal.list()
      : base44.entities.Deal.filter(brokerFilter),
    enabled: !!user,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", user?.email],
    queryFn: () => isAdmin
      ? base44.entities.Task.list("-due_date", 100)
      : base44.entities.Task.filter(taskFilter, "-due_date", 100),
    enabled: !!user,
  });

  const { data: policies = [] } = useQuery({
    queryKey: ["policies", user?.email],
    queryFn: () => isAdmin
      ? base44.entities.Policy.list()
      : base44.entities.Policy.filter(brokerFilter),
    enabled: !!user,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["activities"],
    queryFn: () => base44.entities.ActivityLog.list("-created_date", 20),
    enabled: !!user,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["all-users"],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user && isAdmin,
    refetchInterval: 60000,
  });

  const pendingCount = isAdmin
    ? allUsers.filter(u => !u.status || u.status === "pending").length
    : 0;

  const completeTask = useMutation({
    mutationFn: (task) => base44.entities.Task.update(task.id, { status: "completed" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const totalLeads = deals.filter(d => ["lead","lead_received","contacted"].includes(d.stage)).length;
  const quotesSent = deals.filter(d => ["quote_sent","quotes_received"].includes(d.stage)).length;
  const policyBound = deals.filter(d => ["won","policy_bound"].includes(d.stage)).length;
  const renewalsDue = policies.filter(p => {
    const renewal = moment(p.renewal_date);
    return renewal.isBetween(moment(), moment().add(30, "days"));
  }).length;
  const tasksDueToday = tasks.filter(t => moment(t.due_date).isSame(moment(), "day") && t.status !== "completed").length;
  const tasksOverdue = tasks.filter(t => moment(t.due_date).isBefore(moment(), "day") && t.status !== "completed").length;

  const upcomingTasks = tasks
    .filter(t => t.status !== "completed")
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 10);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#1a2744]">
            Welcome back, {user.full_name?.split(" ")[0] || "User"}
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">{moment().format("dddd, MMMM D, YYYY")}</p>
        </div>
        <Button onClick={() => setShowAddLead(true)} className="bg-[#1a2744] hover:bg-[#243556]">
          <Plus className="w-4 h-4 mr-2" /> Add Lead
        </Button>
      </div>

      {/* Pending users alert for admin */}
      {isAdmin && pendingCount > 0 && (
        <Link to={createPageUrl("UserManagement")} className="block">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3 hover:bg-yellow-100 transition-colors cursor-pointer">
            <div className="w-9 h-9 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
              <UserCog className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-yellow-800 text-sm">
                {pendingCount} user{pendingCount !== 1 ? "s" : ""} awaiting approval
              </p>
              <p className="text-yellow-600 text-xs">Click to review in User Management →</p>
            </div>
          </div>
        </Link>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Total Leads" value={totalLeads} icon={Users} color="blue" />
        <StatCard title="Quotes Sent" value={quotesSent} icon={Send} color="purple" />
        <StatCard title="Policies Bound" value={policyBound} icon={Shield} color="green" />
        <StatCard title="Renewals Due" value={renewalsDue} icon={Clock} color="orange" />
        <StatCard title="Due Today" value={tasksDueToday} icon={CheckSquare} color="cyan" />
        <StatCard title="Overdue" value={tasksOverdue} icon={AlertTriangle} color="red" />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UpcomingTasks tasks={upcomingTasks} onComplete={(task) => completeTask.mutate(task)} />
        <ActivityFeed activities={activities} />
      </div>

      <QuickAddLeadModal
        open={showAddLead}
        onClose={() => setShowAddLead(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["clients"] });
          queryClient.invalidateQueries({ queryKey: ["deals"] });
          queryClient.invalidateQueries({ queryKey: ["activities"] });
        }}
        user={user}
      />
    </div>
  );
}