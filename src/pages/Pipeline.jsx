import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DragDropContext } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, RefreshCw } from "lucide-react";
import PipelineColumn from "@/components/pipeline/PipelineColumn";
import DealFormModal from "@/components/pipeline/DealFormModal";

const STAGES = [
  { value: "lead_received", label: "Lead Received" },
  { value: "contacted", label: "Contacted" },
  { value: "quote_requested", label: "Quote Requested" },
  { value: "quotes_received", label: "Quotes Received" },
  { value: "quote_sent", label: "Quote Sent" },
  { value: "follow_up", label: "Follow Up" },
  { value: "policy_bound", label: "Policy Bound" },
  { value: "lost", label: "Lost" },
];

export default function Pipeline() {
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editDeal, setEditDeal] = useState(null);
  const [brokerFilter, setBrokerFilter] = useState("all");
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === "admin";

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["deals", user?.email],
    queryFn: () => isAdmin
      ? base44.entities.Deal.list("-created_date", 500)
      : base44.entities.Deal.filter({ assigned_broker: user?.email }, "-created_date", 500),
    enabled: !!user,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list", user?.email],
    queryFn: () => isAdmin
      ? base44.entities.Client.list("-created_date", 500)
      : base44.entities.Client.filter({ assigned_broker: user?.email }, "-created_date", 500),
    enabled: !!user,
  });

  const { data: brokers = [] } = useQuery({
    queryKey: ["brokers"],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user && isAdmin,
  });

  const filteredDeals = brokerFilter === "all" ? deals : deals.filter(d => d.assigned_broker === brokerFilter);

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStage = destination.droppableId;
    const deal = deals.find(d => d.id === draggableId);
    if (!deal || deal.stage === newStage) return;
    await base44.entities.Deal.update(draggableId, { stage: newStage });
    await base44.entities.ActivityLog.create({
      action: `Moved deal "${deal.client_name}" to ${newStage.replace(/_/g," ")}`,
      entity_type: "deal", entity_id: draggableId, entity_name: deal.client_name,
      user_email: user?.email, user_name: user?.full_name
    });
    queryClient.invalidateQueries({ queryKey: ["deals"] });
  };

  if (!user) {
    return <div className="flex items-center justify-center h-full"><RefreshCw className="w-5 h-5 animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="p-4 lg:p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5 flex-shrink-0">
        <div>
          <h2 className="text-xl font-bold text-[#1a2744]">Sales Pipeline</h2>
          <p className="text-sm text-gray-400">{filteredDeals.length} deals · R{filteredDeals.reduce((s,d)=>s+(d.estimated_premium||0),0).toLocaleString()} total</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Select value={brokerFilter} onValueChange={setBrokerFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Brokers" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brokers</SelectItem>
                {brokers.map(b => <SelectItem key={b.email} value={b.email}>{b.full_name || b.email}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Button onClick={() => { setEditDeal(null); setShowForm(true); }} className="bg-[#1a2744] hover:bg-[#243556]">
            <Plus className="w-4 h-4 mr-2" /> New Deal
          </Button>
        </div>
      </div>

      {/* Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex gap-4 min-h-full">
            {STAGES.map(stage => (
              <PipelineColumn
                key={stage.value}
                stage={stage.value}
                label={stage.label}
                deals={filteredDeals.filter(d => d.stage === stage.value)}
                onDealClick={(deal) => { setEditDeal(deal); setShowForm(true); }}
              />
            ))}
          </div>
        </div>
      </DragDropContext>

      <DealFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditDeal(null); }}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["deals"] })}
        user={user}
        deal={editDeal}
        clients={clients}
      />
    </div>
  );
}