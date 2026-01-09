import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Prisma } from 'generated/prisma';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService
    ) { }

    async cryptPassword(password: string): Promise<string> {
        return bcrypt.hash(password, 10);
    }

    async createUser(data: Prisma.UserCreateInput) {
        const user = await this.prisma.user.create({
            data: ({
                ...(data as any),
                password: await this.cryptPassword(data.password),
            } as any),
        });
        return user;
    }

    async findUserById(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { idUser: id, active: true },
            include: {
                nivel_acesso: {
                    include: {
                        menus: true,
                    }
                }
            }
        });
        if (!user) throw new UnauthorizedException('Usuário não encontrado');

        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }

    async validateUserWeb(email: string, password: string) {
        const user = await this.prisma.user.findUnique({
            where: {
                email
            }
        });

        if (!user) throw new UnauthorizedException('Email ou senha inválidos');

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) throw new UnauthorizedException('Email ou senha inválidos');

        const isActive = user.active;
        if (!isActive) throw new UnauthorizedException('Usuário inativo');

        const { password: _, ...userWithoutPassword } = user;

        return userWithoutPassword;
    }

    async validateUser(email: string, password: string) {
        const user = await this.prisma.user.findUnique({
            where: {
                email,
            }
        });

        if (!user) throw new UnauthorizedException('Email ou senha inválidos');

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) throw new UnauthorizedException('Email ou senha inválidos');

        const isActive = user.active;
        if (!isActive) throw new UnauthorizedException('Usuário inativo');

        const { password: _, ...userWithoutPassword } = user;

        return userWithoutPassword;
    }

    async login(user: { idUser: string; email: string }) {
        const payload = { sub: user.idUser, email: user.email };
        return this.jwtService.sign(payload)
    }

    async loginWeb(userPayload: { idUser: string; email: string }) {
        const payload = { email: userPayload.email, sub: userPayload.idUser };

        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: process.env.JWT_ACCESS_SECRET,
                expiresIn: '15m',
            }),

            this.jwtService.signAsync(payload, {
                secret: process.env.JWT_REFRESH_SECRET,
                expiresIn: '7d',
            }),
        ]);

        return {
            accessToken,
            refreshToken,
        };
    }

    async validateToken(
        token: string,
        options: { type?: 'access' | 'refresh' | 'any' } = {},
    ) {
        const { type = 'any' } = options;
        const defaultSecret = process.env.JWT_SECRET || 'SECRET_KEY';

        const secretsToTry: string[] = [];
        const pushSecret = (secret?: string) => {
            if (!secret) return;
            if (!secretsToTry.includes(secret)) {
                secretsToTry.push(secret);
            }
        };

        if (type === 'access' || type === 'any') {
            pushSecret(process.env.JWT_ACCESS_SECRET);
        }

        if (type === 'refresh' || type === 'any') {
            pushSecret(process.env.JWT_REFRESH_SECRET);
        }

        if (type !== 'refresh') {
            // Tokens gerados pelo login clássico usam o secret padrão do módulo JWT.
            pushSecret(defaultSecret);
        }

        if (!secretsToTry.length) {
            pushSecret(defaultSecret);
        }

        for (const secret of secretsToTry) {
            try {
                const decoded = this.jwtService.verify(token, {
                    secret,
                    ignoreExpiration: false,
                });
                return { valid: true, dataToken: decoded };
            } catch (e: any) {
                if (e?.name === 'TokenExpiredError') {
                    throw new UnauthorizedException('Token expirado');
                }

                // Se estivermos validando explicitamente um refresh token, não devemos
                // tentar outros segredos além do configurado; nesse caso propaga o erro.
                if (type === 'refresh') {
                    throw new UnauthorizedException('Token inválido');
                }
            }
        }

        throw new UnauthorizedException('Token inválido');
    }


    async refreshToken(token: string) {
        try {
            const dataToken = this.jwtService.verify(token, {
                secret: process.env.JWT_REFRESH_SECRET,
                ignoreExpiration: false,
            });

            const user = await this.findUserById(dataToken.sub);
            if (!user) {
                throw new UnauthorizedException('Usuário não encontrado');
            }

            const payload = { email: user.email, sub: user.idUser };

            const [accessToken, refreshToken] = await Promise.all([
                this.jwtService.signAsync(payload, {
                    secret: process.env.JWT_ACCESS_SECRET,
                    expiresIn: '15m',
                }),
                this.jwtService.signAsync(payload, {
                    secret: process.env.JWT_REFRESH_SECRET,
                    expiresIn: '7d',
                }),
            ]);

            return { accessToken, refreshToken };
        } catch (e: any) {
            if (e?.name === 'TokenExpiredError') {
                throw new UnauthorizedException('Sessão expirada. Faça login novamente.');
            }
            throw new UnauthorizedException('Token inválido');
        }
    }

    async updateUser(id: string, data: Partial<{
        name: string;
        birthDate?: string | Date;
        cpf: string;
        sexo?: string;
        unidadeSaude?: string;
        medicamentos?: string;
        exames?: boolean;
        examesDetalhes?: string;
        alergias?: string;
        phone?: string;
        cep?: string;
        avatar?: string;
    }>) {
        const updateData: any = {};
        if (data.name) updateData.name = data.name;
        if (data.birthDate) updateData.birthDate = new Date(data.birthDate as any);
        if (typeof data.cpf !== 'undefined') updateData.cpf = data.cpf;
        if (typeof data.sexo !== 'undefined') updateData.sexo = data.sexo;
        if (typeof data.unidadeSaude !== 'undefined') updateData.unidadeSaude = data.unidadeSaude;
        if (typeof data.medicamentos !== 'undefined') updateData.medicamentos = data.medicamentos;
        if (typeof data.exames !== 'undefined') updateData.exames = data.exames;
        if (typeof data.examesDetalhes !== 'undefined') updateData.examesDetalhes = data.examesDetalhes;
        if (typeof data.alergias !== 'undefined') updateData.alergias = data.alergias;
        if (typeof data.phone !== 'undefined') updateData.phone = data.phone;
        if (typeof data.cep !== 'undefined') updateData.cep = data.cep;
        if (typeof data.avatar !== 'undefined') updateData.avatar = data.avatar;

        const user = await this.prisma.user.update({
            where: { idUser: id },
            data: updateData,
        });

        const { password, ...rest } = user as any;
        return rest;
    }
}
