import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { ChevronDown } from "lucide-react";

export default function DealTable({
  deals, COL_WIDTHS, STAGES, editingCell, selected,
  toggleSelect, handleStageChange, getPending, setPending,
  keyFn, saveField, setEditingCell, startEdit,
  headerColor, borderColor, divideColor, rowHoverColor, selectedColor,
  TextCell, ContactCell, NotesCell, ValueCell,
}) {
  return (
    <div className="divide-y" style={{ borderColor: divideColor }}>
      {deals.map(deal => {
        const stageConf = STAGES.find(x => x.value === deal._stage) || STAGES[0];
        const isActive = editingCell?.id === deal.id;
        const isSelected = selected.has(deal.id);

        return (
          <div
            key={deal.id}
            className={`grid ${COL_WIDTHS} transition-colors duration-100`}
            style={{
              backgroundColor: isSelected ? selectedColor : isActive ? selectedColor + "80" : undefined,
            }}
          >
            <div className="px-4 py-3 flex items-start gap-2">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelect(deal.id)}
                onClick={e => e.stopPropagation()}
                className="mt-1 flex-shrink-0 accent-[#1a2744] cursor-pointer"
              />
              <div className="w-full">
                <TextCell deal={deal} field="client_name" placeholder="Client name…" />
              </div>
            </div>
            <div className="px-4 py-3 border-l" style={{ borderColor }}>
              <ContactCell deal={deal} />
            </div>
            <div className="px-4 py-3 border-l flex items-start pt-3.5" style={{ borderColor }}>
              <Select value={deal._stage} onValueChange={v => handleStageChange(deal.id, v)}>
                <SelectTrigger className="h-auto p-0 border-0 shadow-none focus:ring-0 bg-transparent w-auto [&>svg]:hidden">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer select-none ${stageConf.color}`}>
                    {stageConf.label}
                    <ChevronDown className="w-3 h-3 opacity-40" />
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
                        {s.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="px-4 py-3 border-l" style={{ borderColor }}>
              <NotesCell
                deal={deal}
                isEditing={editingCell?.id === deal.id && editingCell?.field === "notes"}
                getPending={getPending}
                setPending={setPending}
                keyFn={keyFn}
                saveField={saveField}
                setEditingCell={setEditingCell}
                startEdit={startEdit}
              />
            </div>
            <div className="px-4 py-3 border-l" style={{ borderColor }}>
              <ValueCell deal={deal} />
            </div>
          </div>
        );
      })}
    </div>
  );
}