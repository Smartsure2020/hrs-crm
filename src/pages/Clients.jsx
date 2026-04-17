import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Plus, Search, Users, Phone, Mail, Pencil, RefreshCw } from "lucide-react";
import ClientFormModal from "@/components/clients/ClientFormModal";

const CLIENT_TYPE_LABELS = {
  personal: "Personal", commercial: "Commercial",
  body_corporate: "Body Corporate", motor_trader: "Motor Trader"
};

const STATUS_COLORS = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-gray-100 text-gray-600",
  prospect: "bg-blue-100 text-blue-700"
};

export default function Clients() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [brokerFilter, setBrokerFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === "admin";
  const isAdminStaff = user?.role === "admin_staff";
  const canSeeAll = isAdmin || isAdminStaff;

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients", user?.email],
    queryFn: () => isAdmin
      ? base44.entities.Client.filter({ status: "active" }, "-created_date", 500)
      : base44.entities.Client.filter({ assigned_broker: user?.email, status: "active" }, "-created_date", 500),
    enabled: !!user,
  });

  const { data: brokers = [] } = useQuery({
    queryKey: ["brokers"],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user && canSeeAll,
  });

  const filtered = clients.filter(c => {
    const matchSearch = !search ||
      c.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || c.client_type === typeFilter;
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    const matchBroker = brokerFilter === "all" || c.assigned_broker === brokerFilter;
    return matchSearch && matchType && matchStatus && matchBroker;
  });

  if (!user) {
    return <div className="flex items-center justify-center h-full"><RefreshCw className="w-5 h-5 animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#1a2744]">Clients</h2>
          <p className="text-sm text-gray-400">{filtered.length} client{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => { setEditClient(null); setShowForm(true); }} className="bg-[#1a2744] hover:bg-[#243556]">
          <Plus className="w-4 h-4 mr-2" /> New Client
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4 border-0 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search clients..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Client Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(CLIENT_TYPE_LABELS).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="prospect">Prospect</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          {canSeeAll && (
            <Select value={brokerFilter} onValueChange={setBrokerFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Broker" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brokers</SelectItem>
                {brokers.map(b => <SelectItem key={b.email} value={b.email}>{b.full_name || b.email}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80">
                <TableHead className="font-medium text-xs">Client</TableHead>
                <TableHead className="font-medium text-xs">Type</TableHead>
                <TableHead className="font-medium text-xs hidden md:table-cell">Contact</TableHead>
                <TableHead className="font-medium text-xs hidden lg:table-cell">Broker</TableHead>
                <TableHead className="font-medium text-xs">Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_,i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6} className="text-center text-gray-400">
                      <div className="h-10 bg-gray-100 rounded animate-pulse" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No clients found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(client => (
                  <TableRow
                    key={client.id}
                    className="cursor-pointer hover:bg-blue-50/40 transition-colors group"
                    onClick={() => navigate(createPageUrl("ClientProfile") + "?id=" + client.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1a2744] to-[#2d4a7c] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                          {client.client_name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-gray-900 group-hover:text-[#1a2744]">{client.client_name}</p>
                          {client.company_name && <p className="text-xs text-gray-400">{client.company_name}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-gray-600">{CLIENT_TYPE_LABELS[client.client_type] || client.client_type}</span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="space-y-0.5">
                        {client.email && <div className="flex items-center gap-1 text-xs text-gray-500"><Mail className="w-3 h-3" />{client.email}</div>}
                        {client.phone && <div className="flex items-center gap-1 text-xs text-gray-500"><Phone className="w-3 h-3" />{client.phone}</div>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-xs text-gray-500">{client.broker_name || client.assigned_broker}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${STATUS_COLORS[client.status] || STATUS_COLORS.prospect}`}>
                        {client.status || "prospect"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={e => { e.stopPropagation(); setEditClient(client); setShowForm(true); }}
                        className="p-2 rounded-lg text-gray-400 hover:text-[#1a2744] hover:bg-[#1a2744]/10 transition-colors"
                        title="Edit client"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <ClientFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditClient(null); }}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["clients"] })}
        user={user}
        client={editClient}
      />
    </div>
  );
}