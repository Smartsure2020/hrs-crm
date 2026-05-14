import { useState } from "react";

export function useInlineEdit(persist) {
  const [editingCell, setEditingCell] = useState(null);
  const [pending, setPending] = useState({});

  const keyFn = (id, field) => `${id}.${field}`;
  const isEdit = (id, field) => editingCell?.id === id && editingCell?.field === field;

  const startEdit = (id, field, val) => {
    setEditingCell({ id, field });
    setPending(p => ({ ...p, [keyFn(id, field)]: val ?? "" }));
  };

  const getPending = (id, field, fallback) => {
    const k = keyFn(id, field);
    return pending[k] !== undefined ? pending[k] : (fallback ?? "");
  };

  const saveField = async (id, field) => {
    const k = keyFn(id, field);
    let val = pending[k];
    if (val === undefined) { setEditingCell(null); return; }
    if (field === "estimated_premium") val = parseFloat(val) || 0;
    await persist(id, field, val);
    setEditingCell(null);
  };

  const onKeyDown = (e, id, field) => {
    if (e.key === "Enter" && field !== "notes") saveField(id, field);
    if (e.key === "Escape") setEditingCell(null);
  };

  return { editingCell, setEditingCell, pending, setPending, keyFn, isEdit, startEdit, getPending, saveField, onKeyDown };
}
