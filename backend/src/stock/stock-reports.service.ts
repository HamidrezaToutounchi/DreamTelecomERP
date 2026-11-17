import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  WarehouseStockReportItemDto,
  SerialTimelineResponseDto,
  SerialTimelineEventDto,
  StockMovementReportQueryParams,
} from './dto/stock-report.dto';
import * as ExcelJS from 'exceljs';

@Injectable()
export class StockReportsService {
  private readonly logger = new Logger(StockReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 1. Depo Bazlı Stok Durumu Raporu
   */
  async getWarehouseStock(warehouseId?: string): Promise<WarehouseStockReportItemDto[]> {
    const where: any = {};
    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    const levels = await this.prisma.stockLevel.findMany({
      where,
      include: {
        product: true,
        warehouse: true,
      },
      orderBy: [{ warehouse: { name: 'asc' } }, { product: { name: 'asc' } }],
    });

    return levels.map((l) => {
      const qty = Number(l.quantity);
      const min = l.product.minStockLevel ? Number(l.product.minStockLevel) : 0;
      const isCritical = min > 0 && qty <= min;
      const unitPrice = Number(l.product.unitPrice || 0);
      const totalValue = Number((qty * unitPrice).toFixed(2));
      return {
        productId: l.product.id,
        productName: l.product.name,
        productCode: l.product.code || '',
        brand: l.product.brand || undefined,
        model: l.product.model || undefined,
        warehouseId: l.warehouse.id,
        warehouseName: l.warehouse.name,
        quantity: qty,
        unitPrice,
        currency: l.product.currency || 'TRY',
        totalValue,
        minStockLevel: l.product.minStockLevel ? Number(l.product.minStockLevel) : undefined,
        isCritical,
        unit: l.product.unit || 'Adet',
      };
    });
  }

  /**
   * 2. Kritik Stok Seviyesi Raporu (quantity <= minStockLevel)
   */
  async getCriticalStock(): Promise<WarehouseStockReportItemDto[]> {
    const all = await this.getWarehouseStock();
    return all.filter((item) => item.isCritical);
  }

  /**
   * 3. Seri No Sorgula & Yaşam Döngüsü Zaman Tüneli (Cradle-to-Grave Timeline)
   */
  async getSerialTimeline(query: string): Promise<SerialTimelineResponseDto> {
    const clean = query.trim();
    const serial = await this.prisma.serialNumber.findFirst({
      where: {
        OR: [
          { serial: { equals: clean, mode: 'insensitive' } },
          { macAddress: { equals: clean, mode: 'insensitive' } },
        ],
      },
      include: {
        product: true,
        supplier: true,
        stockEntry: {
          include: { supplier: true, createdBy: true },
        },
        stockExit: {
          include: { customer: true, createdBy: true },
        },
        movements: {
          include: {
            sourceWarehouse: true,
            targetWarehouse: true,
            createdBy: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        faults: {
          include: { customer: true, createdBy: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!serial) {
      throw new NotFoundException(`Seri numarası veya MAC bulunamadı: "${query}"`);
    }

    // Müşteri bilgisi
    let currentCustomerName: string | undefined;
    if (serial.currentCustomerId) {
      const cust = await this.prisma.customer.findUnique({
        where: { id: serial.currentCustomerId },
      });
      if (cust) currentCustomerName = cust.companyName;
    } else if (serial.stockExit?.customer) {
      currentCustomerName = serial.stockExit.customer.companyName;
    }

    // Depo bilgisi
    let currentWarehouseName: string | undefined;
    if (serial.warehouseId) {
      const wh = await this.prisma.warehouse.findUnique({
        where: { id: serial.warehouseId },
      });
      if (wh) currentWarehouseName = wh.name;
    }

    const events: SerialTimelineEventDto[] = [];

    // Olay 1: Mal Kabul (Stok Girişi)
    if (serial.stockEntry) {
      events.push({
        id: `entry-${serial.stockEntry.id}`,
        date: serial.stockEntry.entryDate.toISOString(),
        type: 'STOCK_ENTRY',
        title: 'Mal Kabul (Depoya Giriş)',
        description: `Tedarikçiden mal kabul yapıldı. Fatura/İrsaliye: ${serial.stockEntry.invoiceNumber || serial.stockEntry.waybillNumber || '-'}`,
        referenceNumber: serial.stockEntry.entryNumber,
        performedBy: serial.stockEntry.createdBy?.fullName || undefined,
        party: serial.stockEntry.supplier?.name || serial.supplier?.name || undefined,
      });
    }

    // Olay 2: Stok Hareketleri
    for (const mov of serial.movements) {
      const whName = mov.targetWarehouse?.name || mov.sourceWarehouse?.name || 'Depo';
      events.push({
        id: `mov-${mov.id}`,
        date: mov.createdAt.toISOString(),
        type: `MOVEMENT_${mov.type}`,
        title: `Stok Hareketi: ${mov.type}`,
        description: mov.description || `Miktar: ${mov.quantity} (${whName})`,
        referenceNumber: mov.referenceId || undefined,
        performedBy: mov.createdBy?.fullName || undefined,
        party: whName,
      });
    }

    // Olay 3: Sevkiyat / Stok Çıkışı
    if (serial.stockExit) {
      events.push({
        id: `exit-${serial.stockExit.id}`,
        date: serial.stockExit.exitDate.toISOString(),
        type: 'STOCK_EXIT',
        title: 'Müşteriye Sevkiyat (Stok Çıkışı)',
        description: `Müşteriye sevk edildi. İrsaliye: ${serial.stockExit.waybillNumber || '-'}, Taşıyıcı: ${serial.stockExit.carrierCompany || '-'} (${serial.stockExit.trackingNumber || '-'})`,
        referenceNumber: serial.stockExit.exitNumber,
        performedBy: serial.stockExit.createdBy?.fullName || undefined,
        party: serial.stockExit.customer?.companyName || undefined,
      });
    }

    // Olay 4: Arıza & Servis Kayıtları
    for (const fault of serial.faults) {
      events.push({
        id: `fault-${fault.id}`,
        date: fault.receivedDate.toISOString(),
        type: 'FAULT_RECORD',
        title: `Arıza & Servis Bildirimi (${fault.status})`,
        description: `Problem: ${fault.reportedProblem}. Çözüm: ${fault.resolutionSummary || fault.technicianNotes || 'İşlem devam ediyor.'}`,
        referenceNumber: fault.faultNumber,
        performedBy: fault.createdBy?.fullName || undefined,
        party: fault.customer?.companyName || undefined,
      });
    }

    // Tarihe göre sırala (Yeniden eskiye)
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      id: serial.id,
      serial: serial.serial,
      macAddress: serial.macAddress || undefined,
      status: serial.status,
      productName: serial.product.name,
      productCode: serial.product.code || '',
      brand: serial.product.brand || undefined,
      model: serial.product.model || undefined,
      customerWarrantyEnd: serial.customerWarrantyEnd?.toISOString() || undefined,
      supplierWarrantyEnd: serial.supplierWarrantyEnd?.toISOString() || undefined,
      currentCustomer: currentCustomerName,
      currentWarehouse: currentWarehouseName,
      timeline: events,
    };
  }

  /**
   * 4. Garanti Takip Raporu
   */
  async getWarrantyReport(type: 'CUSTOMER' | 'SUPPLIER' = 'CUSTOMER', daysLeft = 30) {
    const now = new Date();
    const dateField = type === 'CUSTOMER' ? 'customerWarrantyEnd' : 'supplierWarrantyEnd';

    const serials = await this.prisma.serialNumber.findMany({
      where: {
        [dateField]: { not: null },
      },
      include: {
        product: true,
        supplier: true,
      },
      orderBy: { [dateField]: 'asc' },
    });

    const results = await Promise.all(
      serials.map(async (s) => {
        const endDate = type === 'CUSTOMER' ? s.customerWarrantyEnd! : s.supplierWarrantyEnd!;
        const diffMs = endDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        let statusText = 'Aktif';
        if (diffDays < 0) statusText = 'Sona Erdi';
        else if (diffDays <= daysLeft) statusText = 'Yaklaşıyor';

        let partyName = s.supplier?.name || '-';
        if (type === 'CUSTOMER' && s.currentCustomerId) {
          const c = await this.prisma.customer.findUnique({ where: { id: s.currentCustomerId } });
          if (c) partyName = c.companyName;
        }

        return {
          id: s.id,
          serial: s.serial,
          macAddress: s.macAddress,
          productName: s.product.name,
          productCode: s.product.code || '',
          brand: s.product.brand,
          model: s.product.model,
          endDate: endDate.toISOString(),
          daysLeft: diffDays,
          statusText,
          partyName,
        };
      })
    );

    return results;
  }

  /**
   * 5. Stok Hareket Defteri (Giriş/Çıkış Hareketleri)
   */
  async getStockMovements(params: StockMovementReportQueryParams) {
    const where: any = {};

    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = new Date(params.startDate);
      if (params.endDate) where.createdAt.lte = new Date(params.endDate);
    }

    if (params.warehouseId) {
      where.OR = [
        { sourceWarehouseId: params.warehouseId },
        { targetWarehouseId: params.warehouseId },
      ];
    }

    if (params.type) {
      where.type = params.type;
    }

    const movements = await this.prisma.stockMovement.findMany({
      where,
      include: {
        product: true,
        sourceWarehouse: true,
        targetWarehouse: true,
        createdBy: {
          select: { fullName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return movements.map((m) => ({
      id: m.id,
      date: m.createdAt.toISOString(),
      type: m.type,
      productName: m.product.name,
      productCode: m.product.code || '',
      warehouseName: m.targetWarehouse?.name || m.sourceWarehouse?.name || '-',
      quantity: Number(m.quantity),
      referenceNumber: m.referenceId || '-',
      description: m.description || '-',
      userName: m.createdBy?.fullName || '-',
    }));
  }

  /**
   * 6. Tedarikçi Bazlı Mal Kabul Raporu
   */
  async getSupplierEntriesReport() {
    const suppliers = await this.prisma.supplier.findMany({
      include: {
        stockEntries: {
          where: { status: 'COMPLETED' },
          include: {
            items: true,
          },
        },
      },
    });

    return suppliers.map((sup) => {
      const entryCount = sup.stockEntries.length;
      let totalItems = 0;
      let lastDate: Date | null = null;

      for (const entry of sup.stockEntries) {
        if (!lastDate || entry.entryDate > lastDate) {
          lastDate = entry.entryDate;
        }
        for (const item of entry.items) {
          totalItems += Number(item.quantity);
        }
      }

      return {
        supplierId: sup.id,
        supplierCode: sup.code,
        supplierName: sup.name,
        contactPerson: sup.contactPerson || '-',
        phone: sup.phone || '-',
        entryCount,
        totalItemsReceived: totalItems,
        lastEntryDate: lastDate ? lastDate.toISOString() : null,
      };
    });
  }

  /**
   * 7. Müşteri Bazlı Sevkiyat Raporu
   */
  async getCustomerExitsReport() {
    const exits = await this.prisma.stockExit.findMany({
      where: {
        status: 'SHIPPED',
        customerId: { not: null },
      },
      include: {
        customer: true,
        items: true,
      },
    });

    const customerMap = new Map<
      string,
      {
        customerId: string;
        customerName: string;
        taxNumber: string;
        shipmentCount: number;
        totalItemsShipped: number;
        lastShipmentDate: Date | null;
      }
    >();

    for (const exit of exits) {
      if (!exit.customer) continue;
      const cid = exit.customer.id;
      let existing = customerMap.get(cid);
      if (!existing) {
        existing = {
          customerId: cid,
          customerName: exit.customer.companyName,
          taxNumber: exit.customer.taxNumber || '-',
          shipmentCount: 0,
          totalItemsShipped: 0,
          lastShipmentDate: null,
        };
        customerMap.set(cid, existing);
      }

      existing.shipmentCount++;
      for (const item of exit.items) {
        existing.totalItemsShipped += Number(item.quantity);
      }
      if (!existing.lastShipmentDate || exit.exitDate > existing.lastShipmentDate) {
        existing.lastShipmentDate = exit.exitDate;
      }
    }

    return Array.from(customerMap.values()).map((c) => ({
      ...c,
      lastShipmentDate: c.lastShipmentDate ? c.lastShipmentDate.toISOString() : null,
    }));
  }

  /**
   * 8. Arıza & Servis İstatistikleri Raporu
   */
  async getFaultStatistics() {
    const faults = await this.prisma.faultRecord.findMany({
      include: {
        serial: { include: { product: true } },
      },
    });

    const totalFaults = faults.length;
    let underCustomerWarrantyCount = 0;
    let resolvedCount = 0;
    let replacedCount = 0;
    let scrappedCount = 0;
    let inProgressCount = 0;

    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    for (const f of faults) {
      if (f.underCustomerWarranty) underCustomerWarrantyCount++;

      byStatus[f.status] = (byStatus[f.status] || 0) + 1;
      byPriority[f.priority] = (byPriority[f.priority] || 0) + 1;

      if (f.status === 'RESOLVED' || f.status === 'RETURNED_TO_CUSTOMER') {
        resolvedCount++;
      } else if (f.status === 'REPLACED') {
        replacedCount++;
      } else if (f.status === 'SCRAPPED') {
        scrappedCount++;
      } else {
        inProgressCount++;
      }
    }

    return {
      totalFaults,
      underCustomerWarrantyCount,
      outOfWarrantyCount: totalFaults - underCustomerWarrantyCount,
      resolvedCount,
      replacedCount,
      scrappedCount,
      inProgressCount,
      byStatus,
      byPriority,
    };
  }

  /**
   * 9. Excel Export (.xlsx)
   */
  async exportToExcel(
    reportType: string,
    params: any,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Dream Telecom CRM';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Rapor');

    // Header styling helper
    const applyHeaderStyle = (row: ExcelJS.Row) => {
      row.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF004A93' }, // Kurumsal Mavi
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });
      row.height = 26;
    };

    let filename = `Rapor_${Date.now()}.xlsx`;

    if (reportType === 'warehouse-stock') {
      filename = `Depo_Stok_Durumu_${new Date().toISOString().slice(0, 10)}.xlsx`;
      sheet.columns = [
        { header: 'Ürün Kodu', key: 'productCode', width: 16 },
        { header: 'Ürün Adı', key: 'productName', width: 32 },
        { header: 'Marka', key: 'brand', width: 16 },
        { header: 'Model', key: 'model', width: 16 },
        { header: 'Depo Adı', key: 'warehouseName', width: 22 },
        { header: 'Mevcut Stok', key: 'quantity', width: 14 },
        { header: 'Birim', key: 'unit', width: 10 },
        { header: 'Kritik Seviye', key: 'minStockLevel', width: 14 },
        { header: 'Kritik Durumu', key: 'criticalStatus', width: 16 },
      ];
      applyHeaderStyle(sheet.getRow(1));

      const data = await this.getWarehouseStock(params?.warehouseId);
      data.forEach((item) => {
        sheet.addRow({
          productCode: item.productCode,
          productName: item.productName,
          brand: item.brand || '-',
          model: item.model || '-',
          warehouseName: item.warehouseName,
          quantity: item.quantity,
          unit: item.unit,
          minStockLevel: item.minStockLevel || '-',
          criticalStatus: item.isCritical ? 'KRİTİK' : 'Normal',
        });
      });
    } else if (reportType === 'movements') {
      filename = `Stok_Hareket_Defteri_${new Date().toISOString().slice(0, 10)}.xlsx`;
      sheet.columns = [
        { header: 'Tarih', key: 'date', width: 20 },
        { header: 'Hareket Tipi', key: 'type', width: 16 },
        { header: 'Ürün Kodu', key: 'productCode', width: 16 },
        { header: 'Ürün Adı', key: 'productName', width: 30 },
        { header: 'Depo', key: 'warehouseName', width: 20 },
        { header: 'Miktar', key: 'quantity', width: 12 },
        { header: 'Fiş / Ref No', key: 'referenceNumber', width: 18 },
        { header: 'İşlem Yapan', key: 'userName', width: 20 },
        { header: 'Açıklama', key: 'description', width: 35 },
      ];
      applyHeaderStyle(sheet.getRow(1));

      const data = await this.getStockMovements(params || {});
      data.forEach((item) => {
        sheet.addRow({
          date: new Date(item.date).toLocaleString('tr-TR'),
          type: item.type,
          productCode: item.productCode,
          productName: item.productName,
          warehouseName: item.warehouseName,
          quantity: item.quantity,
          referenceNumber: item.referenceNumber,
          userName: item.userName,
          description: item.description,
        });
      });
    } else {
      // Default / critical
      filename = `Kritik_Stok_Raporu_${new Date().toISOString().slice(0, 10)}.xlsx`;
      sheet.columns = [
        { header: 'Ürün Kodu', key: 'productCode', width: 16 },
        { header: 'Ürün Adı', key: 'productName', width: 32 },
        { header: 'Depo Adı', key: 'warehouseName', width: 22 },
        { header: 'Mevcut Stok', key: 'quantity', width: 14 },
        { header: 'Kritik Eşik', key: 'minStockLevel', width: 14 },
      ];
      applyHeaderStyle(sheet.getRow(1));

      const data = await this.getCriticalStock();
      data.forEach((item) => {
        sheet.addRow({
          productCode: item.productCode,
          productName: item.productName,
          warehouseName: item.warehouseName,
          quantity: item.quantity,
          minStockLevel: item.minStockLevel || 0,
        });
      });
    }

    const rawBuffer = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.from(rawBuffer);
    return { buffer, filename };
  }
}
