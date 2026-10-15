/* Trạng thái + thao tác của drawer chi tiết chuyến: tải, sửa, xóa, thêm/xóa chi phí */

import { useCallback, useState } from 'react';
import api from '../../../shared/api';
import { errorMessage } from '../../../shared/format';
import type { NewCostInput, TripDetailData, TripEditForm } from './types';

function buildEditForm(d: TripDetailData): TripEditForm {
  return {
    tripDate: d.tripDate?.split('T')[0] || '',
    tripType: d.tripType || '',
    status: d.status || 'PLANNED',
    unitPrice: d.unitPrice ? String(d.unitPrice) : '',
    revenue: d.revenue ? String(d.revenue) : '',
    departureTime: d.departureTime ? d.departureTime.slice(0, 16) : '',
    arrivalTime: d.arrivalTime ? d.arrivalTime.slice(0, 16) : '',
    actualKm: d.actualKm ? String(d.actualKm) : '',
    cargoWeight: d.cargoWeight ? String(d.cargoWeight) : '',
    cargoDescription: d.cargoDescription || '',
    notes: d.notes || '',
    version: d.version,
  };
}

const numOrNull = (v: string) => (v ? Number(v) : null);

export function useTripDetail(onChanged: () => void) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<TripDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<TripEditForm | null>(null);
  const [busy, setBusy] = useState(false);
  /** Lỗi của hành động trong drawer (đổi trạng thái…), hiển thị bằng Alert thay vì alert() */
  const [actionError, setActionError] = useState('');

  const load = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const res = await api.get(`/trips/${id}`);
      setDetail(res.data.data);
    } catch {
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const open = useCallback((id: number) => {
    if (selectedId === id) return;
    setSelectedId(id);
    setIsEditing(false);
    setActionError('');
    void load(id);
  }, [selectedId, load]);

  const close = useCallback(() => {
    setSelectedId(null);
    setDetail(null);
    setIsEditing(false);
    setActionError('');
  }, []);

  /** Đổi trạng thái qua PATCH /trips/:id/status; luồng hợp lệ do trip-status-flow.ts quyết định */
  const changeStatus = useCallback(async (next: string) => {
    if (!detail) return;
    setBusy(true);
    setActionError('');
    try {
      await api.patch(`/trips/${detail.id}/status`, { status: next });
      await load(detail.id);
      onChanged();
    } catch (err) {
      setActionError(errorMessage(err, 'Không đổi được trạng thái'));
    } finally {
      setBusy(false);
    }
  }, [detail, load, onChanged]);

  const toggleEdit = useCallback(() => {
    if (!isEditing && detail) setEditForm(buildEditForm(detail));
    setIsEditing((prev) => !prev);
  }, [isEditing, detail]);

  const patchForm = useCallback((patch: Partial<TripEditForm>) => {
    setEditForm((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const save = useCallback(async () => {
    if (!detail || !editForm) return;
    setBusy(true);
    try {
      await api.put(`/trips/${detail.id}`, {
        ...editForm,
        unitPrice: numOrNull(editForm.unitPrice),
        revenue: numOrNull(editForm.revenue),
        actualKm: numOrNull(editForm.actualKm),
        cargoWeight: numOrNull(editForm.cargoWeight),
        departureTime: editForm.departureTime || null,
        arrivalTime: editForm.arrivalTime || null,
      });
      setIsEditing(false);
      await load(detail.id);
      onChanged();
    } catch (err) {
      alert(errorMessage(err, 'Lỗi lưu'));
    } finally {
      setBusy(false);
    }
  }, [detail, editForm, load, onChanged]);

  const remove = useCallback(async () => {
    if (!detail || !confirm('Xóa chuyến này?')) return;
    setBusy(true);
    try {
      await api.delete(`/trips/${detail.id}`);
      close();
      onChanged();
    } catch (err) {
      alert(errorMessage(err, 'Lỗi xóa chuyến'));
    } finally {
      setBusy(false);
    }
  }, [detail, close, onChanged]);

  /** Trả về true khi thêm thành công để form chi phí tự đóng */
  const addCost = useCallback(async (cost: NewCostInput): Promise<boolean> => {
    if (!detail) return false;
    try {
      await api.post(`/trips/${detail.id}/costs`, cost);
      await load(detail.id);
      onChanged();
      return true;
    } catch (err) {
      alert(errorMessage(err, 'Lỗi thêm chi phí'));
      return false;
    }
  }, [detail, load, onChanged]);

  const deleteCost = useCallback(async (costId: number) => {
    if (!detail) return;
    try {
      await api.delete(`/trips/${detail.id}/costs/${costId}`);
      await load(detail.id);
      onChanged();
    } catch (err) {
      alert(errorMessage(err, 'Lỗi xóa chi phí'));
    }
  }, [detail, load, onChanged]);

  const clearActionError = useCallback(() => setActionError(''), []);

  return {
    selectedId, detail, loading, isEditing, editForm, busy, actionError,
    open, close, toggleEdit, patchForm, save, remove, addCost, deleteCost, changeStatus, clearActionError,
  };
}

export type TripDetailController = ReturnType<typeof useTripDetail>;
