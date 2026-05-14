import React from "react";
import { Input } from "@/components/ui/input";

export default function TextCell({ deal, field, placeholder, edit }) {
  const { isEdit, getPending, setPending, keyFn, saveField, onKeyDown, startEdit } = edit;
  const val = deal[field] || "";

  if (isEdit(deal.id, field)) {
    return (
      <Input
        autoFocus
        value={getPending(deal.id, field, val)}
        onChange={e => setPending(p => ({ ...p, [keyFn(deal.id, field)]: e.target.value }))}
        onBlur={() => saveField(deal.id, field)}
        onKeyDown={e => onKeyDown(e, deal.id, field)}
        className="h-7 text-sm border-[#1a2744]/25 focus-visible:ring-[#1a2744]/20"
      />
    );
  }

  return (
    <div
      onClick={() => startEdit(deal.id, field, val)}
      className="cursor-text min-h-[26px] flex items-center text-sm text-gray-800 hover:bg-[#1a2744]/5 rounded px-1.5 py-0.5 -mx-1.5 transition-colors"
    >
      {val || <span className="text-gray-300 text-xs italic">{placeholder}</span>}
    </div>
  );
}
