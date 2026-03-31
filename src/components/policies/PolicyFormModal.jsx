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

export default function PolicyFormModal({ open, onClose, onSuccess, user, policy, clients, defaultClientId, defaultClientName }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    policy_number: "", client_id: "", client_name: "", insurer: "",
    policy_type: "motor", premium: "", start_date: "", renewal_date: "",
    assigned_broker: user?.email || "", broker_name: user?.full_name || "",
    status: "active", notes: ""
  });

  useEffect(() => {
    if (policy) {
      setForm({ ...policy, premium: policy.premium || "", start_date: policy.start_date || "", renewal_date: policy.renewal_date || "" });
    } else {
      setForm({
        policy_number: "", client_id: defaultClientId || "", client_name: defaultClientName || "", insurer: "",
        policy_type: "motor", premium: "", start_date: "", renewal_date: "",
        assigned_broker: user?.email || "", broker_name: user?.full_name || "",
        status: "active", notes: ""
      });
    }
  }, [policy, open]);

  const handleSubmit = async () => {
    if (!form.policy_number || !form.insurer) return;
    setLoading(true);
    const data = { ...form, premium: form.premium ? parseFloat(form.premium) : 0 };
    if (policy) {
      await base44.entities.Policy.update(policy.id, data);
    } else {
      await base44.entities.Policy.create(data);
    }
    await base44.entities.ActivityLog.create({
      action: `${policy ? "Updated" : "Created"} policy: ${form.policy_number}`,
      entity_type: "policy", entity_name: form.policy_number,
      user_email: user?.email, user_name: user?.full_name
    });
    setLoading(false);
    onSuccess?.();
    onClose();
  };

  const handleDelete = async () => {
    if (!policy) return;
    setLoading(true);
    await base44.entities.Policy.delete(policy.id);
    setLoading(false);
    onSuccess?.();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#1a2744]">{policy ? "Edit Policy" : "New Policy"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-gray-500">Policy Number *</Label>
              <Input value={form.policy_number} onChange={e => setForm({...form, policy_number: e.target.value})} />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Insurer *</Label>
              <Input value={form.insurer} onChange={e => setForm({...form, insurer: e.target.value})} />
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
              <Label className="text-xs text-gray-500">Premium (ZAR)</Label>
              <Input type="number" value={form.premium} onChange={e => setForm({...form, premium: e.target.value})} />
            </div>
            {clients?.length > 0 && (
              <div className="col-span-2">
                <Label className="text-xs text-gray-500">Client</Label>
                <Select value={form.client_id || ""} onValueChange={v => {
                  const c = clients.find(cl => cl.id === v);
                  setForm({...form, client_id: v, client_name: c?.client_name || ""});
                }}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.client_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-xs text-gray-500">Start Date</Label>
              <Input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Renewal Date</Label>
              <Input type="date" value={form.renewal_date} onChange={e => setForm({...form, renewal_date: e.target.value})} />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Status</Label>
              <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Broker Commission %</Label>
              <Input type="number" min="0" max="100" placeholder="e.g. 70" value={form.broker_commission_pct || ""} onChange={e => setForm({...form, broker_commission_pct: e.target.value})} />
            </div>
            <div>
              <Label className="text-xs text-gray-500">HRS Commission %</Label>
              <Input type="number" min="0" max="100" placeholder="e.g. 30" value={form.hrs_commission_pct || ""} onChange={e => setForm({...form, hrs_commission_pct: e.target.value})} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-gray-500">Notes</Label>
              <Textarea value={form.notes || ""} onChange={e => setForm({...form, notes: e.target.value})} rows={2} />
            </div>
          </div>
        </div>
        <DialogFooter className="flex justify-between">
          <div>{policy && <Button variant="ghost" size="sm" onClick={handleDelete} className="text-red-500 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4 mr-1" /> Delete</Button>}</div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading || !form.policy_number || !form.insurer} className="bg-[#1a2744] hover:bg-[#243556]">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : policy ? "Save" : "Create Policy"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}