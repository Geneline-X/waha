import { Processor } from '@nestjs/bullmq';
import { JOB_CONCURRENCY } from '@waha/apps/app_sdk/constants';
import { AppConsumer } from '@waha/apps/app_sdk/AppConsumer';
import { QueueName } from '@waha/apps/geneline/consumers/QueueName';
import { EventData } from '@waha/apps/geneline/consumers/types';
import { GenelineAPI } from '@waha/apps/geneline/client/GenelineAPI';
import { WAHASessionAPI } from '@waha/apps/chatwoot/session/WAHASelf';
import { SessionManager } from '@waha/core/abc/manager.abc';
import { RMutexService } from '@waha/modules/rmutex/rmutex.service';
import { WAHAEvents } from '@waha/structures/enums.dto';
import { WAMessage, MessageSource } from '@waha/structures/responses.dto';
import { WAHAWebhookMessageAny } from '@waha/structures/webhooks.dto';
import { Job } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';
import { GenelineDIContainer } from '@waha/apps/geneline/di/DIContainer';
import { GenelineAppConfig } from '@waha/apps/geneline/dto/config.dto';
import { AppRepository } from '@waha/apps/app_sdk/storage/AppRepository';

interface IMessageInfo {
  fromMe: boolean;
  source?: string;
}

@Processor(QueueName.WAHA_MESSAGE_ANY, { concurrency: JOB_CONCURRENCY })
export class GenelineMessageAnyConsumer extends AppConsumer {
  constructor(
    protected readonly manager: SessionManager,
    log: PinoLogger,
    rmutex: RMutexService,
  ) {
    super('geneline', 'GenelineMessageAnyConsumer', log, rmutex);
  }

  async processJob(job: Job<EventData, any, WAHAEvents>): Promise<any> {
    const event: WAHAWebhookMessageAny = job.data.event as any;
    const chatId = event.payload.from;
    const mutexKey = `geneline-${job.data.app}-${chatId}`;

    try {
      return await this.withMutex(job, mutexKey, async () => {
        const container = await this.DIContainer(job, job.data.app);
        const session = new WAHASessionAPI(event.session, container.WAHASelf());
        const info: IMessageInfo = {
          fromMe: event.payload?.fromMe || false,
          source: event.payload?.source,
        };
        
        const handler = new GenelineMessageAnyHandler(
          container.Logger(),
          info,
          session,
          container.GenelineAPI(),
          job.data.app,
        );
        await handler.handle(event);
        return;
      });
    } catch (error) {
      // Don't throw to prevent retries
      return;
    }
  }

  async DIContainer(
    job: Job<EventData, any, WAHAEvents>,
    appId: string,
  ): Promise<GenelineDIContainer> {
    const knex = this.manager.store.getWAHADatabase();
    // Use the imported AppRepository instead of dynamic import
    const appRepository = new AppRepository(knex);
    const app = await appRepository.getById(appId);
    
    if (!app) {
      throw new Error(`Geneline app with ID '${appId}' not found`);
    }
    
    return new GenelineDIContainer(app.config as GenelineAppConfig, { logger: this.logger } as PinoLogger);
  }
}

class GenelineMessageAnyHandler {
  constructor(
    private logger: PinoLogger,
    private info: IMessageInfo,
    private session: WAHASessionAPI,
    private genelineAPI: GenelineAPI,
    private appId: string,
  ) {}

  async handle(event: WAHAWebhookMessageAny): Promise<void> {
    const payload = event.payload;

    // Skip messages from the app itself to prevent loops
    if (payload.fromMe) {
      return;
    }

    // Skip non-text messages for now (Geneline might support more later)
    if (!payload.body) {
      return;
    }

    try {
      // Send message to Geneline AI
      const aiResponse = await this.genelineAPI.sendMessage({
        message: payload.body,
        chatId: payload.from,
        session: event.session,
      });

      // Send AI response back to WhatsApp
      if (aiResponse && aiResponse.text) {
        await this.session.sendText({
          chatId: payload.from,
          text: aiResponse.text,
          session: event.session,
        });
      }
    } catch (error) {
      // Don't throw error to prevent infinite retries
      return;
    }
  }
}
