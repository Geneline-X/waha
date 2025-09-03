import axios, { AxiosInstance } from 'axios';
import { Injectable } from '@nestjs/common';
import { GenelineAppConfig } from '@waha/apps/geneline/dto/config.dto';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class GenelineAPI {
  private client: AxiosInstance;

  constructor(
    private config: GenelineAppConfig,
    private logger: PinoLogger,
  ) {
    this.client = axios.create({
      baseURL: this.config.apiUrl,
      headers: {
        'X-API-Key': this.config.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds
    });

    // Skip axios logging for now to avoid logger compatibility issues
  }

  async sendMessage(params: {
    message: string;
    chatId: string;
    session: string;
  }): Promise<{ text: string }> {
    const response = await this.client.post('/api/v1/message', {
      chatbotId: this.config.chatbotId,
      message: params.message,
      email: `${params.chatId}@whatsapp.local`, // Use chatId as email identifier
    }, {
      responseType: 'text', // API returns streamed text/plain
    });

    return { text: response.data };
  }

  async getAnalytics(since?: string): Promise<any> {
    const response = await this.client.get('/api/v1/analytics', {
      params: since ? { since } : {},
    });

    return response.data;
  }

  async upsertEmbeddings(params: {
    namespace: string;
    documents: Array<{
      id?: string;
      text: string;
      metadata?: Record<string, any>;
    }>;
    indexName?: string;
    chunk?: {
      size?: number;
      overlap?: number;
    };
  }): Promise<{ upserted: number }> {
    const response = await this.client.post('/api/v1/embeddings/upsert', params);
    return response.data;
  }

  async searchEmbeddings(params: {
    namespace: string;
    query: string;
    topK?: number;
    indexName?: string;
    filter?: Record<string, any>;
  }): Promise<any> {
    const response = await this.client.post('/api/v1/embeddings/search', params);
    return response.data;
  }
}
