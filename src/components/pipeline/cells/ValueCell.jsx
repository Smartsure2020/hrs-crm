import React from "react";
import { Input } from "@/components/ui/input";

export default function ValueCell({ deal, edit }) {
  const { isEdit, getPending, setPending, keyFn, saveField, onKeyDown, startEdit } = edit;
  const val = deal.estimated_premium ?? 0;

  if (isEdit(deal.id, "estimated_premium")) {
    return (
      <Input
        autoFocus
        type="number"
        value={getPending(deal.id, "estimated_premium", val)}
        onChange={e => setPending(p => ({ ...p, [keyFn(deal.id, "estimated_premium")]: e.target.value }))}
        onBlur={() => saveField(deal.id, "estimated_premium")}
        onKeyDown={e => onKeyDown(e, deal.id, "estimated_premium")}
        className="h-7 text-sm w-full"
      />
    );
  }

  return (
    <div
      onClick={() => startEdit(deal.id, "estimated_premium", val)}
      className="cursor-text text-sm font-medium text-gray-800 hover:bg-[#1a2744]/5 rounded px-1.5 py-0.5 -mx-1.5 transition-colors tabular-nums"
    >
      {val
        ? `R ${Number(val).toLocaleString()}`
        : <span className="text-gray-300 font-normal text-xs italic">—</span>}
    </div>
  );
}
