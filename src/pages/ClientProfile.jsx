import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Mail, Phone, MapPin, Building2, Edit2,
  Shield, Briefcase, FileText, CheckSquare, RefreshCw, Plus
} from "lucide-react";
import ClientDocuments from "@/components/clients/ClientDocuments";
import moment from "moment";
import ClientFormModal from "@/components/clients/ClientFormModal";
import DealFormModal from "@/components/pipeline/DealFormModal";

const TYPE_LABELS = {
  personal: "Personal", commercial: "Commercial",
  body_corporate: "Body Corporate", motor_trader: "Motor Trader"
};

export default function ClientProfile() {
  const params = new URLSearchParams(window.location.search);
  const clientId = params.get("id");
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showDeal, setShowDeal] = useState(false);
  const [editDeal, setEditDeal] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: clients = [] } = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => base44.entities.Client.filter({ id: clientId }),
    enabled: !!clientId,
  });
  const client = clients[0];

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
            <div><p className="text-xs text-gray-400">Deals</p><p className="text-2xl font-bold text-[#1a2744]">{deals.length}</p></div>
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
      <Tabs defaultValue="deals" className="space-y-4">
        <TabsList className="bg-white border shadow-sm">
          <TabsTrigger value="deals"><Briefcase className="w-3.5 h-3.5 mr-1.5" />Deals</TabsTrigger>
          <TabsTrigger value="policies"><Shield className="w-3.5 h-3.5 mr-1.5" />Policies</TabsTrigger>
          <TabsTrigger value="tasks"><CheckSquare className="w-3.5 h-3.5 mr-1.5" />Tasks</TabsTrigger>
          <TabsTrigger value="documents"><FileText className="w-3.5 h-3.5 mr-1.5" />Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="deals">
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
        </TabsContent>

        <TabsContent value="policies">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              {policies.length === 0 ? (
                <div className="text-center py-12 text-gray-400"><Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />No policies yet</div>
              ) : (
                <div className="divide-y">
                  {policies.map(policy => (
                    <div key={policy.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{policy.policy_number} — {policy.insurer}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{policy.policy_type?.replace(/_/g," ")} · R{policy.premium?.toLocaleString() || 0}/yr</p>
                        </div>
                        <div className="text-right">
                          <Badge className={`text-[10px] ${policy.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>{policy.status}</Badge>
                          {policy.renewal_date && <p className="text-[10px] text-gray-400 mt-1">Renews {moment(policy.renewal_date).format("MMM D, YYYY")}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
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
      </Tabs>

      <ClientFormModal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["client"] })}
        user={user}
        client={client}
      />
      <DealFormModal
        open={showDeal}
        onClose={() => { setShowDeal(false); setEditDeal(null); }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["client-deals", clientId] });
          if (!editDeal) navigate(createPageUrl("Pipeline"));
        }}
        user={user}
        clients={[client]}
        deal={editDeal}
      />
    </div>
  );
}