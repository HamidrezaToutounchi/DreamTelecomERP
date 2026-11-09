import { defineConfig } from 'orval';

export default defineConfig({
  crm: {
    input: {
      target: '../backend/docs/openapi.json',
    },
    output: {
      mode: 'split',
      target: 'src/api/generated.ts',
      schemas: 'src/api/model',
      client: 'react-query',
      override: {
        mutator: {
          path: './src/lib/http.ts',
          name: 'customInstance',
        },
        query: {
          useQuery: true,
          useMutation: true,
          signal: true,
        },
      },
    },
  },
});
