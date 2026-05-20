import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      boxShadow: {
        input: '0 1px 3px rgba(15, 23, 42, 0.08)',
        card: '0 10px 30px rgba(15, 23, 42, 0.08)'
      },
      colors: {
        brand: {
          50: '#eff9ff',
          100: '#dbeffe',
          500: '#1d4ed8',
          700: '#1e40af'
        }
      }
    }
  },
  plugins: []
};

export default config;
