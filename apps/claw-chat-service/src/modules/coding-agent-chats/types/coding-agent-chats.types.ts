import { type ChatMessage } from '../../../generated/prisma';
import { type ThreadWithMessageCount } from '../../chat-threads/types/chat-threads.types';

export type CodingAgentThread = ThreadWithMessageCount;

export type CodingAgentMessage = ChatMessage;
