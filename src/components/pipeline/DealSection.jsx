import React from "react";
import { Plus, RefreshCw } from "lucide-react";
import { COL_WIDTHS } from "./stages";
import DealRow from "./DealRow";

const COLUMNS = ["Name", "Contact Details", "Stage", "Notes", "Est. Value (R)"];

export default function DealSection({
  deals,
  theme,
  title,
  subtitle,
  showAddRow,
  onAddRow,
  isLoading,
  edit,
  selected,
  toggleSelect,
  handleStageChange,
  setEditDeal,
  clientMap,
}) {
  return (
    <div>
      {title && (
        <div className="flex items-center gap-2 mb-3">
          <h3 className={`text-sm font-semibold ${theme.titleText}`}>{title}</h3>
          <span className={`text-xs text-gray-400 ${theme.badgeBg} border ${theme.badgeBorder} px-2 py-0.5 rounded-full`}>
            {subtitle}
          </span>
        </div>
      )}
      <div className={`bg-white rounded-xl shadow-sm border ${theme.border} overflow-hidden ${title ? "opacity-80" : ""}`}>
        <div className={`grid ${COL_WIDTHS} border-b ${theme.headerBorder} ${theme.headerBg}`}>
          {COLUMNS.map((col, i) => (
            <div
              key={i}
              className={`px-4 py-2.5 text-[11px] font-semibold ${theme.headerText} uppercase tracking-wider ${
                i > 0 ? `border-l ${theme.colBorder}` : "pl-10"
              }`}
            >
              {col}
            </div>
          ))}
        </div>

        {showAddRow && (
          <button
            onClick={onAddRow}
            className="w-full flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 hover:bg-gray-50 transition-colors text-gray-400 hover:text-[#1a2744] text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Lead</span>
          </button>
        )}

        <div className={`divide-y ${theme.divide}`}>
          {isLoading && (
            <div className="py-16 flex justify-center">
              <RefreshCw className="w-5 h-5 animate-spin text-gray-300" />
            </div>
          )}
          {!isLoading && deals.length === 0 && showAddRow && (
            <div className="py-16 text-center text-gray-400 text-sm">
              No deals found. Click <span className="font-medium text-gray-600">+ Add Lead</span> above to get started.
            </div>
          )}
          {deals.map(deal => (
            <DealRow
              key={deal.id}
              deal={deal}
              isSelected={selected.has(deal.id)}
              toggleSelect={toggleSelect}
              handleStageChange={handleStageChange}
              setEditDeal={setEditDeal}
              edit={edit}
              clientMap={clientMap}
              theme={theme}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
