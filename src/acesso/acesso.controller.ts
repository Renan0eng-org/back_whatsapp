import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Menu } from 'src/auth/menu.decorator';
import { RefreshTokenGuard } from 'src/auth/refresh-token.guard';
import { AcessoService } from './acesso.service';
import { CreateMenuAcessoDto, CreateNivelAcessoDto, UpdateMenuAcessoDto, UpdateNivelAcessoDto, UpdateNivelMenusDto, UpdateUserNivelDto } from './dto/acesso.dto';
import { UpdateUserStatusDto } from './dto/update-user.dto';

@Controller('admin/acesso')
@Menu('acesso')
export class AcessoController {
    constructor(private readonly acessoService: AcessoService) { }

    @Get('niveis')
    @UseGuards(RefreshTokenGuard)
    findNiveis(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
        const p = page ? parseInt(page, 10) : undefined;
        const ps = pageSize ? parseInt(pageSize, 10) : undefined;
        return this.acessoService.findNiveisComMenus(p || ps ? { page: p, pageSize: ps } : undefined as any);
    }

    @Post('niveis')
    @UseGuards(RefreshTokenGuard)
    createNivel(@Body() data: CreateNivelAcessoDto) {
        return this.acessoService.createNivel(data);
    }

    @Put('niveis/:id')
    @UseGuards(RefreshTokenGuard)
    updateNivel(@Param('id', ParseIntPipe) id: number, @Body() data: UpdateNivelAcessoDto) {
        return this.acessoService.updateNivel(id, data);
    }

    @Delete('niveis/:id')
    @UseGuards(RefreshTokenGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    deleteNivel(@Param('id', ParseIntPipe) id: number) {
        return this.acessoService.deleteNivel(id);
    }

    @Put('niveis/:id/menus')
    @UseGuards(RefreshTokenGuard)
    updateNivelMenus(
        @Param('id', ParseIntPipe) id: number,
        @Body() data: UpdateNivelMenusDto, 
    ) {
        return this.acessoService.updateNivelMenus(id, data.menuIds);
    }

    @Get('menus')
    @UseGuards(RefreshTokenGuard)
    findMenus(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
        const p = page ? parseInt(page, 10) : undefined;
        const ps = pageSize ? parseInt(pageSize, 10) : undefined;
        return this.acessoService.findMenus(p || ps ? { page: p, pageSize: ps } : undefined as any);
    }

    @Post('menus')
    @UseGuards(RefreshTokenGuard)
    createMenu(@Body() data: CreateMenuAcessoDto) {
        return this.acessoService.createMenu(data);
    }

    @Put('menus/:id')
    @UseGuards(RefreshTokenGuard)
    updateMenu(@Param('id', ParseIntPipe) id: number, @Body() data: UpdateMenuAcessoDto) {
        return this.acessoService.updateMenu(id, data);
    }

    @Delete('menus/:id')
    @UseGuards(RefreshTokenGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    deleteMenu(@Param('id', ParseIntPipe) id: number) {
        return this.acessoService.deleteMenu(id);
    }

    @Get('users')
    @UseGuards(RefreshTokenGuard)
    findUsers(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
        const p = page ? parseInt(page, 10) : undefined;
        const ps = pageSize ? parseInt(pageSize, 10) : undefined;
        return this.acessoService.findUsers(p || ps ? { page: p, pageSize: ps } : undefined as any);
    }

    @Patch('users/:id/nivel')
    @UseGuards(RefreshTokenGuard)
    updateUserNivel(
        @Param('id') id: string,
        @Body() data: UpdateUserNivelDto,
    ) {
        return this.acessoService.updateUserNivel(id, data.nivelAcessoId);
    }

    @Patch('users/:id/status')
    @UseGuards(RefreshTokenGuard)
    @Menu('ativacao-usuarios')
    updateUserStatus(
        @Param('id') id: string,
        @Body() data: UpdateUserStatusDto, 
    ) {
        return this.acessoService.updateUserStatus(id, data.active);
    }
}