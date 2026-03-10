import React from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Clock, User, DollarSign } from "lucide-react";
import moment from "moment";

const STAGE_COLORS = {
  lead_received: "border-t-gray-400",
  contacted: "border-t-blue-400",
  quote_requested: "border-t-indigo-400",
  quotes_received: "border-t-purple-400",
  quote_sent: "border-t-violet-400",
  follow_up: "border-t-orange-400",
  policy_bound: "border-t-emerald-400",
  lost: "border-t-red-400",
};

const STAGE_BG = {
  lead_received: "bg-gray-50",
  contacted: "bg-blue-50",
  quote_requested: "bg-indigo-50",
  quotes_received: "bg-purple-50",
  quote_sent: "bg-violet-50",
  follow_up: "bg-orange-50",
  policy_bound: "bg-emerald-50",
  lost: "bg-red-50",
};

export default function PipelineColumn({ stage, label, deals, onDealClick }) {
  const total = deals.reduce((sum, d) => sum + (d.estimated_premium || 0), 0);

  return (
    <div className="flex flex-col w-[280px] min-w-[280px] flex-shrink-0">
      {/* Column header */}
      <div className={`p-3 rounded-t-xl ${STAGE_BG[stage]} border-t-2 ${STAGE_COLORS[stage]}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{label}</h3>
          <Badge variant="secondary" className="text-[10px] bg-white/70">{deals.length}</Badge>
        </div>
        <p className="text-[10px] text-gray-400 mt-1">R{total.toLocaleString()}</p>
      </div>

      {/* Droppable area */}
      <Droppable droppableId={stage}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 p-2 space-y-2 min-h-[200px] rounded-b-xl transition-colors ${
              snapshot.isDraggingOver ? "bg-blue-50/50" : "bg-gray-50/30"
            }`}
          >
            {deals.map((deal, index) => (
              <Draggable key={deal.id} draggableId={deal.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    onClick={() => onDealClick(deal)}
                  >
                    <Card className={`p-3 border-0 shadow-sm hover:shadow-md transition-all cursor-pointer ${
                      snapshot.isDragging ? "shadow-lg ring-2 ring-blue-200 rotate-1" : ""
                    }`}>
                      <p className="font-medium text-sm text-gray-800">{deal.client_name}</p>
                      <p className="text-xs text-gray-400 mt-0.5 capitalize">{deal.policy_type?.replace(/_/g," ")}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1 text-[10px] text-gray-500">
                          <DollarSign className="w-3 h-3" />R{deal.estimated_premium?.toLocaleString() || 0}
                        </span>
                        {deal.broker_name && (
                          <span className="flex items-center gap-1 text-[10px] text-gray-400">
                            <User className="w-3 h-3" />{deal.broker_name.split(" ")[0]}
                          </span>
                        )}
                      </div>
                      {deal.reminder_date && (
                        <div className={`flex items-center gap-1 mt-2 text-[10px] ${
                          moment(deal.reminder_date).isBefore(moment(), "day") ? "text-red-500" : "text-gray-400"
                        }`}>
                          <Clock className="w-3 h-3" />{moment(deal.reminder_date).format("MMM D")}
                        </div>
                      )}
                    </Card>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}