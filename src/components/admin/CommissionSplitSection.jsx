import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Save, Trash2, Percent } from "lucide-react";

export default function CommissionSplitSection() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [showNew, setShowNew] = useState(false);
  const [newRow, setNewRow] = useState({ broker_name: "", broker_email: "", broker_percentage: "", hrs_percentage: "" });

  const { data: splits = [] } = useQuery({
    queryKey: ["commission-splits"],
    queryFn: () => base44.entities.CommissionSplit.list("-created_date", 100),
  });

  const { data: brokers = [] } = useQuery({
    queryKey: ["brokers-list"],
    queryFn: () => base44.entities.User.list(),
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CommissionSplit.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["commission-splits"] }); setEditingId(null); },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CommissionSplit.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commission-splits"] });
      setShowNew(false);
      setNewRow({ broker_name: "", broker_email: "", broker_percentage: "", hrs_percentage: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CommissionSplit.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["commission-splits"] }),
  });

  const startEdit = (split) => {
    setEditingId(split.id);
    setEditData({ broker_percentage: split.broker_percentage, hrs_percentage: split.hrs_percentage, notes: split.notes || "" });
  };

  const brokerOptions = brokers.filter(u => u.role === "broker" || u.role === "admin");

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
            <Percent className="w-4 h-4 text-blue-600" />
          </div>
          <h3 className="font-semibold text-[#1a2744]">Commission Splits</h3>
        </div>
        <Button size="sm" onClick={() => setShowNew(true)} className="bg-[#1a2744] hover:bg-[#243556]">
          <Plus className="w-3.5 h-3.5 mr-1" /> Add
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 px-3 text-gray-500 font-medium">Broker</th>
              <th className="text-center py-2 px-3 text-gray-500 font-medium">Broker %</th>
              <th className="text-center py-2 px-3 text-gray-500 font-medium">HRS %</th>
              <th className="text-left py-2 px-3 text-gray-500 font-medium">Notes</th>
              <th className="py-2 px-3"></th>
            </tr>
          </thead>
          <tbody>
            {splits.map(split => (
              <tr key={split.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="py-2 px-3">
                  <div className="font-medium text-[#1a2744]">{split.broker_name}</div>
                  <div className="text-xs text-gray-400">{split.broker_email}</div>
                </td>
                <td className="py-2 px-3 text-center">
                  {editingId === split.id ? (
                    <Input type="number" min="0" max="100" className="w-20 text-center mx-auto h-7 text-sm"
                      value={editData.broker_percentage}
                      onChange={e => setEditData(d => ({ ...d, broker_percentage: e.target.value }))} />
                  ) : (
                    <span className="font-semibold text-blue-600">{split.broker_percentage}%</span>
                  )}
                </td>
                <td className="py-2 px-3 text-center">
                  {editingId === split.id ? (
                    <Input type="number" min="0" max="100" className="w-20 text-center mx-auto h-7 text-sm"
                      value={editData.hrs_percentage}
                      onChange={e => setEditData(d => ({ ...d, hrs_percentage: e.target.value }))} />
                  ) : (
                    <span className="font-semibold text-green-600">{split.hrs_percentage}%</span>
                  )}
                </td>
                <td className="py-2 px-3">
                  {editingId === split.id ? (
                    <Input className="h-7 text-sm" value={editData.notes}
                      onChange={e => setEditData(d => ({ ...d, notes: e.target.value }))} />
                  ) : (
                    <span className="text-gray-500 text-xs">{split.notes || "—"}</span>
                  )}
                </td>
                <td className="py-2 px-3">
                  <div className="flex items-center gap-1 justify-end">
                    {editingId === split.id ? (
                      <>
                        <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700"
                          onClick={() => saveMutation.mutate({ id: split.id, data: editData })}>
                          <Save className="w-3 h-3 mr-1" /> Save
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingId(null)}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => startEdit(split)}>Edit</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => deleteMutation.mutate(split.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {/* New row */}
            {showNew && (
              <tr className="border-b border-blue-100 bg-blue-50/30">
                <td className="py-2 px-3">
                  <select className="w-full border border-gray-200 rounded-md h-8 px-2 text-sm bg-white"
                    value={newRow.broker_email}
                    onChange={e => {
                      const broker = brokerOptions.find(b => b.email === e.target.value);
                      setNewRow(r => ({ ...r, broker_email: e.target.value, broker_name: broker?.full_name || "" }));
                    }}>
                    <option value="">Select broker...</option>
                    {brokerOptions.map(b => (
                      <option key={b.id} value={b.email}>{b.full_name}</option>
                    ))}
                  </select>
                </td>
                <td className="py-2 px-3">
                  <Input type="number" min="0" max="100" placeholder="%" className="w-20 text-center mx-auto h-8 text-sm"
                    value={newRow.broker_percentage}
                    onChange={e => setNewRow(r => ({ ...r, broker_percentage: e.target.value }))} />
                </td>
                <td className="py-2 px-3">
                  <Input type="number" min="0" max="100" placeholder="%" className="w-20 text-center mx-auto h-8 text-sm"
                    value={newRow.hrs_percentage}
                    onChange={e => setNewRow(r => ({ ...r, hrs_percentage: e.target.value }))} />
                </td>
                <td className="py-2 px-3">
                  <Input placeholder="Notes..." className="h-8 text-sm"
                    value={newRow.notes || ""}
                    onChange={e => setNewRow(r => ({ ...r, notes: e.target.value }))} />
                </td>
                <td className="py-2 px-3">
                  <div className="flex items-center gap-1 justify-end">
                    <Button size="sm" className="h-7 text-xs bg-[#1a2744] hover:bg-[#243556]"
                      onClick={() => createMutation.mutate({ ...newRow, broker_percentage: Number(newRow.broker_percentage), hrs_percentage: Number(newRow.hrs_percentage) })}>
                      <Save className="w-3 h-3 mr-1" /> Save
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowNew(false)}>Cancel</Button>
                  </div>
                </td>
              </tr>
            )}

            {splits.length === 0 && !showNew && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-400 text-sm">No commission splits configured yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}