export interface AppConfig {
  nome: string;
  nomeCurto: string;
  subtitulo: string;
  versao: string;
  logo: string;
  favicon: string;
}

export const APP_CONFIG: AppConfig = {
  nome: 'CENTRAL DE OPERAÇÃO JCA SOLUÇÕES',
  nomeCurto: 'Central de Operação',
  subtitulo: 'Portal interno unificado',
  versao: '0.8.0',
  logo: '/assets/images/logo-jca.png',
  favicon: '/assets/images/favicon-32x32.png'
} as const;