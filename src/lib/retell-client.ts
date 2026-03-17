// Retell AI API Client
// API Reference: https://docs.retellai.com/api-reference/overview

import {
  PhoneNumber,
  CreatePhoneNumberRequest,
  UpdatePhoneNumberRequest,
  Agent,
  CreateAgentRequest,
  UpdateAgentRequest,
  Call,
  CreatePhoneCallRequest,
  CreateWebCallRequest,
  WebCallResponse,
  Voice,
  Conversation,
  ListResponse,
  ListQueryParams,
} from './retell-types';

// Retell AI API Base URL
const RETELL_API_BASE_URL = 'https://api.retellai.com';

export class RetellClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey || process.env.RETELL_API_KEY || '';
    this.baseUrl = baseUrl || RETELL_API_BASE_URL;
    
    if (!this.apiKey) {
      console.warn('Retell API key is not set. Please set RETELL_API_KEY environment variable.');
    }
  }

  private async request<T>(
    method: string,
    path: string,
    data?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    
    const headers: HeadersInit = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (data && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    console.log(`[Retell API] ${method} ${path}`);

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorJson.error_message || errorText;
      } catch {
        // Use raw text if JSON parsing fails
      }
      throw new Error(`Retell API Error (${response.status}): ${errorMessage}`);
    }

    // Handle empty response
    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    return JSON.parse(text) as T;
  }

  // ==================== Phone Numbers ====================
  // API Reference: https://docs.retellai.com/api-reference/phone-numbers

  async listPhoneNumbers(params?: ListQueryParams): Promise<ListResponse<PhoneNumber>> {
    const queryParams = new URLSearchParams();
    if (params?.cursor) queryParams.append('cursor', params.cursor);
    
    const query = queryParams.toString();
    const path = query ? `/list-phone-numbers?${query}` : '/list-phone-numbers';
    
    const result = await this.request<PhoneNumber[]>('GET', path);
    // API returns array directly, wrap in ListResponse format
    return { data: result };
  }

  async createPhoneNumber(data: CreatePhoneNumberRequest): Promise<PhoneNumber> {
    return this.request<PhoneNumber>('POST', '/create-phone-number', data);
  }

  async getPhoneNumber(phoneNumber: string): Promise<PhoneNumber> {
    return this.request<PhoneNumber>('GET', `/get-phone-number/${encodeURIComponent(phoneNumber)}`);
  }

  async updatePhoneNumber(phoneNumber: string, data: UpdatePhoneNumberRequest): Promise<PhoneNumber> {
    return this.request<PhoneNumber>('PATCH', `/update-phone-number/${encodeURIComponent(phoneNumber)}`, data);
  }

  async deletePhoneNumber(phoneNumber: string): Promise<void> {
    await this.request<void>('DELETE', `/delete-phone-number/${encodeURIComponent(phoneNumber)}`);
  }

  // ==================== Agents ====================
  // API Reference: https://docs.retellai.com/api-reference/agents

  async listAgents(params?: ListQueryParams): Promise<ListResponse<Agent>> {
    const queryParams = new URLSearchParams();
    if (params?.before) queryParams.append('before', params.before.toString());
    if (params?.after) queryParams.append('after', params.after.toString());
    if (params?.filter_criteria) {
      queryParams.append('filter_criteria', JSON.stringify(params.filter_criteria));
    }
    
    const query = queryParams.toString();
    const path = query ? `/list-agents?${query}` : '/list-agents';
    
    const result = await this.request<Agent[]>('GET', path);
    return { data: result };
  }

  async createAgent(data: CreateAgentRequest): Promise<Agent> {
    return this.request<Agent>('POST', '/create-agent', data);
  }

  async getAgent(agentId: string): Promise<Agent> {
    return this.request<Agent>('GET', `/get-agent/${agentId}`);
  }

  async updateAgent(agentId: string, data: UpdateAgentRequest): Promise<Agent> {
    return this.request<Agent>('PATCH', `/update-agent/${agentId}`, data);
  }

  async deleteAgent(agentId: string): Promise<void> {
    await this.request<void>('DELETE', `/delete-agent/${agentId}`);
  }

  // ==================== Calls ====================
  // API Reference: https://docs.retellai.com/api-reference/calls
  // Note: Call endpoints use /v2 prefix

  async listCalls(params?: ListQueryParams): Promise<ListResponse<Call>> {
    // Use POST /v2/list-calls endpoint
    const result = await this.request<Call[]>('POST', '/v2/list-calls', {
      filter_criteria: params?.filter_criteria,
      limit: params?.limit,
    });
    return { data: result };
  }

  async createPhoneCall(data: CreatePhoneCallRequest): Promise<Call> {
    return this.request<Call>('POST', '/v2/create-phone-call', data);
  }

  async createWebCall(data: CreateWebCallRequest): Promise<WebCallResponse> {
    return this.request<WebCallResponse>('POST', '/v2/create-web-call', data);
  }

  async getCall(callId: string): Promise<Call> {
    return this.request<Call>('GET', `/v2/get-call/${callId}`);
  }

  async deleteCall(callId: string): Promise<void> {
    await this.request<void>('DELETE', `/v2/delete-call/${callId}`);
  }

  // ==================== Voices ====================
  // API Reference: https://docs.retellai.com/api-reference/voices

  async listVoices(params?: ListQueryParams): Promise<ListResponse<Voice>> {
    const queryParams = new URLSearchParams();
    if (params?.cursor) queryParams.append('cursor', params.cursor);
    
    const query = queryParams.toString();
    const path = query ? `/list-voices?${query}` : '/list-voices';
    
    const result = await this.request<Voice[]>('GET', path);
    return { data: result };
  }

  async getVoice(voiceId: string): Promise<Voice> {
    return this.request<Voice>('GET', `/get-voice/${voiceId}`);
  }

  // ==================== Conversations ====================
  // Note: Retell AI may have limited support for listing all conversations

  async listConversations(params?: ListQueryParams): Promise<ListResponse<Conversation>> {
    // Try to use list-conversations if available, otherwise return empty
    try {
      const queryParams = new URLSearchParams();
      if (params?.cursor) queryParams.append('cursor', params.cursor);
      if (params?.before) queryParams.append('before', params.before.toString());
      if (params?.after) queryParams.append('after', params.after.toString());
      if (params?.filter_criteria) {
        queryParams.append('filter_criteria', JSON.stringify(params.filter_criteria));
      }
      
      const query = queryParams.toString();
      const path = query ? `/list-conversations?${query}` : '/list-conversations';
      
      const result = await this.request<Conversation[]>('GET', path);
      return { data: result };
    } catch (error) {
      console.warn('Could not list conversations:', error);
      return { data: [] };
    }
  }

  async getConversation(conversationId: string): Promise<Conversation> {
    return this.request<Conversation>('GET', `/get-conversation/${conversationId}`);
  }

  async deleteConversation(conversationId: string): Promise<void> {
    await this.request<void>('DELETE', `/delete-conversation/${conversationId}`);
  }
}

// Singleton instance
export const retellClient = new RetellClient();

export function getRetellClient(): RetellClient {
  return retellClient;
}
