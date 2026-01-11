# Integração com N8N para Classificação Automática

## Visão Geral

O módulo de finanças foi estruturado para suportar integração futura com N8N para classificação automática de transações usando IA.

## Estrutura Preparada

### 1. Campo `aiSuggestion` no Model Transaction

O modelo `Transaction` possui o campo `aiSuggestion` que armazena a sugestão de categoria gerada pela IA:

```prisma
model Transaction {
  ...
  aiSuggestion    String?  // Sugestão de categoria da IA
  ...
}
```

### 2. Endpoint de Webhook para N8N

Você pode criar um endpoint webhook que receba sugestões do N8N:

```typescript
@Post('transactions/:id/ai-suggestion')
async saveAiSuggestion(
  @Param('id') id: string,
  @Body() dto: { aiSuggestion: string },
) {
  return this.prisma.transaction.update({
    where: { idTransaction: id },
    data: { aiSuggestion: dto.aiSuggestion },
  });
}
```

## Fluxo Proposto com N8N

### 1. Trigger: Nova Transação Importada

Quando transações são importadas, um webhook do N8N pode ser disparado com as transações não classificadas.

### 2. Processamento pela IA do N8N

- Enviar descrição da transação para análise
- Usar IA para sugerir categoria mais apropriada
- Opcionalmente, usar confidence score

### 3. Salvar Sugestão

Salvar a sugestão no campo `aiSuggestion` da transação.

### 4. Apresentar ao Usuário

Na página de classificação, exibir a sugestão e permitir que o usuário:
- Aceite a sugestão
- Escolha outra categoria
- Edite notas adicionais

## Implementação Futura

### Passo 1: Criar Workflow no N8N

1. Webhook Trigger: POST `/webhooks/financas/classify`
2. Parse do payload com dados das transações
3. Usar nó de IA (OpenAI, Claude, etc.)
4. Enviar sugestão de volta via HTTP Request

### Passo 2: Adicionar Endpoint de Webhook

```typescript
@Post('transactions/ai-classify')
@Public() // Se usar token separado
async aiClassifySuggestions(@Body() suggestions: AiSuggestionDto[]) {
  // Atualizar transações com sugestões
  for (const suggestion of suggestions) {
    await this.prisma.transaction.update({
      where: { idTransaction: suggestion.transactionId },
      data: { aiSuggestion: suggestion.categoryName },
    });
  }
}
```

### Passo 3: Atualizar UI de Classificação

Na página de classificação, mostrar:
- Badge com a sugestão da IA
- Confidence score (se fornecido)
- Opção rápida para aceitar sugestão

```typescript
// Exemplo no componente
{currentTransaction.aiSuggestion && (
  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
    <p className="text-sm text-blue-600">
      <strong>Sugestão IA:</strong> {currentTransaction.aiSuggestion}
    </p>
    <Button 
      variant="ghost" 
      size="sm"
      onClick={() => setSelectedCategory(findCategoryByName(currentTransaction.aiSuggestion))}
    >
      Usar sugestão
    </Button>
  </div>
)}
```

### Passo 4: Configurar Trigger Automático

Na importação de CSV, disparar o workflow do N8N:

```typescript
async importTransactionsFromCsv(userId: string, fileContent: string) {
  // ... código de importação ...
  
  // Disparar N8N webhook para classificação automática
  if (process.env.N8N_WEBHOOK_URL) {
    try {
      await axios.post(process.env.N8N_WEBHOOK_URL, {
        transactionIds: newTransactions.map(t => t.idTransaction),
        userId,
      });
    } catch (error) {
      console.error('Erro ao disparar N8N:', error);
      // Não falhar a importação se N8N falhar
    }
  }
}
```

## Variáveis de Ambiente Necessárias

```env
# Backend
N8N_WEBHOOK_URL=https://seu-n8n.com/webhook/financas-classify
N8N_API_KEY=sua-chave-api-n8n
```

## Segurança

1. **Validação de Webhook**: Implementar verificação de assinatura HMAC
2. **Autenticação**: Usar tokens JWT ou API keys
3. **Rate Limiting**: Implementar limite de requisições
4. **Logs**: Registrar todas as sugestões para auditoria

## Exemplo de Integração Completa

```typescript
// financas.service.ts
async importTransactionsFromCsv(userId: string, fileContent: string) {
  const result = await this.prisma.transaction.createMany({
    data: transactions,
  });

  // Disparar classificação automática
  this.triggerAiClassification(userId, transactions);

  return result;
}

private async triggerAiClassification(userId: string, transactions: any[]) {
  if (!process.env.N8N_WEBHOOK_URL) return;

  try {
    await axios.post(
      process.env.N8N_WEBHOOK_URL,
      {
        userId,
        transactions: transactions.map(t => ({
          id: t.idTransaction,
          description: t.description,
          value: t.value,
        })),
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.N8N_API_KEY}`,
        },
      }
    );
  } catch (error) {
    // Log error but don't fail
    console.error('AI Classification failed:', error);
  }
}
```

## Próximos Passos

1. ✅ Estrutura do backend criada
2. ✅ Models Prisma com campo de sugestão
3. ⏳ Implementar webhook para receber sugestões
4. ⏳ Criar workflow no N8N
5. ⏳ Atualizar UI para mostrar sugestões
6. ⏳ Testes de integração

---

**Nota**: Este módulo foi preparado com a estrutura necessária para integração de IA. A implementação específica dependerá da configuração do seu ambiente N8N e preferências de modelo de IA.
