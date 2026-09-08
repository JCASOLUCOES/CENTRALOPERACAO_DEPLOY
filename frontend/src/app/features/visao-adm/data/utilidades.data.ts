export type StatusUtilidade = 'online' | 'offline' | 'indefinido';

export interface HistoricoUtilidade {
  data: string;
  descricao: string;
}

export interface Utilidade {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  url: string;
  icone: string;
  cor: string;
  ordem: number;
  favoritoDefault: boolean;
  status: StatusUtilidade;
  responsavel?: string;
  tags: string[];
  observacoes?: string;
  atualizadoEm?: string;
  historico?: HistoricoUtilidade[];
}

export interface UtilidadeRuntime {
  acessos: number;
  ultimoAcesso: string | null;
}

export const categoriasUtilidades: { id: string; nome: string; icone: string; cor: string }[] = [
  { id: 'Financeiro', nome: 'Financeiro', icone: 'bi-cash-coin', cor: '#16a34a' },
  { id: 'Departamento Pessoal', nome: 'Departamento Pessoal', icone: 'bi-people-fill', cor: '#2563eb' },
  { id: 'Benefícios', nome: 'Benefícios', icone: 'bi-gift-fill', cor: '#0891b2' },
  { id: 'Jurídico', nome: 'Jurídico', icone: 'bi-briefcase-fill', cor: '#7c3aed' },
  { id: 'Marketing', nome: 'Marketing', icone: 'bi-megaphone-fill', cor: '#ea580c' }
];

export const corPorCategoria: Record<string, string> = {
  Financeiro: '#16a34a',
  'Departamento Pessoal': '#2563eb',
  'Benefícios': '#0891b2',
  'Jurídico': '#7c3aed',
  'Marketing': '#ea580c'
};

export const iconePorCategoria: Record<string, string> = {
  Financeiro: 'bi-cash-coin',
  'Departamento Pessoal': 'bi-people-fill',
  'Benefícios': 'bi-gift-fill',
  'Jurídico': 'bi-scale-bag-fill',
  'Marketing': 'bi-megaphone-fill'
};

export const utilidades: Utilidade[] = [
  // ── FINANCEIRO ──
  {
    id: 'emissao-nota-fiscal',
    nome: 'Emissão de Nota Fiscal',
    descricao: 'Emissão de Nota Fiscal de Serviços da Prefeitura.',
    categoria: 'Financeiro',
    url: 'https://iss.fortaleza.ce.gov.br/grpfor/login.seam',
    icone: 'bi-receipt',
    cor: '#16a34a',
    ordem: 1,
    favoritoDefault: true,
    status: 'online',
    responsavel: 'Financeiro',
    tags: ['nota', 'fiscal', 'nf', 'iss', 'prefeitura', 'serviço', 'imposto', 'boleto'],
    observacoes: 'Autorização via certificado digital do responsável fiscal.',
    atualizadoEm: '05/08/2026',
    historico: [
      { data: '05/08/2026', descricao: 'URL atualizada para o novo portal da Prefeitura.' }
    ]
  },
  {
    id: 'itau-empresas',
    nome: 'Itaú Empresas',
    descricao: 'Acesso ao Internet Banking para pagamentos, extratos e movimentações financeiras.',
    categoria: 'Financeiro',
    url: 'https://www.itau.com.br/',
    icone: 'bi-bank',
    cor: '#f5a623',
    ordem: 2,
    favoritoDefault: true,
    status: 'online',
    responsavel: 'Financeiro',
    tags: ['banco', 'itau', 'pagamento', 'extrato', 'boleto', 'movimentação', 'financeiro'],
    atualizadoEm: '05/08/2026',
    historico: [
      { data: '05/08/2026', descricao: 'Registro inicial do acesso.' }
    ]
  },
  {
    id: 'fgts-digital',
    nome: 'FGTS Digital',
    descricao: 'Portal oficial para geração e gerenciamento das guias do FGTS.',
    categoria: 'Financeiro',
    url: 'https://fgtsdigital.sistema.gov.br/',
    icone: 'bi-building',
    cor: '#0f766e',
    ordem: 3,
    favoritoDefault: false,
    status: 'online',
    responsavel: 'Departamento Pessoal',
    tags: ['fgts', 'guia', 'rescisão', 'digital', 'trabalhista', 'imposto'],
    atualizadoEm: '04/08/2026',
    historico: [
      { data: '04/08/2026', descricao: 'Atualização das regras de geração de guias.' }
    ]
  },
  {
    id: 'dctfweb',
    nome: 'DCTFWeb',
    descricao: 'Declarações e tributos federais.',
    categoria: 'Financeiro',
    url: 'https://cav.receita.fazenda.gov.br/autenticacao/login',
    icone: 'bi-file-earmark-spreadsheet',
    cor: '#475569',
    ordem: 4,
    favoritoDefault: false,
    status: 'online',
    responsavel: 'Financeiro',
    tags: ['dctf', 'web', 'imposto', 'tributo', 'federal', 'declaração', 'receita'],
    observacoes: 'Exige certificado digital para acesso completo.',
    atualizadoEm: '03/08/2026',
    historico: [
      { data: '03/08/2026', descricao: 'Vínculo com a conta gov.br.' }
    ]
  },

  // ───────── DEPARTAMENTO PESSOAL ─────────
  {
    id: 'iob',
    nome: 'IOB',
    descricao: 'Consultoria Fiscal, Trabalhista, Contábil e Previdenciária.',
    categoria: 'Departamento Pessoal',
    url: 'https://app.iob.com.br/',
    icone: 'bi-journal-bookmark',
    cor: '#2563eb',
    ordem: 5,
    favoritoDefault: true,
    status: 'online',
    responsavel: 'Departamento Pessoal',
    tags: ['iob', 'fiscal', 'trabalhista', 'contábil', 'previdenciária', 'consultoria'],
    observacoes: 'Acesso liberado apenas para contabilidade e RH.',
    atualizadoEm: '05/08/2026',
    historico: [
      { data: '05/08/2026', descricao: 'Credenciais atualizadas.' }
    ]
  },
  {
    id: 'rhid',
    nome: 'RHID',
    descricao: 'Sistema de Controle de Ponto.',
    categoria: 'Departamento Pessoal',
    url: 'https://www.rhid.com.br/v2/#/login',
    icone: 'bi-clock-history',
    cor: '#7c3aed',
    ordem: 6,
    favoritoDefault: true,
    status: 'online',
    responsavel: 'Departamento Pessoal',
    tags: ['pont', 'ponto', 'frequência', 'marcação', 'rh', 'controle'],
    atualizadoEm: '05/08/2026',
    historico: [
      { data: '05/08/2026', descricao: 'Acesso inicial registrado.' }
    ]
  },
  {
    id: 'hapvida-empresas',
    nome: 'Hapvida Empresas',
    descricao: 'Portal administrativo do Plano de Saúde.',
    categoria: 'Departamento Pessoal',
    url: 'https://www2.hapvida.com.br/empresas',
    icone: 'bi-heart-pulse',
    cor: '#0284c7',
    ordem: 6,
    favoritoDefault: false,
    status: 'online',
    responsavel: 'Departamento Pessoal',
    tags: ['saúde', 'plano', 'hapvida', 'benefício', 'médico', 'assistência'],
    atualizadoEm: '02/08/2026',
    historico: [
      { data: '02/08/2026', descricao: 'Registro administrativo.' }
    ]
  },

  // ───────── BENEFÍCIOS ─────────
  {
    id: 'wellhub',
    nome: 'Wellhub',
    descricao: 'Gestão do benefício Wellhub (Gympass).',
    categoria: 'Benefícios',
    url: 'https://wellhub.com/pt-br',
    icone: 'bi-stars',
    cor: '#e0245e',
    ordem: 7,
    favoritoDefault: false,
    status: 'online',
    responsavel: 'Recursos Humanos',
    tags: ['wellhub', 'gympass', 'academia', 'benefício', 'saúde', 'bem-estar'],
    atualizadoEm: '05/08/2026',
    historico: [
      { data: '05/08/2026', descricao: 'Adição do acesso pelo portal Wellhub.' }
    ]
  },
  {
    id: 'pluxee',
    nome: 'Pluxee',
    descricao: 'Portal do Vale Refeição e Alimentação.',
    categoria: 'Benefícios',
    url: 'https://www.pluxee.com.br/',
    icone: 'bi-wallet2',
    cor: '#f59e0b',
    ordem: 8,
    favoritoDefault: false,
    status: 'online',
    responsavel: 'Departamento Pessoal',
    tags: ['pluxee', 'vale refeição', 'alimentação', 'sodex', 'benefício', 'cartão'],
    atualizadoEm: '04/08/2026',
    historico: [
      { data: '04/08/2026', descricao: 'Migração do benefício para o portal Pluxee.' }
    ]
  },
  {
    id: 'vt-fortaleza',
    nome: 'VT Fortaleza',
    descricao: 'Portal para gestão do Vale Transporte.',
    categoria: 'Benefícios',
    url: 'https://www.vtefortaleza.com.br/Login',
    icone: 'bi-bus-front',
    cor: '#0ea5e9',
    ordem: 9,
    favoritoDefault: false,
    status: 'online',
    responsavel: 'RH',
    tags: ['vt', 'vale transporte', 'transporte', 'fortaleza', 'cartão', 'ct'],
    atualizadoEm: '03/08/2026',
    historico: [
      { data: '03/08/2026', descricao: 'Acesso inicial registrado.' }
    ]
  },

  // ───────── JURÍDICO ─────────
  {
    id: 'clicksign',
    nome: 'Clicksign',
    descricao: 'Assinaturas Digitais.',
    categoria: 'Jurídico',
    url: 'https://app.clicksign.com/',
    icone: 'bi-pen',
    cor: '#7c3aed',
    ordem: 10,
    favoritoDefault: true,
    status: 'online',
    responsavel: 'Comercial / Jurídico',
    tags: ['assinatura', 'digital', 'contrato', 'jurídico', 'documento', 'clicksign'],
    observacoes: 'Certificado de assinatura com custo por documento.',
    atualizadoEm: '05/08/2026',
    historico: [
      { data: '05/08/2026', descricao: 'Revisão de permissões dos usuários.' }
    ]
  },
  {
    id: 'receita-cnpj',
    nome: 'Receita Federal',
    descricao: 'Consulta da situação cadastral do CNPJ.',
    categoria: 'Jurídico',
    url: 'https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/',
    icone: 'bi-building-check',
    cor: '#dc2626',
    ordem: 11,
    favoritoDefault: true,
    status: 'online',
    responsavel: 'Jurídico',
    tags: ['cnpj', 'situação', 'cadastral', 'receita', 'federal', 'consulta', 'jurídico'],
    atualizadoEm: '05/08/2026',
    historico: [
      { data: '05/08/2026', descricao: 'Registro da consulta pública.' }
    ]
  },

  // ───────── MARKETING ─────────
  {
    id: 'canva',
    nome: 'Canva',
    descricao: 'Criação de apresentações, materiais institucionais e artes.',
    categoria: 'Marketing',
    url: 'https://www.canva.com/',
    icone: 'bi-palette',
    cor: '#4c1d95',
    ordem: 12,
    favoritoDefault: true,
    status: 'online',
    responsavel: 'Marketing',
    tags: ['canva', 'design', 'apresentação', 'arte', 'marketing', 'criativo', 'férias'],
    observacoes: 'Conta corporativa com bibliotecas compartilhadas.',
    atualizadoEm: '05/08/2026',
    historico: [
      { data: '05/08/2026', descricao: 'Atualização de membros da biblioteca.' }
    ]
  },
  {
    id: 'capcut',
    nome: 'CapCut',
    descricao: 'Edição de vídeos para campanhas e redes sociais.',
    categoria: 'Marketing',
    url: 'https://www.capcut.com/',
    icone: 'bi-camera-reel',
    cor: '#0f172a',
    ordem: 13,
    favoritoDefault: false,
    status: 'online',
    responsavel: 'Marketing',
    tags: ['capcut', 'vídeo', 'edição', 'redes sociais', 'campanha', 'marketing'],
    atualizadoEm: '04/08/2026',
    historico: [
      { data: '04/08/2026', descricao: 'Registro da ferramenta.' }
    ]
  }
];