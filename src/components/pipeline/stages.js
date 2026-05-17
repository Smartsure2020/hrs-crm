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

// Granular DB-value list with labels harmonised to the board vocabulary.
// Used by DealFormModal so the dropdown matches what the user sees on the pipeline.
// Two DB values collapse to "Quoting" in the board view but stay distinct here,
// because the modal round-trips writes and cannot lose granularity.
export const MODAL_STAGES = [
  { value: "lead_received",    label: "Lead" },
  { value: "contacted",        label: "Lead — Contacted" },
  { value: "quote_requested",  label: "Quoting — Requested" },
  { value: "quotes_received",  label: "Quoting — Received" },
  { value: "quote_sent",       label: "Quote Sent" },
  { value: "follow_up",        label: "Follow Up" },
  { value: "policy_bound",     label: "Won" },
  { value: "lost",             label: "Lost" },
];
