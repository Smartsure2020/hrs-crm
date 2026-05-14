import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { ChevronDown } from "lucide-react";
import { STAGES, COL_WIDTHS, getStageConf } from "./stages";
import TextCell from "./cells/TextCell";
import ContactCell from "./cells/ContactCell";
import ValueCell from "./cells/ValueCell";
import NotesCell from "./cells/NotesCell";

export default function DealRow({ deal, isSelected, toggleSelect, handleStageChange, setEditDeal, edit, clientMap, theme }) {
  const isActive = edit.editingCell?.id === deal.id;
  const stageConf = getStageConf(deal._stage);

  return (
    <div className={`grid ${COL_WIDTHS} transition-colors duration-100 ${
      isSelected ? theme.rowSelected : isActive ? theme.rowEditing : theme.rowHover
    }`}>
      <div className="px-4 py-3 flex items-start gap-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => toggleSelect(deal.id)}
          onClick={e => e.stopPropagation()}
          className="mt-1 flex-shrink-0 accent-[#1a2744] cursor-pointer"
        />
        <div className="w-full">
          <TextCell deal={deal} field="client_name" placeholder="Client name…" edit={edit} />
          <div
            onClick={() => setEditDeal(deal)}
            className="cursor-pointer text-[10px] text-gray-300 hover:text-[#1a2744] hover:underline mt-0.5 transition-colors"
          >
            Open details
          </div>
        </div>
      </div>

      <div className={`px-4 py-3 border-l ${theme.colBorder}`}>
        <ContactCell deal={deal} clientMap={clientMap} edit={edit} />
      </div>

      <div className={`px-4 py-3 border-l ${theme.colBorder} flex items-start pt-3.5`}>
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

      <div className={`px-4 py-3 border-l ${theme.colBorder}`}>
        <NotesCell deal={deal} edit={edit} />
      </div>

      <div className={`px-4 py-3 border-l ${theme.colBorder}`}>
        <ValueCell deal={deal} edit={edit} />
      </div>
    </div>
  );
}
