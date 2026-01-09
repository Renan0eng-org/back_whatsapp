# Backend - Sistema de Autenticação e Controle de Níveis

API em NestJS com autenticação JWT, gerenciamento de usuários e controle de níveis de acesso.

## 📋 Requisitos

- Node.js 18+
- PostgreSQL 12+
- npm ou yarn

## 🚀 Instalação

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env

# Executar migrações do banco de dados
npm run prisma:migrate

# Iniciar o servidor em desenvolvimento
npm run dev
```

## 📝 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Inicia com hot reload
npm run start           # Inicia o servidor

# Build
npm run build           # Compila o TypeScript

# Produção
npm run start:prod      # Inicia a versão compilada

# Testes
npm run test            # Executa testes unitários
npm run test:watch      # Executa testes com watch
npm run test:e2e        # Executa testes E2E

# Linting
npm run lint            # Verifica e corrige lint
npm run format          # Formata o código com Prettier

# Banco de dados
npm run prisma:migrate  # Executa migrações pendentes
npm run prisma:studio   # Abre a interface Prisma Studio
```

## 🔐 Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/template_db"
JWT_SECRET="sua_chave_secreta_aqui_mude_em_producao"
JWT_EXPIRATION="7d"
NODE_ENV="development"
```

## 📚 Estrutura dos Módulos

### Auth Module
- Autenticação com JWT
- Estratégias Passport (JWT)
- Geração de tokens
- Refresh token

### User Module
- CRUD de usuários
- Validação de dados
- Consultas de usuários

### Acesso Module
- Gerenciamento de níveis
- Permissões e menus
- Atribuição de usuários a níveis
- Guardas de autorização

### Database Module
- Configuração do Prisma
- Serviço de prisma

## 🔑 Endpoints Principais

### Autenticação
```
POST   /auth/login          - Login de usuário
POST   /auth/signup         - Cadastro de usuário
POST   /auth/refresh        - Refresh token
```

### Usuários
```
GET    /user                - Listar usuários
GET    /user/:id            - Obter usuário por ID
PATCH  /user/:id            - Atualizar usuário
DELETE /user/:id            - Deletar usuário
```

### Acesso
```
GET    /acesso/niveis       - Listar níveis de acesso
POST   /acesso/niveis       - Criar nível
GET    /acesso/menus        - Listar menus
POST   /acesso/atribuir     - Atribuir usuário a nível
```

## 🛡️ Guardas de Segurança

- `AppTokenGuard`: Valida JWT token
- `MenuPermissionGuard`: Valida permissões de menu
- `RefreshTokenGuard`: Valida refresh token

## 🐳 Docker

```bash
# Buildar imagem
docker build -t template-api .

# Executar container
docker run -p 3000:3000 --env-file .env template-api

# Com docker-compose
docker-compose up
```

## 📊 Banco de Dados

O projeto usa Prisma como ORM. Os modelos principais são:

- **User**: Usuários do sistema
- **Nivel**: Níveis de acesso
- **Menu**: Menus do sistema
- **PermissaoMenu**: Relacionamento entre menus e níveis
- **UserNivel**: Relacionamento entre usuários e níveis

## 🔍 Testes

```bash
# Testes unitários
npm run test

# Testes E2E
npm run test:e2e

# Cobertura de testes
npm run test:cov
```

## 📖 Documentação

Para mais informações sobre NestJS: https://docs.nestjs.com

## 🤝 Contribuindo

Este é um template, sinta-se livre para adaptá-lo às suas necessidades!

---

Desenvolvido com ❤️ usando NestJS
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
