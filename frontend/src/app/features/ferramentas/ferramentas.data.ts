export interface FerramentaLink {
  rotulo: string;
  url: string;
  externo?: boolean;
}

export interface Ferramenta {
  id: string;
  nome: string;
  icone: string;
  categoria: string;
  descricao: string;
  url: string;
  externo: boolean;
  tags: string[];
}

export interface FerramentaCategoria {
  id: string;
  nome: string;
  icone: string;
  cor: string;
  descricao: string;
}

export const categoriasFerramentas: FerramentaCategoria[] = [
  { id: 'downloads', nome: 'Downloads', icone: 'bi-download', cor: '#2563eb', descricao: 'Softwares e aplicativos para instacao nos postos de trabalho.' },
  { id: 'ferramentas-online', nome: 'Ferramentas Online', icone: 'bi-globe', cor: '#0ea5e9', descricao: 'Sites e ferramentas web para validacao, teste e consultas.' },
  { id: 'markdown-documentacao', nome: 'Markdown e Documentacao', icone: 'bi-markdown', cor: '#8b5cf6', descricao: 'Conversao e edicao de documentos em Markdown para documentacao tecnica.' }
];

export const ferramentas: Ferramenta[] = [
  {
    id: 'anydesk',
    nome: 'AnyDesk',
    icone: 'bi-display',
    categoria: 'downloads',
    descricao: 'Acesso remoto rapido e seguro para suporte tecnico e assistencia a distancia.',
    url: 'https://anydesk.com/downloads/windows',
    externo: true,
    tags: ['acesso remoto', 'suporte', 'desktop']
  },
  {
    id: 'postman',
    nome: 'Postman',
    icone: 'bi-send',
    categoria: 'downloads',
    descricao: 'Plataforma para testes e desenvolvimento de APIs REST e GraphQL.',
    url: 'https://www.postman.com/downloads/',
    externo: true,
    tags: ['api', 'teste', 'rest', 'http']
  },
  {
    id: 'forticlient',
    nome: 'FortiClient VPN',
    icone: 'bi-shield-lock',
    categoria: 'downloads',
    descricao: 'Cliente VPN da Fortinet para acesso seguro a redes corporativas.',
    url: 'https://www.fortinet.com/support/product-downloads/forticlient',
    externo: true,
    tags: ['vpn', 'fortinet', 'seguranca', 'rede']
  },
  {
    id: 'openvpn',
    nome: 'OpenVPN',
    icone: 'bi-shield-check',
    categoria: 'downloads',
    descricao: 'Cliente VPN open source para conexao segura a redes privadas.',
    url: 'https://openvpn.net/community-downloads/',
    externo: true,
    tags: ['vpn', 'open source', 'rede']
  },
  {
    id: 'visual-studio-2022',
    nome: 'Visual Studio 2022',
    icone: 'bi-code-square',
    categoria: 'downloads',
    descricao: 'IDE completo da Microsoft para desenvolvimento em C#, .NET, C++ e mais.',
    url: 'https://visualstudio.microsoft.com/pt-br/',
    externo: true,
    tags: ['ide', 'desenvolvimento', 'microsoft', 'csharp', 'dotnet']
  },
  {
    id: 'vs-code',
    nome: 'Visual Studio Code',
    icone: 'bi-filetype-jsx',
    categoria: 'downloads',
    descricao: 'Editor de codigo leve e extensivel da Microsoft para diversas linguagens.',
    url: 'https://code.visualstudio.com/',
    externo: true,
    tags: ['editor', 'codigo', 'desenvolvimento']
  },
  {
    id: 'ssms',
    nome: 'SQL Server Management Studio',
    icone: 'bi-database',
    categoria: 'downloads',
    descricao: 'Ferramenta grafica para gerenciar e consultar bancos SQL Server.',
    url: 'https://learn.microsoft.com/sql/ssms/download-sql-server-management-studio-ssms',
    externo: true,
    tags: ['sql server', 'banco', 'database', 'query']
  },
  {
    id: 'git',
    nome: 'Git',
    icone: 'bi-git',
    categoria: 'downloads',
    descricao: 'Sistema de controle de versao distribuido para desenvolvimento colaborativo.',
    url: 'https://git-scm.com/downloads',
    externo: true,
    tags: ['versionamento', 'repositorio', 'controle de versao']
  },
  {
    id: 'github-desktop',
    nome: 'GitHub Desktop',
    icone: 'bi-github',
    categoria: 'downloads',
    descricao: 'Interface grafica simples para gerenciar repositorios GitHub.',
    url: 'https://desktop.github.com/',
    externo: true,
    tags: ['github', 'git', 'repositorio']
  },
  {
    id: 'nodejs',
    nome: 'Node.js',
    icone: 'bi-hexagon',
    categoria: 'downloads',
    descricao: 'Runtime JavaScript para aplicacoes server-side e ferramentas CLI.',
    url: 'https://nodejs.org/',
    externo: true,
    tags: ['javascript', 'runtime', 'npm', 'desenvolvimento']
  },
  {
    id: 'docker-desktop',
    nome: 'Docker Desktop',
    icone: 'bi-box-seam',
    categoria: 'downloads',
    descricao: 'Plataforma para criar e gerenciar containers e microsservicos.',
    url: 'https://www.docker.com/products/docker-desktop/',
    externo: true,
    tags: ['containers', 'docker', 'devops']
  },
  {
    id: 'google-chrome',
    nome: 'Google Chrome',
    icone: 'bi-browser-chrome',
    categoria: 'downloads',
    descricao: 'Navegador web rapido e seguro do Google.',
    url: 'https://www.google.com/chrome/',
    externo: true,
    tags: ['navegador', 'web', 'internet']
  },
  {
    id: 'notepad-plus-plus',
    nome: 'Notepad++',
    icone: 'bi-file-earmark-text',
    categoria: 'downloads',
    descricao: 'Editor de texto leve para Windows com suporte a syntax highlighting.',
    url: 'https://notepad-plus-plus.org/downloads/',
    externo: true,
    tags: ['editor', 'texto', 'codigo']
  },
  {
    id: 'textpad',
    nome: 'TextPad',
    icone: 'bi-filetype-txt',
    categoria: 'downloads',
    descricao: 'Editor de texto profissional para Windows com recursos avancados.',
    url: 'https://www.textpad.com/home',
    externo: true,
    tags: ['editor', 'texto']
  },
  {
    id: '7zip',
    nome: '7-Zip',
    icone: 'bi-archive',
    categoria: 'downloads',
    descricao: 'Compactador e descompactador de arquivos gratuito e open source.',
    url: 'https://www.7-zip.org/',
    externo: true,
    tags: ['compactador', 'zip', 'arquivo']
  },
  {
    id: 'winrar',
    nome: 'WinRAR',
    icone: 'bi-folder-zip',
    categoria: 'downloads',
    descricao: 'Compactador de arquivos com suporte a multiplos formatos.',
    url: 'https://www.win-rar.com/',
    externo: true,
    tags: ['compactador', 'rar', 'arquivo']
  },
  {
    id: 'json-viewer',
    nome: 'JSON Online Viewer',
    icone: 'bi-braces',
    categoria: 'ferramentas-online',
    descricao: 'Visualizacao, formatacao e validacao de arquivos JSON.',
    url: 'https://json.onlineviewer.net/',
    externo: true,
    tags: ['json', 'validacao', 'formatador', 'online']
  },
  {
    id: 'xml-viewer',
    nome: 'XML Online Viewer',
    icone: 'bi-code-slash',
    categoria: 'ferramentas-online',
    descricao: 'Visualizacao, formatacao e validacao de arquivos XML.',
    url: 'https://xml.onlineviewer.net/',
    externo: true,
    tags: ['xml', 'validacao', 'formatador', 'online']
  },
  {
    id: 'jwt-io',
    nome: 'JWT.IO',
    icone: 'bi-key',
    categoria: 'ferramentas-online',
    descricao: 'Ferramenta para decodificar tokens JWT, visualizar Claims e verificar a data de expiracao.',
    url: 'https://jwt.io/',
    externo: true,
    tags: ['jwt', 'token', 'decodificar', 'autenticacao']
  },
  {
    id: 'validador-boleto',
    nome: 'Validador de Boletos',
    icone: 'bi-upc-scan',
    categoria: 'ferramentas-online',
    descricao: 'Validacao de codigo de barras e linha digitavel de boletos bancarios.',
    url: 'https://box4.dev/pt-br/brasil/validador-boleto',
    externo: true,
    tags: ['boleto', 'banco', 'validacao', 'pagamento']
  },
  {
    id: 'teste-portas',
    nome: 'Teste de Portas',
    icone: 'bi-ethernet',
    categoria: 'ferramentas-online',
    descricao: 'Verificacao rapida se uma porta TCP esta acessivel externamente.',
    url: 'https://testeportas.com.br/',
    externo: true,
    tags: ['porta', 'tcp', 'rede', 'conectividade']
  },
  {
    id: 'markitdown',
    nome: 'MarkItDown',
    icone: 'bi-filetype-md',
    categoria: 'markdown-documentacao',
    descricao: 'Ferramenta da Microsoft que converte documentos em Markdown (DOCX, PDF, PPTX, XLSX e HTML) preservando estrutura e formatacao.',
    url: 'https://github.com/microsoft/markitdown',
    externo: true,
    tags: ['markdown', 'conversao', 'documentacao', 'microsoft', 'pdf']
  },
  {
    id: 'dillinger',
    nome: 'Dillinger',
    icone: 'bi-pencil-square',
    categoria: 'markdown-documentacao',
    descricao: 'Editor online de Markdown com preview em tempo real para revisar, ajustar formatacao e exportar arquivos .md.',
    url: 'https://dillinger.io/',
    externo: true,
    tags: ['markdown', 'editor', 'online', 'preview', 'documentacao']
  }
];
