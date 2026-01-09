import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { CreateMenuAcessoDto, CreateNivelAcessoDto, UpdateMenuAcessoDto, UpdateNivelAcessoDto } from './dto/acesso.dto';

@Injectable()
export class AcessoService {
    constructor(private prisma: PrismaService) { }

    async findNiveisComMenus(opts?: { page?: number; pageSize?: number }) {
        const where = {};
        if (!opts || (typeof opts.page === 'undefined' && typeof opts.pageSize === 'undefined')) {
            return this.prisma.nivel_Acesso.findMany({ include: { menus: true }, orderBy: { nome: 'asc' } });
        }

        const page = opts.page && opts.page > 0 ? opts.page : 1;
        const pageSize = opts.pageSize && opts.pageSize > 0 ? opts.pageSize : 20;

        const [total, data] = await Promise.all([
            this.prisma.nivel_Acesso.count({ where }),
            this.prisma.nivel_Acesso.findMany({ include: { menus: true }, orderBy: { nome: 'asc' }, skip: (page - 1) * pageSize, take: pageSize }),
        ]);

        return { total, page, pageSize, data };
    }

    createNivel(data: CreateNivelAcessoDto) {
        return this.prisma.nivel_Acesso.create({ data });
    }

    updateNivel(id: number, data: UpdateNivelAcessoDto) {
        return this.prisma.nivel_Acesso.update({
            where: { idNivelAcesso: id },
            data,
        });
    }

    deleteNivel(id: number) {
        return this.prisma.nivel_Acesso.delete({
            where: { idNivelAcesso: id },
        });
    }

    updateNivelMenus(nivelId: number, menuIds: number[]) {
        return this.prisma.nivel_Acesso.update({
            where: { idNivelAcesso: nivelId },
            data: {
                menus: {
                    set: menuIds.map(id => ({ idMenuAcesso: id })),
                },
            },
        });
    }

    async findMenus(opts?: { page?: number; pageSize?: number }) {
        const where = {};
        if (!opts || (typeof opts.page === 'undefined' && typeof opts.pageSize === 'undefined')) {
            return this.prisma.menu_Acesso.findMany({ orderBy: { nome: 'asc' } });
        }

        const page = opts.page && opts.page > 0 ? opts.page : 1;
        const pageSize = opts.pageSize && opts.pageSize > 0 ? opts.pageSize : 20;

        const [total, data] = await Promise.all([
            this.prisma.menu_Acesso.count({ where }),
            this.prisma.menu_Acesso.findMany({ orderBy: { nome: 'asc' }, skip: (page - 1) * pageSize, take: pageSize }),
        ]);

        return { total, page, pageSize, data };
    }

    createMenu(data: CreateMenuAcessoDto) {
        return this.prisma.menu_Acesso.create({ data });
    }

    updateMenu(id: number, data: UpdateMenuAcessoDto) {
        return this.prisma.menu_Acesso.update({
            where: { idMenuAcesso: id },
            data,
        });
    }

    deleteMenu(id: number) {
        return this.prisma.menu_Acesso.delete({
            where: { idMenuAcesso: id },
        });
    }

    async findUsers(opts?: { page?: number; pageSize?: number }) {
        const where: any = { type: { not: { in: ['ADMIN'] } }, dt_delete: null };
        const select = {
            idUser: true,
            name: true,
            email: true,
            avatar: true,
            active: true,
            type: true,
            nivelAcessoId: true,
            nivel_acesso: { select: { idNivelAcesso: true, nome: true } },
        };

        if (!opts || (typeof opts.page === 'undefined' && typeof opts.pageSize === 'undefined')) {
            return this.prisma.user.findMany({ select, where, orderBy: { name: 'asc' } });
        }

        const page = opts.page && opts.page > 0 ? opts.page : 1;
        const pageSize = opts.pageSize && opts.pageSize > 0 ? opts.pageSize : 20;

        const [total, data] = await Promise.all([
            this.prisma.user.count({ where }),
            this.prisma.user.findMany({ select, where, orderBy: { name: 'asc' }, skip: (page - 1) * pageSize, take: pageSize }),
        ]);

        return { total, page, pageSize, data };
    }

    async updateUserNivel(idUser: string, nivelAcessoId: number) {
        const user = await this.prisma.user.findUnique({
            where: { idUser },
        });
        if (!user) {
            throw new NotFoundException('Usuário não encontrado.');
        }

        const nivel = await this.prisma.nivel_Acesso.findUnique({
            where: { idNivelAcesso: nivelAcessoId },
        });
        if (!nivel) {
            throw new NotFoundException('Nível de acesso não encontrado.');
        }

        return this.prisma.user.update({
            where: { idUser },
            data: {
                nivelAcessoId: nivelAcessoId,
            },
            include: {
                nivel_acesso: true,
            },
        });
    }

    async updateUserStatus(idUser: string, active: boolean) {
        const user = await this.prisma.user.findUnique({
            where: { idUser },
        });
        if (!user) {
            throw new NotFoundException('Usuário não encontrado.');
        }

        return this.prisma.user.update({
            where: { idUser },
            data: {
                active: active,
            },
            select: { 
                idUser: true,
                active: true,
            }
        });
    }
}