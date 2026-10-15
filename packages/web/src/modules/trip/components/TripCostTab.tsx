/* Tab "Chi phí" của drawer: danh sách khoản chi, tổng, form thêm */

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button, IconButton, Input } from '../../../shared/ui';
import { SearchableMultiSelect } from '../../../shared/components/SearchableMultiSelect';
import { formatMoney } from '../../../shared/format';
import { COST_LABELS } from './types';
import type { NewCostInput, TripDetailData } from './types';

interface Props {
  detail: TripDetailData;
  /** Có quyền sửa và chuyến chưa khóa sổ */
  editable: boolean;
  onAdd: (cost: NewCostInput) => Promise<boolean>;
  onDelete: (costId: number) => void;
}

const EMPTY_FORM = { costType: 'FUEL', amount: '', description: '' };

export function TripCostTab({ detail, editable, onAdd, onDelete }: Props) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const costs = detail.TripCost ?? [];
  const total = costs.reduce((a, c) => a + Number(c.amount), 0);
  const amount = Number(form.amount);
  const valid = form.amount !== '' && Number.isFinite(amount) && amount > 0;

  const submit = async () => {
    if (!valid) return;
    setSaving(true);
    const ok = await onAdd({ costType: form.costType, amount, description: form.description.trim() || null });
    setSaving(false);
    if (ok) { setForm(EMPTY_FORM); setAdding(false); }
  };

  return (
    <div className="sub-card !p-0 overflow-hidden">
      {costs.length > 0 ? (
        <>
          {costs.map((c) => (
            <div key={c.id} className="flex items-center gap-3 border-b border-line-soft px-4 py-3">
              <div className="min-w-0 flex-1">
                <div>{COST_LABELS[c.costType] || c.costType}</div>
                {c.description && <div className="truncate text-xs text-muted">{c.description}</div>}
              </div>
              <span className="tabular-nums font-semibold">{formatMoney(c.amount)}</span>
              {editable && (
                <IconButton label="Xóa khoản chi phí" size="sm" tone="danger" onClick={() => { if (confirm('Xóa khoản chi phí này?')) onDelete(c.id); }}>
                  <Trash2 />
                </IconButton>
              )}
            </div>
          ))}
          <div className="flex px-4 py-3 font-bold">
            <span className="flex-1">Tổng</span>
            <span className="tabular-nums">{formatMoney(total, '0 đ')}</span>
          </div>
        </>
      ) : (
        <div className="tbl-empty">Chưa có khoản chi phí nào</div>
      )}

      {editable && (
        <div className="px-4 pb-4">
          {adding ? (
            <div className="flex flex-col gap-2">
              <SearchableMultiSelect
                mode="single"
                searchable="auto"
                options={Object.entries(COST_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                value={form.costType}
                onChange={(v) => setForm({ ...form, costType: String(v ?? '') })}
                placeholder="Loại chi phí"
              />
              <Input type="number" min={0} value={form.amount} placeholder="Số tiền (VND)" aria-label="Số tiền"
                onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              <Input type="text" value={form.description} placeholder="Mô tả" aria-label="Mô tả"
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setForm(EMPTY_FORM); }}>Hủy</Button>
                <Button size="sm" variant="primary" loading={saving} disabled={!valid} onClick={submit}>Thêm</Button>
              </div>
            </div>
          ) : (
            <Button variant="dashed" block onClick={() => setAdding(true)}>+ Thêm khoản chi phí</Button>
          )}
        </div>
      )}
    </div>
  );
}
