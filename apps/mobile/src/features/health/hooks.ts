import { useQuery } from '@tanstack/react-query';
import { fetchHealth, probePlaintext } from './api';

export const healthKeys = {
  all: ['health'] as const,
  status: () => [...healthKeys.all, 'status'] as const,
  plaintext: () => [...healthKeys.all, 'plaintext'] as const,
};

export function useHealth() {
  return useQuery({ queryKey: healthKeys.status(), queryFn: () => fetchHealth(), staleTime: 0 });
}

export function usePlaintextProbe() {
  return useQuery({
    queryKey: healthKeys.plaintext(),
    queryFn: () => probePlaintext(),
    staleTime: 0,
    retry: false,
  });
}
