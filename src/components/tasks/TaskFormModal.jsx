import React, { useState, useEffect } from "react";
import { base44 } from "@/api/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Trash2 } from "lucide-react";

const TASK_TYPES = [
  { value: "follow_up_quote", label: "Follow Up on Quote" },
  { value: "renewal_reminder", label: "Renewal Reminder" },
  { value: "claim_update", label: "Claim Update" },
  { value: "compliance_followup", label: "Compliance Follow-up" },
  { value: "call_client", label: "Call Client" },
  { value: "send_documents", label: "Send Documents" },
  { value: "general", label: "General" },
];

const PRIORITIES = ["low", "medium", "high", "urgent"];
const STATUSES = ["pending", "in_progress", "completed", "overdue"];

export default function TaskFormModal({ open, onClose, onSuccess, user, task, clients }) {
  const [loading, setLoading] = useState(false);
  const [brokers, setBrokers] = useState([]);
  const [form, setForm] = useState({
    title: "", description: "", client_id: "", client_name: "", deal_id: "",
    due_date: "", assigned_to: user?.email || "", assigned_name: user?.full_name || "",
    status: "pending", priority: "medium", task_type: "general"
  });

  useEffect(() => {
    if (task) {
      setForm({ ...task, due_date: task.due_date || "" });
    } else {
      setForm({
        title: "", description: "", client_id: "", client_name: "", deal_id: "",
        due_date: "", assigned_to: user?.email || "", assigned_name: user?.full_name || "",
        status: "pending", priority: "medium", task_type: "general"
      });
    }
  }, [task, open]);

  useEffect(() => {
    if (user?.role === "admin") {
      base44.entities.User.list().then(setBrokers);
    }
  }, [user]);

  const handleSubmit = async () => {
    if (!form.title || !form.due_date) return;
    setLoading(true);
    if (task) {
      await base44.entities.Task.update(task.id, form);
    } else {
      await base44.entities.Task.create(form);
    }
    setLoading(false);
    onSuccess?.();
    onClose();
  };

  const handleDelete = async () => {
    if (!task) return;
    setLoading(true);
    await base44.entities.Task.delete(task.id);
    setLoading(false);
    onSuccess?.();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#1a2744]">{task ? "Edit Task" : "New Task"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs text-gray-500">Title *</Label>
              <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-gray-500">Description</Label>
              <Textarea value={form.description || ""} onChange={e => setForm({...form, description: e.target.value})} rows={2} />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Due Date *</Label>
              <Input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Task Type</Label>
              <Select value={form.task_type} onValueChange={v => setForm({...form, task_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm({...form, priority: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Status</Label>
              <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase())}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {clients?.length > 0 && (
              <div className="col-span-2">
                <Label className="text-xs text-gray-500">Client</Label>
                <Select value={form.client_id || ""} onValueChange={v => {
                  const c = clients.find(cl => cl.id === v);
                  setForm({...form, client_id: v, client_name: c?.client_name || ""});
                }}>
                  <SelectTrigger><SelectValue placeholder="Select client (optional)" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.client_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {user?.role === "admin" && brokers.length > 0 && (
              <div className="col-span-2">
                <Label className="text-xs text-gray-500">Assigned To</Label>
                <Select value={form.assigned_to} onValueChange={v => {
                  const b = brokers.find(br => br.email === v);
                  setForm({...form, assigned_to: v, assigned_name: b?.full_name || v});
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {brokers.map(b => <SelectItem key={b.email} value={b.email}>{b.full_name || b.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="flex justify-between">
          <div>
            {task && (
              <Button variant="ghost" size="sm" onClick={handleDelete} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                <Trash2 className="w-4 h-4 mr-1" /> Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading || !form.title || !form.due_date} className="bg-[#1a2744] hover:bg-[#243556]">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : task ? "Save" : "Create Task"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}