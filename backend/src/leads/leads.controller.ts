import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { LeadsService } from './leads.service';
import {
  CreateLeadDto,
  UpdateLeadDto,
  QuickActionLeadDto,
  LeadQueryDto,
  LeadDto,
  PaginatedLeadResponseDto,
  DistributionStrategy,
  ImportExcelResultDto,
  ManualSplitItemDto,
} from './dto/lead.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/crm.enums';

@ApiTags('Leads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @ApiOperation({ summary: 'Yeni potansiyel müşteri (Lead) oluştur' })
  @ApiResponse({ status: 201, type: LeadDto })
  async create(
    @Body() createLeadDto: CreateLeadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leadsService.create(createLeadDto, user);
  }

  @Get()
  @ApiOperation({
    summary: 'Lead listesini getir (TanStack Table v8 server-side filtreleme ve sayfalama destekli)',
    description: 'SALES_REP sadece kendine ait/atanmış leadleri görür, SALES_MANAGER tüm leadleri görür.',
  })
  @ApiResponse({ status: 200, type: PaginatedLeadResponseDto })
  async findAll(
    @Query() query: LeadQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leadsService.findAll(query, user);
  }

  @Get('excel-template')
  @Roles(Role.SALES_MANAGER, Role.SALES_REP)
  @ApiOperation({ summary: 'Excel toplu lead yükleme taslağını (.xlsx) indir' })
  @ApiResponse({ status: 200, description: 'Örnek Excel şablon dosyası' })
  async downloadExcelTemplate(@Res() res: Response) {
    const buffer = await this.leadsService.generateExcelTemplate();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="lead_yukleme_taslagi.xlsx"',
    );
    res.send(buffer);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lead detayını getir' })
  @ApiResponse({ status: 200, type: LeadDto })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leadsService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Lead bilgilerini ve durumunu güncelle' })
  @ApiResponse({ status: 200, type: LeadDto })
  async update(
    @Param('id') id: string,
    @Body() updateLeadDto: UpdateLeadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leadsService.update(id, updateLeadDto, user);
  }

  @Post(':id/quick-action')
  @ApiOperation({
    summary: 'Lead için Hızlı İşlem Kaydet (Durum günceller, not ve timeline kaydı oluşturur)',
  })
  @ApiResponse({ status: 200, type: LeadDto })
  async quickAction(
    @Param('id') id: string,
    @Body() dto: QuickActionLeadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leadsService.quickAction(id, dto, user);
  }

  @Post('import-excel')
  @Roles(Role.SALES_MANAGER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Excel ile toplu Lead yükle ve temsilcilere dağıt (Yalnızca Satış Müdürü)',
    description: 'ROUND_ROBIN (eşit sırayla dağıt) veya MANUAL_SPLIT (özel kotalarla dağıt). Atanan temsilcilere anında socket.io üzerinden new_leads_assigned bildirimi gider.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Yüklenecek .xlsx Excel dosyası (Sütunlar: Firma, Yetkili, Telefon, E-posta, Kaynak, Not)',
        },
        strategy: {
          type: 'string',
          enum: ['ROUND_ROBIN', 'MANUAL_SPLIT'],
          default: 'ROUND_ROBIN',
        },
        repIds: {
          type: 'string',
          description: 'ROUND_ROBIN için temsilci ID listesi (Virgülle ayrılmış veya JSON array: ["uuid1","uuid2"])',
        },
        manualSplit: {
          type: 'string',
          description: 'MANUAL_SPLIT için kota JSON string formatı: [{"repId":"uuid","count":10}]',
        },
      },
    },
  })
  @ApiResponse({ status: 200, type: ImportExcelResultDto })
  async importExcel(
    @UploadedFile() file: Express.Multer.File,
    @Body('strategy') strategy: DistributionStrategy = DistributionStrategy.ROUND_ROBIN,
    @Body('repIds') repIdsRaw?: string,
    @Body('manualSplit') manualSplitRaw?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ImportExcelResultDto> {
    if (!file) {
      throw new BadRequestException('Lütfen bir Excel dosyası (.xlsx) yükleyin.');
    }

    let repIds: string[] | undefined;
    if (repIdsRaw) {
      try {
        repIds = typeof repIdsRaw === 'string' && repIdsRaw.startsWith('[') ? JSON.parse(repIdsRaw) : repIdsRaw.split(',').map((s) => s.trim());
      } catch {
        repIds = undefined;
      }
    }

    let manualSplit: ManualSplitItemDto[] | undefined;
    if (manualSplitRaw) {
      try {
        manualSplit = typeof manualSplitRaw === 'string' ? JSON.parse(manualSplitRaw) : manualSplitRaw;
      } catch {
        manualSplit = undefined;
      }
    }

    return this.leadsService.importExcel(
      file.buffer,
      strategy || DistributionStrategy.ROUND_ROBIN,
      repIds,
      manualSplit,
      user!,
    );
  }
}
