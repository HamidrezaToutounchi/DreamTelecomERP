import { Test, TestingModule } from '@nestjs/testing';
import { FaultsService } from './faults.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { FaultPdfService } from './fault-pdf.service';
import { NotFoundException } from '@nestjs/common';
import { FaultStatus, SerialStatus, FaultPriority } from '@prisma/client';

describe('FaultsService', () => {
  let service: FaultsService;
  let prisma: any;
  let auditLogsService: any;
  let faultPdfService: any;

  const mockUser: any = {
    id: 'user-123',
    fullName: 'Admin User',
    email: 'admin@dreamtelecom.com',
    role: 'SALES_MANAGER',
  };

  beforeEach(async () => {
    prisma = {
      faultRecord: {
        count: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      serialNumber: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      customer: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    auditLogsService = {
      log: jest.fn().mockResolvedValue(true),
    };

    faultPdfService = {
      generateFaultSlip: jest.fn().mockResolvedValue(Buffer.from('PDF_CONTENT')),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FaultsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: auditLogsService },
        { provide: FaultPdfService, useValue: faultPdfService },
      ],
    }).compile();

    service = module.get<FaultsService>(FaultsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw NotFoundException if serial number does not exist', async () => {
      prisma.serialNumber.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          {
            serialId: 'non-existent',
            reportedProblem: 'Cihaz bozuk',
          },
          mockUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should successfully create a fault record and set serial to IN_FAULT', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 365);

      const mockSerial = {
        id: 'serial-1',
        serial: 'SN-1001',
        serialNumber: 'SN-1001',
        currentCustomerId: 'cust-1',
        customerWarrantyEnd: futureDate,
        supplierWarrantyEnd: futureDate,
        product: { id: 'p1', name: 'VoIP Gateway' },
      };

      prisma.serialNumber.findUnique.mockResolvedValue(mockSerial);
      prisma.customer.findUnique.mockResolvedValue({ id: 'cust-1', companyName: 'Tescom A.Ş.' });
      prisma.faultRecord.count.mockResolvedValue(0);
      prisma.faultRecord.findUnique.mockResolvedValue(null);

      const mockCreated = {
        id: 'fault-1',
        faultNumber: `ARZ-${now.getFullYear()}-0001`,
        serialId: 'serial-1',
        reportedProblem: 'Açılmıyor',
        status: FaultStatus.RECEIVED,
        priority: FaultPriority.HIGH,
        underCustomerWarranty: true,
        underSupplierWarranty: true,
        customer: { companyName: 'Tescom A.Ş.' },
      };

      prisma.faultRecord.create.mockResolvedValue(mockCreated);

      const result = await service.create(
        {
          serialId: 'serial-1',
          reportedProblem: 'Açılmıyor',
          priority: FaultPriority.HIGH,
        },
        mockUser,
      );

      expect(result).toBeDefined();
      expect(result.faultNumber).toBe(`ARZ-${now.getFullYear()}-0001`);
      expect(prisma.serialNumber.update).toHaveBeenCalledWith({
        where: { id: 'serial-1' },
        data: { status: SerialStatus.IN_FAULT },
      });
      expect(auditLogsService.log).toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('should update fault status and restore serial if returned to customer', async () => {
      const mockRecord = {
        id: 'fault-1',
        serialId: 'serial-1',
        status: FaultStatus.IN_INSPECTION,
        serial: {
          id: 'serial-1',
          currentCustomerId: 'cust-1',
        },
      };

      prisma.faultRecord.findUnique.mockResolvedValue(mockRecord);
      prisma.faultRecord.update.mockResolvedValue({
        ...mockRecord,
        status: FaultStatus.RETURNED_TO_CUSTOMER,
      });

      const result = await service.updateStatus(
        'fault-1',
        {
          status: FaultStatus.RETURNED_TO_CUSTOMER,
          resolutionSummary: 'Cihaz tamir edildi ve teslim edildi.',
        },
        mockUser,
      );

      expect(result.status).toBe(FaultStatus.RETURNED_TO_CUSTOMER);
      expect(prisma.serialNumber.update).toHaveBeenCalledWith({
        where: { id: 'serial-1' },
        data: { status: SerialStatus.SHIPPED },
      });
      expect(auditLogsService.log).toHaveBeenCalled();
    });
  });
});
