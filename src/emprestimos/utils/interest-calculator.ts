// Type aliases matching Prisma enums
type InterestType = 'SIMPLE' | 'COMPOUND';
type PeriodRule = 'MENSAL' | 'ANUAL';

export interface InterestCalculation {
  principal: number;
  interestRate: number;
  interestType: InterestType;
  startDate: Date;
  endDate: Date;
  totalDays?: number;
}

export interface InterestResult {
  principal: number;
  interestAmount: number;
  totalAmount: number;
  monthsDuration: number;
  annualizedRate: number;
}

/**
 * Calcula juros simples
 * Fórmula: J = P * i * t
 * Onde: P = Principal, i = taxa, t = tempo (em períodos)
 */
export function calculateSimpleInterest(
  principal: number,
  monthlyRate: number,
  months: number,
): number {
  return principal * (monthlyRate / 100) * months;
}

/**
 * Calcula juros compostos
 * Fórmula: M = P * (1 + i)^n
 * Onde: M = Montante, P = Principal, i = taxa, n = número de períodos
 */
export function calculateCompoundInterest(
  principal: number,
  monthlyRate: number,
  months: number,
): number {
  const amount = principal * Math.pow(1 + monthlyRate / 100, months);
  return amount - principal;
}

/**
 * Calcula duração em meses entre duas datas
 */
export function calculateMonthsDuration(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);

  let months = 0;
  let currentDate = new Date(start);

  while (currentDate < end) {
    currentDate.setMonth(currentDate.getMonth() + 1);
    if (currentDate <= end) {
      months++;
    }
  }

  // Se não há meses completos, calcular dias como fração
  if (months === 0) {
    const days = Math.abs(Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    ));
    return days / 30; // Aproximar a 1 mês = 30 dias
  }

  return Math.abs(months);
}

/**
 * Converte taxa de período para taxa mensal
 * @param annualRate Taxa em %
 * @param periodRule MENSAL ou ANUAL
 */
export function convertToMonthlyRate(
  annualRate: number,
  periodRule: PeriodRule | string = 'MENSAL',
): number {
  if (periodRule === 'ANUAL') {
    return annualRate / 12; // Converte taxa anual para mensal
  }
  return annualRate; // Já é mensal
}

/**
 * Calcula lucro previsto baseado em juros
 */
export function calculateExpectedProfit(
  principal: number,
  annualRate: number,
  interestType: InterestType | string,
  periodRule: PeriodRule | string,
  months: number,
): number {
  const monthlyRate = convertToMonthlyRate(annualRate, periodRule);

  if (interestType === 'SIMPLE') {
    return calculateSimpleInterest(principal, monthlyRate, months);
  } else {
    return calculateCompoundInterest(principal, monthlyRate, months);
  }
}

/**
 * Calcula o interesse total baseado no tipo
 */
export function calculateInterest(calculation: InterestCalculation): InterestResult {
  const months = calculateMonthsDuration(
    calculation.startDate,
    calculation.endDate,
  );

  let interestAmount = 0;

  if (calculation.interestType === 'SIMPLE') {
    interestAmount = calculateSimpleInterest(
      calculation.principal,
      calculation.interestRate,
      months,
    );
  } else if (calculation.interestType === 'COMPOUND') {
    interestAmount = calculateCompoundInterest(
      calculation.principal,
      calculation.interestRate,
      months,
    );
  }

  return {
    principal: calculation.principal,
    interestAmount: Math.round(interestAmount * 100) / 100,
    totalAmount: Math.round((calculation.principal + interestAmount) * 100) / 100,
    monthsDuration: Math.round(months * 100) / 100,
    annualizedRate: calculation.interestRate * 12,
  };
}

/**
 * Calcula rendimentos totais para um array de empréstimos
 */
export function calculateTotalInterestEarned(
  loans: Array<{
    amount: number;
    interestRate: number | null;
    interestType: InterestType | null;
    createdAt: Date;
    dueDate: Date;
    isPaid: boolean;
    paidDate?: Date | null;
  }>,
): {
  totalPrincipal: number;
  totalInterest: number;
  totalAmount: number;
  byType: {
    simple: { interest: number; amount: number };
    compound: { interest: number; amount: number };
  };
} {
  let totalPrincipal = 0;
  let totalInterest = 0;
  let simpleInterest = 0;
  let compoundInterest = 0;

  for (const loan of loans) {
    totalPrincipal += loan.amount;

    if (loan.interestRate && loan.interestRate > 0) {
      const endDate = loan.isPaid && loan.paidDate ? loan.paidDate : loan.dueDate;
      const result = calculateInterest({
        principal: loan.amount,
        interestRate: loan.interestRate,
        interestType: loan.interestType || 'SIMPLE',
        startDate: loan.createdAt,
        endDate: endDate,
      });

      totalInterest += result.interestAmount;

      if (loan.interestType === 'COMPOUND') {
        compoundInterest += result.interestAmount;
      } else {
        simpleInterest += result.interestAmount;
      }
    }
  }

  return {
    totalPrincipal,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalAmount: Math.round((totalPrincipal + totalInterest) * 100) / 100,
    byType: {
      simple: {
        interest: Math.round(simpleInterest * 100) / 100,
        amount: Math.round((simpleInterest / totalInterest) * 100 * 100) / 100 || 0,
      },
      compound: {
        interest: Math.round(compoundInterest * 100) / 100,
        amount: Math.round((compoundInterest / totalInterest) * 100 * 100) / 100 || 0,
      },
    },
  };
}
