import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
import { HealthScreen } from '../screens/HealthScreen';

let client: QueryClient;

function renderScreen() {
  // gcTime: Infinity stops React Query scheduling garbage-collection timers that keep Jest alive.
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return render(
    <QueryClientProvider client={client}>
      <HealthScreen />
    </QueryClientProvider>,
  );
}

describe('HealthScreen', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    client.clear();
    global.fetch = realFetch;
  });

  it('shows a healthy HTTPS connection and a blocked plaintext probe', async () => {
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('http://')) throw new TypeError('Cleartext HTTP traffic not permitted');
      return new Response(
        JSON.stringify({ status: 'ok', uptimeSeconds: 7, timestamp: new Date().toISOString() }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof fetch;

    await renderScreen();

    expect(await screen.findByText('API healthy (up 7s)')).toBeOnTheScreen();
    expect(await screen.findByText('Blocked (good)')).toBeOnTheScreen();
    expect(screen.getByText('https://10.0.2.2:8443')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Check connection again' })).toBeOnTheScreen();
  });

  it('flags an unreachable API and a plaintext leak', async () => {
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('http://')) return new Response('', { status: 200 });
      throw new TypeError('Network request failed');
    }) as typeof fetch;

    await renderScreen();

    expect(await screen.findByText('Unreachable: Unable to reach the server')).toBeOnTheScreen();
    expect(await screen.findByText('ALLOWED: plaintext traffic got through')).toBeOnTheScreen();
  });
});
