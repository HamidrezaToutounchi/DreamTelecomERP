import { Module, Global } from '@nestjs/common';
import { BarcodeService } from './barcode.service';

@Global()
@Module({
  providers: [BarcodeService],
  exports: [BarcodeService],
})
export class BarcodeModule {}
