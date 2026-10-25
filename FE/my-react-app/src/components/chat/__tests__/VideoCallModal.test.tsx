// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatSocketClient, WsInboundEvent } from '@/api/ws.client';
import { VideoCallModal } from '../VideoCallModal';

vi.mock('@/hooks/api/useAuth', () => ({ useAuth: () => ({ user: { id: 'me', full_name: 'Caller' } }) }));
vi.mock('@/api/resources/call.api', () => ({ default: { start: vi.fn().mockResolvedValue({ id: 'call' }), join: vi.fn().mockResolvedValue({}) } }));

class MockPeerConnection {
  static instances: MockPeerConnection[] = [];
  signalingState = 'stable';
  remoteDescription = null;
  onicecandidate = null;
  ontrack = null;
  addTrack = vi.fn();
  addIceCandidate = vi.fn().mockResolvedValue(undefined);
  createOffer = vi.fn().mockResolvedValue({ type: 'offer', sdp: 'offer-sdp' });
  createAnswer = vi.fn().mockResolvedValue({ type: 'answer', sdp: 'answer-sdp' });
  setLocalDescription = vi.fn().mockResolvedValue(undefined);
  setRemoteDescription = vi.fn().mockResolvedValue(undefined);
  getSenders = () => [];
  close = vi.fn(() => { this.signalingState = 'closed'; });
  constructor() { MockPeerConnection.instances.push(this); }
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe('VideoCallModal media lifecycle', () => {
  const listeners = new Set<(event: WsInboundEvent) => void>();
  const send = vi.fn();
  const onHangup = vi.fn();
  const getUserMedia = vi.fn<() => Promise<MediaStream>>();
  const socket = {
    send,
    on: (listener: (event: WsInboundEvent) => void) => { listeners.add(listener); return () => listeners.delete(listener); },
  } as unknown as ChatSocketClient;
  beforeEach(() => {
    listeners.clear();
    MockPeerConnection.instances = [];
    vi.stubGlobal('RTCPeerConnection', MockPeerConnection);
    vi.stubGlobal('RTCSessionDescription', class { readonly description: RTCSessionDescriptionInit; constructor(description: RTCSessionDescriptionInit) { this.description = description; } });
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
  it('releases late camera results and socket subscriptions after unmount', async () => {
    const media = deferred<MediaStream>();
    getUserMedia.mockReturnValueOnce(media.promise);
    const stop = vi.fn();
    const view = render(<VideoCallModal offer={null} targetUserId="peer" convId="conversation" socket={socket} onHangup={onHangup} onAccept={() => {}} />);
    expect(listeners.size).toBe(1);
    view.unmount();
    expect(listeners.size).toBe(0);
    expect(MockPeerConnection.instances[0].close).toHaveBeenCalled();
    await act(async () => { media.resolve({ getTracks: () => [{ stop }] } as unknown as MediaStream); });
    expect(stop).toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
    expect(onHangup).not.toHaveBeenCalled();
  });
  it('requests camera permission only after accepting an incoming call', async () => {
    const media = deferred<MediaStream>();
    getUserMedia.mockReturnValueOnce(media.promise);
    const view = render(<VideoCallModal offer={{ from_user_id: 'peer', conversation_id: 'conversation', signal_data: { type: 'offer', sdp: 'sdp' } }} socket={socket} onHangup={onHangup} onAccept={() => {}} />);
    expect(getUserMedia).not.toHaveBeenCalled();
    fireEvent.click(view.getByText('Nghe máy'));
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(1));
    const stop = vi.fn();
    view.unmount();
    await act(async () => { media.resolve({ getTracks: () => [{ stop }] } as unknown as MediaStream); });
    expect(stop).toHaveBeenCalled();
  });
  it('ignores answers from an unrelated peer or conversation', async () => {
    const media = deferred<MediaStream>();
    getUserMedia.mockReturnValueOnce(media.promise);
    const view = render(<VideoCallModal offer={null} targetUserId="peer" convId="conversation" socket={socket} onHangup={onHangup} onAccept={() => {}} />);
    for (const listener of listeners) {
      listener({ event: 'call_answer', from_user_id: 'stranger', conversation_id: 'conversation', data: { type: 'answer' } });
      listener({ event: 'call_answer', from_user_id: 'peer', conversation_id: 'other', data: { type: 'answer' } });
    }
    expect(MockPeerConnection.instances[0].setRemoteDescription).not.toHaveBeenCalled();
    view.unmount();
    await act(async () => { media.resolve({ getTracks: () => [] } as unknown as MediaStream); });
  });
});
