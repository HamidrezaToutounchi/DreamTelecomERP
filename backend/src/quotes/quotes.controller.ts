import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiProduces } from '@nestjs/swagger';
import { Response } from 'express';
import { QuotesService } from './quotes.service';
import {
  CreateQuoteDto,
  UpdateQuoteStatusDto,
  ReviseQuoteDto,
  QuoteQueryDto,
  QuoteDto,
  PaginatedQuoteResponseDto,
} from './dto/quote.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('Quotes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post()
  @ApiOperation({ summary: 'Yeni Teklif oluştur (Kalemleri ve otomatik hesaplanan toplamları ile)' })
  @ApiResponse({ status: 201, type: QuoteDto })
  async create(
    @Body() createQuoteDto: CreateQuoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.quotesService.create(createQuoteDto, user);
  }

  @Get()
  @ApiOperation({
    summary: 'Teklifleri listele (TanStack Table v8 server-side filtreleme ve sayfalama)',
    description: 'SALES_REP sadece kendi tekliflerini görür, SALES_MANAGER tüm teklifleri görür.',
  })
  @ApiResponse({ status: 200, type: PaginatedQuoteResponseDto })
  async findAll(
    @Query() query: QuoteQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.quotesService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Teklif detayını getir (Kalemler, müşteri, revizyon geçmişi ile)' })
  @ApiResponse({ status: 200, type: QuoteDto })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.quotesService.findOne(id, user);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Teklif durumunu güncelle (SENT, APPROVED, REJECTED)' })
  @ApiResponse({ status: 200, type: QuoteDto })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateQuoteStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.quotesService.updateStatus(id, updateStatusDto, user);
  }

  @Post(':id/revise')
  @ApiOperation({
    summary: 'Teklifi revize et (Eski teklifi REVISED yapar, yeni versiyon kopyasını DRAFT olarak oluşturur)',
  })
  @ApiResponse({ status: 201, type: QuoteDto })
  async revise(
    @Param('id') id: string,
    @Body() reviseDto: ReviseQuoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.quotesService.revise(id, reviseDto, user);
  }

  @Public()
  @Get(':id/pdf')
  @ApiOperation({
    summary: 'Dream Telecom kurumsal teklif PDF dosyasını indir/stream et',
    description: 'Kurumsal mavi (#004A93), ürün kalemleri, fiyatlar ve toplamları içeren resmi teklif PDFi.',
  })
  @ApiProduces('application/pdf')
  @ApiResponse({
    status: 200,
    description: 'PDF binary stream',
    schema: {
      type: 'string',
      format: 'binary',
    },
  })
  async getPdf(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const { buffer, quoteNumber } = await this.quotesService.getPdfBuffer(id, user);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="Teklif_${quoteNumber}.pdf"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }
}
