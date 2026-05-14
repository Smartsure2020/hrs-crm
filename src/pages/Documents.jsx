import React, { useState, useEffect } from "react";
import { base44, PAGE_SIZE } from "@/api/client";
import { useAuth, useUserRole } from "@/lib/AuthContext";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Upload, Search, FileText, Download, Loader2, RefreshCw, Trash2
} from "lucide-react";
import moment from "moment";
import { Pagination } from "@/components/shared/Pagination";
import { toast } from "@/components/ui/use-toast";

const DOC_TYPES = ["policy_schedule","quote","claim","compliance","id_copy","proof_of_address","bank_statement","other"];
const DOC_TYPE_COLORS = {
  policy_schedule: "bg-blue-100 text-blue-700",
  quote: "bg-purple-100 text-purple-700",
  claim: "bg-red-100 text-red-700",
  compliance: "bg-emerald-100 text-emerald-700",
  id_copy: "bg-orange-100 text-orange-700",
  proof_of_address: "bg-cyan-100 text-cyan-700",
  bank_statement: "bg-yellow-100 text-yellow-700",
  other: "bg-gray-100 text-gray-600",
};

export default function Documents() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    name: "", document_type: "other", client_id: "", client_name: ""
  });
  const queryClient = useQueryClient();

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(0); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page when type filter changes
  useEffect(() => { setPage(0); }, [typeFilter]);

  const { data: pageResult, isLoading } = useQuery({
    queryKey: ["documents", user?.email, page, typeFilter, debouncedSearch],
    queryFn: () => {
      const filters = {};
      if (!isAdmin) filters.uploaded_by = user.email;
      if (typeFilter !== 'all') filters.document_type = typeFilter;
      return base44.entities.Document.paginate(page, filters, '-created_at', debouncedSearch || null);
    },
    enabled: !!user,
    placeholderData: keepPreviousData,
  });

  const documents = pageResult?.data ?? [];
  const total     = pageResult?.total ?? 0;

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list", user?.email],
    queryFn: () => isAdmin
      ? base44.entities.Client.list("-created_at", 500)
      : base44.entities.Client.filter({ assigned_broker: user?.email }, "-created_at", 500),
    enabled: !!user,
  });

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Document.create({
        name: uploadForm.name || file.name,
        file_url,
        client_id: uploadForm.client_id,
        client_name: uploadForm.client_name,
        document_type: uploadForm.document_type,
        uploaded_by: user?.email,
        version: 1
      });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setShowUpload(false);
      setUploadForm({ name: "", document_type: "other", client_id: "", client_name: "" });
    } catch (err) {
      toast({ title: "Upload failed", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    try {
      await base44.entities.Document.delete(docId);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    } catch (err) {
      toast({ title: "Failed to delete document", description: err?.message || "Please try again.", variant: "destructive" });
    }
  };

  if (!user) {
    return <div className="flex items-center justify-center h-full"><RefreshCw className="w-5 h-5 animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#1a2744]">Documents</h2>
          <p className="text-sm text-gray-400">{total.toLocaleString()} document{total !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setShowUpload(true)} className="bg-[#1a2744] hover:bg-[#243556]">
          <Upload className="w-4 h-4 mr-2" /> Upload Document
        </Button>
      </div>

      <Card className="p-4 border-0 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase())}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80">
                <TableHead className="font-medium text-xs">Document</TableHead>
                <TableHead className="font-medium text-xs">Type</TableHead>
                <TableHead className="font-medium text-xs hidden md:table-cell">Client</TableHead>
                <TableHead className="font-medium text-xs hidden md:table-cell">Uploaded</TableHead>
                <TableHead className="font-medium text-xs hidden lg:table-cell">Version</TableHead>
                <TableHead className="font-medium text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.length === 0 && !isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />No documents found
                  </TableCell>
                </TableRow>
              ) : (
                documents.map(doc => (
                  <TableRow key={doc.id} className="hover:bg-blue-50/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="font-medium text-sm truncate max-w-[200px]">{doc.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${DOC_TYPE_COLORS[doc.document_type] || DOC_TYPE_COLORS.other}`}>
                        {doc.document_type?.replace(/_/g," ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-gray-500">{doc.client_name || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-gray-400">{moment(doc.created_at).format("MMM D, YYYY")}</TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-gray-400">v{doc.version || 1}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <a href={`/api/download-file?url=${encodeURIComponent(doc.file_url)}`} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-blue-600">
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                        </a>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-500" onClick={() => handleDelete(doc.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} isLoading={isLoading} />
      </Card>

      {/* Upload Modal */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1a2744]">Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-gray-500">Document Name</Label>
              <Input value={uploadForm.name} onChange={e => setUploadForm({...uploadForm, name: e.target.value})} placeholder="Leave blank for filename" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Document Type</Label>
              <Select value={uploadForm.document_type} onValueChange={v => setUploadForm({...uploadForm, document_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase())}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {clients.length > 0 && (
              <div>
                <Label className="text-xs text-gray-500">Client (optional)</Label>
                <Select value={uploadForm.client_id || ""} onValueChange={v => {
                  const c = clients.find(cl => cl.id === v);
                  setUploadForm({...uploadForm, client_id: v, client_name: c?.client_name || ""});
                }}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.client_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-xs text-gray-500">File</Label>
              <label className="mt-1 flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors">
                <input type="file" className="hidden" onChange={handleUpload} />
                <div className="text-center">
                  {uploading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                      <p className="text-sm text-gray-400">Click to upload</p>
                      <p className="text-[10px] text-gray-300 mt-0.5">PDF, Images, Word, Excel</p>
                    </>
                  )}
                </div>
              </label>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
