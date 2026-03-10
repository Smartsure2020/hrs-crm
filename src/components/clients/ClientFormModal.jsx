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

const CLIENT_TYPES = ["personal","commercial","body_corporate","motor_trader"];

export default function ClientFormModal({ open, onClose, onSuccess, user, client }) {
  const [loading, setLoading] = useState(false);
  const [brokers, setBrokers] = useState([]);
  const [form, setForm] = useState({
    client_name: "", company_name: "", email: "", phone: "",
    address: "", client_type: "personal", assigned_broker: user?.email || "",
    broker_name: user?.full_name || "", notes: "", status: "prospect"
  });

  useEffect(() => {
    if (client) {
      setForm({ ...client });
    } else {
      setForm({
        client_name: "", company_name: "", email: "", phone: "",
        address: "", client_type: "personal", assigned_broker: user?.email || "",
        broker_name: user?.full_name || "", notes: "", status: "prospect"
      });
    }
  }, [client, open]);

  useEffect(() => {
    if (user?.role === "admin") {
      base44.entities.User.list().then(setBrokers);
    }
  }, [user]);

  const handleSubmit = async () => {
    if (!form.client_name) return;
    setLoading(true);
    if (client) {
      await base44.entities.Client.update(client.id, form);
    } else {
      await base44.entities.Client.create(form);
    }
    await base44.entities.ActivityLog.create({
      action: `${client ? "Updated" : "Created"} client: ${form.client_name}`,
      entity_type: "client", entity_name: form.client_name,
      user_email: user?.email, user_name: user?.full_name
    });
    setLoading(false);
    onSuccess?.();
    onClose();
  };

  const handleBrokerChange = (email) => {
    const broker = brokers.find(b => b.email === email);
    setForm({ ...form, assigned_broker: email, broker_name: broker?.full_name || email });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#1a2744]">{client ? "Edit Client" : "New Client"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs text-gray-500">Client Name *</Label>
              <Input value={form.client_name} onChange={e => setForm({...form, client_name: e.target.value})} />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Company</Label>
              <Input value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})} />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Client Type</Label>
              <Select value={form.client_type} onValueChange={v => setForm({...form, client_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CLIENT_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase())}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Email</Label>
              <Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Phone</Label>
              <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-gray-500">Address</Label>
              <Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
            </div>
            {user?.role === "admin" && brokers.length > 0 && (
              <div className="col-span-2">
                <Label className="text-xs text-gray-500">Assigned Broker</Label>
                <Select value={form.assigned_broker} onValueChange={handleBrokerChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {brokers.map(b => <SelectItem key={b.email} value={b.email}>{b.full_name || b.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-xs text-gray-500">Status</Label>
              <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-gray-500">Notes</Label>
              <Textarea value={form.notes || ""} onChange={e => setForm({...form, notes: e.target.value})} rows={3} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || !form.client_name} className="bg-[#1a2744] hover:bg-[#243556]">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : client ? "Save Changes" : "Create Client"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}