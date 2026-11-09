import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { ExchangeRateService } from '../common/services/exchange-rate.service';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, ExchangeRateService],
  exports: [AnalyticsService, ExchangeRateService],
})
export class AnalyticsModule {}
