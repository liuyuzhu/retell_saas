// Retell AI API Client
// API Reference: https://docs.retellai.com/

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

// API Version - can be adjusted based on your Retell AI account
type ApiVersion = 'v1' | 'v2' | 'default';

export class RetellClient {
  private apiKey: string;
  private baseUrl: string;
  private apiVersion: ApiVersion;

  constructor(apiKey?: string, baseUrl?: string, apiVersion?: ApiVersion) {
    this.apiKey = apiKey || process.env.RETELL_API_KEY || '';
    this.baseUrl = baseUrl || RETELL_API_BASE_URL;
    this.apiVersion = apiVersion || 'default';
    
    if (!this.apiKey) {
      console.warn('Retell API key is not set. Please set RETELL_API_KEY environment variable.');
    }
  }

  // Build path with optional version prefix
  private buildPath(endpoint: string): string {
    if (this.apiVersion === 'default') {
      return endpoint;
    }
    return `/${this.apiVersion}${endpoint}`;
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

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorText;
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
  // API Endpoints:
  // - List: GET /get-phone-numbers or GET /phone-numbers
  // - Create: POST /create-phone-number or POST /phone-numbers
  // - Get: GET /get-phone-number/:number or GET /phone-numbers/:number
  // - Update: PATCH /update-phone-number/:number or PATCH /phone-numbers/:number
  // - Delete: DELETE /delete-phone-number/:number or DELETE /phone-numbers/:number

  async listPhoneNumbers(params?: ListQueryParams): Promise<ListResponse<PhoneNumber>> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.cursor) queryParams.append('cursor', params.cursor);
    
    const query = queryParams.toString();
    const path = query ? `/get-phone-numbers?${query}` : '/get-phone-numbers';
    
    return this.request<ListResponse<PhoneNumber>>('GET', this.buildPath(path));
  }

  async createPhoneNumber(data: CreatePhoneNumberRequest): Promise<PhoneNumber> {
    return this.request<PhoneNumber>('POST', this.buildPath('/create-phone-number'), data);
  }

  async getPhoneNumber(phoneNumber: string): Promise<PhoneNumber> {
    return this.request<PhoneNumber>('GET', this.buildPath(`/get-phone-number/${encodeURIComponent(phoneNumber)}`));
  }

  async updatePhoneNumber(phoneNumber: string, data: UpdatePhoneNumberRequest): Promise<PhoneNumber> {
    return this.request<PhoneNumber>('PATCH', this.buildPath(`/update-phone-number/${encodeURIComponent(phoneNumber)}`), data);
  }

  async deletePhoneNumber(phoneNumber: string): Promise<void> {
    await this.request<void>('DELETE', this.buildPath(`/delete-phone-number/${encodeURIComponent(phoneNumber)}`));
  }

  // ==================== Agents ====================
  // API Endpoints:
  // - List: GET /get-agents or GET /agents
  // - Create: POST /create-agent or POST /agents
  // - Get: GET /get-agent/:id or GET /agents/:id
  // - Update: PATCH /update-agent/:id or PATCH /agents/:id
  // - Delete: DELETE /delete-agent/:id or DELETE /agents/:id

  async listAgents(params?: ListQueryParams): Promise<ListResponse<Agent>> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.cursor) queryParams.append('cursor', params.cursor);
    if (params?.before) queryParams.append('before', params.before.toString());
    if (params?.after) queryParams.append('after', params.after.toString());
    if (params?.filter_criteria) {
      queryParams.append('filter_criteria', JSON.stringify(params.filter_criteria));
    }
    
    const query = queryParams.toString();
    const path = query ? `/get-agents?${query}` : '/get-agents';
    
    return this.request<ListResponse<Agent>>('GET', this.buildPath(path));
  }

  async createAgent(data: CreateAgentRequest): Promise<Agent> {
    return this.request<Agent>('POST', this.buildPath('/create-agent'), data);
  }

  async getAgent(agentId: string): Promise<Agent> {
    return this.request<Agent>('GET', this.buildPath(`/get-agent/${agentId}`));
  }

  async updateAgent(agentId: string, data: UpdateAgentRequest): Promise<Agent> {
    return this.request<Agent>('PATCH', this.buildPath(`/update-agent/${agentId}`), data);
  }

  async deleteAgent(agentId: string): Promise<void> {
    await this.request<void>('DELETE', this.buildPath(`/delete-agent/${agentId}`));
  }

  // ==================== Calls ====================
  // API Endpoints:
  // - List: GET /get-calls or GET /calls
  // - Create Phone Call: POST /create-phone-call
  // - Create Web Call: POST /create-web-call
  // - Get: GET /get-call/:id or GET /calls/:id
  // - Delete: DELETE /delete-call/:id or DELETE /calls/:id

  async listCalls(params?: ListQueryParams): Promise<ListResponse<Call>> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.cursor) queryParams.append('cursor', params.cursor);
    if (params?.before) queryParams.append('before', params.before.toString());
    if (params?.after) queryParams.append('after', params.after.toString());
    if (params?.filter_criteria) {
      queryParams.append('filter_criteria', JSON.stringify(params.filter_criteria));
    }
    
    const query = queryParams.toString();
    const path = query ? `/get-calls?${query}` : '/get-calls';
    
    return this.request<ListResponse<Call>>('GET', this.buildPath(path));
  }

  async createPhoneCall(data: CreatePhoneCallRequest): Promise<Call> {
    return this.request<Call>('POST', this.buildPath('/create-phone-call'), data);
  }

  async createWebCall(data: CreateWebCallRequest): Promise<WebCallResponse> {
    return this.request<WebCallResponse>('POST', this.buildPath('/create-web-call'), data);
  }

  async getCall(callId: string): Promise<Call> {
    return this.request<Call>('GET', this.buildPath(`/get-call/${callId}`));
  }

  async deleteCall(callId: string): Promise<void> {
    await this.request<void>('DELETE', this.buildPath(`/delete-call/${callId}`));
  }

  // ==================== Voice ====================
  // API Endpoints:
  // - List: GET /get-voices or GET /voices
  // - Get: GET /get-voice/:id or GET /voices/:id

  async listVoices(params?: ListQueryParams): Promise<ListResponse<Voice>> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.cursor) queryParams.append('cursor', params.cursor);
    
    const query = queryParams.toString();
    const path = query ? `/get-voices?${query}` : '/get-voices';
    
    return this.request<ListResponse<Voice>>('GET', this.buildPath(path));
  }

  async getVoice(voiceId: string): Promise<Voice> {
    return this.request<Voice>('GET', this.buildPath(`/get-voice/${voiceId}`));
  }

  // ==================== Conversations ====================
  // API Endpoints:
  // - List: GET /get-conversations or GET /conversations
  // - Get: GET /get-conversation/:id or GET /conversations/:id
  // - Delete: DELETE /delete-conversation/:id or DELETE /conversations/:id

  async listConversations(params?: ListQueryParams): Promise<ListResponse<Conversation>> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.cursor) queryParams.append('cursor', params.cursor);
    if (params?.before) queryParams.append('before', params.before.toString());
    if (params?.after) queryParams.append('after', params.after.toString());
    if (params?.filter_criteria) {
      queryParams.append('filter_criteria', JSON.stringify(params.filter_criteria));
    }
    
    const query = queryParams.toString();
    const path = query ? `/get-conversations?${query}` : '/get-conversations';
    
    return this.request<ListResponse<Conversation>>('GET', this.buildPath(path));
  }

  async getConversation(conversationId: string): Promise<Conversation> {
    return this.request<Conversation>('GET', this.buildPath(`/get-conversation/${conversationId}`));
  }

  async deleteConversation(conversationId: string): Promise<void> {
    await this.request<void>('DELETE', this.buildPath(`/delete-conversation/${conversationId}`));
  }
}

// Export singleton instance
export const retellClient = new RetellClient();
