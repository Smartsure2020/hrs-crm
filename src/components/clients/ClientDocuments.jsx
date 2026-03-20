import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Upload, FileText, Trash2, Download, Loader2,
  FileCheck2, FileBadge, FileWarning, File
} from "lucide-react";
import moment from "moment";

const FOLDERS = [
  { value: "kyc",               label: "KYC" },
  { value: "compliance",        label: "Compliance" },
  { value: "current_policies",  label: "Current Policies" },
  { value: "previous_policies", label: "Previous Policies" },
  { value: "renewals",          label: "Renewals" },
  { value: "current_claims",    label: "Current Claims" },
  { value: "previous_claims",   label: "Previous Claims" },
  { value: "correspondence",    label: "Correspondence" },
  { value: "general",           label: "General" },
];

const DOC_TYPES = [
  { value: "fica_docs",            label: "FICA Docs",             folder: "kyc" },
  { value: "broker_appointment",   label: "Broker Appointment",    folder: "compliance" },
  { value: "roa",                  label: "ROA",                   folder: "compliance" },
  { value: "disclosure",           label: "Disclosure",            folder: "compliance" },
  { value: "debit_order_authority",label: "Debit Order Authority", folder: "compliance" },
  { value: "fee_consent_form",     label: "Fee Consent Form",      folder: "compliance" },
  { value: "policy_schedule",      label: "Policy Schedule",       folder: "current_policies" },
  { value: "quote",                label: "Quote",                 folder: "current_policies" },
  { value: "claim",                label: "Claim",                 folder: "current_claims" },
  { value: "id_copy",              label: "ID Copy",               folder: "kyc" },
  { value: "proof_of_address",     label: "Proof of Address",      folder: "kyc" },
  { value: "bank_statement",       label: "Bank Statement",        folder: "kyc" },
  { value: "correspondence",       label: "Correspondence",        folder: "correspondence" },
  { value: "other",                label: "Other",                 folder: "general" },
];

const FOLDER_COLORS = {
  kyc:               "bg-teal-100 text-teal-700",
  compliance:        "bg-yellow-100 text-yellow-700",
  current_policies:  "bg-blue-100 text-blue-700",
  previous_policies: "bg-indigo-100 text-indigo-700",
  renewals:          "bg-purple-100 text-purple-700",
  current_claims:    "bg-red-100 text-red-700",
  previous_claims:   "bg-orange-100 text-orange-700",
  correspondence:    "bg-pink-100 text-pink-700",
  general:           "bg-gray-100 text-gray-600",
};

const FileIcon = ({ name }) => {
  const ext = name?.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return <FileCheck2 className="w-5 h-5 text-red-400 flex-shrink-0" />;
  if (["doc","docx"].includes(ext)) return <FileBadge className="w-5 h-5 text-blue-400 flex-shrink-0" />;
  if (["xls","xlsx"].includes(ext)) return <FileBadge className="w-5 h-5 text-green-500 flex-shrink-0" />;
  if (["jpg","jpeg","png"].includes(ext)) return <FileWarning className="w-5 h-5 text-orange-400 flex-shrink-0" />;
  return <File className="w-5 h-5 text-gray-400 flex-shrink-0" />;
};

export default function ClientDocuments({ documents, clientId, clientName, user }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState("other");
  const [deletingId, setDeletingId] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const uploadFile = async (file) => {
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.Document.create({
      name: file.name,
      file_url,
      client_id: clientId,
      client_name: clientName,
      document_type: selectedType,
      uploaded_by: user?.email,
      version: 1,
    });
    queryClient.invalidateQueries({ queryKey: ["client-docs"] });
    setUploading(false);
    setSelectedType("other");
  };

  const handleFileChange = (e) => {
    uploadFile(e.target.files[0]);
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    uploadFile(e.dataTransfer.files[0]);
  };

  const handleDelete = async (docId) => {
    setDeletingId(docId);
    await base44.entities.Document.delete(docId);
    queryClient.invalidateQueries({ queryKey: ["client-docs"] });
    setDeletingId(null);
  };

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
          dragOver ? "border-[#1a2744] bg-blue-50" : "border-gray-200 bg-gray-50 hover:border-gray-300"
        }`}
      >
        <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm font-medium text-gray-600 mb-1">Drag & drop a file, or click to browse</p>
        <p className="text-xs text-gray-400 mb-4">PDF, Word, Excel, or image files</p>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-44 h-8 text-xs bg-white">
              <SelectValue placeholder="Document type" />
            </SelectTrigger>
            <SelectContent>
              {DOC_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            onChange={handleFileChange}
          />
          <Button
            size="sm"
            className="bg-[#1a2744] hover:bg-[#243556] h-8 text-xs"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Uploading…</>
            ) : (
              <><Upload className="w-3.5 h-3.5 mr-1.5" />Upload File</>
            )}
          </Button>
        </div>
      </div>

      {/* Documents list */}
      {documents.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No documents uploaded yet</p>
        </div>
      ) : (
        <div className="divide-y border rounded-xl overflow-hidden bg-white">
          {documents.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 p-3.5 hover:bg-gray-50 transition-colors">
              <FileIcon name={doc.name} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{doc.name}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <Badge className={`text-[10px] px-1.5 py-0 ${TYPE_COLORS[doc.document_type] || TYPE_COLORS.other}`}>
                    {DOC_TYPES.find(t => t.value === doc.document_type)?.label || "Other"}
                  </Badge>
                  <span className="text-[10px] text-gray-400">
                    Uploaded {moment(doc.created_date).format("D MMM YYYY")}
                    {doc.uploaded_by ? ` by ${doc.uploaded_by}` : ""}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                  <Button size="icon" variant="ghost" className="w-7 h-7 text-blue-500 hover:text-blue-700 hover:bg-blue-50">
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                </a>
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-7 h-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                  onClick={() => handleDelete(doc.id)}
                  disabled={deletingId === doc.id}
                >
                  {deletingId === doc.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />
                  }
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}