-- CreateEnum
CREATE TYPE "public"."EnumUserType" AS ENUM ('ADMIN', 'USUARIO');

-- CreateTable
CREATE TABLE "public"."User" (
    "idUser" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "phone" TEXT,
    "avatar" TEXT,
    "user_id_create" TEXT,
    "user_id_update" TEXT,
    "user_id_delete" TEXT,
    "dt_delete" TIMESTAMP(3),
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT false,
    "nivelAcessoId" INTEGER NOT NULL DEFAULT 1,
    "type" "public"."EnumUserType" NOT NULL DEFAULT 'USUARIO',

    CONSTRAINT "User_pkey" PRIMARY KEY ("idUser")
);

-- CreateTable
CREATE TABLE "public"."Nivel_Acesso" (
    "idNivelAcesso" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,

    CONSTRAINT "Nivel_Acesso_pkey" PRIMARY KEY ("idNivelAcesso")
);

-- CreateTable
CREATE TABLE "public"."Menu_Acesso" (
    "idMenuAcesso" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "visualizar" BOOLEAN NOT NULL DEFAULT false,
    "criar" BOOLEAN NOT NULL DEFAULT false,
    "editar" BOOLEAN NOT NULL DEFAULT false,
    "excluir" BOOLEAN NOT NULL DEFAULT false,
    "relatorio" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Menu_Acesso_pkey" PRIMARY KEY ("idMenuAcesso")
);

-- CreateTable
CREATE TABLE "public"."ErrorLog" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "method" TEXT,
    "route" TEXT,
    "statusCode" INTEGER,
    "userId" TEXT,
    "userEmail" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "forwardedFor" TEXT,
    "seen" BOOLEAN NOT NULL DEFAULT false,
    "file" TEXT,
    "line" INTEGER,
    "column" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_Menu_AcessoToNivel_Acesso" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_Menu_AcessoToNivel_Acesso_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_cpf_key" ON "public"."User"("cpf");

-- CreateIndex
CREATE INDEX "User_idUser_idx" ON "public"."User"("idUser");

-- CreateIndex
CREATE INDEX "User_user_id_create_idx" ON "public"."User"("user_id_create");

-- CreateIndex
CREATE INDEX "User_user_id_update_idx" ON "public"."User"("user_id_update");

-- CreateIndex
CREATE INDEX "User_user_id_delete_idx" ON "public"."User"("user_id_delete");

-- CreateIndex
CREATE INDEX "Nivel_Acesso_idNivelAcesso_idx" ON "public"."Nivel_Acesso"("idNivelAcesso");

-- CreateIndex
CREATE INDEX "ErrorLog_createdAt_idx" ON "public"."ErrorLog"("createdAt");

-- CreateIndex
CREATE INDEX "_Menu_AcessoToNivel_Acesso_B_index" ON "public"."_Menu_AcessoToNivel_Acesso"("B");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_nivelAcessoId_fkey" FOREIGN KEY ("nivelAcessoId") REFERENCES "public"."Nivel_Acesso"("idNivelAcesso") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ErrorLog" ADD CONSTRAINT "ErrorLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("idUser") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_Menu_AcessoToNivel_Acesso" ADD CONSTRAINT "_Menu_AcessoToNivel_Acesso_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Menu_Acesso"("idMenuAcesso") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_Menu_AcessoToNivel_Acesso" ADD CONSTRAINT "_Menu_AcessoToNivel_Acesso_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Nivel_Acesso"("idNivelAcesso") ON DELETE CASCADE ON UPDATE CASCADE;
