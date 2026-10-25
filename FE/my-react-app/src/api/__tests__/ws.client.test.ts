import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatSocketClient } from '../ws.client';

const auth = vi.hoisted(() => ({ token: 'test-token', refresh: vi.fn() }));
vi.mock('@/config/env.config', () => ({ default: { WS_BASE_URL: 'ws://test' } }));
vi.mock('@/services/token.service', () => ({ tokenService: {
  getAccessToken: () => auth.token,
  getRefreshToken: () => null,
  clearTokens: vi.fn(),
} }));
vi.mock('@/api/resources/auth.resource', () => ({ authResource: { refresh: auth.refresh } }));

class MockWebSocket {
  static OPEN = 1;
  static CONNECTING = 0;
  static instances: MockWebSocket[] = [];
  readyState = MockWebSocket.CONNECTING;
  onopen?: () => void;
  onclose?: (event: { code: number }) => void;
  onmessage?: (event: { data: string }) => void;
  sent: string[] = [];
  readonly url: string;
  constructor(url: string) { this.url = url; MockWebSocket.instances.push(this); }
  send(data: string) { this.sent.push(data); }
  open() { this.readyState = MockWebSocket.OPEN; this.onopen?.(); }
  close(code = 1000) { this.readyState = 3; this.onclose?.({ code }); }
}

describe('ChatSocketClient', () => {
  let client: ChatSocketClient;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    auth.token = 'test-token';
    MockWebSocket.instances = [];
  });
  afterEach(() => {
    client?.disconnect();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
  it('reuses an existing connecting or open connection', () => {
    client = new ChatSocketClient();
    client.connect();
    MockWebSocket.instances[0].open();
    client.connect();
    expect(MockWebSocket.instances).toHaveLength(1);
  });
  it('waits for authentication before connecting', () => {
    auth.token = '';
    client = new ChatSocketClient();
    expect(MockWebSocket.instances).toHaveLength(0);
    auth.token = 'new-token';
    client.connect();
    expect(MockWebSocket.instances[0].url).toContain('token=new-token');
  });
  it('delivers notifications and ignores heartbeat replies and malformed frames', () => {
    client = new ChatSocketClient();
    const listener = vi.fn();
    const unsubscribe = client.on(listener);
    const ws = MockWebSocket.instances[0];
    const event = { event: 'new_notification', data: { id: 'notice' } };
    ws.onmessage?.({ data: JSON.stringify(event) });
    ws.onmessage?.({ data: '{broken' });
    ws.onmessage?.({ data: '{"event":"pong"}' });
    expect(listener).toHaveBeenCalledExactlyOnceWith(event);
    unsubscribe();
    ws.onmessage?.({ data: JSON.stringify(event) });
    expect(listener).toHaveBeenCalledTimes(1);
  });
  it('sends heartbeats and cancels them after disconnect', () => {
    client = new ChatSocketClient();
    const ws = MockWebSocket.instances[0];
    ws.open();
    vi.advanceTimersByTime(25_000);
    expect(ws.sent).toEqual(['{"event":"ping"}']);
    client.disconnect();
    vi.advanceTimersByTime(50_000);
    expect(ws.sent).toHaveLength(1);
    expect(MockWebSocket.instances).toHaveLength(1);
  });
  it('reconnects after network failure and permits reconnect after explicit disconnect', () => {
    client = new ChatSocketClient();
    MockWebSocket.instances[0].open();
    MockWebSocket.instances[0].close(1006);
    vi.advanceTimersByTime(3_000);
    expect(MockWebSocket.instances).toHaveLength(2);
    client.disconnect();
    client.connect();
    MockWebSocket.instances[2].open();
    expect(MockWebSocket.instances[2].readyState).toBe(MockWebSocket.OPEN);
    vi.advanceTimersByTime(25_000);
    expect(MockWebSocket.instances[2].sent).toEqual(['{"event":"ping"}']);
  });
});
