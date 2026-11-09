import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCustomerCategoryDto {
  @ApiProperty({ example: 'Telekom Operatörü' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Büyük ölçekli omurga ve altyapı operatörleri' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: '#004A93', default: '#004A93' })
  @IsString()
  @IsOptional()
  color?: string = '#004A93';
}

export class CustomerCategoryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  color: string;

  @ApiPropertyOptional()
  _count?: {
    customers: number;
  };

  @ApiProperty()
  createdAt: Date;
}
