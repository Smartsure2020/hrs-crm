import React, { useState, useMemo } from "react";
import { base44 } from "@/api/client";
import { useAuth, useUserRole } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Trash2, MoveRight, X } from "lucide-react";
import { useInlineEdit } from "@/hooks/useInlineEdit";
import { toast } from "@/components/ui/use-toast";
import { STAGES, ACTIVE_STAGES, normalizeStage, toDbStage } from "@/components/pipeline/stages";
import DealSection from "@/components/pipeline/DealSection";
import DealFormModal from "@/components/pipeline/DealFormModal";

const ACTIVE_THEME = {
  border: "border-gray-200",
  headerBorder: "border-gray-200",
  headerBg: "bg-gray-50/80",
  headerText: "text-gray-400",
  colBorder: "border-gray-100",
  divide: "divide-gray-100",
  rowSelected: "bg-blue-50",
  rowEditing: "bg-blue-50/30",
  rowHover: "hover:bg-gray-50/70",
};

const WON_THEME = {
  border: "border-emerald-100",
  headerBorder: "border-emerald-100",
  headerBg: "bg-emerald-50/50",
  headerText: "text-emerald-600",
  colBorder: "border-emerald-100",
  divide: "divide-emerald-50",
  titleText: "text-emerald-700",
  badgeBg: "bg-emerald-50",
  badgeBorder: "border-emerald-100",
  rowSelected: "bg-emerald-50",
  rowEditing: "bg-emerald-50/50",
  rowHover: "hover:bg-emerald-50/40",
};

const LOST_THEME = {
  border: "border-red-100",
  headerBorder: "border-red-100",
  headerBg: "bg-red-50/50",
  headerText: "text-red-400",
  colBorder: "border-red-100",
  divide: "divide-red-50",
  titleText: "text-red-600",
  badgeBg: "bg-red-50",
  badgeBorder: "border-red-100",
  rowSelected: "bg-red-50",
  rowEditing: "bg-red-50/50",
  rowHover: "hover:bg-red-50/40",
};

export default function Pipeline() {
  const { user } = useAuth();
  const { isAdmin, isAdminStaff } = useUserRole();
  const [stageFilter, setStageFilter] = useState("all");
  const [selected, setSelected]       = useState(new Set());
  const [editDeal, setEditDeal]       = useState(null);
  const [showNewDeal, setShowNewDeal] = useState(false);
  const queryClient = useQueryClient();

  const edit = useInlineEdit(async (id, field, val) => {
    await base44.entities.Deal.update(id, { [field]: val });
    queryClient.invalidateQueries({ queryKey: ["deals"] });
  });

  const { data: rawDeals = [], isLoading } = useQuery({
    queryKey: ["deals", user?.email],
    queryFn: () => isAdmin
      ? base44.entities.Deal.list("-created_at", 500)
      : base44.entities.Deal.filter({ assigned_broker: user?.email }, "-created_at", 500),
    enabled: !!user,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list", user?.email],
    queryFn: () => isAdmin
      ? base44.entities.Client.list()
      : base44.entities.Client.filter({ assigned_broker: user?.email }),
    enabled: !!user,
  });

  const { data: brokers = [] } = useQuery({
    queryKey: ["brokers-list"],
    queryFn: () => base44.entities.User.list(),
    enabled: !!isAdmin,
  });

  const clientMap = useMemo(() => {
    const m = {};
    clients.forEach(c => { m[c.id] = c; });
    return m;
  }, [clients]);

  const deals = useMemo(
    () => rawDeals.map(d => ({ ...d, _stage: normalizeStage(d.stage) })),
    [rawDeals]
  );

  const activeDeals   = deals.filter(d => d._stage !== "lost" && d._stage !== "won");
  const wonDeals      = deals.filter(d => d._stage === "won");
  const lostDeals     = deals.filter(d => d._stage === "lost");
  const filteredDeals = stageFilter === "all" ? activeDeals : activeDeals.filter(d => d._stage === stageFilter);
  const totalValue    = filteredDeals.reduce((s, d) => s + (d.estimated_premium || 0), 0);

  const handleStageChange = async (id, stage) => {
    await base44.entities.Deal.update(id, { stage: toDbStage(stage) });
    if (stage === "won" || stage === "policy_bound") {
      const deal = rawDeals.find(d => d.id === id);
      if (deal?.client_id) {
        await base44.entities.Client.update(deal.client_id, { status: "active" });
        queryClient.invalidateQueries({ queryKey: ["clients"] });
        queryClient.invalidateQueries({ queryKey: ["clients-list"] });
      }
    }
    queryClient.invalidateQueries({ queryKey: ["deals"] });
  };

  const toggleSelect   = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const clearSelection = () => setSelected(new Set());

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selected.size} deal(s)?`)) return;
    await Promise.all([...selected].map(id => base44.entities.Deal.delete(id)));
    queryClient.invalidateQueries({ queryKey: ["deals"] });
    clearSelection();
  };

  const handleBulkMove = async (stage) => {
    await Promise.all([...selected].map(id => base44.entities.Deal.update(id, { stage: toDbStage(stage) })));
    queryClient.invalidateQueries({ queryKey: ["deals"] });
    clearSelection();
  };

  const handleAddRow = async () => {
    const uiStage = stageFilter !== "all" ? stageFilter : "lead";
    try {
      await base44.entities.Deal.create({
        client_name: "New Lead", stage: toDbStage(uiStage),
        assigned_broker: user?.email, broker_name: user?.full_name,
      });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    } catch (err) {
      toast({ title: "Failed to add row", description: err?.message ?? "Unknown error", variant: "destructive" });
    }
  };

  const sharedProps = { edit, selected, toggleSelect, handleStageChange, setEditDeal, clientMap };

  const modalProps = { user, clients, isAdmin, brokers, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deals"] }) };

  if (!user) return (
    <div className="flex items-center justify-center h-full">
      <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
    </div>
  );

  if (isAdminStaff) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-gray-400">Access denied. Pipeline is not available for your role.</p>
    </div>
  );

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#1a2744]">Deals & Leads</h2>
          <p className="text-sm text-gray-400">
            {filteredDeals.length} deal{filteredDeals.length !== 1 ? "s" : ""} · R {totalValue.toLocaleString()} total
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setShowNewDeal(true)} className="bg-[#1a2744] hover:bg-[#243556] text-white h-8 px-3 text-sm">
            <Plus className="w-4 h-4 mr-1" /> Add Lead
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 hidden sm:block">Filter by stage:</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setStageFilter("all")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                  stageFilter === "all"
                    ? "bg-[#1a2744] text-white border-[#1a2744]"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                }`}
              >All</button>
              {ACTIVE_STAGES.map(s => (
                <button
                  key={s.value}
                  onClick={() => setStageFilter(stageFilter === s.value ? "all" : s.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                    stageFilter === s.value
                      ? `${s.color} border-current`
                      : "bg-white text-gray-400 border-gray-200 hover:border-gray-300 hover:text-gray-600"
                  }`}
                >{s.label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-[#1a2744] text-white px-4 py-2.5 rounded-xl">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="flex items-center gap-2 ml-auto">
            <Select onValueChange={handleBulkMove}>
              <SelectTrigger className="h-8 text-xs bg-white/10 border-white/20 text-white w-44">
                <span className="flex items-center gap-1.5"><MoveRight className="w-3.5 h-3.5" />Move to stage...</span>
              </SelectTrigger>
              <SelectContent>
                {STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="ghost" onClick={handleBulkDelete} className="h-8 text-red-300 hover:text-red-200 hover:bg-red-500/20">
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
            </Button>
            <Button size="sm" variant="ghost" onClick={clearSelection} className="h-8 text-white/60 hover:text-white hover:bg-white/10">
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      <DealSection
        deals={filteredDeals}
        theme={ACTIVE_THEME}
        showAddRow
        onAddRow={handleAddRow}
        isLoading={isLoading}
        {...sharedProps}
      />

      {wonDeals.length > 0 && (
        <DealSection
          deals={wonDeals}
          theme={WON_THEME}
          title="Won Deals"
          subtitle={`${wonDeals.length} · R ${wonDeals.reduce((s, d) => s + (d.estimated_premium || 0), 0).toLocaleString()} bound`}
          {...sharedProps}
        />
      )}

      {lostDeals.length > 0 && (
        <DealSection
          deals={lostDeals}
          theme={LOST_THEME}
          title="Lost Leads"
          subtitle={`${lostDeals.length} · Follow up to re-engage`}
          {...sharedProps}
        />
      )}

      <DealFormModal
        open={!!editDeal}
        onClose={() => setEditDeal(null)}
        deal={editDeal}
        {...modalProps}
      />
      <DealFormModal
        open={showNewDeal}
        onClose={() => setShowNewDeal(false)}
        deal={null}
        {...modalProps}
      />
    </div>
  );
}
