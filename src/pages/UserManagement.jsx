import React, { useState } from "react";
import { base44 } from "@/api/client";
import { useAuth, useUserRole } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { CheckCircle, XCircle, Trash2, RefreshCw, UserCog, AlertCircle, UserPlus } from "lucide-react";
import moment from "moment";
import InviteUserModal from "@/components/users/InviteUserModal";

const STATUS_COLORS = {
  pending:  "bg-yellow-100 text-yellow-700",
  active:   "bg-emerald-100 text-emerald-700",
  inactive: "bg-red-100 text-red-500",
};

export default function UserManagement() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const [statusFilter, setStatusFilter] = useState("all");
  const [showInvite, setShowInvite] = useState(false);
  const queryClient = useQueryClient();

  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ["all-users"],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user && isAdmin,
    refetchInterval: 30000,
  });

  const filtered = statusFilter === "all"
    ? users
    : users.filter(u => (u.status || "pending") === statusFilter);

  const pendingCount = users.filter(u => !u.status || u.status === "pending").length;

  const handleApprove = async (userId) => {
    await base44.entities.User.update(userId, { status: "active" });
    queryClient.invalidateQueries({ queryKey: ["all-users"] });
  };

  const handleReject = async (userId) => {
    await base44.entities.User.update(userId, { status: "inactive" });
    queryClient.invalidateQueries({ queryKey: ["all-users"] });
  };

  const handleRoleChange = async (userId, role) => {
    await base44.entities.User.update(userId, { role });
    queryClient.invalidateQueries({ queryKey: ["all-users"] });
  };

  const handleDelete = async (userId) => {
    await base44.users.deleteUser(userId);
    queryClient.invalidateQueries({ queryKey: ["all-users"] });
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400">Access denied.</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#1a2744]">User Management</h2>
          <p className="text-sm text-gray-400">
            {users.length} user{users.length !== 1 ? "s" : ""}
            {pendingCount > 0 && (
              <span className="ml-2 text-yellow-600 font-medium">· {pendingCount} pending approval</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Button className="bg-[#1a2744] hover:bg-[#243556]" onClick={() => setShowInvite(true)}>
            <UserPlus className="w-4 h-4 mr-2" /> Invite User
          </Button>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Pending alert */}
      {pendingCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-yellow-800 text-sm">
              {pendingCount} user{pendingCount !== 1 ? "s" : ""} awaiting approval
            </p>
            <p className="text-yellow-600 text-xs mt-0.5">
              Review and approve or reject access requests below.
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80">
                <TableHead className="font-medium text-xs">Name</TableHead>
                <TableHead className="font-medium text-xs">Email</TableHead>
                <TableHead className="font-medium text-xs hidden md:table-cell">Phone</TableHead>
                <TableHead className="font-medium text-xs">Role</TableHead>
                <TableHead className="font-medium text-xs">Status</TableHead>
                <TableHead className="font-medium text-xs hidden lg:table-cell">Joined</TableHead>
                <TableHead className="font-medium text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <RefreshCw className="w-5 h-5 animate-spin text-gray-300 mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-gray-400">
                    <UserCog className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No users found
                  </TableCell>
                </TableRow>
              ) : filtered.map(u => {
                const status = u.status || "pending";
                const isSelf = u.email === user?.email;
                return (
                  <TableRow
                    key={u.id}
                    className={`hover:bg-gray-50/70 transition-colors ${
                      status === "pending" ? "bg-yellow-50/20" : ""
                    }`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1a2744] to-[#2d4a7c] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                          {u.full_name?.charAt(0)?.toUpperCase() || u.email?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <span className="font-medium text-sm text-gray-800">{u.full_name || "—"}</span>
                          {isSelf && <span className="ml-1.5 text-[10px] text-gray-400">(you)</span>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{u.email}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-gray-500">{u.phone || "—"}</TableCell>
                    <TableCell>
                      {isSelf ? (
                        <Badge className="text-[10px] bg-[#1a2744]/10 text-[#1a2744] capitalize">
                          {u.role || "broker"}
                        </Badge>
                      ) : (
                        <Select value={u.role || "broker"} onValueChange={v => handleRoleChange(u.id, v)}>
                          <SelectTrigger className="h-7 w-[100px] text-xs border-gray-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="broker">Broker</SelectItem>
                            <SelectItem value="admin_staff">Admin Staff</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${STATUS_COLORS[status] || STATUS_COLORS.pending}`}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-gray-400">
                      {moment(u.created_at).format("MMM D, YYYY")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {!isSelf && status !== "active" && (
                          <Button size="sm" variant="ghost"
                            className="h-7 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 text-xs"
                            onClick={() => handleApprove(u.id)}>
                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                          </Button>
                        )}
                        {!isSelf && status === "active" && (
                          <Button size="sm" variant="ghost"
                            className="h-7 px-2 text-orange-500 hover:text-orange-600 hover:bg-orange-50 text-xs"
                            onClick={() => handleReject(u.id)}>
                            <XCircle className="w-3.5 h-3.5 mr-1" /> Revoke
                          </Button>
                        )}
                        {!isSelf && status === "pending" && (
                          <Button size="sm" variant="ghost"
                            className="h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50 text-xs"
                            onClick={() => handleReject(u.id)}>
                            <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                          </Button>
                        )}
                        {!isSelf && (
                          <Button size="icon" variant="ghost"
                            className="h-7 w-7 text-gray-300 hover:text-red-500 hover:bg-red-50"
                            onClick={() => handleDelete(u.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
      <InviteUserModal open={showInvite} onClose={() => { setShowInvite(false); queryClient.invalidateQueries({ queryKey: ["all-users"] }); }} />
    </div>
  );
}