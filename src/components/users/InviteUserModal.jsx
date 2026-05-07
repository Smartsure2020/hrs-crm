import React, { useState } from "react";
import { base44 } from "@/api/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UserPlus, CheckCircle2 } from "lucide-react";

export default function InviteUserModal({ open, onClose }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("broker");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      await base44.users.inviteUser(email.trim(), role);
      setSuccess(true);
      setEmail("");
      setRole("broker");
    } catch (err) {
      setError(err?.message || "Failed to send invite. User may already exist.");
    }
    setLoading(false);
  };

  const handleClose = () => {
    setSuccess(false);
    setError("");
    setEmail("");
    setRole("broker");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#1a2744]">Invite User</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <p className="font-semibold text-gray-800">Invite sent!</p>
            <p className="text-sm text-gray-400 mt-1">The user will receive a login link by email.</p>
            <div className="flex gap-2 mt-5 justify-center">
              <Button variant="outline" onClick={() => setSuccess(false)}>Invite another</Button>
              <Button className="bg-[#1a2744] hover:bg-[#243556]" onClick={handleClose}>Done</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Email address</label>
              <Input
                type="email"
                placeholder="broker@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Role</label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="broker">Broker</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
              <Button type="submit" className="bg-[#1a2744] hover:bg-[#243556]" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                Send Invite
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}