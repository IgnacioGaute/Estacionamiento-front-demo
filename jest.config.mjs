import nextJest from 'next/jest.js';

// next/jest compila con SWC igual que Next, ignora .next/ y node_modules, y simula los imports de
// CSS e imágenes. El alias @/ hay que repetirlo acá: Jest no lee los paths de tsconfig.
const createJestConfig = nextJest({ dir: './' });

export default createJestConfig({
  // La mayoría de los tests son de lógica pura. Un test de componente pide el DOM en su primera
  // línea con el docblock `/** @jest-environment jsdom */`.
  testEnvironment: 'node',
  // En jsdom Jest elegiría la versión "browser" de los paquetes, que en lucide-react, jose y otros
  // es ESM y Jest no la carga sin transformar. Las de Node sirven igual para renderizar.
  testEnvironmentOptions: { customExportConditions: ['node', 'node-addons'] },
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/**/*.test.{ts,tsx}'],
});
