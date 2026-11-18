import { Test, TestingModule } from '@nestjs/testing';
import { StockExitsService } from './stock-exits.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
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

  describe('Sequential Approval System (Sıralı Onay Mekanizması)', () => {
    it('should set status to PENDING_APPROVAL and generate approval step records when active approval settings exist', async () => {
      prisma.warehouse.findUnique.mockResolvedValue({ id: 'wh-1', isActive: true, name: 'Ana Depo' });
      prisma.customer.findUnique.mockResolvedValue({ id: 'cust-1', companyName: 'Test Müşteri' });
      prisma.product.findMany.mockResolvedValue([{ id: 'p1', name: 'Grandstream UCM6302', isActive: true }]);
      prisma.stockLevel.findUnique.mockResolvedValue({ quantity: 10 });
      prisma.approvalSetting.findMany.mockResolvedValue([
        { step: 1, name: 'Depo Sorumlusu Onayı', roleId: 'role-wh-1', userId: null, isActive: true },
        { step: 2, name: 'Satış Müdürü Onayı', roleId: null, userId: 'user-manager-1', isActive: true },
      ]);
      prisma.stockExit.count.mockResolvedValue(0);
      prisma.stockExit.create.mockResolvedValue({
        id: 'exit-seq-1',
        exitNumber: 'CK-2026-0001',
        status: StockExitStatus.PENDING_APPROVAL,
      });

      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 'exit-seq-1',
        exitNumber: 'CK-2026-0001',
        status: StockExitStatus.PENDING_APPROVAL,
      } as any);

      await service.create(
        {
          warehouseId: 'wh-1',
          customerId: 'cust-1',
          type: StockExitType.SALE_SHIPMENT,
          items: [{ productId: 'p1', quantity: 2 }],
        },
        mockUser
      );

      expect(prisma.stockExit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: StockExitStatus.PENDING_APPROVAL,
          }),
        })
      );

      // Verify both approval steps were created in order
      expect(prisma.stockExitApproval.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            step: 1,
            roleId: 'role-wh-1',
            status: ApprovalStatus.PENDING,
          }),
        })
      );
      expect(prisma.stockExitApproval.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            step: 2,
            approverId: 'user-manager-1',
            status: ApprovalStatus.PENDING,
          }),
        })
      );
    });

    it('should throw ForbiddenException if user is unauthorized for current pending approval step', async () => {
      const exitData = {
        id: 'exit-seq-1',
        exitNumber: 'CK-2026-0001',
        status: StockExitStatus.PENDING_APPROVAL,
        approvals: [
          {
            id: 'app-step-1',
            step: 1,
            status: ApprovalStatus.PENDING,
            approverId: 'designated-approver-99',
            roleId: 'specific-role-99',
          },
        ],
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(exitData as any);

      const unauthorizedUser: any = {
        id: 'random-rep-id',
        role: 'SALES_REP',
        isSuperAdmin: false,
        appRoleId: 'unrelated-role-id',
      };

      await expect(
        service.approve('exit-seq-1', { note: 'Yetkisiz onay denemesi' }, unauthorizedUser)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should advance step 1 to APPROVED without approving exit if step 2 is still pending', async () => {
      const exitData = {
        id: 'exit-seq-1',
        exitNumber: 'CK-2026-0001',
        status: StockExitStatus.PENDING_APPROVAL,
        approvals: [
          {
            id: 'app-step-1',
            step: 1,
            status: ApprovalStatus.PENDING,
            approverId: 'user-manager-1',
          },
          {
            id: 'app-step-2',
            step: 2,
            status: ApprovalStatus.PENDING,
            approverId: 'director-1',
          },
        ],
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(exitData as any);

      await service.approve('exit-seq-1', { note: '1. Adım depo onayı verildi' }, mockUser);

      // app-step-1 must be approved
      expect(prisma.stockExitApproval.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'app-step-1' },
          data: expect.objectContaining({
            status: ApprovalStatus.APPROVED,
            approverId: mockUser.id,
            note: '1. Adım depo onayı verildi',
          }),
        })
      );

      // StockExit itself must NOT be updated to APPROVED yet because app-step-2 is still pending
      expect(prisma.stockExit.update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: StockExitStatus.APPROVED },
        })
      );
    });

    it('should transition StockExit to APPROVED when the final pending step is approved', async () => {
      const exitData = {
        id: 'exit-seq-1',
        exitNumber: 'CK-2026-0001',
        status: StockExitStatus.PENDING_APPROVAL,
        approvals: [
          {
            id: 'app-step-1',
            step: 1,
            status: ApprovalStatus.APPROVED,
            approverId: 'wh-lead-1',
          },
          {
            id: 'app-step-2',
            step: 2,
            status: ApprovalStatus.PENDING, // This is the last pending step
            approverId: 'user-manager-1',
          },
        ],
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(exitData as any);

      await service.approve('exit-seq-1', { note: 'Nihai satış müdürü onayı verildi' }, mockUser);

      // app-step-2 must be updated to APPROVED
      expect(prisma.stockExitApproval.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'app-step-2' },
          data: expect.objectContaining({
            status: ApprovalStatus.APPROVED,
          }),
        })
      );

      // Since all steps are now complete, StockExit status MUST transition to APPROVED (ready for shipment)
      expect(prisma.stockExit.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'exit-seq-1' },
          data: { status: StockExitStatus.APPROVED },
        })
      );
    });
  });
});
