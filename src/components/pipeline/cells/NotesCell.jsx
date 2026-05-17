import React from "react";

export default function NotesCell({ deal, edit }) {
  const { isEdit, setPending, keyFn, saveField, setEditingCell, startEdit } = edit;
  const isEditing = isEdit(deal.id, "notes");
  const val = deal.notes || "";
  const [localVal, setLocalVal] = React.useState(val);

  if (isEditing) {
    return (
      <textarea
        autoFocus
        value={localVal}
        onChange={e => {
          setLocalVal(e.target.value);
          setPending(p => ({ ...p, [keyFn(deal.id, "notes")]: e.target.value }));
        }}
        onBlur={() => saveField(deal.id, "notes")}
        onKeyDown={e => { if (e.key === "Escape") setEditingCell(null); }}
        className="w-full text-sm border border-[#1a2744]/25 rounded p-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-[#1a2744]/20 min-h-[64px]"
        rows={3}
      />
    );
  }

  return (
    <div
      onClick={() => { setLocalVal(val); startEdit(deal.id, "notes", val); }}
      className="cursor-text min-h-[26px] text-sm text-gray-600 hover:bg-[#1a2744]/5 rounded px-1.5 py-0.5 -mx-1.5 transition-colors leading-snug"
      style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}
    >
      {val || <span className="text-gray-300 text-xs italic">Add notes…</span>}
    </div>
  );
}
