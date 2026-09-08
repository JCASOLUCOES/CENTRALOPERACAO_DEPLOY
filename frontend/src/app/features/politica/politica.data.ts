export interface PoliticaItem {
  titulo: string;
  detalhe: string;
}

export interface PoliticaSecao {
  id: string;
  icone: string;
  titulo: string;
  introducao: string;
  itens: PoliticaItem[];
}

export interface PoliticaDocumento {
  titulo: string;
  descricao: string;
  versao: string;
  vigencia: string;
  responsavel: string;
  ultimaRevisao: string;
  secoes: PoliticaSecao[];
}

export const POLITICA_INTERNA: PoliticaDocumento = {
  titulo: 'Política Interna da Central de Conhecimento',
  descricao:
    'Documento oficial que define as regras de uso, segurança e conduta para todos os colaboradores que acessam a Central de Conhecimento da JCA Soluções. O cumprimento desta política é obrigatório.',
  versao: '1.0',
  vigencia: '12 meses',
  responsavel: 'Equipe de Suporte / Administração',
  ultimaRevisao: '11/08/2026',
  secoes: [
    {
      id: 'uso-aceitavel',
      icone: 'bi-hand-index-thumb',
      titulo: 'Uso Aceitável',
      introducao:
        'A Central de Conhecimento é uma ferramenta corporativa mantida pela JCA Soluções para consulta de informações técnicas e acessos de sistemas. Seu uso é exclusivo para fins profissionais.',
      itens: [
        {
          titulo: 'Finalidade exclusivamente corporativa',
          detalhe:
            'Utilize a plataforma somente com objetivo profissional: consulta de acessos, procedimentos, cursos, fraseologias e demais conteúdos internos. Não a utilize para fins pessoais ou de terceiros.'
        },
        {
          titulo: 'Informações sempre atualizadas',
          detalhe:
            'Ao identificar informações desatualizadas ou incorretas (senhas, IPs, procedimentos), comunique imediatamente à equipe responsável para correção. Não propague dados obsoletos.'
        },
        {
          titulo: 'Registro de uso',
          detalhe:
            'As consultas e visualizações de informações sensíveis podem ser auditadas. Todo acesso é de responsabilidade do colaborador logado.'
        }
      ]
    },
    {
      id: 'credenciais',
      icone: 'bi-shield-lock',
      titulo: 'Segurança das Credenciais',
      introducao:
        'A Central armazena credenciais de acesso a sistemas de clientes e da própria empresa. O manuseio dessas informações exige sigilo absoluto e cuidados específicos.',
      itens: [
        {
          titulo: 'Sigilo das senhas consultadas',
          detalhe:
            'As senhas e acessos consultados na plataforma não podem ser compartilhados fora da Central (WhatsApp, e-mail, anotações em papel, mensagens pessoais, etc.).'
        },
        {
          titulo: 'Acesso individual e intransferível',
          detalhe:
            'O login da Central é pessoal e intransferível. Não compartilhe sua conta com colegas, mesmo de forma temporária.'
        },
        {
          titulo: 'Senha do próprio operador',
          detalhe:
            'Sua senha pessoal de acesso à Central deve ser mantida em sigilo e não deve ser igual às senhas de sistemas de clientes consultadas na plataforma.'
        },
        {
          titulo: 'Uso das credenciais consultadas',
          detalhe:
            'Credenciais devem ser utilizadas apenas para a finalidade operacional legítima (suporte, implantação, atendimento). Não utilize acessos de clientes para navegação sem necessidade ou fora do escopo do atendimento.'
        }
      ]
    },
    {
      id: 'confidencialidade',
      icone: 'bi-incognito',
      titulo: 'Confidencialidade',
      introducao:
        'As informações contidas na Central são de propriedade da JCA Soluções e de seus clientes. A quebra de confidencialidade é violação grave das normas internas.',
      itens: [
        {
          titulo: 'Proibida divulgação externa',
          detalhe:
            'Nenhuma informação obtida na Central (acessos, IPs internos, procedimentos, dados de clientes) pode ser divulgada a pessoas não autorizadas ou a terceiros.'
        },
        {
          titulo: 'Ambiente interno',
          detalhe:
            'O acesso é restrito ao ambiente interno da empresa. Não acesse a Central por redes ou dispositivos não autorizados sem autorização da administração.'
        },
        {
          titulo: 'Termo de responsabilidade',
          detalhe:
            'Ao acessar a plataforma, o colaborador concorda com os termos desta política e com a auditoria de seus acessos quando necessário.'
        }
      ]
    },
    {
      id: 'sancoes',
      icone: 'bi-exclamation-octagon',
      titulo: 'Descumprimento e Sanções',
      introducao:
        'O descumprimento de qualquer diretriz desta política será tratado conforme as normas internas da empresa, podendo resultar em medidas administrativas e disciplinares.',
      itens: [
        {
          titulo: 'Classificação da infração',
          detalhe:
            'Infrações leves (uso inadequado, informações desatualizadas repassadas por descuido) podem gerar advertência e orientação.'
        },
        {
          titulo: 'Infrações graves',
          detalhe:
            'Compartilhamento de credenciais, quebra de sigilo, acesso não autorizado ou qualquer ação que coloque em risco a segurança das informações poderá gerar advertência formal, suspensão de acesso ou demissão, conforme a gravidade.'
        },
        {
          titulo: 'Comunicação de incidentes',
          detalhe:
            'Em caso de perda de dispositivo, suspeita de acesso não autorizado à própria conta ou vazamento acidental, comunique imediatamente à administração para mitigação de riscos.'
        }
      ]
    },
    {
      id: 'revisao',
      icone: 'bi-arrow-repeat',
      titulo: 'Revisão e Validade',
      introducao:
        'Esta política será revisada periodicamente para manter-se alinhada às boas práticas de segurança e às mudanças organizacionais.',
      itens: [
        {
          titulo: 'Ciclo de revisão',
          detalhe:
            'A política possui validade de até 12 meses e será revisada sempre que houver mudanças relevantes de processos, sistemas ou segurança.'
        },
        {
          titulo: 'Canal para dúvidas',
          detalhe:
            'Dúvidas sobre esta política ou sobre o uso da Central devem ser encaminhadas à equipe de Suporte ou à Administração da JCA Soluções.'
        }
      ]
    }
  ]
};