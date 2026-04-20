import { IsEmail, IsString, MinLength } from 'class-validator';
import { Prisma } from '@prisma/client';

export class RegisterUserDto implements Pick<Prisma.UserCreateInput, 'email' | 'password' | 'name' | 'cpf'> {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(6)
    password: string;

    @IsString()
    name: string;

    @IsString()
    cpf: string;
}
