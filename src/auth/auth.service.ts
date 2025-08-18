import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

interface User {
  id: number;
  login: string;
  passwordHash: string;
  role: string;
}

interface LoginDto {
  login: string;
  password: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  private users: User[] = [
    {
      id: 1,
      login: 'bobby',
      passwordHash:
        '$2b$10$a3NAdxhCaPnveKGu8AHxweG4WsLEpGN36UmKN7w3rcfgR/CGVnulC',
      role: 'admin',
    },
  ];

  async login(
    loginDto: LoginDto,
  ): Promise<{ token: string; userRole: string }> {
    const { login, password } = loginDto;
    const user = this.users.find((u) => u.login === login);

    if (!user) {
      throw new UnauthorizedException('Неверный логин или пароль');
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Неверный логин или пароль');
    }

    const payload = { sub: user.id, role: user.role };
    const token = this.jwtService.sign(payload);

    return {
      token,
      userRole: user.role,
    };
  }

  async validateUserById(userId: number) {
    const user = this.users.find((u) => u.id === userId);
    if (!user) {
      return null;
    }
    const { passwordHash, ...result } = user;
    return result;
  }
}
