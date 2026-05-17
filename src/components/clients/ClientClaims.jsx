import React, { useState } from "react";
import { base44 } from "@/api/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, AlertCircle } from "lucide-react";
import moment from "moment";

const STATUS_COLORS = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-orange-100 text-orange-700",
  settled: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  withdrawn: "bg-gray-100 text-gray-600",
};

const EMPTY = {
  claim_number: "", claim_type: "other", status: "open",
  date_of_incident: "", date_submitted: "", date_settled: "",
  amount_claimed: "", amount_settled: "", insurer: "",
  policy_number: "", description: "", notes: "",
  broker_name: "",
};

export default function ClientClaims({ claims = [], clientId, clientName, brokerName }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (claim) => { setEditing(claim); setForm({ ...EMPTY, ...claim }); setOpen(true); };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      ...form,
      client_id: clientId,
      client_name: clientName,
      broker_name: form.broker_name || brokerName || undefined,
      amount_claimed: form.amount_claimed ? Number(form.amount_claimed) : undefined,
      amount_settled: form.amount_settled ? Number(form.amount_settled) : undefined,
    };
    if (editing) {
      await base44.entities.Claim.update(editing.id, payload);
    } else {
      await base44.entities.Claim.create(payload);
    }
    queryClient.invalidateQueries({ queryKey: ["client-claims", clientId] });
    setSaving(false);
    setOpen(false);
  };

  const handleDelete = async () => {
    if (!editing) return;
    await base44.entities.Claim.delete(editing.id);
    queryClient.invalidateQueries({ queryKey: ["client-claims", clientId] });
    setOpen(false);
  };

  return (
    <div>
      <Card className="border-0 shadow-sm">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <p className="text-sm font-medium text-gray-700">{claims.length} claim{claims.length !== 1 ? "s" : ""}</p>
          <Button size="sm" className="bg-[#1a2744] hover:bg-[#243556] h-7 text-xs" onClick={openNew}>
            <Plus className="w-3.5 h-3.5 mr-1" /> New Claim
          </Button>
        </div>
        <CardContent className="p-0">
          {claims.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />No claims on record
            </div>
          ) : (
            <div className="divide-y">
              {claims.map(claim => (
                <div key={claim.id} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => openEdit(claim)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">
                        {claim.claim_number || "No ref"} — {claim.claim_type?.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {claim.insurer && <span>{claim.insurer} · </span>}
                        {claim.date_of_incident ? `Incident: ${moment(claim.date_of_incident).format("MMM D, YYYY")}` : ""}
                      </p>
                      {claim.description && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{claim.description}</p>}
                    </div>
                    <div className="text-right space-y-1">
                      <Badge className={`text-[10px] ${STATUS_COLORS[claim.status] || ""}`}>{claim.status?.replace(/_/g, " ")}</Badge>
                      {claim.amount_claimed && (
                        <p className="text-xs text-gray-400">R{Number(claim.amount_claimed).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Claim" : "New Claim"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Claim Number</label>
                <Input value={form.claim_number} onChange={e => set("claim_number", e.target.value)} placeholder="CLM-001" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Insurer</label>
                <Input value={form.insurer} onChange={e => set("insurer", e.target.value)} placeholder="e.g. Santam" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Claim Type</label>
                <Select value={form.claim_type} onValueChange={v => set("claim_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["motor","household","commercial","liability","life","health","other"].map(t => (
                      <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Status</label>
                <Select value={form.status} onValueChange={v => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["open","in_progress","settled","rejected","withdrawn"].map(s => (
                      <SelectItem key={s} value={s}>{s.replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase())}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Date of Incident</label>
                <Input type="date" value={form.date_of_incident} onChange={e => set("date_of_incident", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Date Submitted</label>
                <Input type="date" value={form.date_submitted} onChange={e => set("date_submitted", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Amount Claimed (R)</label>
                <Input type="number" value={form.amount_claimed} onChange={e => set("amount_claimed", e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Amount Settled (R)</label>
                <Input type="number" value={form.amount_settled} onChange={e => set("amount_settled", e.target.value)} placeholder="0" />
              </div>
            </div>
            {form.status === "settled" && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Date Settled</label>
                <Input type="date" value={form.date_settled} onChange={e => set("date_settled", e.target.value)} />
              </div>
            )}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Policy Number</label>
              <Input value={form.policy_number} onChange={e => set("policy_number", e.target.value)} placeholder="Optional policy reference" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Description</label>
              <Textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="Describe the claim..." rows={3} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Internal Notes</label>
              <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Internal notes..." rows={2} />
            </div>
            <div className="flex justify-between pt-2">
              {editing ? (
                <Button variant="destructive" size="sm" onClick={handleDelete}>Delete</Button>
              ) : <div />}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
                <Button size="sm" className="bg-[#1a2744] hover:bg-[#243556]" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}