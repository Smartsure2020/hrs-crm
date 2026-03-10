import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Trash2 } from "lucide-react";

const POLICY_TYPES = ["motor","household","commercial","liability","life","health","marine","engineering","crop","other"];
const STAGES = [
  { value: "lead_received", label: "Lead Received" },
  { value: "contacted", label: "Contacted" },
  { value: "quote_requested", label: "Quote Requested" },
  { value: "quotes_received", label: "Quotes Received" },
  { value: "quote_sent", label: "Quote Sent to Client" },
  { value: "follow_up", label: "Follow Up" },
  { value: "policy_bound", label: "Policy Bound" },
  { value: "lost", label: "Lost Deal" },
];

export default function DealFormModal({ open, onClose, onSuccess, user, deal, clients }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    client_id: "", client_name: "", policy_type: "motor", estimated_premium: "",
    stage: "lead_received", assigned_broker: user?.email || "", broker_name: user?.full_name || "",
    notes: "", next_action: "", reminder_date: "", insurer: ""
  });

  useEffect(() => {
    if (deal) {
      setForm({
        ...deal,
        estimated_premium: deal.estimated_premium || "",
        reminder_date: deal.reminder_date || ""
      });
    } else {
      setForm({
        client_id: "", client_name: "", policy_type: "motor", estimated_premium: "",
        stage: "lead_received", assigned_broker: user?.email || "", broker_name: user?.full_name || "",
        notes: "", next_action: "", reminder_date: "", insurer: ""
      });
    }
  }, [deal, open]);

  const handleClientSelect = (clientId) => {
    const client = clients?.find(c => c.id === clientId);
    setForm({ ...form, client_id: clientId, client_name: client?.client_name || "" });
  };

  const handleSubmit = async () => {
    setLoading(true);
    const data = {
      ...form,
      estimated_premium: form.estimated_premium ? parseFloat(form.estimated_premium) : 0
    };
    if (deal) {
      await base44.entities.Deal.update(deal.id, data);
    } else {
      await base44.entities.Deal.create(data);
    }
    await base44.entities.ActivityLog.create({
      action: `${deal ? "Updated" : "Created"} deal: ${form.client_name} - ${form.policy_type}`,
      entity_type: "deal", entity_name: form.client_name,
      user_email: user?.email, user_name: user?.full_name
    });
    setLoading(false);
    onSuccess?.();
    onClose();
  };

  const handleDelete = async () => {
    if (!deal) return;
    setLoading(true);
    await base44.entities.Deal.delete(deal.id);
    setLoading(false);
    onSuccess?.();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#1a2744]">{deal ? "Edit Deal" : "New Deal"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs text-gray-500">Client *</Label>
              {clients?.length > 0 ? (
                <Select value={form.client_id} onValueChange={handleClientSelect}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.client_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={form.client_name} onChange={e => setForm({...form, client_name: e.target.value})} placeholder="Client name" />
              )}
            </div>
            <div>
              <Label className="text-xs text-gray-500">Policy Type</Label>
              <Select value={form.policy_type} onValueChange={v => setForm({...form, policy_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {POLICY_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase())}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Est. Premium (ZAR)</Label>
              <Input type="number" value={form.estimated_premium} onChange={e => setForm({...form, estimated_premium: e.target.value})} />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Stage</Label>
              <Select value={form.stage} onValueChange={v => setForm({...form, stage: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Insurer</Label>
              <Input value={form.insurer || ""} onChange={e => setForm({...form, insurer: e.target.value})} />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Next Action</Label>
              <Input value={form.next_action || ""} onChange={e => setForm({...form, next_action: e.target.value})} />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Reminder Date</Label>
              <Input type="date" value={form.reminder_date} onChange={e => setForm({...form, reminder_date: e.target.value})} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-gray-500">Notes</Label>
              <Textarea value={form.notes || ""} onChange={e => setForm({...form, notes: e.target.value})} rows={3} />
            </div>
          </div>
        </div>
        <DialogFooter className="flex justify-between">
          <div>
            {deal && (
              <Button variant="ghost" size="sm" onClick={handleDelete} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                <Trash2 className="w-4 h-4 mr-1" /> Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading} className="bg-[#1a2744] hover:bg-[#243556]">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : deal ? "Save" : "Create Deal"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}