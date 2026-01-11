# Módulo de Finanças

Gerenciamento completo de transações bancárias e classificação de despesas.

## Funcionalidades

### ✅ Implementado

- **Importação de CSV**: Upload de extratos bancários em formato CSV
- **Gerenciamento de Transações**: CRUD completo de transações
- **Categorização de Despesas**: Classificação manual em categorias pré-definidas
- **Categorias Customizáveis**: Crie suas próprias categorias de despesas
- **Dashboard Financeiro**: Visualização de resumo e estatísticas
- **Filtros Avançados**: Por período, categoria e status de classificação
- **Suporte a IA**: Estrutura preparada para integração com N8N

### 📋 Planejado

- Classificação automática com N8N
- Relatórios detalhados em PDF
- Previsão de gastos
- Alertas de limite de gastos
- Sincronização com bancos

## Estrutura de Dados

### Categorias Padrão

- **Alimentação**: Comida e bebida
- **Transporte**: Transporte e combustível
- **Utilidades**: Água, luz e gás
- **Saúde**: Despesas médicas
- **Educação**: Cursos e materiais
- **Lazer**: Entretenimento
- **Telefone/Internet**: Planos
- **Seguros**: Diversos seguros
- **Impostos**: Taxas e impostos
- **Renda**: Entradas de dinheiro
- **Investimentos**: Aplicações
- **Outras**: Despesas diversas

## API Endpoints

### Categorias

```
POST   /financas/categories              # Criar categoria
GET    /financas/categories              # Listar categorias
DELETE /financas/categories/:id          # Deletar categoria
```

### Transações

```
POST   /financas/transactions                    # Criar transação
GET    /financas/transactions                    # Listar (com filtros)
GET    /financas/transactions/:id                # Obter uma transação
PUT    /financas/transactions/:id/classify       # Classificar transação
DELETE /financas/transactions/:id                # Deletar transação
```

### Importação

```
POST   /financas/import-csv              # Importar arquivo CSV
```

### Estatísticas

```
GET    /financas/summary                 # Resumo financeiro
```

## Formato do CSV

O arquivo CSV deve conter as seguintes colunas:

```csv
Data,Valor,Identificador,Descrição
02/01/2026,320.00,695831c6-4ea5-4464-a13c-75e06e68c9d9,Transferência recebida pelo Pix
03/01/2026,-46.99,69594085-13ec-4d1a-a0de-4299d4244642,Compra no débito - AUTO POSTO
```

**Formato de Data**: DD/MM/YYYY  
**Valor**: Positivo para entrada, negativo para saída

## Páginas do Frontend

### 1. Dashboard (`/admin/financas`)

Visão geral das finanças:
- Resumo de entradas e despesas
- Saldo total
- Progresso de classificação
- Despesas por categoria
- Transações recentes

### 2. Importar (`/admin/financas/importar`)

Upload de extratos:
- Seleção de arquivo CSV
- Prévia dos dados
- Processamento e validação
- Feedback de sucesso/erro

### 3. Classificar (`/admin/financas/classificar`)

Classificação interativa:
- Navegação entre transações não classificadas
- Seleção de categoria
- Adição de notas
- Barra de progresso
- Interface responsiva

## Exemplo de Uso

### 1. Importar Extrato

1. Acesse **Finanças > Importar Extrato**
2. Selecione seu arquivo CSV
3. Visualize a prévia dos dados
4. Clique em "Importar Transações"

### 2. Classificar Transações

1. Acesse **Finanças > Classificar Despesas**
2. Selecione a categoria apropriada
3. (Opcional) Adicione notas
4. Navegue entre as transações
5. Clique em "Classificar"

### 3. Visualizar Dashboard

1. Acesse **Finanças**
2. Veja resumo e estatísticas
3. Acompanhe progresso de classificação

## Integração com N8N

Para implementar classificação automática com IA, veja [N8N_INTEGRATION.md](./N8N_INTEGRATION.md)

### Preparação Feita

- ✅ Campo `aiSuggestion` no modelo Transaction
- ✅ Estrutura para receber sugestões
- ✅ Documentação de integração

## Segurança

- ✅ Autenticação JWT obrigatória
- ✅ Isolamento de dados por usuário
- ✅ Validação de entrada
- ✅ Validação de formato CSV

## Próximas Melhorias

1. Adicionar filtros de data mais avançados
2. Exportação de relatórios
3. Gráficos de evolução temporal
4. Categorias inteligentes com machine learning
5. Sincronização com APIs bancárias

---

**Desenvolvido como parte do app-gerenciamento**  
Para dúvidas ou sugestões, abra uma issue ou pull request.
