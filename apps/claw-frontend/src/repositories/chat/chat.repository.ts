import type { MessageFeedback } from '@/enums';
import { apiClient } from '@/services/shared/api-client';
import type {
  BestOfNRequest,
  BestOfNResponse,
  ChatThread,
  ChatMessage,
  ConsensusRequest,
  ConsensusResponse,
  CreateThreadRequest,
  CreateMessageRequest,
  DecomposeRequest,
  DecomposeResponse,
  EscalationChainRequest,
  EscalationChainResponse,
  MessagesListResponse,
  ParallelRequest,
  ParallelResponse,
  RepairRequest,
  RepairResponse,
  SendCostEnsemblePayload,
  SendCostEnsembleResult,
  SendPipelinePayload,
  SendPipelineResult,
  SendVerifyPayload,
  SendVerifyResult,
  ThreadsListResponse,
} from '@/types';

export const chatRepository = {
  async createThread(data: CreateThreadRequest): Promise<ChatThread> {
    const response = await apiClient.post<ChatThread>('/chat-threads', data);
    return response.data;
  },

  async getThreads(params?: Record<string, string>): Promise<ThreadsListResponse> {
    const response = await apiClient.get<ThreadsListResponse>('/chat-threads', params);
    return response.data;
  },

  async getThreadsPaginated(
    page: number,
    limit: number,
    params?: Record<string, string>,
  ): Promise<ThreadsListResponse> {
    const response = await apiClient.get<ThreadsListResponse>('/chat-threads', {
      ...params,
      page: String(page),
      limit: String(limit),
    });
    return response.data;
  },

  async getThread(id: string): Promise<ChatThread> {
    const response = await apiClient.get<ChatThread>(`/chat-threads/${id}`);
    return response.data;
  },

  async updateThread(id: string, data: Partial<ChatThread>): Promise<ChatThread> {
    const response = await apiClient.patch<ChatThread>(`/chat-threads/${id}`, data);
    return response.data;
  },

  async deleteThread(id: string): Promise<void> {
    await apiClient.delete(`/chat-threads/${id}`);
  },

  async createMessage(data: CreateMessageRequest): Promise<ChatMessage> {
    const response = await apiClient.post<ChatMessage>('/chat-messages', data);
    return response.data;
  },

  async getMessages(
    threadId: string,
    params?: Record<string, string>,
  ): Promise<MessagesListResponse> {
    const response = await apiClient.get<MessagesListResponse>(
      `/chat-messages/thread/${threadId}`,
      params,
    );
    return response.data;
  },

  async getMessagesPaginated(
    threadId: string,
    page: number,
    limit: number,
  ): Promise<MessagesListResponse> {
    const response = await apiClient.get<MessagesListResponse>(
      `/chat-messages/thread/${threadId}`,
      { page: String(page), limit: String(limit) },
    );
    return response.data;
  },

  async regenerateMessage(messageId: string): Promise<ChatMessage> {
    const response = await apiClient.post<ChatMessage>(`/chat-messages/${messageId}/regenerate`);
    return response.data;
  },

  async setFeedback(messageId: string, feedback: MessageFeedback | null): Promise<ChatMessage> {
    const response = await apiClient.patch<ChatMessage>(`/chat-messages/${messageId}/feedback`, {
      feedback,
    });
    return response.data;
  },

  async sendParallel(data: ParallelRequest): Promise<ParallelResponse> {
    const response = await apiClient.post<ParallelResponse>('/chat-messages/parallel', data);
    return response.data;
  },

  async sendConsensus(data: ConsensusRequest): Promise<ConsensusResponse> {
    const response = await apiClient.post<ConsensusResponse>('/chat-messages/consensus', data);
    return response.data;
  },

  async sendEscalationChain(data: EscalationChainRequest): Promise<EscalationChainResponse> {
    const response = await apiClient.post<EscalationChainResponse>(
      '/chat-messages/escalation-chain',
      data,
    );
    return response.data;
  },

  async repairMessage(data: RepairRequest): Promise<RepairResponse> {
    const response = await apiClient.post<RepairResponse>('/chat-messages/repair', data);
    return response.data;
  },

  async decomposeTask(data: DecomposeRequest): Promise<DecomposeResponse> {
    const response = await apiClient.post<DecomposeResponse>('/chat-messages/decompose', data);
    return response.data;
  },

  async bestOfNMessage(data: BestOfNRequest): Promise<BestOfNResponse> {
    const response = await apiClient.post<BestOfNResponse>('/chat-messages/best-of-n', data);
    return response.data;
  },

  async sendVerify(payload: SendVerifyPayload): Promise<SendVerifyResult> {
    const res = await apiClient.post<SendVerifyResult>('/chat-messages/verify', payload);
    return res.data;
  },

  async sendPipeline(payload: SendPipelinePayload): Promise<SendPipelineResult> {
    const res = await apiClient.post<SendPipelineResult>('/chat-messages/pipeline', payload);
    return res.data;
  },

  async sendCostEnsemble(payload: SendCostEnsemblePayload): Promise<SendCostEnsembleResult> {
    const res = await apiClient.post<SendCostEnsembleResult>(
      '/chat-messages/cost-ensemble',
      payload,
    );
    return res.data;
  },
};
