---
name: JWT Auto Refresh
overview: Adicionar refresh automático de JWT na camada de transporte (apiClient), com single-flight e retry único em 401, sem alterar backend, contratos ou o syncService.
todos:
  - id: apiclient-handlers
    content: Adicionar setAuthHandlers() e estado interno de auth no apiClient (aditivo)
    status: pending
  - id: authstore-updatetokens
    content: Adicionar updateTokens no auth.store e registrar handlers (getRefreshToken/onTokensRefreshed/onRefreshFailed)
    status: pending
  - id: apiclient-refresh-flow
    content: Implementar single-flight refresh + retry unico em 401 no apiClient.request
    status: pending
  - id: tests-validate
    content: Testes unitarios de refresh + build/lint/test de regressao
    status: pending
isProject: false
---

# Refresh Automático de JWT (FASE 1.2)

Evolução segura e aditiva na camada de transporte. Nenhuma mudança de backend, contratos, DTOs ou `syncService`.

## Arquivos a alterar
- [src/services/apiClient.ts](src/services/apiClient.ts): refresh single-flight + retry unico em 401 + API de auth handlers.
- [src/store/auth.store.ts](src/store/auth.store.ts): acao `updateTokens` (preserva `user`) + registro dos handlers.

## Arquitetura
- Injecao de dependencia para evitar import circular: `apiClient.setAuthHandlers({ getRefreshToken, onTokensRefreshed, onRefreshFailed })`, registrados pelo `auth.store` via `useAuthStore.getState()` lazy.
- `refreshPromise` unico no modulo (single-flight) para 401 concorrentes.
- Em 401: se `retried===false`, ha `refreshToken` e `path` nao comeca com `/auth/`, faz refresh e reexecuta a request 1x com o novo access token.

## Regras de seguranca (invariantes)
- Retry no maximo 1x por request; nunca refresh em rotas `/auth/*` -> sem loop.
- Logout SO quando refresh retorna 401/invalido; 5xx e erros de rede NAO deslogam.
- `updateTokens` atualiza apenas tokens e mantem `user`/`isAuthenticated` (refresh do backend devolve so `TokenPair`).
- Requisicoes publicas sem token nao disparam refresh.
- Contrato de erro `{message, statusCode}` preservado.

## Ordem de implementacao
1. `apiClient`: adicionar `setAuthHandlers()` + estado interno (aditivo, sem mudar comportamento).
2. `auth.store`: adicionar `updateTokens` e registrar handlers.
3. `apiClient`: ativar single-flight + retry em 401.
4. Validar build/lint/test.

## Testes
- Unitarios (mock fetch): 401->refresh->retry 200; N paralelos = 1 refresh; max 1 retry; refresh 401 -> logout; 5xx/rede -> nao desloga; publico sem token -> sem refresh; `updateTokens` preserva user.
- Integracao/manual: TTL curto -> refresh transparente ao sincronizar; refresh token invalido -> logout limpo; offline -> sem logout falso.
- Regressao: `gamification.test.ts` passa; login/logout e sync inalterados.

## Fora de escopo
- Migracao para cookies httpOnly (mudanca maior; registrada como evolucao futura).
- Wiring em React Query (hooks autenticados nao usam apiClient hoje).