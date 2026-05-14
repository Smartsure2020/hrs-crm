import React from "react";
import { Input } from "@/components/ui/input";

export default function ContactCell({ deal, clientMap, edit }) {
  const { isEdit, getPending, setPending, keyFn, saveField, onKeyDown, startEdit } = edit;
  const client = clientMap[deal.client_id];
  const phone = deal.contact_phone || client?.phone || "";
  const email = deal.contact_email || client?.email || "";

  return (
    <div className="space-y-0.5">
      {isEdit(deal.id, "contact_phone") ? (
        <Input
          autoFocus
          value={getPending(deal.id, "contact_phone", phone)}
          onChange={e => setPending(p => ({ ...p, [keyFn(deal.id, "contact_phone")]: e.target.value }))}
          onBlur={() => saveField(deal.id, "contact_phone")}
          onKeyDown={e => onKeyDown(e, deal.id, "contact_phone")}
          className="h-6 text-xs"
          placeholder="+27..."
        />
      ) : (
        <div
          onClick={() => startEdit(deal.id, "contact_phone", phone)}
          className="cursor-text text-xs text-gray-700 hover:bg-[#1a2744]/5 rounded px-1.5 py-0.5 -mx-1.5 transition-colors"
        >
          {phone || <span className="text-gray-300 italic">Phone</span>}
        </div>
      )}
      {isEdit(deal.id, "contact_email") ? (
        <Input
          autoFocus
          value={getPending(deal.id, "contact_email", email)}
          onChange={e => setPending(p => ({ ...p, [keyFn(deal.id, "contact_email")]: e.target.value }))}
          onBlur={() => saveField(deal.id, "contact_email")}
          onKeyDown={e => onKeyDown(e, deal.id, "contact_email")}
          className="h-6 text-xs"
          placeholder="email@..."
        />
      ) : (
        <div
          onClick={() => startEdit(deal.id, "contact_email", email)}
          className="cursor-text text-xs text-gray-400 hover:bg-[#1a2744]/5 rounded px-1.5 py-0.5 -mx-1.5 transition-colors"
        >
          {email || <span className="text-gray-300 italic">Email</span>}
        </div>
      )}
    </div>
  );
}
