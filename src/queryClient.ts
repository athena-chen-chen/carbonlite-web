import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient();

export function invalidateDemoDataQueries() {
  const queryKeys = [
    ['documents'],
    ['document-extraction'],
    ['input-review'],
    ['upload'],
    ['import'],
    ['activity-data'],
    ['metrics'],
    ['reports'],
    ['home', 'emissions'],
  ];

  queryKeys.forEach((queryKey) => {
    void queryClient.invalidateQueries({ queryKey });
  });
}
