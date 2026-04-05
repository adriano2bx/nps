# NPS Health - Documentação Técnica (v1.0)

Este documento detalha a arquitetura, as medidas de segurança e as estratégias de escalabilidade da plataforma NPS Health, projetada para a gestão de pesquisas de satisfação em larga escala no setor de saúde.

---

## 🏗️ 1. Arquitetura do Sistema

A aplicação utiliza uma arquitetura de **Monorepo** com separação clara de responsabilidades:

- **Frontend**: SPA construído em **React 19** com **Vite**, utilizando **TailwindCSS 4** para estilização modular e **Framer Motion** para micro-animações premium. O Dashboard é alimentado por **Recharts** para visualização analítica em tempo real.
- **Backend**: API REST seguindo o padrão **Clean Architecture** simplificado, utilizando **Node.js (TypeScript)** e **Express 5**.
- **Camada de Dados**: **PostgreSQL** como banco relacional central, gerenciado pelo **Prisma ORM (v7)**.
- **Execução Assíncrona**: **BullMQ** sobre **Redis 7** para processamento de filas de disparos e webhooks.

---

## ⚡ 2. Escalabilidade e Performance

O sistema foi desenhado para suportar milhares de pesquisas por minuto através de três pilares:

### A. Processamento Orientado a Filas (Producer-Consumer)
Diferente de sistemas síncronos, o NPS Health desacopla a requisição do envio:
1. Uma requisição de disparo (via API ou Bulk) entra na fila do Redis.
2. **Workers Dedicados** processam essa fila em paralelo, respeitando os limites da API do WhatsApp.
3. Isso evita a sobrecarga da CPU da API principal durante picos de uso.

### B. Estratégia de Caching Ativo
Para evitar consultas pesadas de agregação (COUNT/SUM) no Postgres a cada acesso ao Dashboard:
- Implementamos **Redis Cache** com TTL dinâmico para métricas de NPS e listagens de campanhas.
- **Invalidação Seletiva**: Ao salvar uma nova resposta ou alterar uma campanha, o sistema invalida apenas o cache relacionado àquele `tenantId`.

### C. Escala Horizontal (Master Lock)
Utilizamos um mecanismo de **Distributed Lock** via Redis para garantir que, mesmo com múltiplas instâncias da API rodando, apenas uma seja a "Mestre" responsável por tarefas de limpeza e manutenção de sessões.

---

## 🛡️ 3. Modelo de Segurança (Excelência de Produção)

Segurança não é apenas autenticação; é blindagem em múltiplas camadas:

### A. Isolamento de Tenant (Multi-tenancy)
Cada registro no banco possui um `tenantId`. O middleware de autenticação garante que todas as queries de banco sejam filtradas obrigatoriamente por este ID. Há isolamento lógico total entre os dados de diferentes clínicas.

### B. Blindagem contra Abusos (Rate Limiting)
- **Global**: 200 requisições/min para evitar DoS básico.
- **Login**: 5 tentativas a cada 15 min por IP para impedir ataques de dicionário/força bruta.
- **API Pública (Disparo)**: 30 disparos/min por IP, protegendo o motor de envios contra inundação acidental ou proposital.

### C. Proteção de Headers (`Helmet.js`)
Configurado para mitigar:
- **XSS**: Cross-Site Scripting.
- **Clickjacking**: Proteção via frameguards.
- **Sniffing**: Enforçamento de tipos MIME.

### D. Validação com `Zod`
Todas as entradas críticas da API (Login, Criação de Campanhas, Triggers de API) passam por esquemas de validação rigorosos. Dados malformados são rejeitados na borda da aplicação, evitando falhas de parser ou poluição do banco de dados.

---

## 📱 4. Integração WhatsApp

A plataforma suporta dois motores de comunicação:
1. **WhatsApp Business Cloud (Meta)**: Integração oficial de alta escala, recomendada para produção.
2. **Baileys (WebSockets)**: Motor de fallback para conexões via QR Code (legado/autônomo), rodando em processo isolado para estabilidade.

---

## 📊 5. Conformidade e Dados (LGPD)

O sistema inclui recursos nativos para conformidade com a LGPD:
- **Anonimização de Sessão**: Possibilidade de apagar dados sensíveis (nome/telefone) mantendo a estatística da nota para análise histórica.
- **Mascaramento (`isMasked`)**: Para visualização em painéis públicos (como o TV Dashboard), onde o nome e telefone podem aparecer truncados.

---

## 🛠️ 6. Setup e Deploy

A infraestrutura é otimizada para containers:
```bash
# Iniciar o ecossistema
docker-compose up -d

# Variáveis críticas
# STORAGE_PATH: Persistência de mídias e ssesões
# REDIS_URL: Conexão para filas e cache
# DATABASE_URL: Banco central Postgres
```

---
> [!IMPORTANT]
> Esta documentação reflete o estado da aplicação na branch **dev**, incluindo todas as recentes blindagens de segurança e otimizações de performance.
