import { Test, TestingModule } from '@nestjs/testing';
import { StockExitsService } from './stock-exits.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StockExitStatus, StockExitType, SerialStatus, ApprovalStatus } from '@prisma/client';

describe('StockExitsService', () => {
  let service: StockExitsService;
  let prisma: any;
  let auditLogsService: any;

  const mockUser: any = {
    id: 'user-manager-1',
    fullName: 'Manager User',
    email: 'manager@dreamtelecom.com',
    role: 'SALES_MANAGER',
    isSuperAdmin: true,
  };

  beforeEach(async () => {
    prisma = {
      stockExit: {
        count: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      warehouse: {
        findUnique: jest.fn(),
      },
      customer: {
        findUnique: jest.fn(),
      },
      product: {
        findMany: jest.fn(),
      },
      stockLevel: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      serialNumber: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
      stockExitItem: {
        create: jest.fn(),
      },
      stockExitApproval: {
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      approvalSetting: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      stockMovement: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    auditLogsService = {
      log: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockExitsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: auditLogsService },
      ],
    }).compile();

    service = module.get<StockExitsService>(StockExitsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should fail if no items provided in exit request', async () => {
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

  it('should fail if customer is missing for SALE_SHIPMENT', async () => {
    prisma.warehouse.findUnique.mockResolvedValue({ id: 'wh-1', isActive: true, name: 'Ana Depo' });

    await expect(
      service.create(
        {
          warehouseId: 'wh-1',
          type: StockExitType.SALE_SHIPMENT,
          items: [{ productId: 'p1', quantity: 1 }],
        },
        mockUser
      )
    ).rejects.toThrow(BadRequestException);
  });

  it('should fail if stock level is insufficient', async () => {
    prisma.warehouse.findUnique.mockResolvedValue({ id: 'wh-1', isActive: true, name: 'Ana Depo' });
    prisma.customer.findUnique.mockResolvedValue({ id: 'cust-1', companyName: 'Test Müşteri' });
    prisma.product.findMany.mockResolvedValue([{ id: 'p1', name: 'Switch', isActive: true }]);
    prisma.stockLevel.findUnique.mockResolvedValue({ quantity: 2 }); // only 2 in stock

    await expect(
      service.create(
        {
          warehouseId: 'wh-1',
          customerId: 'cust-1',
          type: StockExitType.SALE_SHIPMENT,
          items: [{ productId: 'p1', quantity: 5 }], // requesting 5
        },
        mockUser
      )
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject exit and release reserved serials back to IN_STOCK', async () => {
    const exitData = {
      id: 'exit-1',
      exitNumber: 'CK-2026-0001',
      status: StockExitStatus.PENDING_APPROVAL,
      serials: [{ id: 's1', serial: 'SN-001' }],
    };

    jest.spyOn(service, 'findOne').mockResolvedValue(exitData as any);

    await service.reject('exit-1', { note: 'Ödeme alınamadı' }, mockUser);

    expect(prisma.serialNumber.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: SerialStatus.IN_STOCK,
          stockExitId: null,
        }),
      })
    );
  });

  it('should cancel shipped exit and reverse stock quantities', async () => {
    const exitData = {
      id: 'exit-1',
      exitNumber: 'CK-2026-0001',
      status: StockExitStatus.SHIPPED,
      warehouseId: 'wh-1',
      items: [{ productId: 'p1', quantity: 3 }],
      serials: [{ id: 's1', serial: 'SN-001' }],
    };

    jest.spyOn(service, 'findOne').mockResolvedValue(exitData as any);
    prisma.stockLevel.findUnique.mockResolvedValue({ quantity: { add: () => ({}) } });

    await service.cancel('exit-1', { cancelReason: 'Müşteri iade etti' }, mockUser);

    expect(auditLogsService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CANCEL',
        entity: 'STOCK_EXIT',
      })
    );
  });
});
