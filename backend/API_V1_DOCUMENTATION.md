# NPS Health - Public API V1 Documentation

Esta documentação descreve como interagir com a API pública do motor de pesquisas NPS.

## Autenticação

Todas as solicitações devem incluir o cabeçalho `X-API-KEY`.
Sua chave de API pode ser gerada no painel administrativo em **Desenvolvedor > Integrações**.

O formato da chave é: `ID_DO_TENANT.SEGREDO_GERADO`

Exemplo:
`X-API-KEY: 2277c900-f366-4d46-a617-b59f4895eab4.4d1df9163e0ed1e5...`

---

## Endpoints

### 1. Listar Campanhas
Retorna todas as campanhas que estão com status `ACTIVE` no seu painel.

**GET** `/api/v1/campaigns`

**Resposta (200 OK):**
```json
[
  {
    "id": "uuid-campanha-1",
    "name": "Pesquisa Pós-Consulta",
    "keyword": "CONSULTA",
    "triggerType": "active",
    "createdAt": "2024-04-05T10:00:00Z"
  }
]
```

---

### 2. Disparar Pesquisa (Trigger)
Inicia uma pesquisa para um número de telefone específico.

**POST** `/api/v1/trigger`

**Corpo (JSON):**
```json
{
  "campaignId": "uuid-da-campanha",
  "phoneNumber": "5511999999999",
  "contactName": "João Silva"
}
```

**Respostas:**
- `200 OK`: Pesquisa disparada com sucesso.
- `404 Not Found`: Campanha ativa não encontrada.
- `409 Conflict`: Já existe uma sessão aberta para este contato nesta campanha.

---

### 3. Sincronizar Contato (Upsert)
Cria ou atualiza um contato e seus segmentos.

**POST** `/api/v1/contacts/upsert`

**Corpo (JSON):**
```json
{
  "name": "João Silva",
  "phoneNumber": "5511999999999",
  "segmentNames": ["Pacientes VIP", "Cardiologia"]
}
```

**Respostas:**
- `200 OK`: Contato criado/atualizado com sucesso (retorna o objeto do contato).

---

### 4. Métricas NPS
Obtém o score NPS e estatísticas de respostas em tempo real.

**GET** `/api/v1/metrics/nps`

**Resposta (200 OK):**
```json
{
  "nps": 75,
  "total": 100,
  "promoters": 80,
  "detractors": 5,
  "passives": 15
}
```

---

## Webhooks

O sistema enviará solicitações POST JSON para as URLs configuradas em seu painel sempre que ocorrerem os seguintes eventos:

- `survey.started`: Uma nova sessão de pesquisa foi aberta.
- `response.received`: Uma resposta (nota ou texto) foi capturada.
- `survey.closed`: A pesquisa foi concluída pelo usuário.

Os payloads dos webhooks incluem detalhes do contato, campanha e valores das respostas.
