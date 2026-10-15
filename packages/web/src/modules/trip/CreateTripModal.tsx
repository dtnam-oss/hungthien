import { useState, useEffect, useCallback } from 'react';
import { Check } from 'lucide-react';
import { ModalOverlay } from '../../shared/components/ModalOverlay';
import { Alert, Button, Field, FormGrid, Input, LoadingBlock, Textarea } from '../../shared/ui';
import { SearchableMultiSelect } from '../../shared/components/SearchableMultiSelect';
import type { MultiSelectOption } from '../../shared/components/SearchableMultiSelect';
import api from '../../shared/api';

interface SelectData {
  customers: MultiSelectOption[];
  routes: MultiSelectOption[];
  vehicles: MultiSelectOption[];
  drivers: MultiSelectOption[];
}

interface CreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const TRIP_TYPES: MultiSelectOption[] = [
  { value: 'STANDARD', label: 'Cố định' },
  { value: 'EXPRESS', label: 'Nhanh' },
  { value: 'SPECIAL', label: 'Đặc biệt' },
];

export function CreateTripModal({ isOpen, onClose, onCreated }: CreateTripModalProps) {
  const [selectData, setSelectData] = useState<SelectData>({
    customers: [], routes: [], vehicles: [], drivers: [],
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form fields
  const [tripCode, setTripCode] = useState('');
  const [tripType, setTripType] = useState<string | number>('STANDARD');
  const [customerId, setCustomerId] = useState<string | number>('');
  const [cargoChannel, setCargoChannel] = useState('');
  const [routeId, setRouteId] = useState<string | number>('');
  const [vehicleId, setVehicleId] = useState<string | number>('');
  const [primaryDriverId, setPrimaryDriverId] = useState<string | number>('');
  const [secondaryDriverId, setSecondaryDriverId] = useState<string | number>('');
  const [tripDate, setTripDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [filteredRoutes, setFilteredRoutes] = useState<MultiSelectOption[]>([]);

  // Auto-generate trip code
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const prefix = `C${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      const rand = String(Math.floor(Math.random() * 900) + 100);
      setTripCode(`${prefix}-${rand}`);
    }
  }, [isOpen]);

  // Load select data
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    Promise.all([
      api.get('/customers?pageSize=500'),
      api.get('/routes?pageSize=500'),
      api.get('/vehicles?pageSize=500'),
      api.get('/employees?pageSize=100&isDriver=true'),
    ]).then(([cusRes, routeRes, vehRes, empRes]) => {
      const customers = (cusRes.data.data || []).map((c: { id: number; code: string; name: string }) => ({
        value: c.id,
        label: c.name,
        sublabel: c.code,
      }));
      const routes = (routeRes.data.data || []).map((r: { id: number; code: string; name: string }) => ({
        value: r.id,
        label: r.name,
        sublabel: r.code,
      }));
      const vehicles = (vehRes.data.data || []).map((v: { id: number; plateNumber: string; type?: string; primaryDriverId?: number; secondaryDriverId?: number; primaryDriver?: { id: number; fullName: string }; secondaryDriver?: { id: number; fullName: string } }) => ({
        value: v.id,
        label: v.plateNumber,
        sublabel: v.type || '',
        _raw: v,
      }));
      const drivers = (empRes.data.data || []).map((e: { id: number; fullName: string; code: string }) => ({
        value: e.id,
        label: e.fullName,
        sublabel: e.code,
      }));
      setSelectData({ customers, routes, vehicles, drivers });
    }).catch(() => {
      setError('Lỗi tải dữ liệu. Thử lại sau.');
    }).finally(() => {
      setLoading(false);
    });
  }, [isOpen]);

  // Auto-fill drivers when vehicle changes
  const handleVehicleChange = useCallback(async (val: string | number) => {
    setVehicleId(val);
    if (!val) {
      setPrimaryDriverId('');
      setSecondaryDriverId('');
      return;
    }
    try {
      const res = await api.get(`/vehicles/${val}`);
      const v = res.data.data;
      if (v.primaryDriver?.id) setPrimaryDriverId(v.primaryDriver.id);
      if (v.secondaryDriver?.id) setSecondaryDriverId(v.secondaryDriver.id);
    } catch {
      // Vehicle detail failed, don't auto-fill
    }
  }, []);

  // Reload routes when customer changes
  const handleCustomerChange = useCallback(async (val: string | number) => {
    setCustomerId(val);
    setRouteId(''); // Reset route
    setCargoChannel(''); // Reset channel
    if (!val) {
      setFilteredRoutes(selectData.routes);
      return;
    }
    try {
      const res = await api.get(`/routes?pageSize=500&customerId=${val}`);
      const routes = (res.data.data || []).map((r: { id: number; code: string; name: string }) => ({
        value: r.id,
        label: r.name,
        sublabel: r.code,
      }));
      setFilteredRoutes(routes);
    } catch {
      setFilteredRoutes(selectData.routes); // Fallback to all
    }
  }, [selectData.routes]);

  // Filter routes by cargoChannel (client-side text search)
  const handleChannelChange = useCallback((val: string) => {
    setCargoChannel(val);
    setRouteId(''); // Reset route when channel changes
  }, []);

  // Derive displayed routes: if cargoChannel is set, filter by name/code containing channel
  const displayedRoutes = cargoChannel
    ? filteredRoutes.filter((r) => {
        const searchStr = cargoChannel.toLowerCase();
        return (r.label?.toLowerCase().includes(searchStr) || r.sublabel?.toLowerCase().includes(searchStr));
      })
    : filteredRoutes;

  // Reset form on open/close
  useEffect(() => {
    if (!isOpen) {
      setTripType('STANDARD');
      setCustomerId('');
      setCargoChannel('');
      setRouteId('');
      setVehicleId('');
      setPrimaryDriverId('');
      setSecondaryDriverId('');
      setNotes('');
      setError('');
    }
  }, [isOpen]);

  // Init filteredRoutes when selectData.routes loads
  useEffect(() => {
    setFilteredRoutes(selectData.routes);
  }, [selectData.routes]);

  // Submit
  const handleSubmit = async () => {
    if (!customerId || !routeId || !vehicleId) {
      setError('Vui lòng chọn Khách hàng, Tuyến, và Xe.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.post('/trips', {
        tripCode,
        tripType,
        customerId: Number(customerId),
        routeId: Number(routeId),
        vehicleId: Number(vehicleId),
        primaryDriverId: primaryDriverId ? Number(primaryDriverId) : null,
        secondaryDriverId: secondaryDriverId ? Number(secondaryDriverId) : null,
        tripDate,
        cargoChannel: cargoChannel || null,
        notes: notes || null,
        status: 'PLANNED',
      });
      onCreated();
      onClose();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosErr.response?.data?.error?.message || 'Lỗi tạo chuyến');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay
      size="lg"
      title="Tạo chuyến mới"
      onClose={onClose}
      footer={(
        <>
          <Button onClick={onClose} disabled={submitting}>Hủy</Button>
          <Button variant="primary" icon={<Check />} onClick={handleSubmit} loading={submitting} disabled={loading}>
            Tạo chuyến
          </Button>
        </>
      )}
    >
      {loading ? (
        <LoadingBlock label="Đang tải dữ liệu..." />
      ) : (
        <div className="flex flex-col gap-4">
          {error && <Alert tone="error">{error}</Alert>}

          <FormGrid>
            <Field label="Mã chuyến" required>
              <Input type="text" value={tripCode} onChange={(e) => setTripCode(e.target.value)} />
            </Field>
            <Field label="Loại chuyến" required>
              <SearchableMultiSelect mode="single" searchable="auto"
                options={TRIP_TYPES}
                value={tripType}
                onChange={(v) => setTripType(v)}
                placeholder="Chọn loại"
              />
            </Field>

            <Field label="Khách hàng" required>
              <SearchableMultiSelect mode="single" searchable="auto"
                options={selectData.customers}
                value={customerId}
                onChange={(v) => handleCustomerChange(v)}
                placeholder="Chọn khách hàng"
                searchPlaceholder="Tìm mã, tên KH..."
                error={!!error && !customerId}
              />
            </Field>
            <Field label="Kênh KH" hint="Nhập kênh để lọc tuyến">
              <Input
                type="text"
                value={cargoChannel}
                onChange={(e) => handleChannelChange(e.target.value)}
                placeholder="VD: Shopee, Lazada..."
              />
            </Field>

            <Field
              full
              label={
                <>
                  Tuyến
                  {customerId ? <span style={{ color: 'var(--faint)', fontWeight: 400, marginLeft: 4 }}>({displayedRoutes.length} tuyến)</span> : null}
                </>
              }
              required
            >
              <SearchableMultiSelect mode="single" searchable="auto"
                options={displayedRoutes}
                value={routeId}
                onChange={(v) => setRouteId(v)}
                placeholder={customerId ? 'Chọn tuyến' : 'Chọn KH trước'}
                searchPlaceholder="Tìm mã, tên tuyến..."
                error={!!error && !routeId}
              />
            </Field>

            <Field full label="Xe" required hint="Chọn xe sẽ tự động điền tài xế nếu đã cấu hình">
              <SearchableMultiSelect mode="single" searchable="auto"
                options={selectData.vehicles}
                value={vehicleId}
                onChange={(v) => handleVehicleChange(v)}
                placeholder="Chọn biển số"
                searchPlaceholder="Tìm biển số..."
                error={!!error && !vehicleId}
              />
            </Field>

            <Field label="Tài xế chính">
              <SearchableMultiSelect mode="single" searchable="auto"
                options={selectData.drivers}
                value={primaryDriverId}
                onChange={(v) => setPrimaryDriverId(v)}
                placeholder="Chọn TX"
                searchPlaceholder="Tìm tên TX..."
              />
            </Field>
            <Field label="Tài xế phụ">
              <SearchableMultiSelect mode="single" searchable="auto"
                options={selectData.drivers}
                value={secondaryDriverId}
                onChange={(v) => setSecondaryDriverId(v)}
                placeholder="Chọn TX"
                searchPlaceholder="Tìm tên TX..."
              />
            </Field>

            <Field full label="Ngày tạo">
              <Input type="date" value={tripDate} onChange={(e) => setTripDate(e.target.value)} />
            </Field>

            <Field full label="Ghi chú">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Nhập ghi chú..." />
            </Field>
          </FormGrid>
        </div>
      )}
    </ModalOverlay>
  );
}
