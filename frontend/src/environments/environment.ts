export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:1009/api/v1',
  // Quando true, o login e o refresh token sao simulados no front-end
  // (usuario admin / senha admin). Troque para false quando o backend
  // ASP.NET Core 8 estiver disponivel.
  useMockAuth: false
};
