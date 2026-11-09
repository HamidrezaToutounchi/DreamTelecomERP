import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, LoginResponseDto, UpdateProfileDto, UserProfileDto } from './dto/auth.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private auditLogsService: AuditLogsService,
  ) {}

  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Geçersiz e-posta veya parola.');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Geçersiz e-posta veya parola.');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    await this.auditLogsService.log({
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
      userRole: user.role,
      action: 'LOGIN',
      entity: 'AUTH',
      entityId: user.id,
      details: `"${user.fullName}" (${user.email}) sisteme başarılı giriş yaptı.`,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    };
  }

  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Kullanıcı bulunamadı.');
    }

    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }

    const updateData: any = {};

    if (dto.fullName) {
      updateData.fullName = dto.fullName.trim();
    }

    if (dto.phone !== undefined) {
      updateData.phone = dto.phone ? dto.phone.trim() : null;
    }

    if (dto.email && dto.email !== user.email) {
      const emailTrimmed = dto.email.trim().toLowerCase();
      const existing = await this.prisma.user.findUnique({
        where: { email: emailTrimmed },
      });
      if (existing && existing.id !== userId) {
        throw new ConflictException('Bu e-posta adresi sistemde başka bir kullanıcı tarafından kullanılıyor.');
      }
      updateData.email = emailTrimmed;
    }

    if (dto.newPassword) {
      if (!dto.currentPassword) {
        throw new BadRequestException('Parolanızı değiştirmek için mevcut parolanızı girmelisiniz.');
      }
      const isCurrentValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
      if (!isCurrentValid) {
        throw new BadRequestException('Mevcut parolanız hatalı.');
      }
      updateData.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    await this.auditLogsService.log({
      userId: user.id,
      userName: updatedUser.fullName,
      userEmail: updatedUser.email,
      userRole: updatedUser.role,
      action: 'UPDATE',
      entity: 'USER',
      entityId: user.id,
      details: `"${updatedUser.fullName}" kullanıcısı profil bilgilerini güncelledi.`,
    });

    return updatedUser;
  }
}

