import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import moment from "moment";

const priorityColors = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

export default function UpcomingTasks({ tasks, onComplete }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-[#1a2744]">Upcoming Tasks</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[380px] overflow-y-auto">
        {tasks.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">No upcoming tasks</p>
        )}
        {tasks.map((task) => {
          const isOverdue = moment(task.due_date).isBefore(moment(), "day");
          const isToday = moment(task.due_date).isSame(moment(), "day");
          return (
            <div
              key={task.id}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-all hover:shadow-sm ${
                isOverdue ? "border-red-200 bg-red-50/50" : "border-gray-100 bg-white"
              }`}
            >
              <button
                onClick={() => onComplete(task)}
                className="mt-0.5 text-gray-300 hover:text-emerald-500 transition-colors flex-shrink-0"
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
                {task.client_name && (
                  <p className="text-xs text-gray-400 mt-0.5">{task.client_name}</p>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge className={`text-[10px] px-1.5 py-0 ${priorityColors[task.priority]}`}>
                    {task.priority}
                  </Badge>
                  <span className={`text-[10px] flex items-center gap-1 ${
                    isOverdue ? "text-red-500" : isToday ? "text-orange-500" : "text-gray-400"
                  }`}>
                    {isOverdue ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {isOverdue ? "Overdue" : isToday ? "Today" : moment(task.due_date).format("MMM D")}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}