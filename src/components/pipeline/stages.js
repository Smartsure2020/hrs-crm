export const STAGES = [
  { value: "lead",       label: "Lead",                  color: "bg-blue-100 text-blue-700" },
  { value: "quoting",    label: "Quoting",               color: "bg-purple-100 text-purple-700" },
  { value: "quote_sent", label: "Quote Sent to Client",  color: "bg-indigo-100 text-indigo-700" },
  { value: "follow_up",  label: "Follow Up",             color: "bg-orange-100 text-orange-700" },
  { value: "won",        label: "Won",                   color: "bg-emerald-100 text-emerald-700" },
  { value: "lost",       label: "Lost",                  color: "bg-red-100 text-red-500" },
];

export const ACTIVE_STAGES = STAGES.filter(s => s.value !== "lost" && s.value !== "won");

export const LEGACY_MAP = {
  lead_received: "lead", contacted: "lead",
  quote_requested: "quoting", quotes_received: "quoting",
  quote_sent: "quote_sent", follow_up: "follow_up",
  policy_bound: "won", lost: "lost",
};

export const UI_TO_DB_STAGE = {
  lead:       "lead_received",
  quoting:    "quote_requested",
  quote_sent: "quote_sent",
  follow_up:  "follow_up",
  won:        "policy_bound",
  lost:       "lost",
};

export const COL_WIDTHS = "grid-cols-[2fr_1.5fr_1.7fr_3fr_1.2fr]";

export const normalizeStage = (s) => LEGACY_MAP[s] || s || "lead";
export const getStageConf   = (s) => STAGES.find(x => x.value === s) || STAGES[0];
export const toDbStage      = (s) => UI_TO_DB_STAGE[s] || s;
