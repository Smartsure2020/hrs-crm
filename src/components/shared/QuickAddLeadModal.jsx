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
import { Loader2 } from "lucide-react";

const POLICY_TYPES = ["motor","household","commercial","liability","life","health","marine","engineering","crop","other"];
const CLIENT_TYPES = ["personal","commercial","body_corporate","motor_trader"];

export default function QuickAddLeadModal({ open, onClose, onSuccess, user }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    client_name: "", company_name: "", email: "", phone: "",
    client_type: "personal", policy_type: "motor", estimated_premium: "",
    notes: ""
  });

  const handleSubmit = async () => {
    if (!form.client_name) return;
    setLoading(true);
    const client = await base44.entities.Client.create({
      client_name: form.client_name,
      company_name: form.company_name,
      email: form.email,
      phone: form.phone,
      client_type: form.client_type,
      assigned_broker: user?.email,
      broker_name: user?.full_name,
      status: "prospect"
    });
    await base44.entities.Deal.create({
      client_id: client.id,
      client_name: form.client_name,
      policy_type: form.policy_type,
      estimated_premium: form.estimated_premium ? parseFloat(form.estimated_premium) : 0,
      stage: "lead_received",
      assigned_broker: user?.email,
      broker_name: user?.full_name,
      notes: form.notes
    });
    await base44.entities.ActivityLog.create({
      action: `New lead added: ${form.client_name}`,
      entity_type: "deal",
      entity_id: client.id,
      entity_name: form.client_name,
      user_email: user?.email,
      user_name: user?.full_name
    });
    setLoading(false);
    setForm({ client_name: "", company_name: "", email: "", phone: "", client_type: "personal", policy_type: "motor", estimated_premium: "", notes: "" });
    onSuccess?.();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#1a2744]">Quick Add Lead</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs text-gray-500">Client Name *</Label>
              <Input value={form.client_name} onChange={e => setForm({...form, client_name: e.target.value})} placeholder="John Smith" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Email</Label>
              <Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="john@email.com" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Phone</Label>
              <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+27..." />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Client Type</Label>
              <Select value={form.client_type} onValueChange={v => setForm({...form, client_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CLIENT_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Policy Type</Label>
              <Select value={form.policy_type} onValueChange={v => setForm({...form, policy_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {POLICY_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Company</Label>
              <Input value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})} placeholder="Company name" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Est. Premium (ZAR)</Label>
              <Input type="number" value={form.estimated_premium} onChange={e => setForm({...form, estimated_premium: e.target.value})} placeholder="0" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-gray-500">Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Any initial notes..." rows={2} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || !form.client_name} className="bg-[#1a2744] hover:bg-[#243556]">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}