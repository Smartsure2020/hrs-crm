import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronDown, Plus, RefreshCw, Trash2, MoveRight, X } from "lucide-react";

const STAGES = [
  { value: "lead",       label: "Lead",                  color: "bg-blue-100 text-blue-700" },
  { value: "quoting",    label: "Quoting",               color: "bg-purple-100 text-purple-700" },
  { value: "quote_sent", label: "Quote Sent to Client",  color: "bg-indigo-100 text-indigo-700" },
  { value: "follow_up",  label: "Follow Up",             color: "bg-orange-100 text-orange-700" },
  { value: "won",        label: "Won",                   color: "bg-emerald-100 text-emerald-700" },
  { value: "lost",       label: "Lost",                  color: "bg-red-100 text-red-500" },
];

// Legacy stage values from older data
const LEGACY_MAP = {
  lead_received: "lead", contacted: "lead",
  quote_requested: "quoting", quotes_received: "quoting",
  quote_sent: "quote_sent", follow_up: "follow_up",
  policy_bound: "won", lost: "lost",
};

const normalizeStage = (s) => LEGACY_MAP[s] || s || "lead";
const getStageConf = (s) => STAGES.find(x => x.value === s) || STAGES[0];

const COL_WIDTHS = "grid-cols-[2fr_1.5fr_1.7fr_3fr_1.2fr]";

export default function Pipeline() {
  const [user, setUser]           = useState(null);
  const [stageFilter, setStageFilter] = useState("all");
  const [editingCell, setEditingCell] = useState(null);
  const [pending, setPending]     = useState({});
  const [selected, setSelected]   = useState(new Set());
  const [bulkStage, setBulkStage] = useState("");
  const queryClient               = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === "admin";

  const { data: rawDeals = [], isLoading } = useQuery({
    queryKey: ["deals", user?.email],
    queryFn: () => isAdmin
      ? base44.entities.Deal.list("-created_date", 500)
      : base44.entities.Deal.filter({ assigned_broker: user?.email }, "-created_date", 500),
    enabled: !!user,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list", user?.email],
    queryFn: () => isAdmin
      ? base44.entities.Client.list()
      : base44.entities.Client.filter({ assigned_broker: user?.email }),
    enabled: !!user,
  });

  const clientMap = useMemo(() => {
    const m = {};
    clients.forEach(c => { m[c.id] = c; });
    return m;
  }, [clients]);

  const deals = useMemo(() =>
    rawDeals.map(d => ({ ...d, _stage: normalizeStage(d.stage) })),
    [rawDeals]
  );

  const filteredDeals = stageFilter === "all"
    ? deals
    : deals.filter(d => d._stage === stageFilter);

  const totalValue = filteredDeals.reduce((s, d) => s + (d.estimated_premium || 0), 0);

  // ── edit helpers ──────────────────────────────────────────────
  const key = (id, field) => `${id}.${field}`;

  const startEdit = (id, field, val) => {
    setEditingCell({ id, field });
    setPending(p => ({ ...p, [key(id, field)]: val ?? "" }));
  };

  const getPending = (id, field, fallback) => {
    const k = key(id, field);
    return pending[k] !== undefined ? pending[k] : (fallback ?? "");
  };

  const saveField = async (id, field) => {
    const k = key(id, field);
    let val = pending[k];
    if (val === undefined) { setEditingCell(null); return; }
    if (field === "estimated_premium") val = parseFloat(val) || 0;
    await base44.entities.Deal.update(id, { [field]: val });
    queryClient.invalidateQueries({ queryKey: ["deals"] });
    setEditingCell(null);
  };

  const onKeyDown = (e, id, field) => {
    if (e.key === "Enter" && field !== "notes") saveField(id, field);
    if (e.key === "Escape") setEditingCell(null);
  };

  const handleStageChange = async (id, stage) => {
    await base44.entities.Deal.update(id, { stage });
    queryClient.invalidateQueries({ queryKey: ["deals"] });
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selected.size} deal(s)?`)) return;
    await Promise.all([...selected].map(id => base44.entities.Deal.delete(id)));
    queryClient.invalidateQueries({ queryKey: ["deals"] });
    clearSelection();
  };

  const handleBulkMove = async (stage) => {
    await Promise.all([...selected].map(id => base44.entities.Deal.update(id, { stage })));
    queryClient.invalidateQueries({ queryKey: ["deals"] });
    clearSelection();
  };

  const handleAddRow = async () => {

  // ── cell renderers ────────────────────────────────────────────
  const isEdit = (id, field) => editingCell?.id === id && editingCell?.field === field;

  const TextCell = ({ deal, field, placeholder }) => {
    const val = deal[field] || "";
    return isEdit(deal.id, field) ? (
      <Input
        autoFocus
        value={getPending(deal.id, field, val)}
        onChange={e => setPending(p => ({ ...p, [key(deal.id, field)]: e.target.value }))}
        onBlur={() => saveField(deal.id, field)}
        onKeyDown={e => onKeyDown(e, deal.id, field)}
        className="h-7 text-sm border-[#1a2744]/25 focus-visible:ring-[#1a2744]/20"
      />
    ) : (
      <div
        onClick={() => startEdit(deal.id, field, val)}
        className="cursor-text min-h-[26px] flex items-center text-sm text-gray-800 hover:bg-[#1a2744]/5 rounded px-1.5 py-0.5 -mx-1.5 transition-colors"
      >
        {val || <span className="text-gray-300 text-xs italic">{placeholder}</span>}
      </div>
    );
  };

  const ContactCell = ({ deal }) => {
    const client = clientMap[deal.client_id];
    const phone = deal.contact_phone || client?.phone || "";
    const email = deal.contact_email || client?.email || "";

    return (
      <div className="space-y-0.5">
        {isEdit(deal.id, "contact_phone") ? (
          <Input autoFocus value={getPending(deal.id, "contact_phone", phone)}
            onChange={e => setPending(p => ({ ...p, [key(deal.id, "contact_phone")]: e.target.value }))}
            onBlur={() => saveField(deal.id, "contact_phone")}
            onKeyDown={e => onKeyDown(e, deal.id, "contact_phone")}
            className="h-6 text-xs" placeholder="+27..." />
        ) : (
          <div onClick={() => startEdit(deal.id, "contact_phone", phone)}
            className="cursor-text text-xs text-gray-700 hover:bg-[#1a2744]/5 rounded px-1.5 py-0.5 -mx-1.5 transition-colors">
            {phone || <span className="text-gray-300 italic">Phone</span>}
          </div>
        )}
        {isEdit(deal.id, "contact_email") ? (
          <Input autoFocus value={getPending(deal.id, "contact_email", email)}
            onChange={e => setPending(p => ({ ...p, [key(deal.id, "contact_email")]: e.target.value }))}
            onBlur={() => saveField(deal.id, "contact_email")}
            onKeyDown={e => onKeyDown(e, deal.id, "contact_email")}
            className="h-6 text-xs" placeholder="email@..." />
        ) : (
          <div onClick={() => startEdit(deal.id, "contact_email", email)}
            className="cursor-text text-xs text-gray-400 hover:bg-[#1a2744]/5 rounded px-1.5 py-0.5 -mx-1.5 transition-colors">
            {email || <span className="text-gray-300 italic">Email</span>}
          </div>
        )}
      </div>
    );
  };

  const NotesCell = ({ deal }) => {
    const val = deal.notes || "";
    return isEdit(deal.id, "notes") ? (
      <textarea autoFocus
        value={getPending(deal.id, "notes", val)}
        onChange={e => setPending(p => ({ ...p, [key(deal.id, "notes")]: e.target.value }))}
        onBlur={() => saveField(deal.id, "notes")}
        onKeyDown={e => { if (e.key === "Escape") setEditingCell(null); }}
        className="w-full text-sm border border-[#1a2744]/25 rounded p-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-[#1a2744]/20 min-h-[64px]"
        rows={3}
      />
    ) : (
      <div onClick={() => startEdit(deal.id, "notes", val)}
        className="cursor-text min-h-[26px] text-sm text-gray-600 hover:bg-[#1a2744]/5 rounded px-1.5 py-0.5 -mx-1.5 transition-colors leading-snug"
        style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {val || <span className="text-gray-300 text-xs italic">Add notes…</span>}
      </div>
    );
  };

  const ValueCell = ({ deal }) => {
    const val = deal.estimated_premium ?? 0;
    return isEdit(deal.id, "estimated_premium") ? (
      <Input autoFocus type="number"
        value={getPending(deal.id, "estimated_premium", val)}
        onChange={e => setPending(p => ({ ...p, [key(deal.id, "estimated_premium")]: e.target.value }))}
        onBlur={() => saveField(deal.id, "estimated_premium")}
        onKeyDown={e => onKeyDown(e, deal.id, "estimated_premium")}
        className="h-7 text-sm w-full"
      />
    ) : (
      <div onClick={() => startEdit(deal.id, "estimated_premium", val)}
        className="cursor-text text-sm font-medium text-gray-800 hover:bg-[#1a2744]/5 rounded px-1.5 py-0.5 -mx-1.5 transition-colors tabular-nums">
        {val ? `R ${Number(val).toLocaleString()}` : <span className="text-gray-300 font-normal text-xs italic">—</span>}
      </div>
    );
  };

  if (!user) return (
    <div className="flex items-center justify-center h-full">
      <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
    </div>
  );

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#1a2744]">Deals & Leads</h2>
          <p className="text-sm text-gray-400">
            {filteredDeals.length} deal{filteredDeals.length !== 1 ? "s" : ""} · R {totalValue.toLocaleString()} total
          </p>
        </div>
        {/* Stage filter */}
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
            {STAGES.map(s => (
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

      {/* ── Bulk Action Bar ── */}
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

      {/* ── Table ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

        {/* Column headers */}
        <div className={`grid ${COL_WIDTHS} border-b border-gray-200 bg-gray-50/80`}>
          {["Name", "Contact Details", "Stage", "Notes", "Est. Value (R)"].map((col, i) => (
            <div key={i} className={`px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider ${i > 0 ? "border-l border-gray-100" : "pl-10"}`}>
              {col}
            </div>
          ))}
        </div>

        {/* Rows */}
        <div className="divide-y divide-gray-100">
          {isLoading && (
            <div className="py-16 flex justify-center">
              <RefreshCw className="w-5 h-5 animate-spin text-gray-300" />
            </div>
          )}

          {!isLoading && filteredDeals.length === 0 && (
            <div className="py-16 text-center text-gray-400 text-sm">
              No deals found. Click <span className="font-medium text-gray-600">+ Add Lead</span> below to get started.
            </div>
          )}

          {filteredDeals.map(deal => {
            const stageConf = getStageConf(deal._stage);
            const isActive = editingCell?.id === deal.id;
            const isSelected = selected.has(deal.id);

            return (
              <div
                key={deal.id}
                className={`grid ${COL_WIDTHS} transition-colors duration-100 ${
                  isSelected ? "bg-blue-50" : isActive ? "bg-blue-50/30" : "hover:bg-gray-50/70"
                }`}
              >
                {/* Name */}
                <div className="px-4 py-3 flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(deal.id)}
                    onClick={e => e.stopPropagation()}
                    className="mt-1 flex-shrink-0 accent-[#1a2744] cursor-pointer"
                  />
                  <div className="w-full">
                    <TextCell deal={deal} field="client_name" placeholder="Client name…" />
                  </div>
                </div>

                {/* Contact Details */}
                <div className="px-4 py-3 border-l border-gray-100">
                  <ContactCell deal={deal} />
                </div>

                {/* Stage — always visible as colored badge dropdown */}
                <div className="px-4 py-3 border-l border-gray-100 flex items-start pt-3.5">
                  <Select value={deal._stage} onValueChange={v => handleStageChange(deal.id, v)}>
                    <SelectTrigger className="h-auto p-0 border-0 shadow-none focus:ring-0 bg-transparent w-auto [&>svg]:hidden">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer select-none ${stageConf.color}`}>
                        {stageConf.label}
                        <ChevronDown className="w-3 h-3 opacity-40" />
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {STAGES.map(s => (
                        <SelectItem key={s.value} value={s.value}>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
                            {s.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div className="px-4 py-3 border-l border-gray-100">
                  <NotesCell deal={deal} />
                </div>

                {/* Estimated Value */}
                <div className="px-4 py-3 border-l border-gray-100">
                  <ValueCell deal={deal} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Add row */}
        <button
          onClick={handleAddRow}
          className="w-full flex items-center gap-2 px-4 py-3 border-t border-gray-100 hover:bg-gray-50 transition-colors text-gray-400 hover:text-[#1a2744] text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Lead</span>
        </button>
      </div>
    </div>
  );
}