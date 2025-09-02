import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UsePipes,
} from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { GenelineAPI } from '@waha/apps/geneline/client/GenelineAPI';
import { GenelineAppConfig } from '@waha/apps/geneline/dto/config.dto';
import { SessionManager } from '@waha/core/abc/manager.abc';
import { WAHAValidationPipe } from '@waha/nestjs/pipes/WAHAValidationPipe';
import { IsString } from 'class-validator';

class TestConnectionDto {
  @IsString()
  apiUrl: string;

  @IsString()
  apiKey: string;

  @IsString()
  chatbotId: string;
}

class GetAnalyticsQuery {
  @IsString()
  session: string;

  @IsString()
  appId: string;

  @IsString()
  since?: string;
}

@ApiSecurity('api_key')
@Controller('api/geneline')
@ApiTags('🤖 Geneline AI')
export class GenelineController {
  constructor(private manager: SessionManager) {}

  @Post('/test-connection')
  @ApiOperation({ summary: 'Test Geneline API connection' })
  @UsePipes(new WAHAValidationPipe())
  async testConnection(@Body() config: TestConnectionDto): Promise<{
    success: boolean;
    message: string;
    analytics?: any;
  }> {
    try {
      // Create a temporary API client to test the connection
      const api = new GenelineAPI(config as GenelineAppConfig, {
        info: () => {},
        error: () => {},
        debug: () => {},
        warn: () => {},
      } as any);

      // Test the connection by getting analytics
      const analytics = await api.getAnalytics('1h');
      
      return {
        success: true,
        message: 'Connection successful',
        analytics,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Connection failed',
      };
    }
  }

  @Get('/analytics')
  @ApiOperation({ summary: 'Get Geneline analytics for an app' })
  @UsePipes(new WAHAValidationPipe())
  async getAnalytics(
    @Query() query: GetAnalyticsQuery,
  ): Promise<any> {
    const knex = this.manager.store.getWAHADatabase();
    const { AppRepository } = await import('@waha/apps/app_sdk/storage/AppRepository');
    const repo = new AppRepository(knex);
    
    const app = await repo.getById(query.appId);
    if (!app || app.session !== query.session) {
      throw new Error('App not found or access denied');
    }

    const api = new GenelineAPI(app.config as GenelineAppConfig, {
      info: () => {},
      error: () => {},
      debug: () => {},
      warn: () => {},
    } as any);

    return await api.getAnalytics(query.since);
  }

  @Post('/embeddings/upsert/:appId')
  @ApiOperation({ summary: 'Upsert embeddings for a Geneline app' })
  @UsePipes(new WAHAValidationPipe())
  async upsertEmbeddings(
    @Param('appId') appId: string,
    @Body() params: {
      session: string;
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
    },
  ): Promise<{ upserted: number }> {
    const knex = this.manager.store.getWAHADatabase();
    const { AppRepository } = await import('@waha/apps/app_sdk/storage/AppRepository');
    const repo = new AppRepository(knex);
    
    const app = await repo.getById(appId);
    if (!app || app.session !== params.session) {
      throw new Error('App not found or access denied');
    }

    const api = new GenelineAPI(app.config as GenelineAppConfig, {
      info: () => {},
      error: () => {},
      debug: () => {},
      warn: () => {},
    } as any);

    const { session, ...upsertParams } = params;
    return await api.upsertEmbeddings(upsertParams);
  }
}
