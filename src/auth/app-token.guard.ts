import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Request, Response } from 'express'
import { AuthService } from './auth.service'

@Injectable()
export class AppTokenGuard implements CanActivate {
    constructor(
        private jwtService: JwtService,
        private authService: AuthService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request & { user?: any }>()
        const response = context.switchToHttp().getResponse<Response>()

        let token: string | undefined

        token = request.cookies?.['refresh_token']

        if (!token && request.headers.authorization?.startsWith('Bearer ')) {
            token = request.headers.authorization.split(' ')[1]
        }

        if (!token) throw new UnauthorizedException('Token não encontrado.')

        try {
            const payload = await this.jwtService.verifyAsync(token, {
                secret: process.env.JWT_REFRESH_SECRET,
            })

            const user = await this.authService.findUserById(payload.sub)
            if (!user || !user.active)
                throw new UnauthorizedException('Usuário inválido ou inativo.')

            request.user = user
            request['refreshTokenPayload'] = payload
            return true
        } catch {
            response.clearCookie('refresh_token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path: '/',
            })
            throw new UnauthorizedException('Refresh token inválido ou expirado.')
        }
    }
}
