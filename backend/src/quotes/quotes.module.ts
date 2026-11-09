import { Module } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { QuotesController } from './quotes.controller';
import { PdfService } from './pdf.service';

@Module({
  controllers: [QuotesController],
  providers: [QuotesService, PdfService],
  exports: [QuotesService, PdfService],
})
export class QuotesModule {}
