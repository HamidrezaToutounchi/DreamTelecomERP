import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import * as path from 'path';

import { PrismaModule } from './prisma/prisma.module';
import { EventsModule } from './events/events.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { LeadsModule } from './leads/leads.module';
import { CustomersModule } from './customers/customers.module';
import { InteractionsModule } from './interactions/interactions.module';
import { QuotesModule } from './quotes/quotes.module';
import { SalesModule } from './sales/sales.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { UploadsModule } from './uploads/uploads.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { CompaniesModule } from './companies/companies.module';
import { PermissionsModule } from './common/services/permissions.module';
import { RolesModule } from './roles/roles.module';
import { BarcodeModule } from './common/barcode/barcode.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { StockModule } from './stock/stock.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ServeStaticModule.forRoot({
      rootPath: path.join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    PermissionsModule,
    BarcodeModule,
    AuditLogsModule,
    EventsModule,
    AuthModule,
    UsersModule,
    RolesModule,
    LeadsModule,
    CustomersModule,
    InteractionsModule,
    QuotesModule,
    SalesModule,
    AnalyticsModule,
    UploadsModule,
    CategoriesModule,
    ProductsModule,
    CompaniesModule,
    WarehousesModule,
    SuppliersModule,
    StockModule,
  ],
})
export class AppModule {}
