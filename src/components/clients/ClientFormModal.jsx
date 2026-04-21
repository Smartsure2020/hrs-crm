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

const PROVINCES = [
  "Eastern Cape","Free State","Gauteng","KwaZulu-Natal",
  "Limpopo","Mpumalanga","North West","Northern Cape","Western Cape"
];

function Field({ label, children }) {
  return (
    <div>
      <Label className="text-xs text-gray-500 mb-1 block">{label}</Label>
      {children}
    </div>
  );
}

function SectionTitle({ title }) {
  return (
    <div className="col-span-2 pt-2 pb-1">
      <p className="text-xs font-semibold text-[#1a2744] uppercase tracking-wider border-b border-gray-100 pb-1">{title}</p>
    </div>
  );
}

const defaultForm = (user, defaultStatus = "prospect") => ({
  client_type: "personal",
  status: defaultStatus,
  client_name: "",
  surname: "", initials: "", first_name: "", id_number: "",
  company_name: "", contact_person: "", company_reg: "", vat_number: "",
  email: "", phone: "",
  street_address: "", complex_number: "", suburb: "", city: "", province: "", postal_code: "",
  current_insurer: "", current_policy_no: "",
  proposed_insurer: "",
  referror: "",
  effective_date: "", renewal_date: "",
  assigned_broker: user?.email || "",
  broker_name: user?.full_name || "",
  notes: ""
});

export default function ClientFormModal({ open, onClose, onSuccess, user, client, defaultStatus }) {
  const [loading, setLoading] = useState(false);
  const [brokers, setBrokers] = useState([]);
  const [form, setForm] = useState(defaultForm(user, defaultStatus));

  const isPersonal = form.client_type === "personal";

  useEffect(() => {
    if (!open) return;
    if (client) {
      setForm({ ...defaultForm(user, defaultStatus), ...client });
    } else {
      setForm({
        ...defaultForm(user, defaultStatus),
        assigned_broker: user?.email || "",
        broker_name: user?.full_name || "",
      });
    }
  }, [client, open, user, defaultStatus]);

  useEffect(() => {
    if (user?.role === "admin") {
      base44.entities.User.list().then(setBrokers);
    }
  }, [user]);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));
  const setVal = (field) => (v) => setForm(f => ({ ...f, [field]: v }));

  // Auto-build client_name from name fields
  const handleTypeChange = (v) => setForm(f => ({ ...f, client_type: v }));

  const handleBrokerChange = (email) => {
    const broker = brokers.find(b => b.email === email);
    setForm(f => ({ ...f, assigned_broker: email, broker_name: broker?.full_name || email }));
  };

  const handleSubmit = async () => {
    // Auto-build client_name if empty
    let submitForm = { ...form };
    if (!submitForm.client_name) {
      if (isPersonal) {
        submitForm.client_name = [submitForm.initials, submitForm.surname].filter(Boolean).join(" ") || "Unnamed";
      } else {
        submitForm.client_name = submitForm.company_name || "Unnamed";
      }
    }
    setLoading(true);
    if (client) {
      await base44.entities.Client.update(client.id, submitForm);
    } else {
      await base44.entities.Client.create(submitForm);
    }
    await base44.entities.ActivityLog.create({
      action: `${client ? "Updated" : "Created"} client: ${submitForm.client_name}`,
      entity_type: "client", entity_name: submitForm.client_name,
      user_email: user?.email, user_name: user?.full_name
    });
    setLoading(false);
    onSuccess?.();
    onClose();
  };

  const canSubmit = isPersonal
    ? (form.surname || form.first_name || form.client_name)
    : (form.company_name || form.client_name);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-[#1a2744]">{client ? "Edit Client" : "New Client"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-1 py-2 max-h-[70vh] overflow-y-auto pr-1">
          {/* Client Type + Status */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Field label="Client Type">
              <Select value={form.client_type} onValueChange={handleTypeChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="commercial">Commercial / Business</SelectItem>
                  <SelectItem value="body_corporate">Body Corporate</SelectItem>
                  <SelectItem value="motor_trader">Motor Trader</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={setVal("status")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* ── CLIENT DETAILS ── */}
            <SectionTitle title="Client Details" />

            {isPersonal ? (
              <>
                <Field label="Surname *">
                  <Input value={form.surname} onChange={set("surname")} />
                </Field>
                <Field label="Initials">
                  <Input value={form.initials} onChange={set("initials")} />
                </Field>
                <Field label="First Name">
                  <Input value={form.first_name} onChange={set("first_name")} />
                </Field>
                <Field label="ID Number">
                  <Input value={form.id_number} onChange={set("id_number")} />
                </Field>
              </>
            ) : (
              <>
                <Field label="Company Name *">
                  <Input value={form.company_name} onChange={set("company_name")} />
                </Field>
                <Field label="Contact Person">
                  <Input value={form.contact_person} onChange={set("contact_person")} />
                </Field>
                <Field label="Company Reg No">
                  <Input value={form.company_reg} onChange={set("company_reg")} />
                </Field>
                <Field label="VAT Number">
                  <Input value={form.vat_number} onChange={set("vat_number")} />
                </Field>
              </>
            )}

            {/* ── CONTACT DETAILS ── */}
            <SectionTitle title="Contact Details" />
            <Field label="Cell / Phone">
              <Input value={form.phone} onChange={set("phone")} />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={set("email")} />
            </Field>

            {/* ── LOCATION ── */}
            <SectionTitle title="Physical Address" />
            <Field label="Street & Number">
              <Input value={form.street_address} onChange={set("street_address")} />
            </Field>
            <Field label="Complex & Number">
              <Input value={form.complex_number} onChange={set("complex_number")} />
            </Field>
            <Field label="Suburb">
              <Input value={form.suburb} onChange={set("suburb")} />
            </Field>
            <Field label="City">
              <Input value={form.city} onChange={set("city")} />
            </Field>
            <Field label="Province">
              <Select value={form.province} onValueChange={setVal("province")}>
                <SelectTrigger><SelectValue placeholder="Select province" /></SelectTrigger>
                <SelectContent>
                  {PROVINCES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Postal Code">
              <Input value={form.postal_code} onChange={set("postal_code")} />
            </Field>

            {/* ── CURRENT INSURER ── */}
            <SectionTitle title="Current Insurer" />
            <Field label="Insurer Name">
              <Input value={form.current_insurer} onChange={set("current_insurer")} />
            </Field>
            <Field label="Policy Number">
              <Input value={form.current_policy_no} onChange={set("current_policy_no")} />
            </Field>

            {/* ── PROPOSED INSURER ── */}
            <SectionTitle title="Proposed Insurer" />
            <div className="col-span-2">
              <Field label="Insurer Name">
                <Input value={form.proposed_insurer} onChange={set("proposed_insurer")} />
              </Field>
            </div>

            {/* ── BROKER & REFERRAL ── */}
            <SectionTitle title="Broker & Referral" />
            {user?.role === "admin" && brokers.length > 0 ? (
              <div className="col-span-2">
                <Field label="Assigned Broker">
                  <Select value={form.assigned_broker} onValueChange={handleBrokerChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {brokers.map(b => <SelectItem key={b.email} value={b.email}>{b.full_name || b.email}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            ) : (
              <div className="col-span-2">
                <Field label="Broker">
                  <Input value={form.broker_name} readOnly className="bg-gray-50" />
                </Field>
              </div>
            )}
            <div className="col-span-2">
              <Field label="Referror (Name / Company)">
                <Input value={form.referror} onChange={set("referror")} />
              </Field>
            </div>

            {/* ── DATES ── */}
            <SectionTitle title="Dates" />
            <Field label="Effective Date">
              <Input type="date" value={form.effective_date} onChange={set("effective_date")} />
            </Field>
            <Field label="Renewal Date">
              <Input type="date" value={form.renewal_date} onChange={set("renewal_date")} />
            </Field>

            {/* ── COMMISSION SPLIT ── */}
            <SectionTitle title="Commission Split" />
            <Field label="Broker Commission %">
              <Input type="number" min="0" max="100" placeholder="e.g. 70" value={form.broker_commission_pct || ""} onChange={set("broker_commission_pct")} />
            </Field>
            <Field label="HRS Commission %">
              <Input type="number" min="0" max="100" placeholder="e.g. 30" value={form.hrs_commission_pct || ""} onChange={set("hrs_commission_pct")} />
            </Field>

            {/* ── NOTES ── */}
            <SectionTitle title="Notes" />
            <div className="col-span-2">
              <Textarea value={form.notes || ""} onChange={set("notes")} rows={3} placeholder="Additional notes..." />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || !canSubmit} className="bg-[#1a2744] hover:bg-[#243556]">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : client ? "Save Changes" : "Create Client"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}