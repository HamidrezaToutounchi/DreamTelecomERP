import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  ColumnDef,
  PaginationState,
} from '@tanstack/react-table';
import {
  PackageMinus,
  Plus,
  Search,
  Warehouse as WarehouseIcon,
  Truck,
  FileText,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Eye,
  ArrowLeft,
  Trash2,
  ScanBarcode,
  Upload,
  ExternalLink,
  ShieldAlert,
  Send,
  CheckCheck,
  Building2,
  Phone,
  MapPin,
  Clock,
  ChevronDown,
  ChevronUp,
  Boxes,
  Info,
  Check,
  ArrowRight,
  UserPlus,
  X,
  PackageCheck,
  AlertTriangle,
  ShieldCheck,
  MoreVertical,
  Volume2,
} from 'lucide-react';
import { toast } from 'sonner';
import { audioNotifier } from '@/lib/audio';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  useStockControllerFindAllExits,
  useStockControllerCreateExit,
  useStockControllerApproveExit,
  useStockControllerRejectExit,
  useStockControllerShipExit,
  useStockControllerCancelExit,
  useStockControllerGetAvailableSerials,
  useStockControllerSearchCustomers,
  useStockControllerQuickCreateCustomer,
  useStockControllerUpdateExitShipping,
  useWarehousesControllerFindAll,
  useProductsControllerFindAll,
} from '@/api/generated';

export enum StockExitType {
  SALE_SHIPMENT = 'SALE_SHIPMENT',
  TRANSFER_OUT = 'TRANSFER_OUT',
  RETURN_SUPPLIER = 'RETURN_SUPPLIER',
  COUNT_DEFICIT = 'COUNT_DEFICIT',
  SCRAP = 'SCRAP',
  FAULT_SEND = 'FAULT_SEND',
  OTHER = 'OTHER',
}

export type StockExitStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'SHIPPED' | 'CANCELLED';

import { BarcodeScanInput } from '@/components/stock/BarcodeScanInput';
import { useAuth } from '@/context/AuthContext';
import { DataTable } from '@/components/common/DataTable';
import { CopyableCode } from '@/components/common/CopyableCode';
import { formatDate, formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface ExitItemState {
  id: string; // frontend temp id
  productId: string;
  product?: any;
  quantity: number;
  unitPrice: number;
  currency: 'TRY' | 'USD' | 'EUR';
  selectedSerials: string[];
}

export const StockExitsPage: React.FC = () => {
  const { can, user, isManager } = useAuth();
  const queryClient = useQueryClient();

  const canCreate = can('STOCK_EXIT', 'create');
  const canEdit = can('STOCK_EXIT', 'edit');

  // List View State
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 });
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Full Page Form View State
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Detail View & Action State
  const [detailExit, setDetailExit] = useState<any | null>(null);
  const [actionMenu, setActionMenu] = useState<{ exit: any; x: number; y: number } | null>(null);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [approveNote, setApproveNote] = useState('');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [shipModalOpen, setShipModalOpen] = useState(false);
  const [shipWaybill, setShipWaybill] = useState('');
  const [shipCarrier, setShipCarrier] = useState('');
  const [shipTracking, setShipTracking] = useState('');
  const [shipRecipient, setShipRecipient] = useState('');
  const [shipPhone, setShipPhone] = useState('');
  const [shipAddress, setShipAddress] = useState('');
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isActionPending, setIsActionPending] = useState(false);

  // Wizard State
  const [exitWizardStep, setExitWizardStep] = useState<1 | 2 | 3 | 4>(1);

  // Form Fields State
  const [formType, setFormType] = useState<StockExitType>(StockExitType.SALE_SHIPMENT);
  const [formWarehouseId, setFormWarehouseId] = useState('');
  const [formCustomerId, setFormCustomerId] = useState('');
  const [formCustomerQuery, setFormCustomerQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [formWaybillNumber, setFormWaybillNumber] = useState('');
  const [formCarrierCompany, setFormCarrierCompany] = useState('');
  const [formTrackingNumber, setFormTrackingNumber] = useState('');
  const [formRecipientPerson, setFormRecipientPerson] = useState('');
  const [formRecipientPhone, setFormRecipientPhone] = useState('');
  const [formDeliveryAddress, setFormDeliveryAddress] = useState('');
  const [formExitDate, setFormExitDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formDescription, setFormDescription] = useState('');
  const [formDocumentUrl, setFormDocumentUrl] = useState<string | null>(null);
  const [formDocumentName, setFormDocumentName] = useState<string | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [formItems, setFormItems] = useState<ExitItemState[]>([]);

  // Active item serial picker state in Step 3
  const [activeSerialPickerItemId, setActiveSerialPickerItemId] = useState<string | null>(null);

  // Hızlı Müşteri Ekle Modal State
  const [isCustModalOpen, setIsCustModalOpen] = useState(false);
  const [custCompanyName, setCustCompanyName] = useState('');
  const [custContactPerson, setCustContactPerson] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custTaxNumber, setCustTaxNumber] = useState('');
  const [custTaxOffice, setCustTaxOffice] = useState('');
  const [custAddress, setCustAddress] = useState('');

  // Kargo Takip No 1 Gün Sonra Güncelleme Modalı State
  const [isUpdateShippingOpen, setIsUpdateShippingOpen] = useState(false);
  const [targetShippingExit, setTargetShippingExit] = useState<any | null>(null);
  const [updateCarrier, setUpdateCarrier] = useState('');
  const [updateTracking, setUpdateTracking] = useState('');
  const [updateWaybill, setUpdateWaybill] = useState('');

  // Queries (15 saniyede bir otomatik güncellenerek depocuya canlı onay akışı sağlar)
  const { data: exitsResponse, isLoading, refetch } = useStockControllerFindAllExits(
    {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      search: search || undefined,
      warehouseId: warehouseFilter || undefined,
      type: typeFilter !== 'ALL' ? (typeFilter as any) : undefined,
      status: statusFilter !== 'ALL' ? (statusFilter as any) : undefined,
    },
    {
      query: {
        refetchInterval: 15000,
      },
    }
  );

  // Yalnızca Yönetici veya bu onay adımına atanmış yetkili onay/ret verebilir.
  // Depocu / Kargocu onay/ret yapamaz; yalnızca iptal edebilir veya onaylanmış fişi sevk edebilir.
  const canUserApproveExit = (exit: any): boolean => {
    if (!exit || exit.status !== 'PENDING_APPROVAL') return false;
    if (isManager || user?.isSuperAdmin) return true;
    if (!exit.approvals || exit.approvals.length === 0) return false;
    const pendingStep = exit.approvals.find((a: any) => a.status === 'PENDING');
    if (!pendingStep) return false;
    return (
      pendingStep.approverId === user?.id ||
      (Boolean(user?.appRoleId) && pendingStep.roleId === user?.appRoleId)
    );
  };

  // Anlık Kişiye Özel Onay Takibi ve Sesli Bildirim (Yalnızca talebi açan kullanıcıya ve yetkili depocuya gider)
  const isFirstLoadRef = React.useRef(true);

  React.useEffect(() => {
    if (!user?.id || !exitsResponse?.data) return;
    const list = exitsResponse.data as any[];

    // Kullanıcının daha önce bildirilmiş fişlerini sessionStorage'dan al
    const storageKey = `sdys_notified_exits_${user.id}`;
    let storedNotified: string[] = [];
    try {
      storedNotified = JSON.parse(sessionStorage.getItem(storageKey) || '[]');
    } catch {
      storedNotified = [];
    }
    const notifiedSet = new Set(storedNotified);

    if (isFirstLoadRef.current) {
      // Sayfa ilk açıldığında mevcut onaylı fişleri "zaten bildirilmiş" olarak işaretle (spam olmaması için)
      for (const e of list) {
        if (e.status === 'APPROVED' || e.status === 'SHIPPED') {
          notifiedSet.add(e.id);
        }
      }
      sessionStorage.setItem(storageKey, JSON.stringify(Array.from(notifiedSet)));
      isFirstLoadRef.current = false;
      return;
    }

    // Yalnızca talebi oluşturan kişinin kendisine özel bildirim göster
    let newlyNotified = false;
    for (const exit of list) {
      if (exit.status === 'APPROVED' && !notifiedSet.has(exit.id)) {
        notifiedSet.add(exit.id);
        newlyNotified = true;

        // Kullanıcı bu fişi talep eden kişi ise doğrudan kendisine özel bildirim ver
        if (exit.createdById === user.id) {
          audioNotifier.playApprovalChime();
          toast.success(
            `🔔 Sevkiyat Talebiniz Onaylandı! Fiş No: ${exit.exitNumber}`,
            {
              duration: 8000,
              description: `Müşteri / Alıcı: ${exit.customer?.companyName || exit.recipientPerson || 'Müşteri'} — Talebiniz onaylandı ve kargoya hazırlanıyor.`,
            }
          );
        }
      }
    }

    if (newlyNotified) {
      sessionStorage.setItem(storageKey, JSON.stringify(Array.from(notifiedSet)));
    }
  }, [exitsResponse?.data, user?.id]);

  const { data: warehouses } = useWarehousesControllerFindAll();
  const { data: productsResponse } = useProductsControllerFindAll({ pageSize: 200 });

  // Customer search query for autocomplete
  const { data: customerSearchResults } = useStockControllerSearchCustomers(
    { query: formCustomerQuery },
    { query: { enabled: formCustomerQuery.trim().length >= 2 } }
  );

  const createMutation = useStockControllerCreateExit();
  const approveMutation = useStockControllerApproveExit();
  const rejectMutation = useStockControllerRejectExit();
  const shipMutation = useStockControllerShipExit();
  const cancelMutation = useStockControllerCancelExit();
  const quickCreateCustomerMutation = useStockControllerQuickCreateCustomer();
  const updateShippingMutation = useStockControllerUpdateExitShipping();

  const allProducts = useMemo(() => (productsResponse as any)?.data || [], [productsResponse]);

  // Open Form
  const handleOpenCreateForm = () => {
    const defaultWh = warehouses?.find((w) => w.isDefault) || warehouses?.[0];
    setExitWizardStep(1);
    setFormType(StockExitType.SALE_SHIPMENT);
    setFormWarehouseId(defaultWh?.id || '');
    setFormCustomerId('');
    setFormCustomerQuery('');
    setSelectedCustomer(null);
    setFormWaybillNumber('');
    setFormCarrierCompany('');
    setFormTrackingNumber('');
    setFormRecipientPerson('');
    setFormRecipientPhone('');
    setFormDeliveryAddress('');
    setFormExitDate(new Date().toISOString().slice(0, 10));
    setFormDescription('');
    setFormDocumentUrl(null);
    setFormDocumentName(null);
    setFormItems([]);
    setActiveSerialPickerItemId(null);
    setIsFormOpen(true);
  };

  // Document Upload
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png', '.xml'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExts.includes(ext)) {
      toast.error('Yalnızca PDF, JPG, PNG ve XML dosyaları yüklenebilir.');
      return;
    }

    setIsUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/v1/stock/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });

      setFormDocumentUrl(res.data.url);
      setFormDocumentName(file.name);
      toast.success('Belge başarıyla yüklendi.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Belge yüklenemedi.');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  // Add Item to Form
  const handleAddItem = (productId?: string) => {
    const defaultProduct = productId ? allProducts.find((p: any) => p.id === productId) : allProducts[0];
    if (!defaultProduct) {
      toast.error('Lütfen önce katalogdan bir ürün seçin.');
      return;
    }

    const newItem: ExitItemState = {
      id: Math.random().toString(36).slice(2, 9),
      productId: defaultProduct.id,
      product: defaultProduct,
      quantity: 1,
      unitPrice: Number(defaultProduct.unitPrice) || 0,
      currency: defaultProduct.currency || 'TRY',
      selectedSerials: [],
    };

    setFormItems((prev) => [...prev, newItem]);
    if (defaultProduct.trackSerial) {
      setActiveSerialPickerItemId(newItem.id);
    }
  };

  const handleUpdateItem = (itemId: string, patch: Partial<ExitItemState>) => {
    setFormItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const updated = { ...item, ...patch };
        if (patch.productId) {
          const prod = allProducts.find((p: any) => p.id === patch.productId);
          updated.product = prod;
          if (prod) {
            updated.unitPrice = Number(prod.unitPrice) || 0;
            updated.currency = prod.currency || 'TRY';
            if (!prod.trackSerial) {
              updated.selectedSerials = [];
            }
          }
        }
        return updated;
      })
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setFormItems((prev) => prev.filter((it) => it.id !== itemId));
    if (activeSerialPickerItemId === itemId) {
      setActiveSerialPickerItemId(null);
    }
  };

  // Select customer from search
  const handleSelectCustomer = (c: any) => {
    setSelectedCustomer(c);
    setFormCustomerId(c.id);
    setFormCustomerQuery(c.companyName);
    if (!formRecipientPerson) setFormRecipientPerson(c.contactPerson || '');
    if (!formRecipientPhone) setFormRecipientPhone(c.phone || '');
    if (!formDeliveryAddress) setFormDeliveryAddress(c.address || '');
  };

  // Toggle Serial Selection for an Item
  const handleToggleSerial = (itemId: string, serial: string) => {
    setFormItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const isSelected = item.selectedSerials.includes(serial);
        const newSerials = isSelected
          ? item.selectedSerials.filter((s) => s !== serial)
          : [...item.selectedSerials, serial];
        return {
          ...item,
          quantity: newSerials.length > 0 ? newSerials.length : 1,
          selectedSerials: newSerials,
        };
      })
    );
  };

  // Dedicated Product Barcode Scan Handler for Exit Form
  const handleScanProductBarcode = (barcode: string) => {
    const raw = barcode.trim();
    if (!raw) return;

    const foundProduct = allProducts.find(
      (p: any) =>
        (p.code && p.code.toLowerCase() === raw.toLowerCase()) ||
        p.id === raw ||
        (p.barcodes && p.barcodes.some((b: any) => (b.barcode || '').toLowerCase() === raw.toLowerCase()))
    );

    if (foundProduct) {
      const existing = formItems.find((it) => it.productId === foundProduct.id);
      if (existing) {
        if (foundProduct.trackSerial) {
          setActiveSerialPickerItemId(existing.id);
          toast.info(`"${foundProduct.name}" zaten ekli. Seri seçim panelini açtık.`);
        } else {
          handleUpdateItem(existing.id, { quantity: Number(existing.quantity) + 1 });
          toast.success(`"${foundProduct.name}" çıkış miktarı artırıldı: ${Number(existing.quantity) + 1}`);
        }
      } else {
        handleAddItem(foundProduct.id);
        toast.success(`Ürün çıkış kalemlerine eklendi: "${foundProduct.name}"`);
      }
    } else {
      toast.error(`"${raw}" barkoduna veya ürün koduna ait ürün katalogda bulunamadı.`);
    }
  };

  // Barcode or MAC address scanned for item serial selection (SIFIR HATA KONTROLÜ)
  const handleScanSerialForItem = (itemId: string, scannedCode: string) => {
    const raw = scannedCode.trim().toUpperCase();
    if (!raw) return;

    // SIFIR HATA KONTROLÜ: Okutulan seri veya MAC depoda gerçekten var mı?
    const matchedSerial = availableSerialsList.find(
      (s: any) =>
        s.serial.toUpperCase() === raw ||
        (s.macAddress && s.macAddress.toUpperCase() === raw)
    );

    if (!matchedSerial) {
      toast.error(
        `❌ HATA: "${raw}" numaralı cihaz bu depoda MEVCUT DEĞİL veya zaten sevk/rezerve edilmiş! Lütfen depodaki doğru cihazı okutunuz.`
      );
      return;
    }

    const targetSerial = matchedSerial.serial;

    setFormItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;

        if (item.selectedSerials.includes(targetSerial)) {
          toast.error(`"${targetSerial}" seri numaralı cihaz zaten okutuldu.`);
          return item;
        }

        if (item.selectedSerials.length >= item.quantity) {
          toast.error(
            `"${item.product?.name}" için talep edilen miktar (${item.quantity} adet) tamamlandı! Fazladan cihaz okutamazsınız.`
          );
          return item;
        }

        const newSerials = [...item.selectedSerials, targetSerial];
        toast.success(
          `✓ Cihaz doğrulandı ve eklendi: ${targetSerial}${matchedSerial.macAddress ? ` (MAC: ${matchedSerial.macAddress})` : ''}`
        );
        return {
          ...item,
          selectedSerials: newSerials,
        };
      })
    );
  };

  // Hızlı Müşteri Oluşturma
  const handleQuickCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custCompanyName.trim() || !custContactPerson.trim() || !custPhone.trim()) {
      toast.error('Lütfen Firma Ünvanı, Yetkili Kişi ve Telefon alanlarını doldurun.');
      return;
    }

    try {
      const res: any = await quickCreateCustomerMutation.mutateAsync({
        data: {
          companyName: custCompanyName.trim(),
          contactPerson: custContactPerson.trim(),
          phone: custPhone.trim(),
          taxNumber: custTaxNumber.trim() || undefined,
          taxOffice: custTaxOffice.trim() || undefined,
          address: custAddress.trim() || undefined,
        },
      });

      toast.success(`"${res.companyName}" müşterisi başarıyla oluşturuldu.`);
      setSelectedCustomer(res);
      setFormCustomerId(res.id);
      setFormCustomerQuery(res.companyName);
      if (res.contactPerson) setFormRecipientPerson(res.contactPerson);
      if (res.phone) setFormRecipientPhone(res.phone);
      if (res.address) setFormDeliveryAddress(res.address);
      setIsCustModalOpen(false);
      setCustCompanyName('');
      setCustContactPerson('');
      setCustPhone('');
      setCustTaxNumber('');
      setCustTaxOffice('');
      setCustAddress('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Müşteri oluşturulamadı.');
    }
  };

  // Kargo Takip No Güncelleme (1 gün sonra geldiğinde)
  const handleUpdateShippingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetShippingExit) return;

    try {
      await updateShippingMutation.mutateAsync({
        id: targetShippingExit.id,
        data: {
          carrierCompany: updateCarrier.trim() || undefined,
          trackingNumber: updateTracking.trim() || undefined,
          waybillNumber: updateWaybill.trim() || undefined,
        },
      });

      toast.success('Kargo takip ve sevkiyat bilgileri güncellendi.');
      setIsUpdateShippingOpen(false);
      setTargetShippingExit(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/v1/stock/exits'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Güncellenemedi.');
    }
  };

  // Submit Stock Exit Form
  const handleSubmitExit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formWarehouseId) {
      toast.error('Lütfen çıkış yapılacak depoyu seçin.');
      return;
    }

    if (formType === StockExitType.SALE_SHIPMENT && !formCustomerId) {
      toast.error('Müşteri satış sevkiyatlarında müşteri seçilmesi zorunludur.');
      return;
    }

    if (formItems.length === 0) {
      toast.error('Lütfen en az bir çıkış kalemi ekleyin.');
      return;
    }

    for (const item of formItems) {
      if (item.product?.trackSerial) {
        if (item.selectedSerials.length === 0) {
          toast.error(`"${item.product.name}" seri takiplidir. Çıkış yapılacak serileri seçmelisiniz.`);
          return;
        }
        if (item.selectedSerials.length !== item.quantity) {
          toast.error(
            `"${item.product.name}" için girilen miktar (${item.quantity}) ile seçilen seri sayısı (${item.selectedSerials.length}) eşit olmalıdır.`
          );
          return;
        }
      }
    }

    try {
      const payload = {
        type: formType,
        warehouseId: formWarehouseId,
        customerId: formCustomerId || undefined,
        waybillNumber: formWaybillNumber.trim() || undefined,
        carrierCompany: formCarrierCompany.trim() || undefined,
        trackingNumber: formTrackingNumber.trim() || undefined,
        recipientPerson: formRecipientPerson.trim() || undefined,
        recipientPhone: formRecipientPhone.trim() || undefined,
        deliveryAddress: formDeliveryAddress.trim() || undefined,
        exitDate: formExitDate ? new Date(formExitDate).toISOString() : undefined,
        description: formDescription.trim() || undefined,
        documentUrl: formDocumentUrl || undefined,
        documentName: formDocumentName || undefined,
        items: formItems.map((it) => ({
          productId: it.productId,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice) || 0,
          currency: it.currency,
          serials: it.product?.trackSerial ? it.selectedSerials : undefined,
        })),
      };

      await createMutation.mutateAsync({ data: payload });
      toast.success('Stok çıkış talebi başarıyla oluşturuldu.');
      setIsFormOpen(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/v1/stock/exits'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/products'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Stok çıkış talebi oluşturulamadı.');
    }
  };

  // Approve Exit Handler
  const handleApprove = async () => {
    if (!detailExit) return;
    setIsActionPending(true);
    try {
      await approveMutation.mutateAsync({
        id: detailExit.id,
        data: { note: approveNote.trim() || undefined },
      });
      audioNotifier.playApprovalChime();
      toast.success(`Çıkış fişi (${detailExit.exitNumber}) onaylandı.`);
      setApproveModalOpen(false);
      setApproveNote('');
      setDetailExit(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/v1/stock/exits'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Onay işlemi başarısız oldu.');
    } finally {
      setIsActionPending(false);
    }
  };

  // Reject Exit Handler
  const handleReject = async () => {
    if (!detailExit) return;
    if (!rejectNote.trim()) {
      toast.error('Lütfen bir ret gerekçesi giriniz.');
      return;
    }
    setIsActionPending(true);
    try {
      await rejectMutation.mutateAsync({
        id: detailExit.id,
        data: { note: rejectNote.trim() },
      });
      toast.success(`Çıkış fişi (${detailExit.exitNumber}) reddedildi ve seriler serbest bırakıldı.`);
      setRejectModalOpen(false);
      setRejectNote('');
      setDetailExit(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/v1/stock/exits'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Red işlemi başarısız oldu.');
    } finally {
      setIsActionPending(false);
    }
  };

  // Ship Exit Handler
  const handleShip = async () => {
    if (!detailExit) return;
    setIsActionPending(true);
    try {
      await shipMutation.mutateAsync({
        id: detailExit.id,
        data: {
          waybillNumber: shipWaybill.trim() || undefined,
          carrierCompany: shipCarrier.trim() || undefined,
          trackingNumber: shipTracking.trim() || undefined,
          recipientPerson: shipRecipient.trim() || undefined,
          recipientPhone: shipPhone.trim() || undefined,
          deliveryAddress: shipAddress.trim() || undefined,
        },
      });
      toast.success(`Sevkiyat tamamlandı: Fiş No: ${detailExit.exitNumber}. Stoklar depodan düşüldü.`);
      setShipModalOpen(false);
      setDetailExit(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/v1/stock/exits'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/products'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Sevkiyat işlemi başarısız oldu.');
    } finally {
      setIsActionPending(false);
    }
  };

  // Cancel Exit Handler
  const handleCancel = async () => {
    if (!detailExit) return;
    if (!cancelReason.trim()) {
      toast.error('Lütfen bir iptal gerekçesi yazınız.');
      return;
    }
    setIsActionPending(true);
    try {
      await cancelMutation.mutateAsync({
        id: detailExit.id,
        data: { cancelReason: cancelReason.trim() },
      });
      toast.success(`Çıkış fişi (${detailExit.exitNumber}) iptal edildi.`);
      setCancelModalOpen(false);
      setCancelReason('');
      setDetailExit(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/v1/stock/exits'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/products'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'İptal işlemi başarısız oldu.');
    } finally {
      setIsActionPending(false);
    }
  };

  const exitTypeLabels: Record<string, string> = {
    SALE_SHIPMENT: 'Müşteri Sevkiyatı',
    TRANSFER_OUT: 'Depo Transferi',
    RETURN_SUPPLIER: 'Tedarikçiye İade',
    COUNT_DEFICIT: 'Sayım Eksiği / Fire',
    SCRAP: 'Hurda Çıkışı',
    FAULT_SEND: 'Arıza Gönderimi',
    OTHER: 'Diğer Çıkış',
  };

  // Table Columns
  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: 'exitNumber',
        header: 'Fiş Numarası',
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <CopyableCode code={row.original.exitNumber} className="font-bold text-xs" />
            <div className="text-[11px] text-muted-foreground font-semibold">
              {exitTypeLabels[row.original.type] || row.original.type}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'warehouse',
        header: 'Çıkış Deposu',
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <WarehouseIcon className="w-3.5 h-3.5 text-navy-600 dark:text-navy-400" />
            <span>{row.original.warehouse?.name || '-'}</span>
          </div>
        ),
      },
      {
        accessorKey: 'customer',
        header: 'Müşteri / Alıcı',
        cell: ({ row }) => (
          <div className="space-y-0.5 text-xs">
            <div className="font-bold text-foreground">
              {row.original.customer?.companyName || row.original.recipientPerson || '-'}
            </div>
            {row.original.recipientPhone && (
              <div className="text-[11px] text-muted-foreground font-mono">
                {row.original.recipientPhone}
              </div>
            )}
          </div>
        ),
      },
      {
        id: 'shipping',
        header: 'Kargo & Takip',
        cell: ({ row }) => (
          <div className="text-xs space-y-0.5">
            {row.original.carrierCompany ? (
              <div className="font-semibold text-foreground flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-slate-400" />
                <span>{row.original.carrierCompany}</span>
              </div>
            ) : (
              <span className="text-muted-foreground italic">-</span>
            )}
            {row.original.trackingNumber && (
              <div className="font-mono text-[11px] text-muted-foreground">
                Takip: {row.original.trackingNumber}
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Durum',
        cell: ({ row }) => {
          const status = row.original.status;
          let badgeClass = 'bg-slate-100 text-slate-800 border-slate-200';
          let label = status;
          let Icon = Clock;

          if (status === 'PENDING_APPROVAL') {
            badgeClass = 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300';
            label = 'Onay Bekliyor';
            Icon = Clock;
          } else if (status === 'APPROVED') {
            badgeClass = 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300';
            label = 'Onaylandı (Sevk Hazır)';
            Icon = CheckCircle2;
          } else if (status === 'SHIPPED') {
            badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300';
            label = 'Sevk Edildi';
            Icon = CheckCheck;
          } else if (status === 'CANCELLED') {
            badgeClass = 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300';
            label = 'İptal Edildi';
            Icon = XCircle;
          }

          return (
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border',
                badgeClass
              )}
            >
              <Icon className="w-3 h-3" />
              {label}
            </span>
          );
        },
      },
      {
        accessorKey: 'exitDate',
        header: 'Çıkış Tarihi',
        cell: ({ row }) => (
          <div className="text-xs text-muted-foreground">
            <div>{formatDate(row.original.exitDate, 'dd.MM.yyyy')}</div>
            <div className="text-[10px]">{row.original.createdBy?.fullName || '-'}</div>
          </div>
        ),
      },
      {
        id: 'actions',
        header: 'İşlemler',
        cell: ({ row }) => {
          const exit = row.original;
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                setActionMenu((prev) =>
                  prev?.exit.id === exit.id
                    ? null
                    : {
                        exit,
                        x: rect.right,
                        y: rect.bottom + 4,
                      }
                );
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-card hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-foreground transition-all cursor-pointer shadow-2xs"
            >
              <span>İşlemler</span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: exitsResponse?.data || [],
    columns,
    pageCount: exitsResponse?.meta?.totalPages || 1,
    state: { pagination },
    onPaginationChange: setPagination,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
  });

  // Active item available serials hook
  const activeItem = formItems.find((it) => it.id === activeSerialPickerItemId);
  const { data: availableSerialsForActiveItem } = useStockControllerGetAvailableSerials(
    {
      productId: activeItem?.productId || '',
      warehouseId: formWarehouseId || '',
    },
    {
      query: {
        enabled: !!activeItem && !!formWarehouseId && !!activeItem.product?.trackSerial,
      },
    }
  );
  const availableSerialsList: any[] = ((availableSerialsForActiveItem as unknown) as any[]) || [];

  /* ================= TAM SAYFA FORM: YENİ STOK ÇIKIŞI (4 ADIMLI SİHİRBAZ) ================= */
  if (isFormOpen) {
    const totalItemsCount = formItems.length;
    const totalQuantity = formItems.reduce((acc, it) => acc + Number(it.quantity || 0), 0);
    const hasSerialItems = formItems.some((it) => it.product?.trackSerial);
    const allSerialsCompleted = formItems.every(
      (it) => !it.product?.trackSerial || it.selectedSerials.length === Number(it.quantity)
    );
    const canGoToStep2 = !!formWarehouseId && (formType !== StockExitType.SALE_SHIPMENT || !!formCustomerId);
    const canGoToStep3 = canGoToStep2 && formItems.length > 0;
    const canGoToStep4 = canGoToStep3 && allSerialsCompleted;

    const currentActiveItem = formItems.find((it) => it.id === activeSerialPickerItemId) || formItems.find((it) => it.product?.trackSerial);

    return (
      <div className="space-y-6 max-w-6xl mx-auto py-2">
        {/* Üst Başlık ve Geri Dön */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setIsFormOpen(false)}
            className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Sevkiyat & Çıkış Listesine Dön</span>
          </button>
          <div className="text-right">
            <h1 className="text-xl font-bold text-foreground">Yeni Stok Çıkışı & Sevkiyat Sihirbazı</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              4 adımda hatasız mal çıkışı, müşteri eşleştirmesi ve kargo sevkiyatı
            </p>
          </div>
        </div>

        {/* 4 ADIMLI SİHİRBAZ STEPPER BAŞLIĞI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-card border border-slate-200 dark:border-slate-800 p-2 rounded-2xl shadow-xs">
          {/* Adım 1 */}
          <button
            type="button"
            onClick={() => setExitWizardStep(1)}
            className={cn(
              'flex items-center gap-3 p-3 rounded-xl text-left transition-all cursor-pointer',
              exitWizardStep === 1
                ? 'bg-navy-50 dark:bg-navy-950/60 border border-navy-200 dark:border-navy-800 ring-2 ring-navy-600/20'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
            )}
          >
            <div
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0',
                exitWizardStep === 1
                  ? 'bg-navy-700 text-white'
                  : canGoToStep2
                  ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              )}
            >
              {canGoToStep2 && exitWizardStep > 1 ? <Check className="w-4 h-4" /> : '1'}
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-foreground truncate">1. Sevkiyat & Müşteri</div>
              <div className="text-[10px] text-muted-foreground truncate">Çıkış Türü ve Hedef</div>
            </div>
          </button>

          {/* Adım 2 */}
          <button
            type="button"
            disabled={!canGoToStep2}
            onClick={() => canGoToStep2 && setExitWizardStep(2)}
            className={cn(
              'flex items-center gap-3 p-3 rounded-xl text-left transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
              exitWizardStep === 2
                ? 'bg-navy-50 dark:bg-navy-950/60 border border-navy-200 dark:border-navy-800 ring-2 ring-navy-600/20'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
            )}
          >
            <div
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0',
                exitWizardStep === 2
                  ? 'bg-navy-700 text-white'
                  : canGoToStep3
                  ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              )}
            >
              {canGoToStep3 && exitWizardStep > 2 ? <Check className="w-4 h-4" /> : '2'}
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-foreground truncate">2. Çıkış Kalemleri</div>
              <div className="text-[10px] text-muted-foreground truncate">Ürün & Ambalaj Barkodu</div>
            </div>
          </button>

          {/* Adım 3 */}
          <button
            type="button"
            disabled={!canGoToStep3}
            onClick={() => canGoToStep3 && setExitWizardStep(3)}
            className={cn(
              'flex items-center gap-3 p-3 rounded-xl text-left transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
              exitWizardStep === 3
                ? 'bg-navy-50 dark:bg-navy-950/60 border border-navy-200 dark:border-navy-800 ring-2 ring-navy-600/20'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
            )}
          >
            <div
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0',
                exitWizardStep === 3
                  ? 'bg-navy-700 text-white'
                  : canGoToStep4
                  ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              )}
            >
              {canGoToStep4 && exitWizardStep > 3 ? <Check className="w-4 h-4" /> : '3'}
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-foreground truncate">3. Seri & MAC Doğrulama</div>
              <div className="text-[10px] text-muted-foreground truncate">Sıfır Hata Cihaz Okutma</div>
            </div>
          </button>

          {/* Adım 4 */}
          <button
            type="button"
            disabled={!canGoToStep4}
            onClick={() => canGoToStep4 && setExitWizardStep(4)}
            className={cn(
              'flex items-center gap-3 p-3 rounded-xl text-left transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
              exitWizardStep === 4
                ? 'bg-navy-50 dark:bg-navy-950/60 border border-navy-200 dark:border-navy-800 ring-2 ring-navy-600/20'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
            )}
          >
            <div
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0',
                exitWizardStep === 4 ? 'bg-navy-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              )}
            >
              4
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-foreground truncate">4. Kargo & Teslimat</div>
              <div className="text-[10px] text-muted-foreground truncate">Sevk Bilgileri & Onay</div>
            </div>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* ADIM 1: SEVKİYAT TÜRÜ, DEPO VE MÜŞTERİ SEÇİMİ                             */}
        {/* ========================================================================= */}
        {exitWizardStep === 1 && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4 text-navy-700 dark:text-navy-400" />
                    Adım 1: Sevkiyat Türü, Depo ve Hedef Müşteri
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Çıkış yapılacak depoyu seçin ve satış ise hedef müşteriyi kartından belirleyin.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Çıkış Türü <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as StockExitType)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-semibold"
                  >
                    <option value={StockExitType.SALE_SHIPMENT}>Müşteri Satış Sevkiyatı</option>
                    <option value={StockExitType.TRANSFER_OUT}>Depolar Arası Transfer</option>
                    <option value={StockExitType.RETURN_SUPPLIER}>Tedarikçiye İade</option>
                    <option value={StockExitType.COUNT_DEFICIT}>Sayım Eksiği / Fire</option>
                    <option value={StockExitType.SCRAP}>Hurda Çıkışı</option>
                    <option value={StockExitType.FAULT_SEND}>Arıza İçin Gönderim</option>
                    <option value={StockExitType.OTHER}>Diğer</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Çıkış Yapılacak Depo <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formWarehouseId}
                    onChange={(e) => setFormWarehouseId(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-semibold"
                  >
                    <option value="">Depo Seçiniz...</option>
                    {(warehouses || []).map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code}) {w.isDefault ? '— Varsayılan' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Planlanan Çıkış Tarihi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formExitDate}
                    onChange={(e) => setFormExitDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-semibold"
                  />
                </div>
              </div>

              {/* MÜŞTERİ SEÇİMİ VE KART GÖRÜNÜMÜ */}
              {formType === StockExitType.SALE_SHIPMENT && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-navy-700 dark:text-navy-400" />
                      <span>Hedef Müşteri Kartı <span className="text-red-500">*</span></span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustModalOpen(true)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ Yeni Müşteri Kartı Oluştur</span>
                    </button>
                  </div>

                  {selectedCustomer ? (
                    /* Seçili Müşteri Bilgi Kartı */
                    <div className="p-4 rounded-xl border-2 border-teal-500/30 bg-teal-50/50 dark:bg-teal-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-foreground">{selectedCustomer.companyName}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200">
                            ✓ Seçili Müşteri
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                          {selectedCustomer.taxNumber && (
                            <div>VKN: <span className="font-mono font-medium text-foreground">{selectedCustomer.taxNumber}</span> {selectedCustomer.taxOffice ? `(${selectedCustomer.taxOffice} VD)` : ''}</div>
                          )}
                          {selectedCustomer.contactPerson && (
                            <div>Yetkili: <span className="font-medium text-foreground">{selectedCustomer.contactPerson}</span></div>
                          )}
                          {selectedCustomer.phone && (
                            <div>Tel: <span className="font-mono font-medium text-foreground">{selectedCustomer.phone}</span></div>
                          )}
                        </div>
                        {selectedCustomer.address && (
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1 pt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{selectedCustomer.address}</span>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(null);
                          setFormCustomerId('');
                          setFormCustomerQuery('');
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer self-start sm:self-center shrink-0"
                      >
                        Değiştir / Kaldır
                      </button>
                    </div>
                  ) : (
                    /* Müşteri Arama Autocomplete Kutusu */
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Müşteri kartından seçin (en az 2 harf yazın)..."
                        value={formCustomerQuery}
                        onChange={(e) => setFormCustomerQuery(e.target.value)}
                        className="w-full h-10 pl-9 pr-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-semibold"
                      />

                      {/* Autocomplete Dropdown Listesi */}
                      {(customerSearchResults || []).length > 0 && (
                        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-card border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-52 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                          {(customerSearchResults || []).map((c: any) => (
                            <div
                              key={c.id}
                              onClick={() => handleSelectCustomer(c)}
                              className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-xs transition-colors"
                            >
                              <div className="font-bold text-foreground flex items-center justify-between">
                                <span>{c.companyName}</span>
                                {c.taxNumber && <span className="font-mono text-[10px] text-muted-foreground">VKN: {c.taxNumber}</span>}
                              </div>
                              <div className="text-[11px] text-muted-foreground flex items-center gap-3 mt-0.5">
                                {c.contactPerson && <span>Yetkili: {c.contactPerson}</span>}
                                {c.phone && <span>Tel: {c.phone}</span>}
                                {c.address && <span className="truncate max-w-xs">{c.address}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Çıkış Açıklaması */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Çıkış Notu / Açıklama</label>
                <textarea
                  rows={2}
                  placeholder="Çıkış fişi hakkında dahili not veya sevk nedeni..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs"
                />
              </div>
            </div>

            {/* İlerle Butonu */}
            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-5 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={!canGoToStep2}
                onClick={() => setExitWizardStep(2)}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-navy-700 hover:bg-navy-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>2. Adım: Çıkış Kalemlerine Geç</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ADIM 2: ÇIKIŞ KALEMLERİ (FİYAT VE PARA BİRİMİ KALDIRILDI)                 */}
        {/* ========================================================================= */}
        {exitWizardStep === 2 && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* HIZLI ÜRÜN BARKODU OKUYUCU ÇUBUĞU - HIGH CONTRAST */}
            <div className="p-4 bg-gradient-to-r from-navy-900 to-slate-900 text-white rounded-2xl shadow-md space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                    <ScanBarcode className="w-4 h-4 text-teal-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Ürün Koli / Ambalaj Barkodu Okut (EAN-13, GS1, Ürün Kodu)</h3>
                    <p className="text-[11px] text-slate-300">
                      Çıkış yapılacak ürünün kutu barkodunu okutun. Ürün otomatik eklenir veya miktarı artırılır.
                    </p>
                  </div>
                </div>
                <div className="text-[11px] text-teal-300 font-mono hidden sm:block">
                  ⚡ Zebra HID Uyumlu
                </div>
              </div>

              <div className="pt-1">
                <BarcodeScanInput
                  placeholder="Ürün koli barkodunu veya Ürün Kodunu okutunuz / yazınız..."
                  onScan={handleScanProductBarcode}
                  inputClassName="bg-white text-slate-900 placeholder:text-slate-400 font-bold"
                />
              </div>
            </div>

            {/* Kalemler Tablosu (Sıfır Fiyat - Depocu İçin Sade ve Temiz) */}
            <div className="bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <PackageMinus className="w-4 h-4 text-navy-700 dark:text-navy-400" />
                    Çıkış Yapılacak Ürünler ({formItems.length})
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Depodan sevk edilecek ürünleri ve çıkış adetlerini giriniz (Fiyat girişi gerekmez).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleAddItem()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-navy-700 hover:bg-navy-800 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                  Manuel Kalem Ekle
                </button>
              </div>

              {formItems.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                  <PackageMinus className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-foreground">Henüz ürün eklenmedi.</p>
                  <p className="text-xs text-muted-foreground">
                    Yukarıdaki barkod okuyucuyla ürün koli barkodunu okutun veya "+ Manuel Kalem Ekle" butonuna basın.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {formItems.map((item, idx) => {
                    const isSerial = !!item.product?.trackSerial;

                    return (
                      <div
                        key={item.id}
                        className="border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <select
                              value={item.productId}
                              onChange={(e) => handleUpdateItem(item.id, { productId: e.target.value })}
                              className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-bold text-foreground flex-1 max-w-md"
                            >
                              {allProducts.map((p: any) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.code || '-'}) {p.trackSerial ? '★ Seri Takipli' : ''}
                                </option>
                              ))}
                            </select>
                            {isSerial ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 shrink-0">
                                <ScanBarcode className="w-3.5 h-3.5" />
                                Seri Takipli
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 shrink-0">
                                Standart Stok
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 self-end sm:self-center">
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-muted-foreground">Sevk Miktarı:</label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateItem(item.id, { quantity: parseInt(e.target.value) || 1 })
                              }
                              className="w-20 h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-mono font-bold text-center"
                            />
                            <span className="text-xs text-muted-foreground">{item.product?.unit || 'ADET'}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer transition-colors"
                            title="Kalemi Kaldır"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* İlerle ve Geri Butonları */}
            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => setExitWizardStep(1)}
                className="px-5 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>1. Adıma Dön</span>
              </button>

              <button
                type="button"
                disabled={!canGoToStep3}
                onClick={() => {
                  setExitWizardStep(3);
                  const firstSerial = formItems.find((it) => it.product?.trackSerial);
                  if (firstSerial) {
                    setActiveSerialPickerItemId(firstSerial.id);
                  }
                }}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-navy-700 hover:bg-navy-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>3. Adım: Cihaz Seri & MAC Okutmaya Geç</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ADIM 3: SIFIR HATA CİHAZ SERİ & MAC OKUTMA (BUTONLAR KALDIRILDI)         */}
        {/* ========================================================================= */}
        {exitWizardStep === 3 && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Sıfır Hata Kuralı Bilgilendirme Kutusu */}
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <span className="font-bold text-amber-900 dark:text-amber-200">
                  Depocu Sıfır Hata Kuralı: Fiziksel Cihaz Barkodu Okutma Zorunludur
                </span>
                <p className="text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
                  İnsan hatasını sıfıra indirmek amacıyla tıklanabilir seri listesi kaldırılmıştır. Elinizdeki fiziksel cihazın
                  seri numarasını veya MAC barkodunu okutunuz. Sistem depodaki seriler ile anlık eşleştirip cihazı onaylayacaktır.
                </p>
              </div>
            </div>

            {!hasSerialItems ? (
              <div className="bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-3 shadow-xs">
                <CheckCircle2 className="w-10 h-10 text-teal-600 mx-auto" />
                <h3 className="text-sm font-bold text-foreground">Seri Takipli Ürün Bulunmuyor</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Eklediğiniz tüm ürünler standart stok takiplidir. Seri okutma yapmanıza gerek yoktur, doğrudan Kargo & Teslimat adımına geçebilirsiniz.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setExitWizardStep(4)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    <span>Kargo & Teslimat Adımına Geç</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
                {/* Ürün Sekmeleri */}
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
                  {formItems
                    .filter((it) => it.product?.trackSerial)
                    .map((it) => {
                      const isComplete = it.selectedSerials.length === Number(it.quantity);
                      const isActive = (currentActiveItem?.id || activeSerialPickerItemId) === it.id;

                      return (
                        <button
                          key={it.id}
                          type="button"
                          onClick={() => setActiveSerialPickerItemId(it.id)}
                          className={cn(
                            'px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0',
                            isActive
                              ? 'bg-navy-700 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-foreground hover:bg-slate-200'
                          )}
                        >
                          <span>{it.product?.name}</span>
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded text-[10px] font-mono',
                              isComplete
                                ? 'bg-green-500 text-white'
                                : isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                            )}
                          >
                            {it.selectedSerials.length} / {it.quantity}
                          </span>
                        </button>
                      );
                    })}
                </div>

                {/* Aktif Ürün İçin Seri Okutma Barı */}
                {currentActiveItem && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-foreground">
                          {currentActiveItem.product?.name} İçin Cihaz Okutun
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Depoda mevcut seriler ile anlık doğrulanır. Toplam {currentActiveItem.quantity} adet okutulmalıdır.
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-muted-foreground">Kalan Adet: </span>
                        <span className="text-sm font-mono font-bold text-navy-700 dark:text-navy-400">
                          {Math.max(0, Number(currentActiveItem.quantity) - currentActiveItem.selectedSerials.length)}
                        </span>
                      </div>
                    </div>

                    {/* Seri Barkod Okuyucu Çubuğu - High Contrast */}
                    <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                      <BarcodeScanInput
                        placeholder="Cihaz üzerindeki Seri No veya MAC barkodunu okutunuz..."
                        onScan={(code) => handleScanSerialForItem(currentActiveItem.id, code)}
                        inputClassName="bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 font-bold"
                      />
                    </div>

                    {/* Okutulan Cihazlar Listesi */}
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-foreground">
                          Fiziksel Olarak Okutulan ve Doğrulanan Cihazlar ({currentActiveItem.selectedSerials.length} Adet)
                        </span>
                        {currentActiveItem.selectedSerials.length === Number(currentActiveItem.quantity) && (
                          <span className="text-green-600 dark:text-green-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" />
                            Tamamlandı
                          </span>
                        )}
                      </div>

                      {currentActiveItem.selectedSerials.length === 0 ? (
                        <div className="p-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs text-muted-foreground">
                          Henüz hiçbir cihaz okutulmadı. El terminali veya barkod okuyucuyla cihazı okutunuz.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {currentActiveItem.selectedSerials.map((sn, snIdx) => {
                            const matched = availableSerialsList.find((s: any) => s.serial === sn);

                            return (
                              <div
                                key={sn}
                                className="p-2.5 rounded-lg border border-teal-200 dark:border-teal-900 bg-teal-50/50 dark:bg-teal-950/20 flex items-center justify-between text-xs"
                              >
                                <div className="space-y-0.5 truncate">
                                  <div className="font-mono font-bold text-foreground flex items-center gap-1.5 truncate">
                                    <span className="text-[10px] text-teal-600 font-bold">#{snIdx + 1}</span>
                                    <span>{sn}</span>
                                  </div>
                                  {matched?.macAddress && (
                                    <div className="text-[10px] text-muted-foreground font-mono truncate">
                                      MAC: {matched.macAddress}
                                    </div>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleToggleSerial(currentActiveItem.id, sn)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer shrink-0"
                                  title="Cihazı Listeden Çıkar"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* İlerle ve Geri Butonları */}
            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => setExitWizardStep(2)}
                className="px-5 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>2. Adıma Dön</span>
              </button>

              <button
                type="button"
                disabled={!canGoToStep4}
                onClick={() => setExitWizardStep(4)}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-navy-700 hover:bg-navy-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>4. Adım: Kargo & Teslimat Bilgilerine Geç</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ADIM 4: KARGO, SEVKİYAT VE ÖZET BİLGİLERİ (TAKİP NO OPSİYONEL)            */}
        {/* ========================================================================= */}
        {exitWizardStep === 4 && (
          <form onSubmit={handleSubmitExit} className="space-y-6 animate-in fade-in duration-150">
            {/* Kargo ve Teslimat Bilgileri */}
            <div className="bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Truck className="w-4 h-4 text-navy-700 dark:text-navy-400" />
                  Kargo, Sevk ve Teslimat Bilgileri
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Taşıyıcı ve irsaliye detaylarını girin. Kargo takip no sonradan (ertesi gün) da güncellenebilir.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Kargo / Taşıyıcı Firma</label>
                  <input
                    type="text"
                    placeholder="Örn: Yurtiçi Kargo, Aras, Teslimat Aracı"
                    value={formCarrierCompany}
                    onChange={(e) => setFormCarrierCompany(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-semibold"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-foreground">Kargo Takip No</label>
                    <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold">1 Gün Sonra da Girilebilir</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Örn: YK-987654321 (Opsiyonel)"
                    value={formTrackingNumber}
                    onChange={(e) => setFormTrackingNumber(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">İrsaliye Numarası</label>
                  <input
                    type="text"
                    placeholder="Örn: IRS-2026-9001"
                    value={formWaybillNumber}
                    onChange={(e) => setFormWaybillNumber(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Alıcı Yetkili Kişi</label>
                  <input
                    type="text"
                    placeholder="Örn: Mehmet Bey"
                    value={formRecipientPerson}
                    onChange={(e) => setFormRecipientPerson(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Alıcı Telefon Numarası</label>
                  <input
                    type="text"
                    placeholder="Örn: 0532 555 44 33"
                    value={formRecipientPhone}
                    onChange={(e) => setFormRecipientPhone(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Teslimat Açık Adresi</label>
                <textarea
                  rows={2}
                  placeholder="İlçe, mahalle, cadde, bina no, şehir..."
                  value={formDeliveryAddress}
                  onChange={(e) => setFormDeliveryAddress(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs"
                />
              </div>

              {/* Sevk Evrak / İrsaliye Dosyası */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="text-xs font-bold text-foreground block mb-1">Sevk Evrak / İrsaliye Dosyası (Opsiyonel)</label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <Upload className="w-4 h-4 text-slate-500" />
                    <span>{isUploadingDoc ? 'Yükleniyor...' : 'Dosya Seç (PDF / Resim)'}</span>
                    <input
                      type="file"
                      className="hidden"
                      disabled={isUploadingDoc}
                      onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                    />
                  </label>
                  {formDocumentName && (
                    <span className="text-xs text-teal-600 dark:text-teal-400 font-medium truncate">
                      ✓ {formDocumentName}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Genel Çıkış Özeti Kartı */}
            <div className="p-5 bg-card border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Sevkiyat Çıkış Özeti</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground block">Çıkış Türü:</span>
                  <span className="font-bold text-foreground">{formType}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Depo:</span>
                  <span className="font-bold text-foreground">
                    {warehouses?.find((w) => w.id === formWarehouseId)?.name || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Toplam Kalem:</span>
                  <span className="font-bold text-foreground">{totalItemsCount} Kalem</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Toplam Ürün Adedi:</span>
                  <span className="font-mono font-bold text-foreground">{totalQuantity} Adet</span>
                </div>
              </div>
            </div>

            {/* Alt İşlem Butonları */}
            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setExitWizardStep(3)}
                className="px-5 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>3. Adıma Dön</span>
              </button>

              <button
                type="submit"
                disabled={createMutation.isPending || isUploadingDoc}
                className="inline-flex items-center gap-2 px-8 py-3 bg-navy-700 hover:bg-navy-800 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                <PackageCheck className="w-4 h-4" />
                <span>{createMutation.isPending ? 'Kaydediliyor...' : 'Stok Çıkış Talebini Oluştur'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  /* ================= TAM SAYFA DETAY GÖRÜNÜMÜ: SEVKİYAT & ÇIKIŞ İNCELEME ================= */
  if (detailExit) {
    const currentExit = (exitsResponse?.data || []).find((e: any) => e.id === detailExit.id) || detailExit;
    const isCancelled = currentExit.status === 'CANCELLED';
    const isShipped = currentExit.status === 'SHIPPED';
    const isPending = currentExit.status === 'PENDING_APPROVAL';
    const isApproved = currentExit.status === 'APPROVED';

    return (
      <div className="space-y-6 max-w-6xl mx-auto py-2 animate-in fade-in duration-150">
        {/* Üst Bar & Geri Dön */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDetailExit(null)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Sevkiyat Listesine Dön</span>
            </button>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
                  <PackageMinus className="w-5 h-5 text-navy-700 dark:text-navy-400" />
                  <span>Stok Çıkış Detayı:</span>
                  <CopyableCode code={currentExit.exitNumber} className="text-xl font-mono font-extrabold text-navy-700 dark:text-navy-400" />
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-navy-50 text-navy-800 dark:bg-navy-950 dark:text-navy-300 border border-navy-200 dark:border-navy-800">
                  {exitTypeLabels[currentExit.type] || currentExit.type}
                </span>
                <span className={cn(
                  'px-2.5 py-0.5 rounded-full text-xs font-bold border',
                  isShipped ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300' :
                  isApproved ? 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300' :
                  isPending ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300' :
                  'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300'
                )}>
                  {isShipped ? '✓ Sevk Edildi' : isApproved ? 'Onaylandı (Sevk Hazır)' : isPending ? 'Onay Bekliyor' : 'İptal Edildi'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Kayıt Tarihi: {formatDate(currentExit.createdAt, 'dd.MM.yyyy HH:mm')} — Fişi Oluşturan: {currentExit.createdBy?.fullName || '-'}
              </p>
            </div>
          </div>

          {/* Üst Aksiyon Butonları */}
          <div className="flex flex-wrap items-center gap-2">
            {!isCancelled && canEdit && (
              <button
                type="button"
                onClick={() => {
                  setTargetShippingExit(currentExit);
                  setUpdateCarrier(currentExit.carrierCompany || '');
                  setUpdateTracking(currentExit.trackingNumber || '');
                  setUpdateWaybill(currentExit.waybillNumber || '');
                  setIsUpdateShippingOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 dark:bg-teal-950 dark:hover:bg-teal-900 dark:text-teal-200 rounded-xl text-xs font-bold border border-teal-200 dark:border-teal-800 transition-colors cursor-pointer"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Kargo / Takip No Güncelle</span>
              </button>
            )}

            {isPending && canUserApproveExit(currentExit) && (
              <>
                <button
                  type="button"
                  onClick={() => setApproveModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Çıkışı Onayla</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 rounded-xl text-xs font-bold border border-rose-200 dark:border-rose-800 cursor-pointer transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reddet</span>
                </button>
              </>
            )}

            {(isApproved || (isPending && isManager)) && canEdit && (
              <button
                type="button"
                onClick={() => {
                  setShipWaybill(currentExit.waybillNumber || '');
                  setShipCarrier(currentExit.carrierCompany || '');
                  setShipTracking(currentExit.trackingNumber || '');
                  setShipRecipient(currentExit.recipientPerson || '');
                  setShipPhone(currentExit.recipientPhone || '');
                  setShipAddress(currentExit.deliveryAddress || '');
                  setShipModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-navy-700 hover:bg-navy-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Sevkiyatı Sevk Et</span>
              </button>
            )}

            {!isCancelled && canEdit && (
              <button
                type="button"
                onClick={() => setCancelModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors border border-transparent hover:border-rose-200"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                <span>Fişi İptal Et</span>
              </button>
            )}
          </div>
        </div>

        {/* Durum Bildirimleri */}
        {isCancelled && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-900 dark:text-rose-200 space-y-1">
            <div className="flex items-center gap-2 font-bold text-sm text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4" />
              Bu Sevkiyat Fişi İptal Edilmiştir
            </div>
            <p>
              <span className="font-semibold">İptal Tarihi:</span> {formatDate(currentExit.cancelledAt, 'dd.MM.yyyy HH:mm')} — <span className="font-semibold">İptal Eden:</span> {currentExit.cancelledBy?.fullName || '-'}
            </p>
            <p>
              <span className="font-semibold">İptal Gerekçesi:</span> {currentExit.cancelReason || 'Belirtilmedi'}
            </p>
          </div>
        )}

        {isShipped && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-3">
            <CheckCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-bold text-sm text-emerald-800 dark:text-emerald-300">
                Sevkiyat Başarıyla Tamamlandı & Depodan Çıkış Yapıldı
              </div>
              <p className="text-emerald-700/90 dark:text-emerald-400/90 leading-relaxed">
                Bu fişteki ürünlerin stok seviyeleri depodan fiziksel olarak düşülmüş ve aşağıda listelenen seri numaraları müşteriye sevk edilmiştir.
                {currentExit.shippedAt && ` (Sevk Zamanı: ${formatDate(currentExit.shippedAt, 'dd.MM.yyyy HH:mm')})`}
              </p>
            </div>
          </div>
        )}

        {/* Onay Akışı Kartı (Varsa) */}
        {currentExit.approvals && currentExit.approvals.length > 0 && (
          <div className="p-4 bg-card border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-2">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Sıralı Onay Süreci</h4>
            <div className="flex items-center gap-3 overflow-x-auto pt-1">
              {currentExit.approvals.map((ap: any) => (
                <div
                  key={ap.id}
                  className={cn(
                    'px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 shrink-0',
                    ap.status === 'APPROVED'
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : ap.status === 'REJECTED'
                      ? 'border-rose-300 bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      : 'border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  )}
                >
                  <span className="font-bold">Adım {ap.step}:</span>
                  <span>
                    {ap.status === 'APPROVED' ? '✓ Onaylandı' : ap.status === 'REJECTED' ? '✕ Reddedildi' : '⏳ Bekliyor'}
                  </span>
                  {ap.approver && (
                    <span className="text-[10px] text-muted-foreground font-normal">({ap.approver.fullName})</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bilgi Kartları (2 Kolon) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sol Kart: Sevkiyat ve Kargo Bilgileri */}
          <div className="p-5 bg-card border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <Truck className="w-4 h-4 text-navy-700 dark:text-navy-400" />
              <span>Sevkiyat & İrsaliye Bilgileri</span>
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Çıkış Deposu:</span>
                <span className="font-bold text-foreground">{currentExit.warehouse?.name} ({currentExit.warehouse?.code})</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Planlanan Çıkış Tarihi:</span>
                <span className="font-semibold text-foreground">{formatDate(currentExit.exitDate, 'dd.MM.yyyy')}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Kargo / Taşıyıcı:</span>
                <span className="font-semibold text-foreground">{currentExit.carrierCompany || 'Belirtilmedi'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Kargo Takip No:</span>
                {currentExit.trackingNumber ? (
                  <CopyableCode code={currentExit.trackingNumber} className="font-mono font-bold text-teal-600 dark:text-teal-400" />
                ) : (
                  <span className="text-muted-foreground italic">Henüz Girilmedi</span>
                )}
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">İrsaliye Numarası:</span>
                {currentExit.waybillNumber ? (
                  <CopyableCode code={currentExit.waybillNumber} className="font-mono font-bold text-foreground" />
                ) : (
                  <span className="text-muted-foreground italic">Belirtilmedi</span>
                )}
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Sevk Evrağı / İrsaliye:</span>
                {currentExit.documentUrl ? (
                  <a
                    href={currentExit.documentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 font-bold hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{currentExit.documentName || 'Evrağı Aç'}</span>
                  </a>
                ) : (
                  <span className="text-muted-foreground italic">Yüklenmedi</span>
                )}
              </div>
            </div>
            {currentExit.description && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-muted-foreground block text-[11px]">Çıkış Notu:</span>
                <p className="text-foreground mt-0.5">{currentExit.description}</p>
              </div>
            )}
          </div>

          {/* Sağ Kart: Müşteri ve Teslimat Bilgileri */}
          <div className="p-5 bg-card border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <Building2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Hedef Müşteri & Teslimat Bilgileri</span>
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2">
                <span className="text-muted-foreground block text-[11px]">Müşteri Firma:</span>
                <span className="font-bold text-sm text-foreground">
                  {currentExit.customer?.companyName || currentExit.recipientPerson || 'Belirtilmedi'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Alıcı / Yetkili Kişi:</span>
                <span className="font-semibold text-foreground">
                  {currentExit.recipientPerson || currentExit.customer?.contactPerson || '-'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">İletişim Telefonu:</span>
                <span className="font-mono font-semibold text-foreground">
                  {currentExit.recipientPhone || currentExit.customer?.phone || '-'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground block text-[11px]">Teslimat Açık Adresi:</span>
                <p className="text-foreground mt-0.5 leading-relaxed">
                  {currentExit.deliveryAddress || currentExit.customer?.address || 'Belirtilmedi'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 1. ÇIKIŞ YAPILAN ÜRÜN KALEMLERİ TABLOSU */}
        <div className="bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Boxes className="w-4 h-4 text-navy-700 dark:text-navy-400" />
                <span>Çıkış Yapılan Kalemler ({currentExit.items?.length || 0})</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Bu sevkiyatta depodan çıkışı yapılan ürünlerin listesi ve miktarları
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-foreground">
              Toplam {currentExit.items?.reduce((acc: number, it: any) => acc + Number(it.quantity || 0), 0)} Adet
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-muted-foreground font-bold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">#</th>
                  <th className="py-2.5 px-3">Ürün Tanımı</th>
                  <th className="py-2.5 px-3">Marka / Model</th>
                  <th className="py-2.5 px-3 text-right">Sevk Edilen Miktar</th>
                  <th className="py-2.5 px-3 text-center">Takip Türü</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(currentExit.items || []).map((it: any, idx: number) => {
                  const isSerial = !!it.product?.trackSerial;

                  return (
                    <tr key={it.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                      <td className="py-3 px-3 text-center font-bold text-muted-foreground">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-foreground">{it.product?.name}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">{it.product?.code || '-'}</div>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">
                        <div>{it.product?.brand || '-'}</div>
                        <div className="text-[11px]">{it.product?.model || '-'}</div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-foreground">
                        {it.quantity} {it.product?.unit || 'ADET'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isSerial ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                            <ScanBarcode className="w-3.5 h-3.5" />
                            Seri Takipli
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            Standart Stok
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. SEVK EDİLEN CİHAZLAR, SERİ NUMARALARI VE MAC ADRESLERİ (EN ÖNEMLİ BÖLÜM) */}
        <div className="bg-card border-2 border-teal-500/30 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <ScanBarcode className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <span>Sevk Edilen Cihazlar, Seri Numaraları ve MAC Adresleri</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                  {currentExit.serials?.length || 0} Adet Cihaz
                </span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Bu sevkiyat kapsamında depodan çıkarılan fiziksel cihazların seri ve MAC eşleştirmeleri
              </p>
            </div>
          </div>

          {currentExit.serials && currentExit.serials.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-teal-50/60 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 font-bold border-b border-teal-100 dark:border-teal-900">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">#</th>
                    <th className="py-2.5 px-3">Ürün</th>
                    <th className="py-2.5 px-3">Seri Numarası (SN)</th>
                    <th className="py-2.5 px-3">MAC Adresi</th>
                    <th className="py-2.5 px-3 text-center">Cihaz Durumu</th>
                    <th className="py-2.5 px-3 text-right">Müşteri Garantisi</th>
                    <th className="py-2.5 px-3 text-right">Tedarikçi Garantisi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {currentExit.serials.map((s: any, sIdx: number) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                      <td className="py-3 px-3 text-center font-bold text-muted-foreground">
                        {sIdx + 1}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-foreground">
                          {s.product?.name || currentExit.items?.find((it: any) => it.productId === s.productId)?.product?.name || 'Cihaz'}
                        </div>
                        <div className="text-[11px] font-mono text-muted-foreground">
                          {s.product?.code || currentExit.items?.find((it: any) => it.productId === s.productId)?.product?.code || '-'}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <CopyableCode
                          code={s.serial}
                          className="font-mono font-extrabold text-sm text-foreground bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded"
                        />
                      </td>
                      <td className="py-3 px-3">
                        {s.macAddress ? (
                          <CopyableCode
                            code={s.macAddress}
                            className="font-mono text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700"
                          />
                        ) : (
                          <span className="text-muted-foreground italic">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold',
                          s.status === 'SHIPPED'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        )}>
                          {s.status === 'SHIPPED' ? '✓ Sevk Edildi' : 'Rezerve'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        {s.customerWarrantyEnd ? (
                          <div className="text-foreground font-semibold">
                            {formatDate(s.customerWarrantyEnd, 'dd.MM.yyyy')}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        {s.supplierWarrantyEnd ? (
                          <div className="text-muted-foreground">
                            {formatDate(s.supplierWarrantyEnd, 'dd.MM.yyyy')}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
              <Boxes className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-bold text-foreground">Seri Numaralı Cihaz Bulunmuyor</p>
              <p className="text-xs text-muted-foreground">
                Bu sevkiyattaki ürünler standart stok takiplidir ve seri numarası atanmamıştır.
              </p>
            </div>
          )}
        </div>

        {/* Alt Kapat & Geri Dön Butonu */}
        <div className="flex justify-between items-center pt-2">
          <button
            type="button"
            onClick={() => setDetailExit(null)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-foreground rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Sevkiyat Listesine Dön</span>
          </button>
        </div>

        {/* MODALLAR (Detay sayfasından da sorunsuz açılır) */}
        {approveModalOpen && currentExit && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-card w-full max-w-md rounded-2xl border border-emerald-200 dark:border-emerald-800 p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-base">
                <CheckCircle2 className="w-5 h-5" />
                Çıkış Fişini Onayla
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="font-bold text-foreground">{currentExit.exitNumber}</span> numaralı çıkış fişini
                onaylamak üzeresiniz.
              </p>
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground block">Onay Notu (İsteğe Bağlı)</label>
                <textarea
                  rows={2}
                  placeholder="Örn: Stoklar kontrol edildi, sevkiyata uygundur."
                  value={approveNote}
                  onChange={(e) => setApproveNote(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setApproveModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  disabled={isActionPending}
                  onClick={handleApprove}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  {isActionPending ? 'Onaylanıyor...' : 'Onayla'}
                </button>
              </div>
            </div>
          </div>
        )}

        {rejectModalOpen && currentExit && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-card w-full max-w-md rounded-2xl border border-rose-200 dark:border-rose-800 p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
                <XCircle className="w-5 h-5" />
                Çıkış Fişini Reddet
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="font-bold text-foreground">{currentExit.exitNumber}</span> talebi reddedilecek ve
                rezerve edilen seri numaraları tekrar depoya serbest bırakılacaktır.
              </p>
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground block">
                  Reddetme Gerekçesi (Zorunlu) <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Örn: Müşteri siparişi iptal ettiği için reddedildi."
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  disabled={isActionPending || !rejectNote.trim()}
                  onClick={handleReject}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {isActionPending ? 'Reddediliyor...' : 'Talebi Reddet'}
                </button>
              </div>
            </div>
          </div>
        )}

        {shipModalOpen && currentExit && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-card w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center gap-2 text-navy-700 dark:text-navy-400 font-bold text-base">
                <Send className="w-5 h-5" />
                Sevkiyatı Tamamla / Sevk Et
              </div>
              <p className="text-xs text-muted-foreground">
                Bu işlemle birlikte ürünler depodan fiziksel olarak düşülecek, defter hareketi kaydedilecek ve seriler
                müşteriye sevk edilmiş durumuna geçecektir.
              </p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">Kargo Firması</label>
                    <input
                      type="text"
                      value={shipCarrier}
                      onChange={(e) => setShipCarrier(e.target.value)}
                      placeholder="Örn: Yurtiçi Kargo"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">Takip Numarası</label>
                    <input
                      type="text"
                      value={shipTracking}
                      onChange={(e) => setShipTracking(e.target.value)}
                      placeholder="Örn: YK-123456"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">İrsaliye Numarası</label>
                  <input
                    type="text"
                    value={shipWaybill}
                    onChange={(e) => setShipWaybill(e.target.value)}
                    placeholder="Örn: IRS-2026-9001"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">Alıcı Yetkili</label>
                    <input
                      type="text"
                      value={shipRecipient}
                      onChange={(e) => setShipRecipient(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">Alıcı Telefon</label>
                    <input
                      type="text"
                      value={shipPhone}
                      onChange={(e) => setShipPhone(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Teslimat Adresi</label>
                  <textarea
                    rows={2}
                    value={shipAddress}
                    onChange={(e) => setShipAddress(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShipModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  disabled={isActionPending}
                  onClick={handleShip}
                  className="px-5 py-2 bg-navy-700 hover:bg-navy-800 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  {isActionPending ? 'Sevk Ediliyor...' : 'Sevk Et ve Stoğu Düş'}
                </button>
              </div>
            </div>
          </div>
        )}

        {cancelModalOpen && currentExit && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-card w-full max-w-md rounded-2xl border border-rose-200 dark:border-rose-800 p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
                <ShieldAlert className="w-5 h-5" />
                Çıkış Fişini İptal Et
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="font-bold text-foreground">{currentExit.exitNumber}</span> fişi iptal edilecektir.
                Eğer ürünler sevk edilmişse stok seviyeleri depoya geri yüklenecektir.
              </p>
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground block">
                  İptal Gerekçesi (Zorunlu) <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Örn: Müşteri siparişi iptal ettiği için sevk iptal edildi..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  disabled={isActionPending || !cancelReason.trim()}
                  onClick={handleCancel}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {isActionPending ? 'İptal Ediliyor...' : 'Fişi İptal Et'}
                </button>
              </div>
            </div>
          </div>
        )}

        {isUpdateShippingOpen && targetShippingExit && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-card w-full max-w-md rounded-2xl border border-teal-200 dark:border-teal-800 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400 font-bold text-base">
                  <Truck className="w-5 h-5" />
                  <span>Kargo & Takip Bilgilerini Güncelle</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsUpdateShippingOpen(false)}
                  className="text-slate-400 hover:text-foreground text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="font-bold text-foreground">{targetShippingExit.exitNumber}</span> fişi için kargo takip
                numarasını veya taşıyıcı firma bilgilerini giriniz.
              </p>
              <form onSubmit={handleUpdateShippingSubmit} className="space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Kargo / Taşıyıcı Firma</label>
                  <input
                    type="text"
                    placeholder="Örn: Yurtiçi Kargo, Aras Kargo"
                    value={updateCarrier}
                    onChange={(e) => setUpdateCarrier(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Kargo Takip No</label>
                  <input
                    type="text"
                    placeholder="Örn: YK-123456789"
                    value={updateTracking}
                    onChange={(e) => setUpdateTracking(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">İrsaliye Numarası</label>
                  <input
                    type="text"
                    placeholder="Örn: IRS-2026-0042"
                    value={updateWaybill}
                    onChange={(e) => setUpdateWaybill(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-mono"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsUpdateShippingOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-muted-foreground cursor-pointer"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={updateShippingMutation.isPending}
                    className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    {updateShippingMutation.isPending ? 'Kaydediliyor...' : 'Kargo Bilgilerini Güncelle'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ================= LİSTE GÖRÜNÜMÜ ================= */
  return (
    <div className="space-y-6">
      {/* Üst Başlık & Aksiyon */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <PackageMinus className="w-6 h-6 text-navy-700 dark:text-navy-400" />
            <span>Stok Çıkışı & Sevkiyat Yönetimi</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Müşteri sevkiyatları, transferler, sıralı onay mekanizması ve seri numarası takibi.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              audioNotifier.playApprovalChime();
              toast.info('🔔 Onay bildirim sesi çalındı (Hoparlör Testi).');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-all cursor-pointer h-10 border border-slate-200 dark:border-slate-700"
            title="Onay bildirim sesini test et"
          >
            <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden md:inline">Ses Testi</span>
          </button>

          {canCreate && (
            <button
              type="button"
              onClick={handleOpenCreateForm}
              className="inline-flex items-center gap-2 px-4 py-2 bg-navy-700 hover:bg-navy-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer h-10"
            >
              <Plus className="w-4 h-4" />
              Yeni Çıkış / Sevkiyat Talebi
            </button>
          )}
        </div>
      </div>

      {/* Filtre Barı */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-card p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="relative sm:col-span-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Fiş No, Müşteri, Kargo, İrsaliye ara..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-navy-600"
          />
        </div>

        <div>
          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
          >
            <option value="">Tüm Depolar</option>
            {(warehouses || []).map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
          >
            <option value="ALL">Tüm Çıkış Türleri</option>
            <option value="SALE_SHIPMENT">Müşteri Sevkiyatı</option>
            <option value="TRANSFER_OUT">Depo Transferi</option>
            <option value="RETURN_SUPPLIER">Tedarikçiye İade</option>
            <option value="COUNT_DEFICIT">Sayım Eksiği / Fire</option>
            <option value="SCRAP">Hurda</option>
            <option value="FAULT_SEND">Arıza Gönderimi</option>
            <option value="OTHER">Diğer</option>
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
          >
            <option value="ALL">Tüm Durumlar</option>
            <option value="PENDING_APPROVAL">Onay Bekliyor</option>
            <option value="APPROVED">Onaylandı (Sevk Hazır)</option>
            <option value="SHIPPED">Sevk Edildi</option>
            <option value="CANCELLED">İptal Edildi</option>
          </select>
        </div>
      </div>

      {/* TanStack Table */}
      <DataTable
        table={table}
        isLoading={isLoading}
        totalRowCount={exitsResponse?.meta?.totalRowCount}
      />

      {/* ================= FLOATING ACTION MENU ================= */}
      {actionMenu && (
        <>
          <div
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            onClick={(e) => {
              e.stopPropagation();
              setActionMenu(null);
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: Math.min(actionMenu.y, window.innerHeight - 280),
              left: Math.max(16, actionMenu.x - 224),
            }}
            className="w-56 bg-card border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 py-1 divide-y divide-slate-100 dark:divide-slate-800 text-xs animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="py-1">
              <button
                type="button"
                onClick={() => {
                  const exit = actionMenu.exit;
                  setActionMenu(null);
                  setDetailExit(exit);
                }}
                className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-foreground font-semibold cursor-pointer"
              >
                <Eye className="w-4 h-4 text-navy-600 dark:text-navy-400" />
                <span>Sevkiyatı İncele (Detay)</span>
              </button>

              {actionMenu.exit.status !== 'CANCELLED' && canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    const exit = actionMenu.exit;
                    setActionMenu(null);
                    setTargetShippingExit(exit);
                    setUpdateCarrier(exit.carrierCompany || '');
                    setUpdateTracking(exit.trackingNumber || '');
                    setUpdateWaybill(exit.waybillNumber || '');
                    setIsUpdateShippingOpen(true);
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-foreground font-semibold cursor-pointer"
                >
                  <Truck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>Kargo / Takip No Güncelle</span>
                </button>
              )}
            </div>

            {/* Onay Adımları (Yalnızca Yönetici veya Onaycı Görür) */}
            {actionMenu.exit.status === 'PENDING_APPROVAL' && canUserApproveExit(actionMenu.exit) && (
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    const exit = actionMenu.exit;
                    setActionMenu(null);
                    setDetailExit(exit);
                    setApproveModalOpen(true);
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-semibold cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Çıkışı Onayla</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const exit = actionMenu.exit;
                    setActionMenu(null);
                    setDetailExit(exit);
                    setRejectModalOpen(true);
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-700 dark:text-rose-400 font-semibold cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Talebi Reddet</span>
                </button>
              </div>
            )}

            {/* Sevk Et */}
            {(actionMenu.exit.status === 'APPROVED' || (actionMenu.exit.status === 'PENDING_APPROVAL' && isManager)) && canEdit && (
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    const exit = actionMenu.exit;
                    setActionMenu(null);
                    setDetailExit(exit);
                    setShipWaybill(exit.waybillNumber || '');
                    setShipCarrier(exit.carrierCompany || '');
                    setShipTracking(exit.trackingNumber || '');
                    setShipRecipient(exit.recipientPerson || '');
                    setShipPhone(exit.recipientPhone || '');
                    setShipAddress(exit.deliveryAddress || '');
                    setShipModalOpen(true);
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-navy-50 dark:hover:bg-navy-950/40 text-navy-800 dark:text-navy-300 font-bold cursor-pointer"
                >
                  <Send className="w-4 h-4 text-navy-600" />
                  <span>Sevkiyatı Sevk Et</span>
                </button>
              </div>
            )}

            {/* İptal */}
            {actionMenu.exit.status !== 'CANCELLED' && canEdit && (
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    const exit = actionMenu.exit;
                    setActionMenu(null);
                    setDetailExit(exit);
                    setCancelModalOpen(true);
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 font-semibold cursor-pointer"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Fişi İptal Et</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}



      {/* ================= MODAL: ONAYLA ================= */}
      {approveModalOpen && detailExit && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-emerald-200 dark:border-emerald-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-base">
              <CheckCircle2 className="w-5 h-5" />
              Çıkış Fişini Onayla
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="font-bold text-foreground">{detailExit.exitNumber}</span> numaralı çıkış fişini
              onaylamak üzeresiniz.
            </p>
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground block">Onay Notu (İsteğe Bağlı)</label>
              <textarea
                rows={2}
                placeholder="Örn: Stoklar kontrol edildi, sevkiyata uygundur."
                value={approveNote}
                onChange={(e) => setApproveNote(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setApproveModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={isActionPending}
                onClick={handleApprove}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                {isActionPending ? 'Onaylanıyor...' : 'Onayla'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: REDDET ================= */}
      {rejectModalOpen && detailExit && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-rose-200 dark:border-rose-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
              <XCircle className="w-5 h-5" />
              Çıkış Fişini Reddet
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="font-bold text-foreground">{detailExit.exitNumber}</span> talebi reddedilecek ve
              rezerve edilen seri numaraları tekrar depoya serbest bırakılacaktır.
            </p>
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground block">
                Reddetme Gerekçesi (Zorunlu) <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="Örn: Müşteri siparişi iptal ettiği için reddedildi."
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={isActionPending || !rejectNote.trim()}
                onClick={handleReject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {isActionPending ? 'Reddediliyor...' : 'Talebi Reddet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: SEVK ET ================= */}
      {shipModalOpen && detailExit && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2 text-navy-700 dark:text-navy-400 font-bold text-base">
              <Send className="w-5 h-5" />
              Sevkiyatı Tamamla / Sevk Et
            </div>
            <p className="text-xs text-muted-foreground">
              Bu işlemle birlikte ürünler depodan fiziksel olarak düşülecek, defter hareketi kaydedilecek ve seriler
              müşteriye sevk edilmiş durumuna geçecektir.
            </p>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Kargo Firması</label>
                  <input
                    type="text"
                    value={shipCarrier}
                    onChange={(e) => setShipCarrier(e.target.value)}
                    placeholder="Örn: Yurtiçi Kargo"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Takip Numarası</label>
                  <input
                    type="text"
                    value={shipTracking}
                    onChange={(e) => setShipTracking(e.target.value)}
                    placeholder="Örn: YK-123456"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">İrsaliye Numarası</label>
                <input
                  type="text"
                  value={shipWaybill}
                  onChange={(e) => setShipWaybill(e.target.value)}
                  placeholder="Örn: IRS-2026-9001"
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Alıcı Yetkili</label>
                  <input
                    type="text"
                    value={shipRecipient}
                    onChange={(e) => setShipRecipient(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Alıcı Telefon</label>
                  <input
                    type="text"
                    value={shipPhone}
                    onChange={(e) => setShipPhone(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Teslimat Adresi</label>
                <textarea
                  rows={2}
                  value={shipAddress}
                  onChange={(e) => setShipAddress(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShipModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={isActionPending}
                onClick={handleShip}
                className="px-5 py-2 bg-navy-700 hover:bg-navy-800 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                {isActionPending ? 'Sevk Ediliyor...' : 'Sevk Et ve Stoğu Düş'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: İPTAL ET ================= */}
      {cancelModalOpen && detailExit && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-rose-200 dark:border-rose-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
              <ShieldAlert className="w-5 h-5" />
              Çıkış Fişini İptal Et
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="font-bold text-foreground">{detailExit.exitNumber}</span> fişi iptal edilecektir.
              Eğer ürünler sevk edilmişse stok seviyeleri depoya geri yüklenecektir.
            </p>
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground block">
                İptal Gerekçesi (Zorunlu) <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="Örn: Müşteri siparişi iptal ettiği için sevk iptal edildi..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={isActionPending || !cancelReason.trim()}
                onClick={handleCancel}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {isActionPending ? 'İptal Ediliyor...' : 'Fişi İptal Et'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: HIZLI MÜŞTERİ KARTI OLUŞTUR ================= */}
      {isCustModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-navy-700 dark:text-navy-400 font-bold text-base">
                <UserPlus className="w-5 h-5" />
                <span>Hızlı Müşteri Kartı Tanımla</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCustModalOpen(false)}
                className="text-slate-400 hover:text-foreground text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Sevkiyat için gerekli temel müşteri bilgilerini giriniz. Kart anında kaydedilecek ve sevkiyatınıza eklenecektir.
            </p>

            <form onSubmit={handleQuickCreateCustomer} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Firma / Müşteri Ünvanı <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Armada Bilişim ve İletişim A.Ş."
                  value={custCompanyName}
                  onChange={(e) => setCustCompanyName(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Yetkili Kişi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Ahmet Yılmaz"
                    value={custContactPerson}
                    onChange={(e) => setCustContactPerson(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Telefon Numarası <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: 0532 555 44 33"
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Vergi Numarası (VKN)</label>
                  <input
                    type="text"
                    placeholder="10 Haneli VKN"
                    value={custTaxNumber}
                    onChange={(e) => setCustTaxNumber(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Vergi Dairesi</label>
                  <input
                    type="text"
                    placeholder="Örn: Maslak VD."
                    value={custTaxOffice}
                    onChange={(e) => setCustTaxOffice(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Teslimat / Fatura Adresi</label>
                <textarea
                  rows={2}
                  placeholder="İlçe, cadde, bina no, şehir..."
                  value={custAddress}
                  onChange={(e) => setCustAddress(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCustModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={quickCreateCustomerMutation.isPending}
                  className="px-5 py-2 bg-navy-700 hover:bg-navy-800 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {quickCreateCustomerMutation.isPending ? 'Kaydediliyor...' : 'Müşteriyi Kaydet ve Seç'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: KARGO TAKİP NO GÜNCELLE (1 GÜN SONRA) ================= */}
      {isUpdateShippingOpen && targetShippingExit && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-teal-200 dark:border-teal-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400 font-bold text-base">
                <Truck className="w-5 h-5" />
                <span>Kargo & Takip Bilgilerini Güncelle</span>
              </div>
              <button
                type="button"
                onClick={() => setIsUpdateShippingOpen(false)}
                className="text-slate-400 hover:text-foreground text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              <span className="font-bold text-foreground">{targetShippingExit.exitNumber}</span> fişi için kargo takip
              numarasını veya taşıyıcı firma bilgilerini giriniz.
            </p>

            <form onSubmit={handleUpdateShippingSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Kargo / Taşıyıcı Firma</label>
                <input
                  type="text"
                  placeholder="Örn: Yurtiçi Kargo, Aras Kargo"
                  value={updateCarrier}
                  onChange={(e) => setUpdateCarrier(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Kargo Takip No</label>
                <input
                  type="text"
                  placeholder="Örn: YK-123456789"
                  value={updateTracking}
                  onChange={(e) => setUpdateTracking(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">İrsaliye Numarası</label>
                <input
                  type="text"
                  placeholder="Örn: IRS-2026-0042"
                  value={updateWaybill}
                  onChange={(e) => setUpdateWaybill(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUpdateShippingOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={updateShippingMutation.isPending}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {updateShippingMutation.isPending ? 'Kaydediliyor...' : 'Kargo Bilgilerini Güncelle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
