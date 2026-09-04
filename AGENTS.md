# AGENTS.md — Central de Conhecimento

## Idioma
- Responder sempre em **português (PT-BR)**, salvo pedido explícito do usuário por outro idioma.

## Prioridades
1. Complete a tarefa solicitada.
2. Cuide da integridade do código.
3. **Atualize a documentação automaticamente** (§ Documentação).
4. Mantenha o contexto leve.

## Regras de comunidade
- Não pergunte o que já foi definido/respondido; verifique e siga.
- Não pergunte se a mudança gera conflito com o código; verifique sozinho.

## § Documentação (prioridade 3 — atualização AUTOMÁTICA)
Ao **concluir** alterações relevantes, atualize a documentação **automaticamente, sem aguardar pedido do usuário**:

- **Alterações de código** (Angular em `CENTRALOPERACAO_FRONTEND/src`, backend em `CENTRALOPERACAO_BACKEND`, skills, agentes, scripts de deploy):
  delegue **automaticamente** ao agente `docs-writer` (tool `task`) para revisar e atualizar:
  - `CENTRALOPERACAO_FRONTEND/README.md`
  - `CENTRALOPERACAO_FRONTEND/docs/*.md` (`DOCUMENTACAO-COMPLETA.md`, `deploy-*`, etc.)
- **Alterações de conteúdo do wiki** (`*.data.ts`):
  delegue **automaticamente** ao agente `content-editor` (tool `task`).
- **Regras da delegação automática:**
  - Não pergunte se deve atualizar a documentação — faça.
  - Não invente fatos: o agente confirma no código antes de documentar.
  - Mesmo que o usuário não peça, execute a delegação ao final da tarefa.

## Observação
- Configuração/instruções (AGENTS.md, agentes, skills) valem em novas sessões; após modificá-las, informe o usuário para reiniciar o opencode.