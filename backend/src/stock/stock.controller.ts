import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { StockService } from './stock.service';
import { StockEntriesService } from './stock-entries.service';
import { StockExitsService } from './stock-exits.service';
import { FaultsService } from './faults.service';
import { StockReportsService } from './stock-reports.service';
import { ApprovalSettingsService } from './approval-settings.service';
import {
  CreateApprovalSettingDto,
  UpdateApprovalSettingDto,
  ApprovalSettingResponseDto,
} from './dto/approval-setting.dto';
import {
  SerialTimelineQueryParams,
  StockMovementReportQueryParams,
  WarehouseStockReportItemDto,
  SerialTimelineResponseDto,
  WarrantyReportItemDto,
  StockMovementReportItemDto,
  SupplierEntriesReportItemDto,
  CustomerExitsReportItemDto,
  FaultStatisticsReportDto,
} from './dto/stock-report.dto';
import {
  CreateFaultRecordDto,
  UpdateFaultStatusDto,
  FaultsQueryParams,
  FaultRecordResponseDto,
  FaultsPaginatedResponseDto,
} from './dto/fault.dto';
import {
  QuickCreateCustomerDto,
  StockCustomerSearchItemDto,
  StockLookupResultDto,
} from './dto/stock.dto';
import {
  CreateStockEntryDto,
  CancelStockEntryDto,
  StockEntriesQueryParams,
  StockEntryResponseDto,
  StockEntriesPaginatedResponseDto,
} from './dto/stock-entry.dto';
import {
  CreateStockExitDto,
  ApproveStockExitDto,
  RejectStockExitDto,
  ShipStockExitDto,
  UpdateStockExitShippingDto,
  CancelStockExitDto,
  StockExitsQueryParams,
  AvailableSerialsQueryParams,
  AvailableSerialItemDto,
  StockExitResponseDto,
  StockExitsPaginatedResponseDto,
} from './dto/stock-exit.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { AppModule } from '../common/enums/crm.enums';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

const stockDocsDir = path.join(process.cwd(), 'uploads', 'stock-documents');
if (!fs.existsSync(stockDocsDir)) {
  fs.mkdirSync(stockDocsDir, { recursive: true });
}

export class StockDocumentUploadResponseDto {
  url: string;
  filename: string;
  originalName: string;
  size: number;
}

@ApiTags('Stock')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('stock')
export class StockController {
  constructor(
    private readonly stockService: StockService,
    private readonly stockEntriesService: StockEntriesService,
    private readonly stockExitsService: StockExitsService,
    private readonly faultsService: FaultsService,
    private readonly stockReportsService: StockReportsService,
    private readonly approvalSettingsService: ApprovalSettingsService,
  ) {}

  /* ================= MÜŞTERİ ARAMA & HIZLI EKLEME ================= */
  @Get('customers/search')
  @RequirePermission(AppModule.STOCK_ENTRY, 'view')
  @ApiOperation({ summary: 'Stok Modülü İçin Tüm Müşterilerde Arama' })
  @ApiQuery({ name: 'query', required: false, type: String })
  @ApiResponse({ status: 200, type: [StockCustomerSearchItemDto] })
  async searchCustomers(@Query('query') query?: string) {
    return this.stockService.searchCustomers(query);
  }

  @Post('customers/quick-create')
  @RequirePermission(AppModule.STOCK_ENTRY, 'create')
  @ApiOperation({ summary: 'Stok İçin Hızlı ve Mükerrer Kontrollü Müşteri Ekle' })
  @ApiResponse({ status: 201, type: StockCustomerSearchItemDto })
  async quickCreateCustomer(
    @Body() dto: QuickCreateCustomerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.stockService.quickCreateCustomer(dto, user);
  }

  /* ================= BARKOD & SERİ NO LOOKUP ================= */
  @Get('lookup')
  @ApiOperation({ summary: 'Barkod, Seri No veya MAC ile Akıllı Ürün/Stok Tespiti' })
  @ApiQuery({ name: 'code', required: false, type: String })
  @ApiQuery({ name: 'serial', required: false, type: String })
  @ApiResponse({ status: 200, type: StockLookupResultDto })
  async lookup(
    @Query('code') code?: string,
    @Query('serial') serial?: string,
  ) {
    const query = (code || serial || '').trim();
    return this.stockService.lookup(query);
  }

  /* ================= GİZLİ STOK BELGESİ YÜKLEME & SERVİS ETME ================= */
  @Post('documents/upload')
  @RequirePermission(AppModule.STOCK_ENTRY, 'create')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          cb(null, stockDocsDir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          cb(null, `stock-doc-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        // İzinli tipler: PDF, JPG, PNG, XML (e-irsaliye / e-fatura)
        const allowedMimes = [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'application/xml',
          'text/xml',
        ];
        const ext = path.extname(file.originalname).toLowerCase();
        const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png', '.xml'];

        if (!allowedMimes.includes(file.mimetype) && !allowedExts.includes(ext)) {
          return cb(
            new BadRequestException(
              'Yalnızca PDF, JPG, PNG ve XML (e-irsaliye/e-fatura) dosyaları yüklenebilir.'
            ),
            false
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB Maksimum
      },
    })
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Stok Giriş/Çıkış Fişleri İçin Gizli Belge Yükle' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, type: StockDocumentUploadResponseDto })
  async uploadStockDocument(@UploadedFile() file: Express.Multer.File): Promise<StockDocumentUploadResponseDto> {
    if (!file) {
      throw new BadRequestException('Lütfen bir dosya seçin.');
    }
    return {
      url: `/api/v1/stock/documents/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
    };
  }

  @Get('documents/:filename')
  @RequirePermission(AppModule.STOCK_ENTRY, 'view')
  @ApiOperation({ summary: 'Yetkili Kullanıcıya Gizli Stok Belgesini Göster / İndir' })
  async serveStockDocument(
    @Param('filename') filename: string,
    @Res() res: Response
  ) {
    // Path traversal koruması
    const safeFilename = path.basename(filename);
    const filePath = path.join(stockDocsDir, safeFilename);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Belge bulunamadı.');
    }

    return res.sendFile(filePath);
  }

  /* ================= MAL KABUL & STOK GİRİŞLERİ ================= */
  @Post('entries')
  @RequirePermission(AppModule.STOCK_ENTRY, 'create')
  @ApiOperation({ summary: 'Yeni Mal Kabul / Stok Giriş Fişi Kaydet' })
  @ApiResponse({ status: 201, type: StockEntryResponseDto })
  async createEntry(
    @Body() dto: CreateStockEntryDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.stockEntriesService.create(dto, user);
  }

  @Get('entries')
  @RequirePermission(AppModule.STOCK_ENTRY, 'view')
  @ApiOperation({ summary: 'Stok Giriş Fişlerini Listele (Filtreleme & Sayfalama)' })
  @ApiResponse({ status: 200, type: StockEntriesPaginatedResponseDto })
  async findAllEntries(@Query() query: StockEntriesQueryParams) {
    return this.stockEntriesService.findAll(query);
  }

  @Get('entries/:id')
  @RequirePermission(AppModule.STOCK_ENTRY, 'view')
  @ApiOperation({ summary: 'Giriş Fişi Detayını ve Kalemlerini Getir' })
  @ApiResponse({ status: 200, type: StockEntryResponseDto })
  async findOneEntry(@Param('id') id: string) {
    return this.stockEntriesService.findOne(id);
  }

  @Post('entries/:id/cancel')
  @RequirePermission(AppModule.STOCK_ENTRY, 'edit')
  @ApiOperation({ summary: 'Giriş Fişini İptal Et (Ters Hareket & İptal Gerekçesi İle)' })
  @ApiResponse({ status: 200, type: StockEntryResponseDto })
  async cancelEntry(
    @Param('id') id: string,
    @Body() dto: CancelStockEntryDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.stockEntriesService.cancel(id, dto, user);
  }

  /* ================= KULLANILABİLİR SERİ NUMARALARI ================= */
  @Get('available-serials')
  @RequirePermission(AppModule.STOCK_EXIT, 'view')
  @ApiOperation({ summary: 'Depoda Çıkışa Hazır (IN_STOCK) Serileri Listele' })
  @ApiResponse({ status: 200, type: [AvailableSerialItemDto] })
  async getAvailableSerials(@Query() query: AvailableSerialsQueryParams) {
    return this.stockExitsService.getAvailableSerials(query);
  }

  /* ================= STOK ÇIKIŞI & SEVKİYAT ================= */
  @Post('exits')
  @RequirePermission(AppModule.STOCK_EXIT, 'create')
  @ApiOperation({ summary: 'Yeni Stok Çıkışı / Sevkiyat Talebi Oluştur' })
  @ApiResponse({ status: 201, type: StockExitResponseDto })
  async createExit(
    @Body() dto: CreateStockExitDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.stockExitsService.create(dto, user);
  }

  @Get('exits')
  @RequirePermission(AppModule.STOCK_EXIT, 'view')
  @ApiOperation({ summary: 'Stok Çıkış Fişlerini Listele (Filtreleme & Sayfalama)' })
  @ApiResponse({ status: 200, type: StockExitsPaginatedResponseDto })
  async findAllExits(@Query() query: StockExitsQueryParams) {
    return this.stockExitsService.findAll(query);
  }

  @Get('exits/:id')
  @RequirePermission(AppModule.STOCK_EXIT, 'view')
  @ApiOperation({ summary: 'Çıkış Fişi Detayını, Kalemlerini ve Onay Adımlarını Getir' })
  @ApiResponse({ status: 200, type: StockExitResponseDto })
  async findOneExit(@Param('id') id: string) {
    return this.stockExitsService.findOne(id);
  }

  @Post('exits/:id/approve')
  @RequirePermission(AppModule.STOCK_EXIT, 'edit')
  @ApiOperation({ summary: 'Çıkış Fişini Onayla (Sıralı Onay Mekanizması)' })
  @ApiResponse({ status: 200, type: StockExitResponseDto })
  async approveExit(
    @Param('id') id: string,
    @Body() dto: ApproveStockExitDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.stockExitsService.approve(id, dto, user);
  }

  @Post('exits/:id/reject')
  @RequirePermission(AppModule.STOCK_EXIT, 'edit')
  @ApiOperation({ summary: 'Çıkış Fişini Reddet (Serileri Serbest Bırakır)' })
  @ApiResponse({ status: 200, type: StockExitResponseDto })
  async rejectExit(
    @Param('id') id: string,
    @Body() dto: RejectStockExitDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.stockExitsService.reject(id, dto, user);
  }

  @Post('exits/:id/ship')
  @RequirePermission(AppModule.STOCK_EXIT, 'edit')
  @ApiOperation({ summary: 'Sevkiyatı Tamamla / Sevk Et (Fiziksel Stok Düşüşü)' })
  @ApiResponse({ status: 200, type: StockExitResponseDto })
  async shipExit(
    @Param('id') id: string,
    @Body() dto: ShipStockExitDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.stockExitsService.ship(id, dto, user);
  }

  @Patch('exits/:id/shipping')
  @RequirePermission(AppModule.STOCK_EXIT, 'edit')
  @ApiOperation({ summary: 'Kargo / Taşıyıcı ve Takip Numarası Bilgilerini Güncelle (1 gün sonra geldiğinde)' })
  @ApiResponse({ status: 200, type: StockExitResponseDto })
  async updateExitShipping(
    @Param('id') id: string,
    @Body() dto: UpdateStockExitShippingDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.stockExitsService.updateShipping(id, dto, user);
  }

  @Post('exits/:id/cancel')
  @RequirePermission(AppModule.STOCK_EXIT, 'edit')
  @ApiOperation({ summary: 'Çıkış Fişini İptal Et (Ters Hareket & Gerekçe İle)' })
  @ApiResponse({ status: 200, type: StockExitResponseDto })
  async cancelExit(
    @Param('id') id: string,
    @Body() dto: CancelStockExitDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.stockExitsService.cancel(id, dto, user);
  }

  /* ================= RMA / ARIZA YÖNETİMİ ================= */

  @Post('faults')
  @RequirePermission(AppModule.FAULTS, 'create')
  @ApiOperation({ summary: 'Yeni Arıza / RMA Kaydı Oluştur' })
  @ApiResponse({ status: 201, type: FaultRecordResponseDto })
  async createFault(
    @Body() dto: CreateFaultRecordDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.faultsService.create(dto, user);
  }

  @Get('faults')
  @RequirePermission(AppModule.FAULTS, 'view')
  @ApiOperation({ summary: 'Arıza Kayıtlarını Listele (Filtreleme & Sayfalama)' })
  @ApiResponse({ status: 200, type: FaultsPaginatedResponseDto })
  async findAllFaults(@Query() query: FaultsQueryParams) {
    return this.faultsService.findAll(query);
  }

  @Get('faults/:id')
  @RequirePermission(AppModule.FAULTS, 'view')
  @ApiOperation({ summary: 'Arıza Kaydı Detayı' })
  @ApiResponse({ status: 200, type: FaultRecordResponseDto })
  async findOneFault(@Param('id') id: string) {
    return this.faultsService.findOne(id);
  }

  @Patch('faults/:id/status')
  @RequirePermission(AppModule.FAULTS, 'edit')
  @ApiOperation({ summary: 'Arıza Statüsü ve Teknisyen Notu Güncelle' })
  @ApiResponse({ status: 200, type: FaultRecordResponseDto })
  async updateFaultStatus(
    @Param('id') id: string,
    @Body() dto: UpdateFaultStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.faultsService.updateStatus(id, dto, user);
  }

  @Get('faults/:id/pdf')
  @RequirePermission(AppModule.FAULTS, 'view')
  @ApiOperation({ summary: 'Servis Kabul / Arıza Fişi PDF İndir' })
  async getFaultPdf(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { buffer, faultNumber } = await this.faultsService.getPdfBuffer(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="Servis_Fisi_${faultNumber}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  /* ================= STOK RAPORLARI & YAŞAM DÖNGÜSÜ ================= */

  @Get('reports/warehouse-stock')
  @RequirePermission(AppModule.STOCK_VIEW, 'view')
  @ApiOperation({ summary: 'Depo Bazlı Stok Durumu Raporu' })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  @ApiResponse({ status: 200, type: [WarehouseStockReportItemDto] })
  async getWarehouseStockReport(@Query('warehouseId') warehouseId?: string) {
    return this.stockReportsService.getWarehouseStock(warehouseId);
  }

  @Get('reports/critical-stock')
  @RequirePermission(AppModule.STOCK_VIEW, 'view')
  @ApiOperation({ summary: 'Kritik Stok Seviyesi Raporu' })
  @ApiResponse({ status: 200, type: [WarehouseStockReportItemDto] })
  async getCriticalStockReport() {
    return this.stockReportsService.getCriticalStock();
  }

  @Get('reports/serial-timeline')
  @RequirePermission(AppModule.STOCK_VIEW, 'view')
  @ApiOperation({ summary: 'Seri Numarası Yaşam Döngüsü & Zaman Tüneli' })
  @ApiQuery({ name: 'query', required: true, type: String, description: 'Seri Numarası veya MAC' })
  @ApiResponse({ status: 200, type: SerialTimelineResponseDto })
  async getSerialTimeline(@Query('query') query: string) {
    return this.stockReportsService.getSerialTimeline(query);
  }

  @Get('reports/warranty')
  @RequirePermission(AppModule.STOCK_VIEW, 'view')
  @ApiOperation({ summary: 'Garanti Takip Raporu (Müşteri & Tedarikçi)' })
  @ApiQuery({ name: 'type', required: false, enum: ['CUSTOMER', 'SUPPLIER'] })
  @ApiQuery({ name: 'daysLeft', required: false, type: Number })
  @ApiResponse({ status: 200, type: [WarrantyReportItemDto] })
  async getWarrantyReport(
    @Query('type') type?: 'CUSTOMER' | 'SUPPLIER',
    @Query('daysLeft') daysLeft?: number,
  ) {
    return this.stockReportsService.getWarrantyReport(type, daysLeft ? Number(daysLeft) : 30);
  }

  @Get('reports/movements')
  @RequirePermission(AppModule.STOCK_VIEW, 'view')
  @ApiOperation({ summary: 'Stok Hareket Defteri (Giriş / Çıkış Tarihçesi)' })
  @ApiResponse({ status: 200, type: [StockMovementReportItemDto] })
  async getStockMovements(@Query() query: StockMovementReportQueryParams) {
    return this.stockReportsService.getStockMovements(query);
  }

  @Get('reports/supplier-entries')
  @RequirePermission(AppModule.STOCK_VIEW, 'view')
  @ApiOperation({ summary: 'Tedarikçi Bazlı Mal Kabul Raporu' })
  @ApiResponse({ status: 200, type: [SupplierEntriesReportItemDto] })
  async getSupplierEntriesReport() {
    return this.stockReportsService.getSupplierEntriesReport();
  }

  @Get('reports/customer-exits')
  @RequirePermission(AppModule.STOCK_VIEW, 'view')
  @ApiOperation({ summary: 'Müşteri Bazlı Sevkiyat Raporu' })
  @ApiResponse({ status: 200, type: [CustomerExitsReportItemDto] })
  async getCustomerExitsReport() {
    return this.stockReportsService.getCustomerExitsReport();
  }

  @Get('reports/fault-statistics')
  @RequirePermission(AppModule.STOCK_VIEW, 'view')
  @ApiOperation({ summary: 'Arıza & RMA İstatistikleri Raporu' })
  @ApiResponse({ status: 200, type: FaultStatisticsReportDto })
  async getFaultStatisticsReport() {
    return this.stockReportsService.getFaultStatistics();
  }

  @Get('reports/export/:reportType')
  @RequirePermission(AppModule.STOCK_VIEW, 'view')
  @ApiOperation({ summary: 'Stok Raporlarını Excel Olarak İndir (.xlsx)' })
  async exportStockReport(
    @Param('reportType') reportType: string,
    @Query() query: any,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.stockReportsService.exportToExcel(reportType, query);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  /* ================= SEVKİYAT SIRALI ONAY AKIŞI AYARLARI ================= */

  @Get('approval-settings')
  @RequirePermission(AppModule.STOCK_EXIT, 'view')
  @ApiOperation({ summary: 'Sıralı Onay Akışı Adımlarını Listele' })
  @ApiResponse({ status: 200, type: [ApprovalSettingResponseDto] })
  async getApprovalSettings() {
    return this.approvalSettingsService.findAll();
  }

  @Post('approval-settings')
  @RequirePermission(AppModule.STOCK_EXIT, 'edit')
  @ApiOperation({ summary: 'Yeni Onay Adımı Ekle' })
  @ApiResponse({ status: 201, type: ApprovalSettingResponseDto })
  async createApprovalSetting(
    @Body() dto: CreateApprovalSettingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.approvalSettingsService.create(dto, user);
  }

  @Put('approval-settings/:id')
  @RequirePermission(AppModule.STOCK_EXIT, 'edit')
  @ApiOperation({ summary: 'Onay Adımını Güncelle' })
  @ApiResponse({ status: 200, type: ApprovalSettingResponseDto })
  async updateApprovalSetting(
    @Param('id') id: string,
    @Body() dto: UpdateApprovalSettingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.approvalSettingsService.update(id, dto, user);
  }

  @Delete('approval-settings/:id')
  @RequirePermission(AppModule.STOCK_EXIT, 'edit')
  @ApiOperation({ summary: 'Onay Adımını Sil' })
  async removeApprovalSetting(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.approvalSettingsService.remove(id, user);
  }
}
