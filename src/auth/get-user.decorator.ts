// src/auth/get-user.decorator.ts
import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { User } from 'generated/prisma';

/**
 * Cria um decorador de parâmetro personalizado chamado @GetUser.
 * Ele extrai o objeto 'user' que foi anexado à requisição pela
 * estratégia de autenticação (JwtStrategy) após a validação do token.
 */
export const GetUser = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): User => {
        const request = ctx.switchToHttp().getRequest<Request & { user?: User }>();

        if (!request.user) {
            throw new UnauthorizedException('Usuário não autenticado');
        }

        return request.user;
    },
);