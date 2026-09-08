#!/usr/bin/env npx tsx
/**
 * extract-screens.ts
 * 
 * Extrai estrutura de rotas, components, services e endpoints backend
 * para gerar o JSON intermediário usado pelo docs-writer na geração de TELAS.md.
 * 
 * Uso: npx tsx scripts/extract-screens.ts
 * Saída: scripts/screens-data.json
 */

import * as fs from 'fs';
import * as path from 'path';

// ── Tipos ──────────────────────────────────────────────────────────────────

interface RouteInfo {
  path: string;
  component: string;
  lazy: boolean;
  file: string;
}

interface ServiceInfo {
  name: string;
  file: string;
  methods: string[];
  httpCalls: HttpCall[];
}

interface HttpCall {
  method: string;
  url: string;
  serviceMethod: string;
}

interface ComponentInfo {
  name: string;
  file: string;
  services: ServiceInfo[];
  routes: RouteInfo[];
}

interface EndpointInfo {
  method: string;
  route: string;
  controller: string;
  service: string;
  description: string;
}

interface ScreensData {
  generatedAt: string;
  frontend: {
    routes: RouteInfo[];
    components: ComponentInfo[];
  };
  backend: {
    endpoints: EndpointInfo[];
    tables: string[];
    migrations: string[];
  };
}

// ── Frontend Extraction ────────────────────────────────────────────────────

function extractRoutes(): RouteInfo[] {
  const routesDir = path.join(__dirname, '..', 'frontend', 'src', 'app', 'features');
  const routes: RouteInfo[] = [];

  function scanDir(dir: string, parentPath: string) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory() && file.name !== 'node_modules') {
        scanDir(fullPath, path.join(parentPath, file.name));
      } else if (file.name.endsWith('.routes.ts')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const routeMatches = content.matchAll(
          /path:\s*['"`]([^'"`]+)['"`][\s\S]*?loadComponent:\s*\(\s*\)\s*=>\s*import\(\s*['"`]([^'"`]+)['"`]/g
        );
        const redirectMatches = content.matchAll(
          /path:\s*['"`]([^'"`]+)['"`][\s\S]*?redirectTo:\s*['"`]([^'"`]+)['"`]/g
        );

        for (const match of routeMatches) {
          routes.push({
            path: match[1],
            component: match[2].replace(/\.ts$/, '.component'),
            lazy: true,
            file: fullPath.replace(/\\/g, '/')
          });
        }
        for (const match of redirectMatches) {
          routes.push({
            path: match[1],
            component: match[2],
            lazy: false,
            file: fullPath.replace(/\\/g, '/')
          });
        }
      }
    }
  }

  scanDir(routesDir, '');
  return routes;
}

function extractComponents(): ComponentInfo[] {
  const componentsDir = path.join(__dirname, '..', 'frontend', 'src', 'app', 'features');
  const components: ComponentInfo[] = [];

  function scanDir(dir: string) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory() && file.name !== 'node_modules') {
        scanDir(fullPath);
      } else if (file.name.endsWith('.component.ts')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const componentName = content.match(/export class (\w+)Component/)?.[1] || '';
        const serviceImports = content.matchAll(
          /import\s+\{([^}]+)\}\s+from\s+['"`]([^'"`]+)['"`]/g
        );
        const services: ServiceInfo[] = [];
        for (const si of serviceImports) {
          const importedNames = si[1].split(',').map((s: string) => s.trim());
          const sourcePath = si[2];
          if (sourcePath.includes('services/') || sourcePath.includes('Service')) {
            const serviceName = sourcePath.split('/').pop()?.replace('.service.ts', '') || '';
            services.push({
              name: serviceName,
              file: sourcePath,
              methods: [],
              httpCalls: []
            });
          }
        }

        const httpCalls = content.matchAll(
          /this\.(\w+)\.(listar|obter|criar|atualizar|excluir|buscar|mover|reordenar|validar|listarEmpresas|listarCursos)\s*\(/g
        );
        for (const hc of httpCalls) {
          if (services.length > 0) {
            const svc = services[services.length - 1];
            svc.methods.push(hc[1]);
            svc.httpCalls.push({
              method: 'GET',
              url: `/${hc[1]}`,
              serviceMethod: hc[1]
            });
          }
        }

        components.push({
          name: componentName,
          file: fullPath.replace(/\\/g, '/'),
          services,
          routes: []
        });
      }
    }
  }

  scanDir(componentsDir);
  return components;
}

// ── Backend Extraction ─────────────────────────────────────────────────────

function extractBackendEndpoints(): EndpointInfo[] {
  const controllersDir = path.join(__dirname, '..', 'backend', 'Central_BackEnd', 'Controllers');
  const endpoints: EndpointInfo[] = [];

  if (!fs.existsSync(controllersDir)) return endpoints;

  function scanDir(dir: string) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory() && file.name !== 'node_modules') {
        scanDir(fullPath);
      } else if (file.name.endsWith('Controller.cs')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const controllerName = file.name.replace('Controller.cs', '');
        // Robust endpoint extraction
        const endpointRegex = /\[Http(Get|Post|Put|Delete|Patch)(?:\(["'`](.*?)["'`]\))?\][\s\S]*?public\s+(?:async\s+)?Task<(?:ActionResult<)?(.*?)(?:>)?\s+(\w+)/g;
        
        let match;
        const baseRouteMatch = content.match(/\[Route\(["'`](.*?)["'`]\)\]/);
        const baseRoute = baseRouteMatch ? baseRouteMatch[1] : '';

        while ((match = endpointRegex.exec(content)) !== null) {
          const httpMethod = match[1];
          const subRoute = match[2] || '';
          const returnType = match[3];
          const methodName = match[4];

          endpoints.push({
            method: httpMethod.toUpperCase(),
            route: (baseRoute + (subRoute ? '/' + subRoute : '')).replace(/\/+/g, '/'),
            controller: controllerName,
            service: '',
            description: `${methodName} returning ${returnType}`
          });
        }
      }
    }
  }

  scanDir(controllersDir);
  return endpoints;
}

function extractTables(): string[] {
  const modelsDir = path.join(__dirname, '..', 'backend', 'Central_BackEnd', 'Models');
  const tables: string[] = [];

  if (!fs.existsSync(modelsDir)) return tables;

  function scanDir(dir: string) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory() && file.name !== 'node_modules') {
        scanDir(fullPath);
      } else if (file.name.endsWith('.cs')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const tableMatch = content.match(/\[Table\(['"`]([^'"`]+)['"`]\)\]/);
        if (tableMatch) {
          tables.push(tableMatch[1]);
        } else {
          // Try to infer from class name
          const classMatch = content.match(/class\s+(\w+)/);
          if (classMatch && classMatch[1].endsWith('Entity')) {
            tables.push(classMatch[1].replace('Entity', ''));
          }
        }
      }
    }
  }

  scanDir(modelsDir);
  return tables;
}

function extractMigrations(): string[] {
  const migrationsDir = path.join(__dirname, '..', 'backend', 'Central_BackEnd', 'Migrations');
  const migrations: string[] = [];

  if (!fs.existsSync(migrationsDir)) return migrations;

  const files = fs.readdirSync(migrationsDir);
  for (const file of files) {
    if (file.endsWith('.cs') && !file.endsWith('Designer.cs') && !file.endsWith('ModelSnapshot.cs')) {
      const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      const descMatch = content.match(/\/\/ Migration:\s*(.+)/);
      migrations.push({
        file,
        description: descMatch?.[1] || file
      } as any);
    }
  }
  return migrations;
}

// ── Main ───────────────────────────────────────────────────────────────────

function main() {
  const data: ScreensData = {
    generatedAt: new Date().toISOString(),
    frontend: {
      routes: extractRoutes(),
      components: extractComponents()
    },
    backend: {
      endpoints: extractBackendEndpoints(),
      tables: extractTables(),
      migrations: extractMigrations()
    }
  };

  const outputPath = path.join(__dirname, 'screens-data.json');
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`✅ TELAS.md data extracted to ${outputPath}`);
  console.log(`   Routes: ${data.frontend.routes.length}`);
  console.log(`   Components: ${data.frontend.components.length}`);
  console.log(`   Backend Endpoints: ${data.backend.endpoints.length}`);
  console.log(`   Tables: ${data.backend.tables.length}`);
  console.log(`   Migrations: ${data.backend.migrations.length}`);
}

main();
