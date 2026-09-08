// ═══════════════════════════════════════════════════════════════════════════
// Modelo e conteúdo do Onboarding Corporativo
// Conteúdo transcrito do "Manual de Onboarding Corporativo" da JCA.
// ═══════════════════════════════════════════════════════════════════════════

export interface OnboardingCard {
  icone?: string;
  titulo: string;
  texto?: string;
}

export interface OnboardingEtapa {
  icone?: string;
  titulo: string;
  texto: string;
}

export interface OnboardingAcordeao {
  icone?: string;
  titulo: string;
  texto: string;
}

export type TipoBloco =
  | 'paragrafo'
  | 'lista'
  | 'checklist'
  | 'destaque'
  | 'citacao'
  | 'card'
  | 'cards'
  | 'valores'
  | 'produtos'
  | 'departamentos'
  | 'fluxo'
  | 'timeline'
  | 'acordeao'
  | 'fases90dias'
  | 'mensagem';

export interface BlocoOnboarding {
  tipo: TipoBloco;
  icone?: string;
  titulo?: string;
  texto?: string;
  itens?: string[];
  cards?: OnboardingCard[];
  etapas?: OnboardingEtapa[];
  acordeoes?: OnboardingAcordeao[];
}

export interface CapituloOnboarding {
  id: number;
  numero: number;
  titulo: string;
  subtitulo: string;
  icone: string;
  cor: string;
  tempoMinutos: number;
  blocos: BlocoOnboarding[];
}

// ═══════════════════════════════════════════════════════════════════════════

export const CAPITULOS: CapituloOnboarding[] = [
  {
    id: 1,
    numero: 1,
    titulo: 'Boas-vindas',
    subtitulo: 'Seja bem-vindo à JCA Soluções & Sistemas',
    icone: 'bi-emoji-smile-fill',
    cor: '#2563eb',
    tempoMinutos: 3,
    blocos: [
      {
        tipo: 'citacao',
        texto:
          'É com grande satisfação que recebemos você em nossa equipe. Independentemente da área em que atuará, sua chegada representa mais um passo na construção da história da JCA.'
      },
      {
        tipo: 'paragrafo',
        titulo: 'Uma jornada de integração',
        texto:
          'Este Manual de Onboarding foi desenvolvido para facilitar sua integração, apresentando nossa história, nossos valores, a forma como trabalhamos e o papel de cada área dentro da organização. Ao concluir esta jornada, você compreenderá quem somos, o que fazemos, como entregamos valor aos nossos clientes e de que forma seu trabalho contribuirá para o crescimento da empresa.'
      },
      {
        tipo: 'card',
        titulo: 'Nosso Propósito',
        icone: 'bi-bullseye',
        texto:
          'A JCA existe para desenvolver soluções que auxiliem empresas a organizar seus processos, aumentar sua produtividade e oferecer um atendimento cada vez mais eficiente aos seus clientes. Entendemos que a tecnologia deve ser uma facilitadora do negócio — e cada colaborador, independentemente da função, participa diretamente dessa missão.'
      },
      {
        tipo: 'checklist',
        titulo: 'O que esperamos de você',
        itens: [
          'Ética e transparência',
          'Respeito às pessoas',
          'Colaboração entre equipes',
          'Compromisso com a qualidade',
          'Foco na satisfação do cliente',
          'Busca constante por aprendizado',
          'Organização e responsabilidade',
          'Proatividade na identificação e resolução de problemas',
          'Compartilhamento de conhecimento',
          'Melhoria contínua dos processos'
        ]
      },
      {
        tipo: 'destaque',
        titulo: 'Nosso compromisso com os clientes',
        texto:
          'Cada cliente que confia em nossas soluções deposita na JCA a responsabilidade de apoiar processos importantes para o funcionamento de seu negócio. Independentemente da sua área, seu trabalho impactará direta ou indiretamente a experiência dos nossos clientes.'
      }
    ]
  },
  {
    id: 2,
    numero: 2,
    titulo: 'Nossa História',
    subtitulo: 'Como surgiu a JCA Soluções & Sistemas',
    icone: 'bi-clock-history',
    cor: '#b45309',
    tempoMinutos: 3,
    blocos: [
      {
        tipo: 'paragrafo',
        titulo: 'Uma história construída sobre conhecimento',
        texto:
          'A JCA Soluções & Sistemas nasceu da união de profissionais com ampla experiência nos segmentos de tecnologia, desenvolvimento de software e operações de cobrança. Desde sua fundação, em 2013, a empresa tem como propósito desenvolver soluções inteligentes capazes de transformar a forma como empresas administram suas operações de cobrança, recuperação de crédito e atendimento ao cliente.'
      },
      {
        tipo: 'cards',
        titulo: 'Nossa evolução',
        cards: [
          {
            icone: 'bi-graph-up',
            titulo: 'Crescimento no mercado nacional',
            texto:
              'Ao longo dos anos, a JCA consolidou sua atuação no mercado nacional, investindo continuamente em inovação, tecnologia e relacionamento com seus clientes.'
          },
          {
            icone: 'bi-arrows-expand',
            titulo: 'Um ecossistema de soluções',
            texto:
              'Hoje a empresa atende organizações de diversos segmentos, apoiando desde operações de cobrança até integrações, automações, comunicação omnichannel e inteligência aplicada aos processos de negócio.'
          },
          {
            icone: 'bi-lightning-charge',
            titulo: 'Modernização contínua',
            texto:
              'O desenvolvimento de novos produtos, a modernização das plataformas e a ampliação do portfólio refletem o compromisso de acompanhar as transformações do mercado e antecipar as necessidades dos clientes.'
          }
        ]
      },
      {
        tipo: 'cards',
        titulo: 'Nossos fundadores',
        cards: [
          {
            icone: 'bi-person-badge',
            titulo: 'José Clésio Maciel',
            texto:
              'Com ampla experiência em tecnologia e desenvolvimento de soluções para gestão empresarial.'
          },
          {
            icone: 'bi-person-badge',
            titulo: 'Pedro Amaral',
            texto:
              'Especialista em operações de cobrança e recuperação de crédito, com profundo conhecimento do negócio e das necessidades dos clientes.'
          },
          {
            icone: 'bi-person-badge',
            titulo: 'Valcondes Barbosa',
            texto:
              'Responsável pela evolução tecnológica das soluções, com forte atuação no desenvolvimento de software e inovação.'
          }
        ]
      },
      {
        tipo: 'destaque',
        titulo: 'Nossa trajetória continua',
        texto:
          'A história da JCA é construída diariamente por cada colaborador. Cada atendimento, cada funcionalidade desenvolvida, cada implantação concluída e cada relacionamento fortalecido contribui para o crescimento da empresa. Agora, você também faz parte dessa história.'
      }
    ]
  },
  {
    id: 3,
    numero: 3,
    titulo: 'Nossa Identidade',
    subtitulo: 'Missão, Visão e Valores',
    icone: 'bi-bullseye',
    cor: '#7c3aed',
    tempoMinutos: 3,
    blocos: [
      {
        tipo: 'paragrafo',
        titulo: 'Nossa essência',
        texto:
          'A identidade da JCA é formada por princípios que orientam nossas decisões, nosso relacionamento com clientes e parceiros e a forma como desenvolvemos nossas soluções. Missão, Visão e Valores representam o compromisso que assumimos diariamente com a qualidade, a inovação e a excelência.'
      },
      {
        tipo: 'card',
        titulo: 'Missão',
        icone: 'bi-bullseye',
        texto:
          '"Proporcionar e disponibilizar aos nossos clientes soluções inteligentes, utilizando tecnologia de ponta para atender às suas expectativas." Nossa missão vai além do desenvolvimento de softwares: buscamos compreender os desafios dos clientes para entregar soluções que simplifiquem processos e contribuam para o crescimento sustentável dos seus negócios.'
      },
      {
        tipo: 'card',
        titulo: 'Visão',
        icone: 'bi-eye',
        texto:
          '"Ser reconhecida como a melhor empresa de software CRM para Call Centers do Brasil." Nossa visão representa onde queremos chegar e nos motiva a investir continuamente em inovação, qualidade, atendimento especializado e desenvolvimento de novas soluções.'
      },
      {
        tipo: 'valores',
        titulo: 'Nossos Valores',
        cards: [
          {
            icone: 'bi-lightning-charge-fill',
            titulo: 'Agilidade',
            texto:
              'Respostas rápidas, decisões assertivas e soluções eficientes, com qualidade e dentro dos prazos.'
          },
          {
            icone: 'bi-patch-check-fill',
            titulo: 'Credibilidade',
            texto:
              'Relações baseadas na confiança, cumprindo nossos compromissos com responsabilidade e profissionalismo.'
          },
          {
            icone: 'bi-people-fill',
            titulo: 'Respeito',
            texto:
              'Cordialidade e empatia com clientes, parceiros e colaboradores, valorizando diferentes opiniões e experiências.'
          },
          {
            icone: 'bi-graph-up-arrow',
            titulo: 'Resultado Sustentável',
            texto:
              'Resultados consistentes que promovam o crescimento da empresa e o sucesso dos clientes, sempre pensando no longo prazo.'
          },
          {
            icone: 'bi-diagram-3-fill',
            titulo: 'Integração',
            texto:
              'Trabalho em equipe, compartilhamento de conhecimento e colaboração entre departamentos.'
          },
          {
            icone: 'bi-shield-check',
            titulo: 'Ética',
            texto:
              'Honestidade, responsabilidade e integridade em todas as nossas relações.'
          },
          {
            icone: 'bi-broadcast',
            titulo: 'Transparência',
            texto:
              'Comunicação clara, objetiva e verdadeira, fortalecendo a confiança entre colaboradores, clientes e parceiros.'
          },
          {
            icone: 'bi-badge-cc-fill',
            titulo: 'Compromisso com a Marca do Cliente',
            texto:
              'Entregar produtos e serviços que agreguem valor aos negócios dos clientes e fortaleçam sua reputação no mercado.'
          }
        ]
      },
      {
        tipo: 'destaque',
        titulo: 'Vivendo nossos valores',
        texto:
          'Nossos valores estão presentes em atitudes simples: colaborar com um colega, compartilhar conhecimento, cumprir prazos, atender um cliente com excelência ou propor melhorias para um processo interno. Cada colaborador é responsável por fortalecer essa cultura.'
      }
    ]
  },
  {
    id: 4,
    numero: 4,
    titulo: 'Quem Somos',
    subtitulo: 'Muito além de uma empresa de software',
    icone: 'bi-people-fill',
    cor: '#0d9488',
    tempoMinutos: 3,
    blocos: [
      {
        tipo: 'paragrafo',
        titulo: 'Especialistas em cobrança e atendimento',
        texto:
          'A JCA Soluções & Sistemas é especializada no desenvolvimento de soluções tecnológicas para operações de cobrança, recuperação de crédito e atendimento ao cliente. Nosso propósito é ajudar empresas a organizar processos, aumentar produtividade e melhorar a experiência de seus clientes por meio da tecnologia.'
      },
      {
        tipo: 'destaque',
        titulo: 'O mercado em que atuamos',
        texto:
          'Atuamos em um segmento altamente dinâmico, onde produtividade, organização, segurança das informações e agilidade são fatores essenciais. Nossos clientes precisam administrar grandes volumes de informações, realizar negociações, acompanhar indicadores, integrar canais de comunicação e tomar decisões rápidas.'
      },
      {
        tipo: 'checklist',
        titulo: 'O problema que ajudamos a resolver',
        itens: [
          'Processos realizados manualmente',
          'Informações descentralizadas',
          'Dificuldade no acompanhamento das negociações',
          'Baixo controle operacional',
          'Falta de indicadores gerenciais',
          'Dificuldade de comunicação com clientes',
          'Retrabalho',
          'Baixa produtividade'
        ]
      },
      {
        tipo: 'checklist',
        titulo: 'Nossa proposta de valor',
        itens: [
          'Centralizar informações',
          'Automatizar tarefas repetitivas',
          'Acompanhar indicadores em tempo real',
          'Melhorar a comunicação com os clientes',
          'Aumentar a produtividade das equipes',
          'Reduzir falhas operacionais',
          'Apoiar a tomada de decisões'
        ]
      },
      {
        tipo: 'cards',
        titulo: 'Quem são nossos clientes',
        cards: [
          { icone: 'bi-briefcase', titulo: 'Assessorias de Cobrança', texto: 'Operações estruturadas de recuperação de crédito.' },
          { icone: 'bi-bank', titulo: 'Instituições Financeiras e Bancos', texto: 'Gestão de carteiras e relacionamento com clientes.' },
          { icone: 'bi-people', titulo: 'Cooperativas de Crédito', texto: 'Organização de processos de atendimento e negociação.' },
          { icone: 'bi-mortarboard', titulo: 'Instituições de Ensino', texto: 'Operações de cobrança e comunicação em larga escala.' },
          { icone: 'bi-globe2', titulo: 'Provedores de Internet', texto: 'Atendimento, cobrança e acompanhamento de indicadores.' },
          { icone: 'bi-shield', titulo: 'Seguradoras', texto: 'Gestão de operações de atendimento e recuperação.' },
          { icone: 'bi-building', titulo: 'Condomínios', texto: 'Controle financeiro e comunicação com condôminos.' },
          { icone: 'bi-headset', titulo: 'Empresas de Atendimento', texto: 'Operações de atendimento em larga escala.' }
        ]
      },
      {
        tipo: 'paragrafo',
        titulo: 'Nosso diferencial',
        texto:
          'Nosso maior diferencial está na combinação entre tecnologia, conhecimento do negócio e relacionamento próximo. Não entregamos apenas funcionalidades: entregamos soluções construídas para atender necessidades reais, acompanhando cada etapa da jornada do cliente — do processo comercial à implantação, treinamento, suporte e evolução contínua.'
      },
      {
        tipo: 'destaque',
        titulo: 'Fazendo parte dessa jornada',
        texto:
          'Ao ingressar na JCA, você passa a fazer parte de uma empresa que acredita na força das pessoas, da colaboração e do conhecimento compartilhado. Cada colaborador é parte fundamental dessa história e participa diretamente da construção do futuro da JCA.'
      }
    ]
  },
  {
    id: 5,
    numero: 5,
    titulo: 'Nossas Soluções',
    subtitulo: 'O Ecossistema Actyon',
    icone: 'bi-boxes',
    cor: '#2563eb',
    tempoMinutos: 4,
    blocos: [
      {
        tipo: 'paragrafo',
        titulo: 'Um ecossistema completo',
        texto:
          'A JCA oferece um ecossistema completo de soluções voltadas para operações de cobrança, recuperação de crédito e atendimento ao cliente. Essas soluções trabalham de forma integrada, permitindo que empresas organizem seus processos, automatizem atividades, acompanhem indicadores e aumentem a produtividade das equipes.'
      },
      {
        tipo: 'produtos',
        titulo: 'Produtos do Ecossistema Actyon',
        cards: [
          {
            icone: 'bi-display',
            titulo: 'ActyonCOB (CRM Desktop)',
            texto:
              'A solução tradicional da JCA para gestão de operações de cobrança. Desenvolvido para Windows, permite gerenciar carteiras, consultar devedores, registrar atendimentos, realizar negociações, emitir boletos, gerenciar acordos, automatizar rotinas e integrar com sistemas externos.'
          },
          {
            icone: 'bi-window',
            titulo: 'Actyon Web',
            texto:
              'A evolução da plataforma Actyon para ambiente web. Interface moderna, responsiva e acessível por navegadores, com integração ao ecossistema e atualizações centralizadas.'
          },
          {
            icone: 'bi-hand-index-thumb',
            titulo: 'Portal de Negociação',
            texto:
              'Permite que consumidores realizem negociações de forma autônoma: consulta de débitos, simulação de propostas, formalização de acordos, emissão de boletos e negociação online.'
          },
          {
            icone: 'bi-chat-dots',
            titulo: 'Comunicação Omnichannel',
            texto:
              'Integrações que centralizam diferentes canais de atendimento em uma única plataforma: WhatsApp Oficial, SMS, e-mail e outros canais, garantindo controle, rastreabilidade e qualidade no relacionamento.'
          },
          {
            icone: 'bi-bar-chart-line',
            titulo: 'Dashboard Gerencial',
            texto:
              'Acompanhamento dos principais indicadores: produtividade dos operadores, acordos realizados, recuperação financeira, performance das equipes, indicadores de atendimento e resultados da operação.'
          },
          {
            icone: 'bi-plug',
            titulo: 'APIs e Integrações',
            texto:
              'Integrações com ERPs, sistemas financeiros, discadores, plataformas de atendimento, portais, sistemas legados e serviços externos — reduzindo retrabalho e garantindo consistência das informações.'
          },
          {
            icone: 'bi-rocket-takeoff',
            titulo: 'Evolução Contínua',
            texto:
              'Novas funcionalidades, melhorias de desempenho, integrações e recursos são desenvolvidos constantemente para manter as soluções modernas, seguras e alinhadas às demandas dos clientes.'
          }
        ]
      }
    ]
  },
  {
    id: 6,
    numero: 6,
    titulo: 'Nossos Clientes e Resultados',
    subtitulo: 'Para quem entregamos valor',
    icone: 'bi-people',
    cor: '#059669',
    tempoMinutos: 2,
    blocos: [
      {
        tipo: 'paragrafo',
        titulo: 'Parceria que gera resultados',
        texto:
          'Nossas soluções atendem empresas de diversos segmentos que possuem operações estruturadas de atendimento, relacionamento ou recuperação de crédito. Independentemente do segmento, todos possuem um objetivo comum: tornar seus processos mais eficientes, organizados e produtivos.'
      },
      {
        tipo: 'cards',
        titulo: 'Segmentos que atendemos',
        cards: [
          { icone: 'bi-briefcase', titulo: 'Assessorias de Cobrança', texto: 'Operações estruturadas de recuperação de crédito.' },
          { icone: 'bi-bank', titulo: 'Instituições Financeiras', texto: 'Bancos, cooperativas e seguradoras.' },
          { icone: 'bi-mortarboard', titulo: 'Instituições de Ensino', texto: 'Cobrança e comunicação com alunos.' },
          { icone: 'bi-globe2', titulo: 'Provedores de Internet', texto: 'Atendimento e cobrança em escala.' },
          { icone: 'bi-building', titulo: 'Condomínios', texto: 'Controle financeiro e comunicação.' },
          { icone: 'bi-headset', titulo: 'Empresas de Atendimento', texto: 'Operações em larga escala.' }
        ]
      },
      {
        tipo: 'checklist',
        titulo: 'Resultados que ajudamos a gerar',
        itens: [
          'Processos mais organizados e seguros',
          'Maior controle operacional',
          'Automação de tarefas repetitivas',
          'Indicadores acompanhados em tempo real',
          'Atendimento mais eficiente aos consumidores',
          'Recuperação financeira mais assertiva',
          'Experiência consistente nos canais de comunicação'
        ]
      },
      {
        tipo: 'destaque',
        titulo: 'Nosso papel',
        texto:
          'Nosso papel é transformar dificuldades em processos organizados, seguros e eficientes por meio da tecnologia. Quando um cliente cresce, nós crescemos junto.'
      }
    ]
  },
  {
    id: 7,
    numero: 7,
    titulo: 'Nossa Estrutura Organizacional',
    subtitulo: 'Trabalhando como um único time',
    icone: 'bi-diagram-3-fill',
    cor: '#d97706',
    tempoMinutos: 3,
    blocos: [
      {
        tipo: 'paragrafo',
        titulo: 'Áreas integradas',
        texto:
          'A JCA acredita que os melhores resultados são alcançados quando as áreas trabalham de forma integrada. Embora cada departamento possua responsabilidades específicas, todos compartilham um mesmo objetivo: oferecer soluções de qualidade e proporcionar a melhor experiência possível aos clientes.'
      },
      {
        tipo: 'departamentos',
        titulo: 'As principais áreas da empresa',
        cards: [
          {
            icone: 'bi-bank',
            titulo: 'Diretoria',
            texto:
              'Define a estratégia, metas de crescimento e investimentos em inovação e novos negócios.'
          },
          {
            icone: 'bi-briefcase',
            titulo: 'Comercial',
            texto:
              'Apresenta as soluções ao mercado, identifica necessidades e conduz o processo até o fechamento da venda.'
          },
          {
            icone: 'bi-clipboard-data',
            titulo: 'Administrativo',
            texto:
              'Gestão de documentos, contratos, compras, fornecedores e organização dos processos internos.'
          },
          {
            icone: 'bi-cash-stack',
            titulo: 'Financeiro',
            texto:
              'Faturamento, notas fiscais, contas a pagar/receber, boletos, conciliação bancária e controle financeiro.'
          },
          {
            icone: 'bi-people',
            titulo: 'Recursos Humanos',
            texto:
              'Admissões, desligamentos, férias, benefícios, controle de ponto, comunicação com a contabilidade e integração de novos colaboradores.'
          },
          {
            icone: 'bi-megaphone',
            titulo: 'Marketing',
            texto:
              'Gestão da marca, conteúdo, materiais institucionais, campanhas, redes sociais, eventos e comunicação corporativa.'
          },
          {
            icone: 'bi-rocket-takeoff',
            titulo: 'Implantação',
            texto:
              'Planejamento, parametrização, importação de dados, integrações, treinamentos, homologação e Go Live.'
          },
          {
            icone: 'bi-code-slash',
            titulo: 'Desenvolvimento',
            texto:
              'Novas funcionalidades, correções, melhorias de desempenho, integrações e evolução da arquitetura.'
          },
          {
            icone: 'bi-headset',
            titulo: 'Suporte Técnico',
            texto:
              'Atendimento de dúvidas, orientações operacionais, identificação de incidentes e acompanhamento de chamados.'
          },
          {
            icone: 'bi-lightbulb',
            titulo: 'Inovação',
            texto:
              'Identifica oportunidades de melhoria, avalia novas tecnologias, automações e aplicações de Inteligência Artificial.'
          }
        ]
      },
      {
        tipo: 'destaque',
        titulo: 'Uma empresa conectada',
        texto:
          'Embora existam diferentes departamentos, nenhum deles trabalha isoladamente. Todas as áreas colaboram entre si para entregar um único resultado: o sucesso dos nossos clientes.'
      }
    ]
  },
  {
    id: 8,
    numero: 8,
    titulo: 'Como Trabalhamos',
    subtitulo: 'Nossa forma de trabalhar',
    icone: 'bi-gear-wide-connected',
    cor: '#4f46e5',
    tempoMinutos: 3,
    blocos: [
      {
        tipo: 'paragrafo',
        titulo: 'Processos, comunicação e colaboração',
        texto:
          'Na JCA, acreditamos que processos bem definidos, comunicação eficiente e colaboração entre equipes são fundamentais para entregar soluções de qualidade. Cada colaborador possui autonomia para executar suas atividades, sempre contando com o apoio das demais equipes quando necessário.'
      },
      {
        tipo: 'destaque',
        titulo: 'O Cliente é o Centro de Tudo',
        texto:
          'Todas as nossas decisões possuem um objetivo em comum: gerar valor para nossos clientes. Independentemente da área em que você atua, seu trabalho impacta diretamente a experiência do cliente.'
      },
      {
        tipo: 'fluxo',
        titulo: 'Nossa Jornada de Trabalho',
        etapas: [
          { icone: 'bi-briefcase', titulo: 'Comercial', texto: 'Identifica oportunidades e compreende as necessidades do cliente.' },
          { icone: 'bi-search', titulo: 'Diagnóstico', texto: 'Levantamento das necessidades operacionais e definição da solução.' },
          { icone: 'bi-file-earmark-text', titulo: 'Proposta Comercial', texto: 'Apresentação da solução e formalização da proposta.' },
          { icone: 'bi-pencil-square', titulo: 'Contratação', texto: 'Início da parceria entre cliente e JCA.' },
          { icone: 'bi-tools', titulo: 'Implantação', texto: 'Configuração do ambiente, parametrizações, importações e treinamentos.' },
          { icone: 'bi-rocket-takeoff', titulo: 'Go Live', texto: 'Início da operação em ambiente produtivo.' },
          { icone: 'bi-headset', titulo: 'Suporte Técnico', texto: 'Acompanhamento contínuo, esclarecimento de dúvidas e resolução de incidentes.' },
          { icone: 'bi-code-slash', titulo: 'Desenvolvimento', texto: 'Melhorias, correções e novas funcionalidades.' },
          { icone: 'bi-arrow-repeat', titulo: 'Evolução Contínua', texto: 'Acompanhamento da operação e evolução permanente das soluções.' }
        ]
      },
      {
        tipo: 'checklist',
        titulo: 'Comunicação',
        itens: [
          'Registre informações importantes',
          'Compartilhe conhecimento',
          'Mantenha os envolvidos atualizados',
          'Comunique problemas rapidamente',
          'Proponha melhorias'
        ]
      },
      {
        tipo: 'paragrafo',
        titulo: 'Trabalho em equipe e organização',
        texto:
          'A colaboração faz parte da cultura da JCA. Cada colaborador deve compreender que sua atividade impacta o trabalho dos demais e, consequentemente, a experiência do cliente. Por isso, buscamos padronizar rotinas, documentar procedimentos e incentivar a melhoria contínua.'
      },
      {
        tipo: 'checklist',
        titulo: 'Excelência no atendimento',
        itens: ['Cordialidade', 'Agilidade', 'Clareza', 'Responsabilidade', 'Comprometimento', 'Foco na solução']
      },
      {
        tipo: 'destaque',
        titulo: 'Melhoria contínua e aprendizado',
        texto:
          'Na JCA acreditamos que sempre existe espaço para evoluir. Valorizamos sugestões que melhorem processos, simplifiquem atividades e aprimorem nossos produtos. O mercado de tecnologia está em constante evolução — aprender faz parte do nosso trabalho, e ensinar também.'
      }
    ]
  },
  {
    id: 9,
    numero: 9,
    titulo: 'Cultura Organizacional',
    subtitulo: 'A essência do nosso dia a dia',
    icone: 'bi-heart-fill',
    cor: '#db2777',
    tempoMinutos: 3,
    blocos: [
      {
        tipo: 'paragrafo',
        titulo: 'Nossa Cultura',
        texto:
          'A cultura organizacional da JCA representa a maneira como conduzimos nosso trabalho, nos relacionamos com clientes e colaboradores e tomamos decisões diariamente. Independentemente do cargo ou departamento, todos são responsáveis por fortalecer essa cultura.'
      },
      {
        tipo: 'destaque',
        titulo: 'O Cliente Sempre em Primeiro Lugar',
        texto:
          'Nosso cliente é a razão da existência da empresa. Toda decisão deve considerar como ela impactará nossos clientes, seus processos e seus resultados. Mais do que atender chamados, buscamos construir relações de confiança.'
      },
      {
        tipo: 'checklist',
        titulo: 'Trabalho em equipe',
        itens: [
          'Respeito entre colegas',
          'Compartilhamento de conhecimento',
          'Comunicação clara',
          'Cooperação',
          'Disponibilidade para ajudar',
          'Responsabilidade coletiva pelos resultados'
        ]
      },
      {
        tipo: 'cards',
        titulo: 'Pilares da nossa cultura',
        cards: [
          {
            icone: 'bi-book',
            titulo: 'Compartilhamento de Conhecimento',
            texto:
              'Documentar processos, compartilhar experiências e produzir materiais de apoio. O conhecimento deve permanecer na empresa.'
          },
          {
            icone: 'bi-arrow-up-circle',
            titulo: 'Melhoria Contínua',
            texto:
              'Sempre existe uma forma melhor de realizar uma atividade. Boas ideias podem surgir em qualquer área.'
          },
          {
            icone: 'bi-lightbulb',
            titulo: 'Inovação',
            texto:
              'Novas tecnologias, metodologias e ferramentas que gerem benefícios para clientes e equipe: automações, IA, integrações.'
          },
          {
            icone: 'bi-clipboard-check',
            titulo: 'Responsabilidade',
            texto:
              'Cumprir prazos, comunicar dificuldades, registrar informações, manter organização e agir com ética.'
          },
          {
            icone: 'bi-chat-square-text',
            titulo: 'Comunicação',
            texto:
              'Clara, objetiva, respeitosa, transparente e profissional. Confirme o entendimento e registre decisões importantes.'
          },
          {
            icone: 'bi-book-half',
            titulo: 'Aprendizado Contínuo',
            texto:
              'Manter uma postura de aprendizado constante para entregar melhores soluções aos clientes e crescer profissionalmente.'
          }
        ]
      },
      {
        tipo: 'destaque',
        titulo: 'Orgulho de fazer parte',
        texto:
          'Cada colaborador participa da construção da história da empresa. Queremos que todos sintam orgulho de fazer parte desta equipe e contribuam para fortalecer nossa cultura diariamente.'
      }
    ]
  },
  {
    id: 10,
    numero: 10,
    titulo: 'Processos Corporativos',
    subtitulo: 'Como nossos processos funcionam',
    icone: 'bi-arrow-repeat',
    cor: '#0891b2',
    tempoMinutos: 3,
    blocos: [
      {
        tipo: 'paragrafo',
        titulo: 'Processos integrados',
        texto:
          'A organização dos processos é um dos fatores que garantem qualidade, produtividade e segurança nas operações. Cada departamento possui responsabilidades específicas, porém todas as áreas trabalham de forma integrada para garantir uma jornada organizada — do primeiro contato ao suporte contínuo.'
      },
      {
        tipo: 'timeline',
        titulo: 'Principais processos',
        etapas: [
          {
            icone: 'bi-briefcase',
            titulo: 'Processo Comercial',
            texto:
              'Prospecção, identificação de necessidades, diagnóstico da operação, demonstração, proposta, negociação e fechamento do contrato.'
          },
          {
            icone: 'bi-rocket-takeoff',
            titulo: 'Processo de Implantação',
            texto:
              'Planejamento, configuração do ambiente, parametrização, importação de dados, integrações, validações, treinamentos, homologação e Go Live.'
          },
          {
            icone: 'bi-headset',
            titulo: 'Processo de Suporte',
            texto:
              'Atendimento aos usuários, esclarecimento de dúvidas, investigação de incidentes, acompanhamento de chamados e orientação operacional.'
          },
          {
            icone: 'bi-code-slash',
            titulo: 'Processo de Desenvolvimento',
            texto:
              'Correções, novas funcionalidades, melhorias de desempenho, integrações, manutenção tecnológica e testes.'
          },
          {
            icone: 'bi-cash-stack',
            titulo: 'Processo Financeiro',
            texto:
              'Faturamento, emissão de notas fiscais e boletos, contas a pagar/receber, conciliação bancária e relacionamento com instituições financeiras.'
          },
          {
            icone: 'bi-clipboard-data',
            titulo: 'Processo Administrativo',
            texto:
              'Contratos, documentos, fornecedores, compras, organização interna e apoio operacional.'
          },
          {
            icone: 'bi-people',
            titulo: 'Processo de Recursos Humanos',
            texto:
              'Recrutamento, integração, admissões, benefícios, férias, desligamentos, comunicação com a contabilidade e desenvolvimento organizacional.'
          },
          {
            icone: 'bi-megaphone',
            titulo: 'Processo de Marketing',
            texto:
              'Campanhas, produção de conteúdo, materiais institucionais, redes sociais, eventos e identidade visual.'
          }
        ]
      },
      {
        tipo: 'destaque',
        titulo: 'Integração entre departamentos',
        texto:
          'Todos os processos estão conectados. O sucesso de uma entrega depende da colaboração entre diversas áreas. Manter uma comunicação eficiente e compartilhar informações corretamente é responsabilidade de todos.'
      }
    ]
  },
  {
    id: 11,
    numero: 11,
    titulo: 'Segurança da Informação',
    subtitulo: 'Nosso compromisso com a segurança',
    icone: 'bi-shield-lock-fill',
    cor: '#334155',
    tempoMinutos: 2,
    blocos: [
      {
        tipo: 'paragrafo',
        titulo: 'A segurança é responsabilidade de todos',
        texto:
          'A JCA trabalha diariamente com informações estratégicas de clientes, parceiros e colaboradores. A segurança da informação não depende apenas de ferramentas tecnológicas — depende principalmente da postura de cada colaborador.'
      },
      {
        tipo: 'checklist',
        titulo: 'Confidencialidade',
        itens: [
          'Documentos',
          'Contratos',
          'Dados financeiros',
          'Informações técnicas',
          'Informações de clientes',
          'Códigos-fonte',
          'Credenciais de acesso',
          'Estratégias comerciais'
        ]
      },
      {
        tipo: 'destaque',
        titulo: 'Proteção de Dados (LGPD)',
        texto:
          'Todos os colaboradores devem atuar de forma responsável na utilização de dados pessoais, respeitando a legislação vigente, incluindo a Lei Geral de Proteção de Dados (LGPD). Em caso de dúvidas, consulte sua liderança.'
      },
      {
        tipo: 'checklist',
        titulo: 'Senhas e acessos',
        itens: [
          'Nunca compartilhar senhas',
          'Utilizar senhas fortes',
          'Alterar senhas quando solicitado',
          'Bloquear o computador ao se ausentar',
          'Manter os acessos protegidos'
        ]
      },
      {
        tipo: 'checklist',
        titulo: 'Uso de e-mail e comunicação',
        itens: [
          'Confirme o destinatário',
          'Revise o conteúdo',
          'Evite compartilhar dados desnecessários',
          'Mantenha linguagem respeitosa'
        ]
      },
      {
        tipo: 'cards',
        titulo: 'Boas práticas no ambiente de trabalho',
        cards: [
          { icone: 'bi-box-seam', titulo: 'Organização', texto: 'Mantenha o ambiente e os recursos organizados.' },
          { icone: 'bi-shield-lock', titulo: 'Proteção', texto: 'Proteja informações confidenciais e respeite políticas internas.' },
          { icone: 'bi-software', titulo: 'Softwares autorizados', texto: 'Utilize apenas softwares autorizados pela empresa.' },
          { icone: 'bi-exclamation-triangle', titulo: 'Incidentes', texto: 'Comunique incidentes imediatamente à sua liderança.' }
        ]
      },
      {
        tipo: 'destaque',
        titulo: 'Incidentes de segurança',
        texto:
          'Sempre que identificar qualquer situação de risco — tentativa de fraude, acesso não autorizado, perda de equipamentos, vazamento de informações, e-mails suspeitos ou comportamento incomum — comunique imediatamente sua liderança ou a área responsável. Agir rapidamente reduz impactos.'
      }
    ]
  },
  {
    id: 12,
    numero: 12,
    titulo: 'Desenvolvimento Profissional',
    subtitulo: 'Crescer faz parte da nossa cultura',
    icone: 'bi-graph-up-arrow',
    cor: '#16a34a',
    tempoMinutos: 2,
    blocos: [
      {
        tipo: 'paragrafo',
        titulo: 'O crescimento começa pelas pessoas',
        texto:
          'Na JCA acreditamos que o crescimento da empresa acontece por meio do desenvolvimento das pessoas. Investimos continuamente na evolução dos nossos colaboradores, incentivando o aprendizado, o compartilhamento de conhecimento e o desenvolvimento de novas competências.'
      },
      {
        tipo: 'destaque',
        titulo: 'O protagonismo é seu',
        texto:
          'A empresa oferece ferramentas, apoio e oportunidades, mas o crescimento profissional depende principalmente da iniciativa de cada colaborador. Ser protagonista da própria carreira significa buscar novos conhecimentos, participar de treinamentos, propor melhorias, assumir novos desafios e desenvolver novas competências.'
      },
      {
        tipo: 'checklist',
        titulo: 'Aprendizado contínuo',
        itens: [
          'Treinamentos internos',
          'Cursos e certificações',
          'Workshops',
          'Compartilhamento de conhecimento entre equipes',
          'Participação em projetos',
          'Estudos individuais'
        ]
      },
      {
        tipo: 'cards',
        titulo: 'Valorizamos também',
        cards: [
          { icone: 'bi-chat', titulo: 'Comunicação', texto: 'Expressar ideias com clareza e assertividade.' },
          { icone: 'bi-list-check', titulo: 'Organização', texto: 'Gerenciar atividades e prioridades.' },
          { icone: 'bi-people', titulo: 'Trabalho em equipe', texto: 'Colaborar e apoiar colegas.' },
          { icone: 'bi-wrench', titulo: 'Resolução de problemas', texto: 'Encontrar soluções práticas e criativas.' },
          { icone: 'bi-clock', titulo: 'Gestão do tempo', texto: 'Entregar no prazo com qualidade.' },
          { icone: 'bi-stars', titulo: 'Foco no cliente', texto: 'Colocar as necessidades do cliente em primeiro lugar.' }
        ]
      },
      {
        tipo: 'destaque',
        titulo: 'Sua jornada continua',
        texto:
          'Novos desafios, participação em projetos estratégicos e oportunidades de crescimento surgem naturalmente para colaboradores dedicados. Este onboarding representa apenas o início de uma trajetória de aprendizado, colaboração e crescimento dentro da JCA.'
      }
    ]
  },
  {
    id: 13,
    numero: 13,
    titulo: 'Benefícios e Recursos',
    subtitulo: 'Cuidando das pessoas',
    icone: 'bi-gift-fill',
    cor: '#ca8a04',
    tempoMinutos: 2,
    blocos: [
      {
        tipo: 'paragrafo',
        titulo: 'Ambiente saudável e recursos de apoio',
        texto:
          'Acreditamos que um ambiente de trabalho saudável é construído por meio do respeito, da valorização das pessoas e da oferta de recursos que contribuam para o bem-estar. Os benefícios podem evoluir ao longo do tempo, conforme políticas internas e legislação vigente.'
      },
      {
        tipo: 'checklist',
        titulo: 'Benefícios',
        itens: [
          'Vale-Refeição ou Vale-Alimentação',
          'Vale-Transporte',
          'Plano de Saúde',
          'Convênios e parcerias',
          'Programas de qualidade de vida',
          'Wellhub (quando disponibilizado)',
          'Outros benefícios definidos pela política interna'
        ]
      },
      {
        tipo: 'cards',
        titulo: 'Recursos disponibilizados',
        cards: [
          { icone: 'bi-laptop', titulo: 'Computador ou notebook', texto: 'Equipamento para execução das atividades.' },
          { icone: 'bi-display', titulo: 'Monitor e periféricos', texto: 'Estrutura de trabalho adequada à função.' },
          { icone: 'bi-key', titulo: 'Acessos aos sistemas', texto: 'Acessos corporativos e e-mail institucional.' },
          { icone: 'bi-box-seam', titulo: 'Softwares licenciados', texto: 'Ferramentas de comunicação e plataformas de gestão.' }
        ]
      },
      {
        tipo: 'paragrafo',
        titulo: 'Ambiente de trabalho',
        texto:
          'Buscamos proporcionar um ambiente organizado, colaborativo e respeitoso. Cada colaborador é responsável por zelar pelo patrimônio da empresa e contribuir para a organização dos espaços, conservação dos equipamentos e boa convivência entre equipes.'
      },
      {
        tipo: 'destaque',
        titulo: 'Apoio ao colaborador',
        texto:
          'Sempre que necessário, procure sua liderança ou o setor responsável. Nenhum colaborador precisa enfrentar dificuldades sozinho — o RH poderá orientar sobre elegibilidade, prazos e regras de utilização dos benefícios.'
      }
    ]
  },
  {
    id: 14,
    numero: 14,
    titulo: 'Seus Primeiros 90 Dias',
    subtitulo: 'Uma jornada de adaptação e crescimento',
    icone: 'bi-calendar3',
    cor: '#7c3aed',
    tempoMinutos: 3,
    blocos: [
      {
        tipo: 'paragrafo',
        titulo: 'Adaptação gradual',
        texto:
          'Os primeiros meses representam um período importante de adaptação. O objetivo não é dominar todas as atividades imediatamente, mas compreender a empresa, conhecer os processos e desenvolver autonomia gradualmente. Conte com sua liderança e com seus colegas sempre que precisar.'
      },
      {
        tipo: 'fases90dias',
        titulo: 'Timeline dos primeiros 90 dias',
        etapas: [
          {
            icone: 'bi-1-circle',
            titulo: 'Primeiros 30 Dias — Aprendizado e integração',
            texto:
              'Conhecer a empresa e a cultura, compreender os produtos, conhecer sua equipe, entender os processos do seu departamento, participar dos treinamentos iniciais e se familiarizar com os sistemas utilizados.'
          },
          {
            icone: 'bi-2-circle',
            titulo: 'De 30 a 60 Dias — Consolidação',
            texto:
              'Executar atividades com maior autonomia, participar de projetos da equipe, consolidar conhecimentos, buscar aprofundamento técnico, compartilhar dúvidas e sugestões e desenvolver relacionamento com outras áreas.'
          },
          {
            icone: 'bi-3-circle',
            titulo: 'De 60 a 90 Dias — Segurança e contribuição',
            texto:
              'Compreender plenamente sua rotina, atuar com segurança nas atividades diárias, conhecer os principais processos, colaborar com a equipe, identificar oportunidades de melhoria e contribuir para os resultados do departamento.'
          }
        ]
      },
      {
        tipo: 'destaque',
        titulo: 'Seu desenvolvimento não termina aqui',
        texto:
          'Cada colaborador possui seu próprio ritmo de desenvolvimento. O mais importante é manter uma postura de aprendizado contínuo — após os primeiros 90 dias, novos desafios, projetos e oportunidades surgirão ao longo da sua trajetória.'
      }
    ]
  },
  {
    id: 15,
    numero: 15,
    titulo: 'Mensagem Final da Diretoria',
    subtitulo: 'Uma nova jornada começa agora',
    icone: 'bi-megaphone-fill',
    cor: '#0f4c81',
    tempoMinutos: 1,
    blocos: [
      {
        tipo: 'mensagem',
        titulo: 'Uma Nova Jornada Começa Agora',
        texto:
          'Parabéns por concluir o processo de integração à JCA Soluções & Sistemas. Esperamos que este material tenha proporcionado uma visão clara sobre quem somos, como trabalhamos, quais são nossos valores e de que forma cada colaborador contribui para o sucesso da empresa. Mais do que desenvolver tecnologia, construímos relacionamentos, resolvemos problemas e ajudamos nossos clientes a alcançarem melhores resultados. Agora você faz parte dessa missão.'
      },
      {
        tipo: 'card',
        titulo: 'Nosso Compromisso',
        icone: 'bi-heart',
        texto:
          'Continuaremos investindo em pessoas, inovação, tecnologia e melhoria contínua. Acreditamos que empresas fortes são construídas por profissionais comprometidos, éticos e apaixonados pelo que fazem.'
      },
      {
        tipo: 'destaque',
        titulo: 'Conte conosco',
        texto:
          'Nenhum colaborador cresce sozinho. Nossa cultura incentiva a colaboração, o compartilhamento de conhecimento e o apoio entre equipes. Sempre que precisar, conte com sua liderança, seus colegas e toda a estrutura da empresa.'
      },
      {
        tipo: 'citacao',
        titulo: 'Bem-vindo à JCA',
        texto:
          'A partir de hoje, você também faz parte da nossa história. Desejamos muito sucesso nessa nova etapa da sua carreira. Seja muito bem-vindo à JCA Soluções & Sistemas — juntos, continuaremos construindo soluções que transformam processos, fortalecem empresas e geram resultados para nossos clientes.'
      }
    ]
  }
];

export const TEMPO_TOTAL_MINUTOS = CAPITULOS.reduce((soma, c) => soma + c.tempoMinutos, 0);
