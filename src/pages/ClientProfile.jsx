import React, { useState, useEffect } from "react";
import { base44 } from "@/api/client";
import { useAuth, useUserRole } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Mail, Phone, MapPin, Building2, Edit2,
  Shield, Briefcase, FileText, CheckSquare, RefreshCw, Plus, ClipboardList, AlertCircle, Pencil
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ClientDocuments from "@/components/clients/ClientDocuments";
import ClientClaims from "@/components/clients/ClientClaims";
import moment from "moment";
import ClientFormModal from "@/components/clients/ClientFormModal";
import { logAudit } from "@/lib/auditLogger";
import DealFormModal from "@/components/pipeline/DealFormModal";
import PolicyFormModal from "@/components/policies/PolicyFormModal";

const TYPE_LABELS = {
  personal: "Personal", commercial: "Commercial",
  body_corporate: "Body Corporate", motor_trader: "Motor Trader"
};

export default function ClientProfile() {
  const params = new URLSearchParams(window.location.search);
  const clientId = params.get("id");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdminStaff } = useUserRole();
  const [showEdit, setShowEdit] = useState(false);
  const [showDeal, setShowDeal] = useState(false);
  const [editDeal, setEditDeal] = useState(null);
  const [showPolicy, setShowPolicy] = useState(false);
  const [editPolicy, setEditPolicy] = useState(null);
  const queryClient = useQueryClient();

  const { data: client } = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => base44.entities.Client.get(clientId),
    enabled: !!clientId,
  });

  // Log client view once user and client are both loaded
  useEffect(() => {
    if (user && client) {
      logAudit(user, "view_client", {
        record_type: "Client",
        record_id: client.id,
        record_name: client.client_name,
      });
    }
  }, [user?.email, client?.id]);

  const { data: deals = [] } = useQuery({
    queryKey: ["client-deals", clientId],
    queryFn: () => base44.entities.Deal.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  const { data: policies = [] } = useQuery({
    queryKey: ["client-policies", clientId],
    queryFn: () => base44.entities.Policy.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["client-tasks", clientId],
    queryFn: () => base44.entities.Task.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["client-docs", clientId],
    queryFn: () => base44.entities.Document.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  const { data: claims = [] } = useQuery({
    queryKey: ["client-claims", clientId],
    queryFn: () => base44.entities.Claim.filter({ client_id: clientId }),
    enabled: !!clientId,
  });



  if (!client) {
    return <div className="flex items-center justify-center h-full"><RefreshCw className="w-5 h-5 animate-spin text-gray-400" /></div>;
  }

  const STAGE_COLORS = {
    lead_received: "bg-gray-100 text-gray-700",
    contacted: "bg-blue-100 text-blue-700",
    quote_requested: "bg-indigo-100 text-indigo-700",
    quotes_received: "bg-purple-100 text-purple-700",
    quote_sent: "bg-violet-100 text-violet-700",
    follow_up: "bg-orange-100 text-orange-700",
    policy_bound: "bg-emerald-100 text-emerald-700",
    lost: "bg-red-100 text-red-700",
  };

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Back & header */}
      <div className="flex items-center gap-3">
        <Link to={createPageUrl("Clients")} className="text-gray-400 hover:text-[#1a2744] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-[#1a2744]">{client.client_name}</h2>
          {client.company_name && <p className="text-sm text-gray-400">{client.company_name}</p>}
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
          <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit
        </Button>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm p-5">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-100 text-blue-700 text-xs">{TYPE_LABELS[client.client_type] || "Personal"}</Badge>
              <Badge className={`text-xs ${client.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>{client.status}</Badge>
            </div>
            {client.email && <div className="flex items-center gap-2 text-sm text-gray-600"><Mail className="w-4 h-4 text-gray-400" />{client.email}</div>}
            {client.phone && <div className="flex items-center gap-2 text-sm text-gray-600"><Phone className="w-4 h-4 text-gray-400" />{client.phone}</div>}
            {client.address && <div className="flex items-center gap-2 text-sm text-gray-600"><MapPin className="w-4 h-4 text-gray-400" />{client.address}</div>}
            <div className="flex items-center gap-2 text-sm text-gray-600"><Building2 className="w-4 h-4 text-gray-400" />{client.broker_name || client.assigned_broker || "Unassigned"}</div>
          </div>
        </Card>
        <Card className="border-0 shadow-sm p-5">
          <div className="grid grid-cols-2 gap-4">
            {!isAdminStaff && <div><p className="text-xs text-gray-400">Deals</p><p className="text-2xl font-bold text-[#1a2744]">{deals.length}</p></div>}
            <div><p className="text-xs text-gray-400">Policies</p><p className="text-2xl font-bold text-[#1a2744]">{policies.length}</p></div>
            <div><p className="text-xs text-gray-400">Open Tasks</p><p className="text-2xl font-bold text-[#1a2744]">{tasks.filter(t=>t.status!=="completed").length}</p></div>
            <div><p className="text-xs text-gray-400">Documents</p><p className="text-2xl font-bold text-[#1a2744]">{documents.length}</p></div>
          </div>
        </Card>
        <Card className="border-0 shadow-sm p-5">
          <p className="text-xs text-gray-400 mb-2">Notes</p>
          <p className="text-sm text-gray-600 leading-relaxed">{client.notes || "No notes yet."}</p>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={isAdminStaff ? "policies" : "deals"} className="space-y-4">
        <TabsList className="bg-white border shadow-sm">
          {!isAdminStaff && <TabsTrigger value="deals"><Briefcase className="w-3.5 h-3.5 mr-1.5" />Deals</TabsTrigger>}
          <TabsTrigger value="policies"><Shield className="w-3.5 h-3.5 mr-1.5" />Policies</TabsTrigger>
          <TabsTrigger value="documents"><FileText className="w-3.5 h-3.5 mr-1.5" />Documents</TabsTrigger>
          <TabsTrigger value="claims"><AlertCircle className="w-3.5 h-3.5 mr-1.5" />Claims</TabsTrigger>
          <TabsTrigger value="tasks"><CheckSquare className="w-3.5 h-3.5 mr-1.5" />Tasks</TabsTrigger>
          <TabsTrigger value="roa"><ClipboardList className="w-3.5 h-3.5 mr-1.5" />ROA</TabsTrigger>
        </TabsList>

        {!isAdminStaff && <TabsContent value="deals">
          <Card className="border-0 shadow-sm">
            <div className="flex items-center justify-between px-4 pt-4">
              <p className="text-sm font-medium text-gray-700">{deals.length} deal{deals.length !== 1 ? 's' : ''}</p>
              <Button size="sm" className="bg-[#1a2744] hover:bg-[#243556] h-7 text-xs" onClick={() => setShowDeal(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" /> New Deal
              </Button>
            </div>
            <CardContent className="p-0 mt-3">
              {deals.length === 0 ? (
                <div className="text-center py-12 text-gray-400"><Briefcase className="w-8 h-8 mx-auto mb-2 opacity-30" />No deals yet</div>
              ) : (
                <div className="divide-y">
                  {deals.map(deal => (
                    <div key={deal.id} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => { setEditDeal(deal); setShowDeal(true); }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{deal.policy_type?.replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase())}</p>
                          <p className="text-xs text-gray-400 mt-0.5">R{deal.estimated_premium?.toLocaleString() || 0}</p>
                        </div>
                        <Badge className={`text-[10px] ${STAGE_COLORS[deal.stage] || ""}`}>{deal.stage?.replace(/_/g," ")}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>}

        <TabsContent value="policies">
          <Card className="border-0 shadow-sm">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <p className="text-sm font-medium text-gray-700">{policies.length} polic{policies.length !== 1 ? 'ies' : 'y'}</p>
              <Button size="sm" className="bg-[#1a2744] hover:bg-[#243556] h-7 text-xs" onClick={() => { setEditPolicy(null); setShowPolicy(true); }}>
                <Plus className="w-3.5 h-3.5 mr-1" /> New Policy
              </Button>
            </div>
            {policies.length === 0 ? (
              <CardContent className="py-12 text-center text-gray-400"><Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />No policies yet</CardContent>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/80">
                      <TableHead className="text-xs font-medium">Policy #</TableHead>
                      <TableHead className="text-xs font-medium">Insurer</TableHead>
                      <TableHead className="text-xs font-medium hidden md:table-cell">Type</TableHead>
                      <TableHead className="text-xs font-medium hidden sm:table-cell">Monthly</TableHead>
                      <TableHead className="text-xs font-medium">Annual</TableHead>
                      <TableHead className="text-xs font-medium hidden lg:table-cell">Renewal</TableHead>
                      <TableHead className="text-xs font-medium">Status</TableHead>
                      <TableHead className="w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {policies.map(policy => (
                      <TableRow key={policy.id} className="hover:bg-blue-50/20 cursor-pointer" onClick={() => { setEditPolicy(policy); setShowPolicy(true); }}>
                        <TableCell className="font-medium text-sm">{policy.policy_number}</TableCell>
                        <TableCell className="text-sm font-semibold text-[#1a2744]">{policy.insurer}</TableCell>
                        <TableCell className="text-xs text-gray-500 hidden md:table-cell capitalize">{policy.policy_type?.replace(/_/g," ")}</TableCell>
                        <TableCell className="text-sm hidden sm:table-cell">R{policy.monthly_premium?.toLocaleString() || "—"}</TableCell>
                        <TableCell className="text-sm font-medium">R{policy.premium?.toLocaleString() || 0}</TableCell>
                        <TableCell className="text-xs text-gray-400 hidden lg:table-cell">{policy.renewal_date ? moment(policy.renewal_date).format("MMM D, YYYY") : "—"}</TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] ${policy.status === "active" ? "bg-emerald-100 text-emerald-700" : policy.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600"}`}>{policy.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Pencil className="w-3.5 h-3.5 text-gray-300 hover:text-[#1a2744]" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="claims">
          <ClientClaims
            claims={claims}
            clientId={clientId}
            clientName={client?.client_name}
            policies={policies}
          />
        </TabsContent>

        <TabsContent value="tasks">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              {tasks.length === 0 ? (
                <div className="text-center py-12 text-gray-400"><CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />No tasks yet</div>
              ) : (
                <div className="divide-y">
                  {tasks.map(task => (
                    <div key={task.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{task.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">Due {moment(task.due_date).format("MMM D, YYYY")}</p>
                        </div>
                        <Badge className={`text-[10px] ${task.status === "completed" ? "bg-emerald-100 text-emerald-700" : task.status === "overdue" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>{task.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <ClientDocuments
            documents={documents}
            clientId={clientId}
            clientName={client?.client_name}
            user={user}
          />
        </TabsContent>

        <TabsContent value="roa">
          <div className="rounded-lg overflow-hidden shadow-sm border border-gray-200">
            <iframe
              src="https://hrsroa.vercel.app/"
              width="100%"
              height="900px"
              style={{ border: "none", borderRadius: "8px" }}
              title="HRS Advice Record"
            />
          </div>
        </TabsContent>
      </Tabs>

      <ClientFormModal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["client"] });
          logAudit(user, "edit_client", { record_type: "Client", record_id: client?.id, record_name: client?.client_name });
        }}
        user={user}
        client={client}
      />
      {!isAdminStaff && <DealFormModal
        open={showDeal}
        onClose={() => { setShowDeal(false); setEditDeal(null); }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["client-deals", clientId] });
          if (!editDeal) navigate(createPageUrl("Pipeline"));
        }}
        user={user}
        clients={[client]}
        deal={editDeal}
      />}
      <PolicyFormModal
        open={showPolicy}
        onClose={() => { setShowPolicy(false); setEditPolicy(null); }}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["client-policies", clientId] })}
        user={user}
        policy={editPolicy}
        clients={[client]}
        defaultClientId={clientId}
        defaultClientName={client?.client_name}
      />
    </div>
  );
}