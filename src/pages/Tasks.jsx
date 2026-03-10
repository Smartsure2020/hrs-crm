import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Search, CheckCircle2, Circle, Clock, AlertTriangle,
  RefreshCw, Calendar
} from "lucide-react";
import moment from "moment";
import TaskFormModal from "@/components/tasks/TaskFormModal";

const PRIORITY_COLORS = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const STATUS_ICONS = {
  pending: Circle, in_progress: Clock, completed: CheckCircle2, overdue: AlertTriangle
};

export default function Tasks() {
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === "admin";

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", user?.email],
    queryFn: () => isAdmin
      ? base44.entities.Task.list("-due_date", 500)
      : base44.entities.Task.filter({ assigned_to: user?.email }, "-due_date", 500),
    enabled: !!user,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list", user?.email],
    queryFn: () => isAdmin
      ? base44.entities.Client.list("-created_date", 500)
      : base44.entities.Client.filter({ assigned_broker: user?.email }, "-created_date", 500),
    enabled: !!user,
  });

  const toggleComplete = useMutation({
    mutationFn: (task) => base44.entities.Task.update(task.id, {
      status: task.status === "completed" ? "pending" : "completed"
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const filtered = tasks.filter(t => {
    const matchSearch = !search || t.title?.toLowerCase().includes(search.toLowerCase()) || t.client_name?.toLowerCase().includes(search.toLowerCase());
    if (statusFilter === "active") return matchSearch && t.status !== "completed";
    if (statusFilter === "completed") return matchSearch && t.status === "completed";
    if (statusFilter === "overdue") return matchSearch && moment(t.due_date).isBefore(moment(), "day") && t.status !== "completed";
    if (statusFilter === "today") return matchSearch && moment(t.due_date).isSame(moment(), "day") && t.status !== "completed";
    return matchSearch;
  }).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  if (!user) {
    return <div className="flex items-center justify-center h-full"><RefreshCw className="w-5 h-5 animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#1a2744]">Tasks & Reminders</h2>
          <p className="text-sm text-gray-400">{filtered.length} task{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => { setEditTask(null); setShowForm(true); }} className="bg-[#1a2744] hover:bg-[#243556]">
          <Plus className="w-4 h-4 mr-2" /> New Task
        </Button>
      </div>

      <Card className="p-4 border-0 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="bg-gray-100">
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="overdue">Overdue</TabsTrigger>
              <TabsTrigger value="completed">Done</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </Card>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <Card className="border-0 shadow-sm p-12 text-center text-gray-400">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No tasks found
          </Card>
        )}
        {filtered.map(task => {
          const isOverdue = moment(task.due_date).isBefore(moment(), "day") && task.status !== "completed";
          const isToday = moment(task.due_date).isSame(moment(), "day");
          const StatusIcon = STATUS_ICONS[task.status] || Circle;

          return (
            <Card
              key={task.id}
              className={`border-0 shadow-sm p-4 hover:shadow-md transition-all cursor-pointer ${
                isOverdue ? "border-l-4 border-l-red-400" : task.status === "completed" ? "opacity-60" : ""
              }`}
              onClick={() => { setEditTask(task); setShowForm(true); }}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={(e) => { e.stopPropagation(); toggleComplete.mutate(task); }}
                  className={`mt-0.5 flex-shrink-0 transition-colors ${
                    task.status === "completed" ? "text-emerald-500" : "text-gray-300 hover:text-emerald-400"
                  }`}
                >
                  <StatusIcon className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`font-medium text-sm ${task.status === "completed" ? "line-through text-gray-400" : "text-gray-800"}`}>
                        {task.title}
                      </p>
                      {task.client_name && <p className="text-xs text-gray-400 mt-0.5">{task.client_name}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge className={`text-[10px] ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`text-xs flex items-center gap-1 ${isOverdue ? "text-red-500 font-medium" : isToday ? "text-orange-500" : "text-gray-400"}`}>
                      <Calendar className="w-3 h-3" />
                      {isOverdue ? "Overdue · " : ""}{moment(task.due_date).format("MMM D, YYYY")}
                    </span>
                    {task.assigned_name && (
                      <span className="text-xs text-gray-400">{task.assigned_name}</span>
                    )}
                    <span className="text-xs text-gray-300 capitalize">{task.task_type?.replace(/_/g," ")}</span>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <TaskFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditTask(null); }}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["tasks"] })}
        user={user}
        task={editTask}
        clients={clients}
      />
    </div>
  );
}