import { Module } from '@nestjs/common';
import { StockService } from './stock.service';
import { StockController } from './stock.controller';
import { StockEntriesService } from './stock-entries.service';
import { StockExitsService } from './stock-exits.service';
import { FaultsService } from './faults.service';
import { FaultPdfService } from './fault-pdf.service';
import { StockReportsService } from './stock-reports.service';
import { ApprovalSettingsService } from './approval-settings.service';
import { BarcodeService } from '../common/barcode/barcode.service';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [AuditLogsModule],
  controllers: [StockController],
  providers: [
    StockService,
    StockEntriesService,
    StockExitsService,
    FaultsService,
    FaultPdfService,
    StockReportsService,
    ApprovalSettingsService,
    BarcodeService,
  ],
  exports: [
    StockService,
    StockEntriesService,
    StockExitsService,
    FaultsService,
    FaultPdfService,
    StockReportsService,
    ApprovalSettingsService,
  ],
})
export class StockModule {}
