import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ example: 45, description: 'Toplam kayıt sayısı' })
  totalRowCount: number;

  @ApiProperty({ example: 1, description: 'Mevcut sayfa numarası' })
  page: number;

  @ApiProperty({ example: 10, description: 'Sayfa başına düşen kayıt sayısı' })
  pageSize: number;

  @ApiProperty({ example: 5, description: 'Toplam sayfa sayısı' })
  totalPages: number;
}

export class PaginatedResponseDto<T> {
  @ApiProperty({ isArray: true, description: 'Sayfalanmış veri listesi' })
  data: T[];

  @ApiProperty({ type: PaginationMetaDto, description: 'Sayfalama meta bilgileri' })
  meta: PaginationMetaDto;
}
