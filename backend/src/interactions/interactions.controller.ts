import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InteractionsService } from './interactions.service';
import {
  CreateInteractionDto,
  UpdateInteractionDto,
  InteractionQueryDto,
  InteractionDto,
  PaginatedInteractionResponseDto,
} from './dto/interaction.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('Interactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('interactions')
export class InteractionsController {
  constructor(private readonly interactionsService: InteractionsService) {}

  @Post()
  @ApiOperation({ summary: 'Yeni Görüşme/Etkileşim Kaydı Ekle (Müşteri veya Lead ile temas)' })
  @ApiResponse({ status: 201, type: InteractionDto })
  async create(
    @Body() createInteractionDto: CreateInteractionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.interactionsService.create(createInteractionDto, user);
  }

  @Get('upcoming-followups')
  @ApiOperation({ summary: 'Yaklaşan ve geciken sonraki takip / arama bildirimlerini getirir' })
  @ApiResponse({ status: 200 })
  async getUpcomingFollowUps(@CurrentUser() user: AuthenticatedUser) {
    return this.interactionsService.getUpcomingFollowUps(user);
  }

  @Get()
  @ApiOperation({
    summary: 'Görüşme kayıtlarını listele (TanStack Table v8 server-side filtreleme ve sayfalama)',
  })
  @ApiResponse({ status: 200, type: PaginatedInteractionResponseDto })
  async findAll(
    @Query() query: InteractionQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.interactionsService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Görüşme kaydı detayını getir' })
  @ApiResponse({ status: 200, type: InteractionDto })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.interactionsService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Görüşme kaydını güncelle' })
  @ApiResponse({ status: 200, type: InteractionDto })
  async update(
    @Param('id') id: string,
    @Body() updateInteractionDto: UpdateInteractionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.interactionsService.update(id, updateInteractionDto, user);
  }
}
