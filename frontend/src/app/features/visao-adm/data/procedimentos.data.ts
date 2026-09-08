export interface PassoProcedimento {
  titulo: string;
  detalhe?: string;
}

export interface ErroComum {
  problema: string;
  solucao: string;
}

export interface PerguntaProcedimento {
  pergunta: string;
  resposta: string;
}

export interface AnexoProcedimento {
  nome: string;
  tipo: string;
  tamanho: string;
}

export interface AlteracaoProcedimento {
  data: string;
  autor: string;
  descricao: string;
}

export type SetorProcedimento = 'financeiro' | 'rh' | 'comercial';

export interface Procedimento {
  id: string;
  titulo: string;
  setor: SetorProcedimento;
  categoria: string;
  icone: string;
  resumo: string;
  tags: string[];
  objetivo: string;
  quandoUtilizar: string[];
  preRequisitos: string[];
  passos: PassoProcedimento[];
  observacoes: string[];
  errosComuns: ErroComum[];
  faq: PerguntaProcedimento[];
  video?: { titulo: string; url: string };
  anexos: AnexoProcedimento[];
  responsavel: string;
  atualizadoEm: string;
  versao: string;
  historico: AlteracaoProcedimento[];
  observacoesInternas: string;
}

export const procedimentosFinanceiro: Procedimento[] = [
  {
    id: 'emissao-nota-fiscal',
    titulo: 'Emissão de Nota Fiscal',
    setor: 'financeiro',
    categoria: 'Faturamento',
    icone: 'bi-receipt',
    resumo: 'Emissão de NF de serviço no sistema interno, com conferência de dados do cliente e faturamento.',
    tags: ['nota fiscal', 'nf', 'faturamento', 'impostos', 'fiscal'],
    objetivo:
      'Padronizar a emissão de notas fiscais de serviços, garantindo o correto lançamento fiscal, a conferência dos dados do cliente e a entrega da nota ao contratante.',
    quandoUtilizar: [
      'Após a confirmação do serviço prestado ou da renovação contratual',
      'Quando o cliente solicita a nota de um período já faturado',
      'Para faturamento mensal recorrente de contratos ativos'
    ],
    preRequisitos: [
      'Cliente cadastrado e ativo no sistema interno',
      'Contrato vigente associado ao cliente',
      'Dados fiscais do cliente atualizados (CNPJ, IE, e-mail de envio)'
    ],
    passos: [
      { titulo: 'Acessar o módulo Fiscal', detalhe: 'No sistema interno, abra o menu "Faturamento" e selecione "Emissão de NF".' },
      { titulo: 'Localizar o cliente', detalhe: 'Busque pelo CNPJ ou razão social e confirme os dados fiscais exibidos.' },
      { titulo: 'Selecionar o serviço', detalhe: 'Escolha o serviço/contrato a ser faturado e verifique o valor e a competência.' },
      { titulo: 'Conferir tributos', detalhe: 'Valide ISS, ICMS e retenções calculados automaticamente antes de prosseguir.' },
      { titulo: 'Emitir a nota', detalhe: 'Confirme a emissão, valide o número e o QR-Code, e envie a NF ao cliente por e-mail.' },
      { titulo: 'Arquivar o comprovante', detalhe: 'Salve o XML e o DANFE no diretório do cliente no drive compartilhado.' }
    ],
    observacoes: [
      'Notas emitidas com erro de competência devem ser canceladas, nunca editadas.',
      'O envio do XML ao cliente é obrigatório para fins de conferência contábil.'
    ],
    errosComuns: [
      { problema: 'CNPJ divergente do cadastro', solucao: 'Atualize o cadastro do cliente antes de emitir. Nunca emita com dados divergentes.' },
      { problema: 'ISS retido indevidamente', solucao: 'Confira o município do cliente; a retenção segue a regra do local do serviço.' }
    ],
    faq: [
      { pergunta: 'Posso emitir NF retroativa?', resposta: 'Sim, desde que dentro do mesmo mês de competência. Fora disso, consulte o responsável fiscal.' },
      { pergunta: 'Onde encontro o XML?', resposta: 'No módulo Fiscal, na aba "Notas emitidas", após o envio.' }
    ],
    video: { titulo: 'Demonstração de emissão de NF', url: 'https://www.youtube.com/watch?v=exemplo-nf' },
    anexos: [
      { nome: 'modelo-email-envio-nf.txt', tipo: 'Texto', tamanho: '2 KB' },
      { nome: 'checklist-faturamento.pdf', tipo: 'PDF', tamanho: '180 KB' }
    ],
    responsavel: 'Equipe Financeiro',
    atualizadoEm: '05/08/2026',
    versao: '1.4',
    historico: [
      { data: '05/08/2026', autor: 'Financeiro', descricao: 'Atualização das regras de retenção de ISS.' },
      { data: '12/04/2026', autor: 'Financeiro', descricao: 'Criação do procedimento.' }
    ],
    observacoesInternas: 'Validar com a contabilidade a mudança do regime de ISS prevista para o próximo trimestre.'
  },
  {
    id: 'cancelamento-nota',
    titulo: 'Cancelamento de Nota',
    setor: 'financeiro',
    categoria: 'Faturamento',
    icone: 'bi-x-circle',
    resumo: 'Cancelamento de NF emitida com erro, dentro do prazo legal, com registro do motivo.',
    tags: ['nota fiscal', 'cancelamento', 'erro', 'fiscal'],
    objetivo:
      'Estabelecer o fluxo de cancelamento de notas fiscais emitidas incorretamente, respeitando o prazo legal e mantendo o histórico auditável.',
    quandoUtilizar: [
      'Nota emitida com valores, dados ou competência incorretos',
      'Cliente desistiu do serviço após o faturamento',
      'Duplicidade de emissão'
    ],
    preRequisitos: [
      'Prazo legal de cancelamento dentro do limite da SEFAZ (geralmente o mesmo dia)',
      'Justificativa formal do motivo do cancelamento'
    ],
    passos: [
      { titulo: 'Acessar a nota emitida', detalhe: 'No módulo Fiscal, localize a NF pelo número e situação "Emitida".' },
      { titulo: 'Solicitar o cancelamento', detalhe: 'Clique em "Cancelar nota", informe o motivo e confirme.' },
      { titulo: 'Aguarda o retorno da SEFAZ', detalhe: 'Se o retorno for positivo, a NF passa para situação "Cancelada".' },
      { titulo: 'Comunicar o cliente', detalhe: 'Informe o cliente sobre o cancelamento e a nova numeração, se houver reemissão.' }
    ],
    observacoes: [
      'Fora do prazo legal, o cancelamento deve ser feito via carta de correção ou registro de devolução, conforme o caso.'
    ],
    errosComuns: [
      { problema: 'Tentar cancelar nota já enviada à contabilidade', solucao: 'Comunique a contabilidade antes de cancelar para evitar divergência no fechamento.' }
    ],
    faq: [
      { pergunta: 'Até quando posso cancelar?', resposta: 'Em regra, no mesmo dia da emissão. Consulte sempre a regra vigente da SEFAZ.' }
    ],
    anexos: [
      { nome: 'fluxo-cancelamento.pdf', tipo: 'PDF', tamanho: '95 KB' }
    ],
    responsavel: 'Equipe Financeiro',
    atualizadoEm: '02/08/2026',
    versao: '1.1',
    historico: [
      { data: '02/08/2026', autor: 'Financeiro', descricao: 'Ajuste no fluxo de comunicação com a contabilidade.' }
    ],
    observacoesInternas: ''
  },
  {
    id: 'carta-correcao',
    titulo: 'Carta de Correção',
    setor: 'financeiro',
    categoria: 'Faturamento',
    icone: 'bi-envelope-paper',
    resumo: 'Correção de informações acessórias de uma NF já emitida, sem cancelamento.',
    tags: ['nota fiscal', 'carta de correção', 'fiscal', 'erro'],
    objetivo:
      'Permitir a correção de informações acessórias de notas fiscais já emitidas, sem necessidade de cancelamento, seguindo as regras da CC-e.',
    quandoUtilizar: [
      'Erro em dados acessórios como e-mail, observações ou endereço de cobrança',
      'Nota fora do prazo de cancelamento com erro não impeditivo'
    ],
    preRequisitos: [
      'Nota emitida e autorizada pela SEFAZ',
      'Não alterar valores, produtos ou destinatário (exige cancelamento)'
    ],
    passos: [
      { titulo: 'Selecionar a nota', detalhe: 'No módulo Fiscal, abra a NF e clique em "Emitir carta de correção".' },
      { titulo: 'Descrever a correção', detalhe: 'Informe o grupo de informação corrigida e a justificativa em texto livre.' },
      { titulo: 'Enviar para a SEFAZ', detalhe: 'Confirme o envio da CC-e e aguarde a autorização.' },
      { titulo: 'Reenviar ao cliente', detalhe: 'Envie a carta de correção autorizada ao cliente junto com a NF original.' }
    ],
    observacoes: [
      'Limite de correções: são permitidas até 20 cartas de correção por NF.'
    ],
    errosComuns: [
      { problema: 'Usar carta de correção para alterar valor', solucao: 'Valor não pode ser corrigido por CC-e; nesse caso, cancele e reemita.' }
    ],
    faq: [
      { pergunta: 'Carta de correção altera o XML?', resposta: 'Não. A CC-e é um documento vinculado à NF, mantendo o XML original intacto.' }
    ],
    anexos: [
      { nome: 'modelo-carta-correcao.txt', tipo: 'Texto', tamanho: '2 KB' }
    ],
    responsavel: 'Equipe Financeiro',
    atualizadoEm: '28/07/2026',
    versao: '1.0',
    historico: [
      { data: '28/07/2026', autor: 'Financeiro', descricao: 'Criação do procedimento.' }
    ],
    observacoesInternas: ''
  },
  {
    id: 'emissao-boletos',
    titulo: 'Emissão de Boletos',
    setor: 'financeiro',
    categoria: 'Cobrança',
    icone: 'bi-upc-scan',
    resumo: 'Geração de boletos de cobrança no banco Itaú, com envio automático ao cliente.',
    tags: ['boleto', 'cobrança', 'itaú', 'pagamento'],
    objetivo:
      'Padronizar a emissão e o envio de boletos, garantindo a integridade dos dados de cobrança e a baixa correta no sistema interno.',
    quandoUtilizar: [
      'Cobrança de mensalidades e serviços recorrentes',
      'Cobrança de acordos firmados com clientes',
      'Reemissão de boleto vencido'
    ],
    preRequisitos: [
      'Cliente cadastrado com endereço de cobrança válido',
      'Contrato com regra de faturamento ativa',
      'Conta bancária Itaú configurada para emissão'
    ],
    passos: [
      { titulo: 'Acessar o módulo de Cobrança', detalhe: 'No sistema interno, abra "Cobrança" e depois "Emissão de boletos".' },
      { titulo: 'Selecionar os títulos', detalhe: 'Marque os títulos em aberto que devem compor o boleto.' },
      { titulo: 'Conferir os dados', detalhe: 'Valide vencimento, valor e descontos/multas configurados.' },
      { titulo: 'Gerar o boleto', detalhe: 'Clique em "Gerar boleto" e confirme o envio automático por e-mail.' },
      { titulo: 'Registrar a emissão', detalhe: 'Confira a situação do título como "Emitido" no sistema.' }
    ],
    observacoes: [
      'Boletos de acordos devem ser gerados com as datas pactuadas no acordo.'
    ],
    errosComuns: [
      { problema: 'Boleto gerado com vencimento errado', solucao: 'Altere a data no título e reemita o boleto antes do vencimento.' },
      { problema: 'E-mail de envio retornando', solucao: 'Confira o cadastro e reenvie o boleto manualmente.' }
    ],
    faq: [
      { pergunta: 'O boleto é enviado automaticamente?', resposta: 'Sim, se o cliente possuir e-mail válido no cadastro e a opção de envio automático estiver ativa.' }
    ],
    video: { titulo: 'Como gerar boletos no Itaú Empresas', url: 'https://www.youtube.com/watch?v=exemplo-boleto' },
    anexos: [
      { nome: 'modelo-email-boleto.txt', tipo: 'Texto', tamanho: '3 KB' }
    ],
    responsavel: 'Equipe Financeiro',
    atualizadoEm: '30/07/2026',
    versao: '1.3',
    historico: [
      { data: '30/07/2026', autor: 'Financeiro', descricao: 'Inclusão da regra de boleto de acordos.' },
      { data: '10/03/2026', autor: 'Financeiro', descricao: 'Criação do procedimento.' }
    ],
    observacoesInternas: 'Verificar tarifa por boleto com o banco no próximo reajuste.'
  },
  {
    id: 'cobranca-clientes',
    titulo: 'Cobrança de Clientes',
    setor: 'financeiro',
    categoria: 'Cobrança',
    icone: 'bi-telephone',
    resumo: 'Rotina de cobrança ativa de títulos em atraso, com regras de contato e negociação.',
    tags: ['cobrança', 'inadimplência', 'negociação', 'contato'],
    objetivo:
      'Padronizar a rotina de cobrança de clientes inadimplentes, definindo prioridades, canais e regras de negociação de descontos.',
    quandoUtilizar: [
      'Títulos com atraso superior a 3 dias',
      'Acordos com pagamento em atraso',
      'Clientes em carteira de cobrança ativa'
    ],
    preRequisitos: [
      'Acesso ao módulo de Cobrança com carteira autorizada',
      'Script de cobrança e tabela de descontos vigente'
    ],
    passos: [
      { titulo: 'Consultar a carteira de atraso', detalhe: 'Abra a fila de cobrança filtrando por atraso e prioridade.' },
      { titulo: 'Realizar o contato', detalhe: 'Siga o script de cobrança, registrando a tentativa e o resultado no atendimento.' },
      { titulo: 'Negociar', detalhe: 'Aplique os descontos permitidos pela tabela vigente e registre o acordo.' },
      { titulo: 'Emitir o boleto do acordo', detalhe: 'Gere o boleto com as datas pactuadas e envie ao cliente.' },
      { titulo: 'Encerrar o atendimento', detalhe: 'Registre o status final e a próxima ação programada.' }
    ],
    observacoes: [
      'Registre TODOS os contatos no histórico do cliente, inclusive os não concluídos.'
    ],
    errosComuns: [
      { problema: 'Conceder desconto acima do autorizado', solucao: 'Descontos acima da tabela exigem aprovação do gestor comercial.' }
    ],
    faq: [
      { pergunta: 'Qual o percentual máximo de desconto?', resposta: 'Consulte a tabela vigente no módulo Comercial > Tabelas.' }
    ],
    anexos: [
      { nome: 'script-cobranca.txt', tipo: 'Texto', tamanho: '4 KB' },
      { nome: 'tabela-descontos.pdf', tipo: 'PDF', tamanho: '120 KB' }
    ],
    responsavel: 'Equipe Financeiro',
    atualizadoEm: '01/08/2026',
    versao: '2.0',
    historico: [
      { data: '01/08/2026', autor: 'Financeiro', descricao: 'Revisão geral com novas regras de priorização.' }
    ],
    observacoesInternas: ''
  },
  {
    id: 'contas-receber',
    titulo: 'Contas a Receber',
    setor: 'financeiro',
    categoria: 'Financeiro',
    icone: 'bi-cash-stack',
    resumo: 'Conciliação e acompanhamento dos valores a receber da carteira de clientes.',
    tags: ['contas a receber', 'fluxo de caixa', 'conciliação'],
    objetivo:
      'Acompanhar a posição de contas a receber, identificar valores em aberto e garantir a conciliação com os pagamentos recebidos.',
    quandoUtilizar: [
      'Rotina diária de acompanhamento do contas a receber',
      'Conciliação bancária dos recebimentos',
      'Análise de inadimplência do mês'
    ],
    preRequisitos: [
      'Acesso ao módulo Financeiro > Contas a Receber',
      'Extrato bancário do período disponível'
    ],
    passos: [
      { titulo: 'Abrir o relatório de Contas a Receber', detalhe: 'Filtre por competência e situação (em aberto, vencido, liquidado).' },
      { titulo: 'Identificar os valores em aberto', detalhe: 'Cruze os títulos em aberto com os pagamentos recebidos no extrato.' },
      { titulo: 'Realizar a baixa manual', detalhe: 'Quando o pagamento não compensar automaticamente, faça a baixa manual com o comprovante.' },
      { titulo: 'Gerar o relatório do dia', detalhe: 'Exporte a posição e envie ao gestor para análise.' }
    ],
    observacoes: [
      'Baixas manuais sempre exigem comprovante anexado ao título.'
    ],
    errosComuns: [
      { problema: 'Valor recebido sem título correspondente', solucao: 'Verifique se é antecipação, pagamento parcial ou depósito identificado incorretamente.' }
    ],
    faq: [
      { pergunta: 'Como tratar pagamento parcial?', resposta: 'Lance o valor parcial como baixa parcial e mantenha o saldo remanescente em aberto.' }
    ],
    anexos: [
      { nome: 'modelo-relatorio-receber.xlsx', tipo: 'Planilha', tamanho: '45 KB' }
    ],
    responsavel: 'Equipe Financeiro',
    atualizadoEm: '27/07/2026',
    versao: '1.2',
    historico: [
      { data: '27/07/2026', autor: 'Financeiro', descricao: 'Atualização do modelo de relatório.' }
    ],
    observacoesInternas: ''
  },
  {
    id: 'contas-pagar',
    titulo: 'Contas a Pagar',
    setor: 'financeiro',
    categoria: 'Financeiro',
    icone: 'bi-credit-card',
    resumo: 'Controle de obrigações financeiras, vencimentos e liberação de pagamentos.',
    tags: ['contas a pagar', 'pagamentos', 'fornecedores', 'vencimento'],
    objetivo:
      'Garantir o controle das obrigações financeiras da empresa, com vencimentos monitorados e pagamentos aprovados dentro do fluxo.',
    quandoUtilizar: [
      'Cadastro de novas despesas e obrigações',
      'Liberação de pagamentos para fornecedores',
      'Rotina de verificação de vencimentos'
    ],
    preRequisitos: [
      'Nota fiscal ou contrato da despesa',
      'Aprovação do responsável da área'
    ],
    passos: [
      { titulo: 'Cadastrar a obrigação', detalhe: 'No módulo Contas a Pagar, informe fornecedor, valor, vencimento e centro de custo.' },
      { titulo: 'Anexar a nota fiscal', detalhe: 'Vincule o documento de suporte à obrigação.' },
      { titulo: 'Agendar a liberação', detalhe: 'Solicite a aprovação e agende a data de pagamento.' },
      { titulo: 'Efetuar o pagamento', detalhe: 'Após aprovado, realize o pagamento e registre a baixa.' },
      { titulo: 'Conciliar', detalhe: 'Confirme a compensação no extrato bancário.' }
    ],
    observacoes: [
      'Nenhum pagamento deve ser realizado sem a aprovação registrada no sistema.'
    ],
    errosComuns: [
      { problema: 'Pagamento duplicado', solucao: 'Sempre confira a situação da obrigação antes de efetuar a liberação.' }
    ],
    faq: [
      { pergunta: 'Quem aprova os pagamentos?', resposta: 'Os pagamentos são aprovados pelo responsável financeiro e pela diretoria conforme o valor.' }
    ],
    anexos: [
      { nome: 'fluxo-aprovacao-pagamento.pdf', tipo: 'PDF', tamanho: '150 KB' }
    ],
    responsavel: 'Equipe Financeiro',
    atualizadoEm: '29/07/2026',
    versao: '1.1',
    historico: [
      { data: '29/07/2026', autor: 'Financeiro', descricao: 'Ajuste no fluxo de aprovação.' }
    ],
    observacoesInternas: ''
  },
  {
    id: 'conciliacao-bancaria',
    titulo: 'Conciliação Bancária',
    setor: 'financeiro',
    categoria: 'Financeiro',
    icone: 'bi-arrow-repeat',
    resumo: 'Conciliação entre os lançamentos do sistema e o extrato bancário.',
    tags: ['conciliação', 'banco', 'extrato', 'financeiro'],
    objetivo:
      'Garantir que os lançamentos financeiros do sistema estejam de acordo com o extrato bancário, identificando divergências e pendências.',
    quandoUtilizar: [
      'Rotina semanal de conciliação',
      'Fechamento mensal do financeiro',
      'Identificação de valores não conciliados'
    ],
    preRequisitos: [
      'Extrato bancário do período',
      'Acesso ao módulo Financeiro > Conciliação'
    ],
    passos: [
      { titulo: 'Importar o extrato', detalhe: 'Importe o arquivo OFX ou TXT do banco no módulo de conciliação.' },
      { titulo: 'Conferir os lançamentos', detalhe: 'Compare automaticamente os lançamentos do sistema com o extrato.' },
      { titulo: 'Resolver divergências', detalhe: 'Corrija classificações erradas e identifique lançamentos sem correspondência.' },
      { titulo: 'Confirmar a conciliação', detalhe: 'Finalize o período e gere o relatório de conciliação.' }
    ],
    observacoes: [
      'Lançamentos sem correspondência devem ser tratados no mesmo período de conciliação.'
    ],
    errosComuns: [
      { problema: 'Taxa bancária não lançada', solucao: 'Lance manualmente as tarifas identificadas no extrato antes de confirmar.' }
    ],
    faq: [
      { pergunta: 'Com que frequência conciliar?', resposta: 'Recomenda-se a conciliação semanal e obrigatória no fechamento mensal.' }
    ],
    anexos: [
      { nome: 'modelo-conciliacao.xlsx', tipo: 'Planilha', tamanho: '60 KB' }
    ],
    responsavel: 'Equipe Financeiro',
    atualizadoEm: '25/07/2026',
    versao: '1.3',
    historico: [
      { data: '25/07/2026', autor: 'Financeiro', descricao: 'Inclusão do suporte ao formato OFX.' }
    ],
    observacoesInternas: ''
  },
  {
    id: 'fechamento-financeiro',
    titulo: 'Fechamento Financeiro',
    setor: 'financeiro',
    categoria: 'Financeiro',
    icone: 'bi-clipboard-check',
    resumo: 'Fechamento mensal consolidando recebimentos, pagamentos e divergências.',
    tags: ['fechamento', 'mensal', 'financeiro', 'relatório'],
    objetivo:
      'Consolidar o resultado financeiro do período, validar a conciliação e gerar o relatório gerencial mensal.',
    quandoUtilizar: [
      'Últimos dias do mês ou primeiro dia útil do mês seguinte',
      'Sempre que houver necessidade de fechamento antecipado por gestão'
    ],
    preRequisitos: [
      'Todas as conciliações do período concluídas',
      'Contas a receber e a pagar revisadas',
      'Extratos bancários do mês importados'
    ],
    passos: [
      { titulo: 'Revisar recebimentos', detalhe: 'Confirme que todos os recebimentos do período foram baixados.' },
      { titulo: 'Revisar pagamentos', detalhe: 'Valide os pagamentos realizados e pendentes.' },
      { titulo: 'Conferir divergências', detalhe: 'Trate os lançamentos pendentes de conciliação.' },
      { titulo: 'Gerar o relatório gerencial', detalhe: 'Gere o resumo financeiro do mês e envie ao gestor.' },
      { titulo: 'Arquivar o fechamento', detalhe: 'Salve o relatório no diretório do mês no drive compartilhado.' }
    ],
    observacoes: [
      'O fechamento só deve ser concluído com todas as pendências de conciliação resolvidas ou justificadas.'
    ],
    errosComuns: [
      { problema: 'Esquecer recebimento via PIX', solucao: 'Confira os lançamentos PIX antes de confirmar o fechamento.' }
    ],
    faq: [
      { pergunta: 'Posso fechar o mês com pendências?', resposta: 'Sim, desde que as pendências estejam identificadas e justificadas no relatório.' }
    ],
    anexos: [
      { nome: 'modelo-fechamento-mensal.xlsx', tipo: 'Planilha', tamanho: '80 KB' }
    ],
    responsavel: 'Equipe Financeiro',
    atualizadoEm: '31/07/2026',
    versao: '1.5',
    historico: [
      { data: '31/07/2026', autor: 'Financeiro', descricao: 'Novo modelo de relatório gerencial.' }
    ],
    observacoesInternas: ''
  },
  {
    id: 'cadastro-cliente',
    titulo: 'Cadastro de Cliente',
    setor: 'financeiro',
    categoria: 'Cadastro',
    icone: 'bi-person-plus',
    resumo: 'Cadastro completo do cliente no sistema interno, com dados fiscais e de cobrança.',
    tags: ['cadastro', 'cliente', 'fiscal', 'cobrança'],
    objetivo:
      'Padronizar o cadastro de novos clientes, garantindo dados fiscais, comerciais e de cobrança completos e válidos.',
    quandoUtilizar: [
      'Novo cliente aprovado pelo comercial',
      'Alteração de dados cadastrais de clientes existentes'
    ],
    preRequisitos: [
      'CNPJ/CPF válido e documentos comerciais assinados',
      'Aprovação do contrato pelo comercial'
    ],
    passos: [
      { titulo: 'Abrir o módulo de Clientes', detalhe: 'No sistema interno, acesse "Cadastros" > "Clientes".' },
      { titulo: 'Informar os dados', detalhe: 'Preencha razão social, CNPJ, inscrição estadual, endereço e contatos.' },
      { titulo: 'Configurar a cobrança', detalhe: 'Defina prazo, boleto/e-mail de envio e regra de faturamento.' },
      { titulo: 'Vincular o contrato', detalhe: 'Associe o contrato vigente e as licenças contratadas.' },
      { titulo: 'Salvar e validar', detalhe: 'Salve e valide os dados fiscais com a SEFAZ antes de ativar.' }
    ],
    observacoes: [
      'Clientes sem validação fiscal ativa não devem receber faturamento.'
    ],
    errosComuns: [
      { problema: 'E-mail de cobrança errado', solucao: 'Confirme o e-mail com o cliente antes de finalizar o cadastro.' }
    ],
    faq: [
      { pergunta: 'O cadastro é validado automaticamente?', resposta: 'Sim, o sistema consulta a SEFAZ para validar CNPJ e IE.' }
    ],
    video: { titulo: 'Cadastro completo de cliente', url: 'https://www.youtube.com/watch?v=exemplo-cadastro' },
    anexos: [
      { nome: 'checklist-cadastro-cliente.pdf', tipo: 'PDF', tamanho: '110 KB' }
    ],
    responsavel: 'Equipe Financeiro',
    atualizadoEm: '26/07/2026',
    versao: '1.2',
    historico: [
      { data: '26/07/2026', autor: 'Financeiro', descricao: 'Inclusão da etapa de validação fiscal.' }
    ],
    observacoesInternas: ''
  }
];

export const procedimentosRh: Procedimento[] = [
  {
    id: 'rh-admissao',
    titulo: 'Admissão de Colaborador',
    setor: 'rh',
    categoria: 'Admissão',
    icone: 'bi-person-plus-fill',
    resumo: 'Fluxo de admissão, da documentação à contratação formal no eSocial.',
    tags: ['admissão', 'rh', 'eSocial', 'contratação'],
    objetivo:
      'Padronizar o processo de admissão de novos colaboradores, garantindo a documentação completa e o registro correto no eSocial.',
    quandoUtilizar: [
      'Contratação de novo colaborador',
      'Admissão após aprovação do gestor da área'
    ],
    preRequisitos: [
      'Currículo aprovado e proposta aceita',
      'Documentos pessoais do colaborador em mãos'
    ],
    passos: [
      { titulo: 'Coletar a documentação', detalhe: 'Reúna RG, CPF, comprovantes, dados bancários e exames admissionais.' },
      { titulo: 'Preencher a ficha de admissão', detalhe: 'Registre os dados no sistema de RH e anexe os documentos.' },
      { titulo: 'Registrar no eSocial', detalhe: 'Envie o evento de admissão (S-2200) no prazo legal.' },
      { titulo: 'Realizar a integração', detalhe: 'Apresente a empresa, a política interna e os sistemas utilizados.' },
      { titulo: 'Liberar os acessos', detalhe: 'Solicite a criação de usuário e os acessos aos sistemas.' }
    ],
    observacoes: [
      'O envio do eSocial deve ocorrer até o dia útil anterior ao início das atividades.'
    ],
    errosComuns: [
      { problema: 'Exame admissional vencido', solucao: 'Verifique a validade do ASO antes de iniciar o colaborador.' }
    ],
    faq: [
      { pergunta: 'Quais exames são necessários?', resposta: 'O ASO admissional, conforme o cargo e os riscos da função.' }
    ],
    anexos: [
      { nome: 'checklist-admissao.pdf', tipo: 'PDF', tamanho: '130 KB' }
    ],
    responsavel: 'RH / Departamento Pessoal',
    atualizadoEm: '03/08/2026',
    versao: '1.6',
    historico: [
      { data: '03/08/2026', autor: 'RH', descricao: 'Atualização do checklist de documentos.' }
    ],
    observacoesInternas: ''
  },
  {
    id: 'rh-ferias',
    titulo: 'Solicitação de Férias',
    setor: 'rh',
    categoria: 'Férias',
    icone: 'bi-sun',
    resumo: 'Solicitação, aprovação e programação das férias do colaborador.',
    tags: ['férias', 'rh', 'período de gozo'],
    objetivo:
      'Orientar o colaborador e o RH sobre o processo de solicitação e programação de férias, respeitando a legislação.',
    quandoUtilizar: [
      'Colaborador em período aquisitivo vencido',
      'Programação anual de férias da equipe'
    ],
    preRequisitos: [
      'Período aquisitivo completo',
      'Aprovação do gestor imediato'
    ],
    passos: [
      { titulo: 'Solicitar no sistema de RH', detalhe: 'O colaborador abre a solicitação indicando o período desejado.' },
      { titulo: 'Aprovar pelo gestor', detalhe: 'O gestor valida a solicitação respeitando o escalonamento da equipe.' },
      { titulo: 'Programar no eSocial', detalhe: 'O RH envia o evento de férias (S-2230) e registra o pagamento.' },
      { titulo: 'Avisar o colaborador', detalhe: 'Confirme por escrito o período de gozo aprovado.' }
    ],
    observacoes: [
      'As férias devem ser concedidas dentro dos 12 meses seguintes ao período aquisitivo.'
    ],
    errosComuns: [
      { problema: 'Período em conflito com outro colaborador', solucao: 'Consulte o escalonamento antes de aprovar.' }
    ],
    faq: [
      { pergunta: 'Posso vender 1/3 das férias?', resposta: 'Sim, a conversão em abono pecuniário deve ser solicitada até 15 dias antes do término do período aquisitivo.' }
    ],
    anexos: [
      { nome: 'modelo-solicitacao-ferias.txt', tipo: 'Texto', tamanho: '2 KB' }
    ],
    responsavel: 'RH / Departamento Pessoal',
    atualizadoEm: '29/07/2026',
    versao: '1.1',
    historico: [
      { data: '29/07/2026', autor: 'RH', descricao: 'Revisão dos prazos.' }
    ],
    observacoesInternas: ''
  },
  {
    id: 'rh-desligamento',
    titulo: 'Desligamento de Colaborador',
    setor: 'rh',
    categoria: 'Desligamento',
    icone: 'bi-person-dash-fill',
    resumo: 'Processo de desligamento, homologação, rescisão e devolução de acessos.',
    tags: ['desligamento', 'rh', 'rescisão', 'homologação'],
    objetivo:
      'Executar o desligamento de colaboradores de forma organizada, com rescisão correta e devolução integral de acessos e materiais.',
    quandoUtilizar: [
      'Desligamento por iniciativa do colaborador ou da empresa',
      'Fim de contrato temporário'
    ],
    preRequisitos: [
      'Comunicação formal do desligamento',
      'Verificação de pendências (férias, materiais, acessos)'
    ],
    passos: [
      { titulo: 'Registrar o desligamento', detalhe: 'Abra a solicitação no sistema de RH informando o tipo e a data.' },
      { titulo: 'Coletar devoluções', detalhe: 'Recolha crachá, equipamentos, chaves e materiais da empresa.' },
      { titulo: 'Encerrar acessos', detalhe: 'Revogue os acessos aos sistemas e ao e-mail corporativo.' },
      { titulo: 'Calcular a rescisão', detalhe: 'Gere os cálculos de verbas rescisórias e os documentos de homologação.' },
      { titulo: 'Registrar no eSocial', detalhe: 'Envie o evento de desligamento (S-2299) e baixe a guia de rescisão.' }
    ],
    observacoes: [
      'A homologação pode ser obrigatória conforme o tempo de vínculo; verifique sempre.'
    ],
    errosComuns: [
      { problema: 'Acesso não revogado', solucao: 'Use o checklist de desligamento para garantir a revogação de todos os acessos.' }
    ],
    faq: [
      { pergunta: 'O que é necessário para a homologação?', resposta: 'Documentos de rescisão assinados e o termo de quitação, quando aplicável.' }
    ],
    anexos: [
      { nome: 'checklist-desligamento.pdf', tipo: 'PDF', tamanho: '140 KB' }
    ],
    responsavel: 'RH / Departamento Pessoal',
    atualizadoEm: '02/08/2026',
    versao: '1.4',
    historico: [
      { data: '02/08/2026', autor: 'RH', descricao: 'Atualização do fluxo de homologação.' }
    ],
    observacoesInternas: ''
  },
  {
    id: 'rh-atestados',
    titulo: 'Recebimento de Atestados',
    setor: 'rh',
    categoria: 'Atestados',
    icone: 'bi-file-medical',
    resumo: 'Regras e fluxo para recebimento, análise e lançamento de atestados médicos.',
    tags: ['atestado', 'rh', 'afastamento', 'INSS'],
    objetivo:
      'Estabelecer o fluxo de recebimento e análise de atestados médicos, com a correta classificação e o lançamento no sistema.',
    quandoUtilizar: [
      'Colaborador apresenta atestado médico',
      'Afastamento acima de 15 dias (encaminhamento ao INSS)'
    ],
    preRequisitos: [
      'Atestado legível com CID informado',
      'Apresentação em até 48h após a emissão'
    ],
    passos: [
      { titulo: 'Receber o atestado', detalhe: 'Confira a validade e a identificação do colaborador no documento.' },
      { titulo: 'Analisar o documento', detalhe: 'Verifique CID, período de afastamento e emissor.' },
      { titulo: 'Lançar no sistema de RH', detalhe: 'Registre o afastamento com data inicial e final.' },
      { titulo: 'Arquivar', detalhe: 'Digitalize e arquive o atestado no prontuário do colaborador.' }
    ],
    observacoes: [
      'Afastamentos acima de 15 dias exigem encaminhamento ao INSS via eSocial.'
    ],
    errosComuns: [
      { problema: 'Atestado com rasuras', solucao: 'Solicite novo documento ou confirmação do emissor.' }
    ],
    faq: [
      { pergunta: 'Qual o prazo para entregar o atestado?', resposta: 'Em até 48 horas a contar da data de emissão.' }
    ],
    anexos: [
      { nome: 'modelo-afastamento.pdf', tipo: 'PDF', tamanho: '95 KB' }
    ],
    responsavel: 'RH / Departamento Pessoal',
    atualizadoEm: '31/07/2026',
    versao: '1.0',
    historico: [
      { data: '31/07/2026', autor: 'RH', descricao: 'Criação do procedimento.' }
    ],
    observacoesInternas: ''
  }
];

export const todosProcedimentos: Procedimento[] = [
  ...procedimentosFinanceiro,
  ...procedimentosRh
];
