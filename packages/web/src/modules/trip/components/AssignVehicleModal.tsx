/* Modal gán xe cho các chuyến đã chọn (bulk) — dùng PUT /trips/:id { vehicleId, version } */

import { useEffect, useState } from 'react';
import api from '../../../shared/api';
import { ModalOverlay } from '../../../shared/components/ModalOverlay';
import { SearchableMultiSelect } from '../../../shared/components/SearchableMultiSelect';
import type { MultiSelectOption } from '../../../shared/components/SearchableMultiSelect';
import { Alert, Button, Field } from '../../../shared/ui';
import { errorMessage } from '../../../shared/format';

interface VehicleOption { id: number; plateNumber: string; brand?: string | null; Supplier?: { name: string } | null }

interface Props {
  isOpen: boolean;
  /** Số chuyến sẽ được gán */
  count: number;
  busy: boolean;
  onClose: () => void;
  onSubmit: (vehicleId: number) => Promise<void>;
}

export function AssignVehicleModal({ isOpen, count, busy, onClose, onSubmit }: Props) {
  const [options, setOptions] = useState<MultiSelectOption[]>([]);
  const [vehicleId, setVehicleId] = useState<string | number>('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setVehicleId('');
    setError('');
    // Route /vehicles không giới hạn pageSize; dropdown tự lọc theo biển số
    api.get('/vehicles?pageSize=1000&status=ACTIVE')
      .then((r) => setOptions((r.data.data as VehicleOption[]).map((v) => ({
        value: v.id,
        label: v.plateNumber,
        sublabel: [v.brand, v.Supplier?.name].filter(Boolean).join(' · ') || undefined,
      }))))
      .catch((err) => setError(errorMessage(err, 'Không tải được danh sách xe')));
  }, [isOpen]);

  const submit = async () => {
    if (!vehicleId) { setError('Chọn một xe để gán.'); return; }
    setError('');
    await onSubmit(Number(vehicleId));
  };

  return (
    <ModalOverlay
      isOpen={isOpen}
      onClose={onClose}
      title="Gán xe cho chuyến"
      subtitle={`Áp dụng cho ${count} chuyến đã chọn`}
      size="sm"
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>Hủy</Button>
          <Button variant="primary" onClick={submit} loading={busy} disabled={!vehicleId}>Gán xe</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="Xe" required hint="Chỉ liệt kê xe đang hoạt động. Nhà xe lấy theo xe được gán.">
          <SearchableMultiSelect mode="single" searchable="auto" options={options} value={vehicleId} onChange={(v) => setVehicleId(v)} placeholder="— Chọn biển số —" />
        </Field>
      </div>
    </ModalOverlay>
  );
}
