import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(identifier: string, password: string) {
    const user = await this.usersService.findByIdentifier(identifier);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = await this.jwtService.signAsync({
      sub: user.id,
      role: user.role,
      investorId: user.investorId,
    });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        investorId: user.investorId,
      },
    };
  }
}
