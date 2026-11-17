import { Test, TestingModule } from '@nestjs/testing';
import { StockEntriesService } from './stock-entries.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { BarcodeService } from '../common/barcode/barcode.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StockEntryStatus, SerialStatus, StockMovementType } from '@prisma/client';

describe('StockEntriesService', () => {
  let service: StockEntriesService;
  let prisma: any;
  let auditLogsService: any;
  let barcodeService: any;

  const mockUser: any = {
    id: 'user-123',
    fullName: 'Admin User',
    email: 'admin@dreamtelecom.com',
    role: 'SALES_MANAGER',
  };

  beforeEach(async () => {
    prisma = {
      stockEntry: {
        count: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      warehouse: {
        findUnique: jest.fn(),
      },
      supplier: {
        findUnique: jest.fn(),
      },
      product: {
        findMany: jest.fn(),
      },
      serialNumber: {
        findMany: jest.fn(),
        upsert: jest.fn(),
        updateMany: jest.fn(),
      },
      stockLevel: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      stockEntryItem: {
        create: jest.fn(),
      },
      stockMovement: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    auditLogsService = {
      log: jest.fn().mockResolvedValue(true),
    };

    barcodeService = new BarcodeService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockEntriesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: auditLogsService },
        { provide: BarcodeService, useValue: barcodeService },
      ],
    }).compile();

    service = module.get<StockEntriesService>(StockEntriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should fail if no items provided', async () => {
    await expect(
      service.create(
        {
          warehouseId: 'wh-1',
          items: [],
        },
        mockUser
      )
    ).rejects.toThrow(BadRequestException);
  });

  it('should fail if warehouse does not exist', async () => {
    prisma.warehouse.findUnique.mockResolvedValue(null);
    await expect(
      service.create(
        {
          warehouseId: 'wh-nonexistent',
          items: [{ productId: 'p1', quantity: 1, unitPrice: 10, currency: 'TRY' }],
        },
        mockUser
      )
    ).rejects.toThrow(NotFoundException);
  });

  it('should enforce serial quantity match for trackSerial products', async () => {
    prisma.warehouse.findUnique.mockResolvedValue({ id: 'wh-1', isActive: true, name: 'Ana Depo' });
    prisma.product.findMany.mockResolvedValue([
      { id: 'p1', name: 'Fiber Router', isActive: true, trackSerial: true },
    ]);

    await expect(
      service.create(
        {
          warehouseId: 'wh-1',
          items: [
            {
              productId: 'p1',
              quantity: 2,
              unitPrice: 100,
              currency: 'USD',
              serials: [{ serial: 'SN-001' }], // 1 serial for 2 quantity -> must fail
            },
          ],
        },
        mockUser
      )
    ).rejects.toThrow(BadRequestException);
  });

  it('should prevent duplicate serial numbers in the same payload', async () => {
    prisma.warehouse.findUnique.mockResolvedValue({ id: 'wh-1', isActive: true, name: 'Ana Depo' });
    prisma.product.findMany.mockResolvedValue([
      { id: 'p1', name: 'Fiber Router', isActive: true, trackSerial: true },
    ]);

    await expect(
      service.create(
        {
          warehouseId: 'wh-1',
          items: [
            {
              productId: 'p1',
              quantity: 2,
              unitPrice: 100,
              currency: 'USD',
              serials: [{ serial: 'SN-001' }, { serial: 'SN-001' }],
            },
          ],
        },
        mockUser
      )
    ).rejects.toThrow(BadRequestException);
  });

  it('should cancel stock entry with reversal and cancel reason', async () => {
    const entryData = {
      id: 'entry-1',
      entryNumber: 'GR-2026-0001',
      status: StockEntryStatus.COMPLETED,
      warehouseId: 'wh-1',
      items: [{ productId: 'p1', quantity: 5 }],
      serials: [{ id: 's1', serial: 'SN-1', status: SerialStatus.IN_STOCK, stockExitId: null }],
    };

    jest.spyOn(service, 'findOne').mockResolvedValue(entryData as any);

    prisma.stockLevel.findUnique.mockResolvedValue({
      quantity: {
        lessThan: () => false,
        minus: () => ({ toNumber: () => 5 }),
      },
    });

    const res = await service.cancel('entry-1', { cancelReason: 'Yanlış giriş' }, mockUser);
    expect(auditLogsService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CANCEL',
        entity: 'STOCK_ENTRY',
      })
    );
  });
});
