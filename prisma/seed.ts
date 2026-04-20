import { ExpenseCategoryEnum, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultCategories = [
  {
    name: 'Salario',
    type: ExpenseCategoryEnum.RENDA,
    color: '#16A34A',
    icon: 'wallet',
    description: 'Salario e proventos recorrentes',
  },
  {
    name: 'Freelance',
    type: ExpenseCategoryEnum.RENDA,
    color: '#22C55E',
    icon: 'briefcase',
    description: 'Entradas de trabalhos freelancer',
  },
  {
    name: 'Moradia',
    type: ExpenseCategoryEnum.UTILIDADES,
    color: '#2563EB',
    icon: 'home',
    description: 'Aluguel e despesas de moradia',
  },
  {
    name: 'Supermercado',
    type: ExpenseCategoryEnum.ALIMENTACAO,
    color: '#F97316',
    icon: 'shopping-cart',
    description: 'Compras de mercado e itens domesticos',
  },
  {
    name: 'Combustivel e Transporte',
    type: ExpenseCategoryEnum.TRANSPORTE,
    color: '#0EA5E9',
    icon: 'car',
    description: 'Posto, uber e deslocamentos',
  },
  {
    name: 'Saude e Farmacia',
    type: ExpenseCategoryEnum.SAUDE,
    color: '#DC2626',
    icon: 'heart',
    description: 'Farmacia e despesas de saude',
  },
  {
    name: 'Assinaturas e Servicos',
    type: ExpenseCategoryEnum.INTERNET,
    color: '#7C3AED',
    icon: 'wifi',
    description: 'Internet, streaming e servicos digitais',
  },
  {
    name: 'Lazer',
    type: ExpenseCategoryEnum.LAZER,
    color: '#DB2777',
    icon: 'gamepad-2',
    description: 'Restaurantes, bar e entretenimento',
  },
  {
    name: 'Cartao de Credito',
    type: ExpenseCategoryEnum.OUTRAS,
    color: '#6B7280',
    icon: 'credit-card',
    description: 'Pagamentos de fatura e ajustes de cartao',
  },
  {
    name: 'Transferencias',
    type: ExpenseCategoryEnum.OUTRAS,
    color: '#475569',
    icon: 'arrow-right-left',
    description: 'Transferencias e pix enviados',
  },
];

async function main() {
  for (const category of defaultCategories) {
    await prisma.expenseCategory.upsert({
      where: { name: category.name },
      update: {
        type: category.type,
        color: category.color,
        icon: category.icon,
        description: category.description,
      },
      create: {
        ...category,
        userId: null,
      },
    });
  }

  console.log(`Seed concluida com ${defaultCategories.length} categorias padrao.`);
}

main()
  .catch((error) => {
    console.error('Erro ao executar seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
