# COMPLEMENTO — REGRAS DE CRIAÇÃO E USABILIDADE DAS TAREFAS

Além dos requisitos já descritos, considere obrigatoriamente as seguintes regras de negócio e experiência do usuário.

---

## 17. TAREFA PODE EXISTIR SEM PROJETO

Uma tarefa **NÃO deve obrigatoriamente estar vinculada a um projeto**.

Deve ser possível criar uma tarefa independente, sem selecionar projeto.

Isso é necessário porque determinados perfis, como o perfil **F (ex.: Richelle)**, poderão utilizar o KABAN para criar e acompanhar tarefas que não necessariamente pertencem a um projeto formal.

Portanto, o relacionamento:

```text
TAREFA → PROJETO
```

deve ser **opcional**.

Conceitualmente:

```text
PROJETO_ID = NULL
```

deve ser uma situação válida.

Exemplos:

```text
Tarefa com projeto
────────────────────────────
Projeto: Implantação Cliente X
Tarefa: Configurar integração

Tarefa sem projeto
────────────────────────────
Projeto: Nenhum
Tarefa: Verificar problema no cadastro
```

### IMPORTANTE

Não criar um "Projeto Geral", "Sem Projeto" ou qualquer projeto fictício apenas para acomodar essas tarefas.

A ausência de projeto deve ser uma condição válida no modelo de dados.

No planejamento, avaliar:

* se `PROJETO_ID` atualmente é obrigatório;
* se existe FK que impeça `NULL`;
* impacto no backend;
* impacto no frontend;
* impacto nos filtros;
* impacto nos indicadores;
* impacto nas telas que atualmente pressupõem que toda tarefa possui projeto.

Os indicadores por projeto devem simplesmente desconsiderar tarefas sem projeto quando fizerem sentido.

Também deve existir uma visão que permita localizar posteriormente as **tarefas sem projeto**.

---

# 18. TELA DE CRIAÇÃO DE TAREFA — UX/UI

A tela de criação de tarefa deve ser **simples, intuitiva e de fácil utilização**.

Evite criar um formulário excessivamente carregado.

Os campos devem estar organizados de forma lógica, deixando claro para o usuário:

1. o que precisa ser feito;
2. para quem a tarefa será atribuída;
3. quando deve ser entregue;
4. se é FEATURE ou BUG;
5. a qual projeto pertence, quando aplicável;
6. quais chamados estão relacionados.

### Sugestão de organização

```text
┌─────────────────────────────────────────────────┐
│              NOVA TAREFA                        │
├─────────────────────────────────────────────────┤
│                                                 │
│ Título                                          │
│ [____________________________________________]  │
│                                                 │
│ Descrição                                       │
│ [____________________________________________]  │
│ [____________________________________________]  │
│                                                 │
│ Tipo                    Data de entrega         │
│ [ FEATURE ▼ ]           [ 25/09/2026 ]          │
│                                                 │
│ Responsável                                     │
│ [ Felipe Gomes ▼ ]                              │
│                                                 │
│ Projeto (opcional)                              │
│ [ Selecione um projeto ▼ ]                      │
│                                                 │
│ Chamados relacionados                           │
│ [ + Adicionar chamado ]                         │
│                                                 │
│                          [ Cancelar ] [ Criar ]  │
└─────────────────────────────────────────────────┘
```

Isso é apenas uma referência conceitual.

**Analise o padrão visual já utilizado pelo KABAN e mantenha consistência com a interface existente.**

Não crie uma tela visualmente desconectada do restante do sistema.

---

# 19. RESPONSÁVEL — LOGIN DO USUÁRIO COMO PADRÃO

Ao abrir a tela de criação de tarefa, o campo **Responsável** deve vir automaticamente preenchido com o usuário atualmente logado.

Exemplo:

Usuário logado:

```text
Felipe Gomes
```

Ao clicar em:

```text
Nova tarefa
```

o formulário deve abrir:

```text
Responsável
[ Felipe Gomes ▼ ]
```

O usuário poderá alterar o responsável através de um **menu suspenso/dropdown**.

### Requisitos

* valor inicial = usuário logado;
* utilizar a identidade/autenticação já existente no sistema;
* não solicitar que o usuário selecione seu próprio nome manualmente;
* permitir alteração do responsável conforme as permissões do usuário;
* carregar os operadores a partir da fonte oficial já existente na Central;
* permitir busca no dropdown caso existam muitos operadores.

Exemplo:

```text
Responsável
┌──────────────────────────────┐
│ Felipe Gomes              ▼  │
└──────────────────────────────┘

Ao abrir:

┌──────────────────────────────┐
│ 🔎 Buscar operador...        │
├──────────────────────────────┤
│ Felipe Gomes                 │
│ João Silva                   │
│ Maria Souza                  │
│ Richelle                     │
│ Carlos Oliveira              │
└──────────────────────────────┘
```

---

# 20. PERMISSÃO PARA ATRIBUIR TAREFAS

Não assuma que qualquer usuário poderá atribuir tarefas para qualquer operador.

Analise o modelo atual de **perfis, permissões e usuários**.

O planejamento deve responder:

* quais perfis podem criar tarefas;
* quais perfis podem alterar o responsável;
* quais perfis podem atribuir tarefas para terceiros;
* se o usuário comum deve poder alterar o responsável;
* se o perfil F possui alguma regra específica;
* como a Central atualmente controla essas permissões.

### Regra esperada

O comportamento deve ser:

```text
Usuário entra
      ↓
Clica em "Nova tarefa"
      ↓
Sistema identifica usuário logado
      ↓
Responsável vem preenchido automaticamente
      ↓
Usuário pode alterar
      ↓
Sistema valida se ele possui permissão
      ↓
Tarefa é criada
```

A validação de permissão deve existir **no backend**, e não somente no frontend.

---

# 21. COMPORTAMENTO ESPECÍFICO DO PERFIL F

O planejamento deve considerar explicitamente o cenário em que um usuário com **perfil F**, como a Richelle, cria tarefas.

Esse usuário deve conseguir:

```text
Criar tarefa
      ↓
Sem projeto
      ↓
Atribuir para um operador
      ↓
Definir prazo
      ↓
Definir FEATURE/BUG
      ↓
Relacionar chamado, quando existir
```

Exemplo:

```text
Nova tarefa

Título:
"Verificar inconsistência no cadastro"

Tipo:
BUG

Responsável:
[ João Silva ▼ ]

Projeto:
[ Nenhum / opcional ]

Data de entrega:
[ 18/09/2026 ]

Chamado:
[ 123456 - Erro no cadastro ]

[ CRIAR TAREFA ]
```

Essa tarefa deve aparecer normalmente no Kanban, mesmo sem projeto.

---

# 22. FILTROS E VISUALIZAÇÃO DE TAREFAS SEM PROJETO

Como existirão tarefas independentes, o sistema deverá prever uma forma de identificá-las.

Exemplo de filtro:

```text
Projeto
[ Todos ▼ ]
```

Opções:

```text
Todos
Sem projeto
Projeto A
Projeto B
Projeto C
...
```

Ou uma visualização equivalente que mantenha a interface simples.

No card, quando não houver projeto, não exibir um projeto fictício.

Pode apresentar:

```text
Projeto: Sem projeto
```

ou simplesmente não exibir o campo, desde que fique claro na tela de detalhes que aquela tarefa não possui projeto.

---

# 23. CRITÉRIO DE USABILIDADE

Ao planejar a alteração, considere como requisito funcional que a criação de uma tarefa deve exigir **o mínimo possível de interação do usuário**.

O fluxo esperado deve ser próximo de:

```text
1. Clicar em "Nova tarefa"
2. Informar título
3. Definir/confirmar responsável
4. Definir prazo
5. Definir tipo
6. Opcionalmente escolher projeto
7. Opcionalmente relacionar chamado
8. Criar
```

O responsável não deve exigir uma seleção obrigatória quando já puder ser inferido pelo usuário logado.

O projeto deve ser opcional.

Chamados devem ser opcionais.

A interface deve deixar claramente separados:

**Informações obrigatórias**

e

**Informações opcionais**.

---

# 24. VALIDAÇÕES

No planejamento, defina claramente quais campos serão obrigatórios.

Sugestão:

### Obrigatórios

* Título;
* Responsável;
* Tipo;
* Data de entrega, caso a regra definida para o KABAN determine prazo obrigatório.

### Opcionais

* Projeto;
* Descrição;
* Chamados relacionados;
* Observação.

A decisão final deve considerar o comportamento já existente no sistema.

Não torne campos atualmente opcionais obrigatórios sem avaliar o impacto sobre os usuários e registros existentes.

---

# 25. RESULTADO ESPERADO DO PLANEJAMENTO — COMPLEMENTO

Além dos itens anteriores, o planejamento deve responder especificamente:

### Tarefas sem projeto

* O banco permite `PROJETO_ID = NULL`?
* Quais componentes assumem que existe projeto?
* Quais APIs precisam ser ajustadas?
* Como essas tarefas aparecerão no Kanban?
* Como serão filtradas?

### Usuário logado

* Como o sistema identifica o usuário autenticado?
* Como obter o operador correspondente?
* Como preencher automaticamente o responsável?
* Como garantir que esse valor seja validado no backend?

### Dropdown de responsáveis

* Qual tabela/fonte será utilizada?
* Como carregar os operadores?
* Existe endpoint reutilizável?
* Será necessário criar endpoint?
* Haverá busca no dropdown?

### Perfil F

* Quais permissões o perfil F possui atualmente?
* Ele já pode criar tarefas?
* Poderá criar tarefas sem projeto?
* Poderá atribuir para terceiros?
* Existem regras específicas de visualização/edição?

### UX

* Qual componente existente deve ser reutilizado?
* Como manter consistência visual?
* Quais campos devem aparecer inicialmente?
* Quais podem ficar em seção "Mais opções" para não poluir a tela?

---

## REGRA FINAL

Antes de qualquer implementação, **não altere código**.

Primeiro:

1. analise a arquitetura existente;
2. identifique como usuários, operadores e perfis funcionam;
3. identifique como projetos e tarefas funcionam;
4. identifique como o Kanban funciona;
5. identifique como a Central disponibiliza os operadores;
6. identifique como a `tbchamado` é consumida;
7. apresente o planejamento técnico completo;
8. destaque conflitos entre o comportamento atual e os novos requisitos;
9. proponha a solução de menor impacto estrutural;
10. aguarde validação do planejamento antes de implementar.

O objetivo é **evoluir o KABAN existente**, e não reconstruir ou criar uma arquitetura paralela.
