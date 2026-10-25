import type {  ApiUserPublic } from './user.types';

export interface ApiCallParticipant {
  user: ApiUserPublic;
  joined_at: string | null;
  left_at: string | null;
}

export interface ApiCallSession {
  id: string;
  conversation_id: string;
  call_type: 'voice' | 'video';
  started_at: string;
  ended_at: string | null;
  participants: ApiCallParticipant[];
}

export interface ApiStartCallPayload {
  conversation_id: string;
  call_type: 'voice' | 'video';
  participant_ids: string[];
}