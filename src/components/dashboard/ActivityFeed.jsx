import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, Briefcase, Shield, CheckSquare, FileText } from "lucide-react";
import moment from "moment";

const iconMap = {
  client: Users,
  deal: Briefcase,
  policy: Shield,
  task: CheckSquare,
  document: FileText,
};

const colorMap = {
  client: "bg-blue-100 text-blue-600",
  deal: "bg-purple-100 text-purple-600",
  policy: "bg-emerald-100 text-emerald-600",
  task: "bg-orange-100 text-orange-600",
  document: "bg-cyan-100 text-cyan-600",
};

export default function ActivityFeed({ activities }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-[#1a2744]">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-h-[380px] overflow-y-auto">
        {activities.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">No recent activity</p>
        )}
        {activities.map((activity) => {
          const Icon = iconMap[activity.entity_type] || Briefcase;
          const colors = colorMap[activity.entity_type] || colorMap.deal;
          return (
            <div key={activity.id} className="flex items-start gap-3 group">
              <div className={`p-1.5 rounded-lg ${colors} flex-shrink-0 mt-0.5`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 leading-snug">{activity.action}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {activity.user_name || activity.user_email} · {moment(activity.created_at).fromNow()}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}