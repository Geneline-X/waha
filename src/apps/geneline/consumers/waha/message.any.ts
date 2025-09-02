import { Processor } from '@nestjs/bullmq';
import { JOB_CONCURRENCY } from '@waha/apps/app_sdk/constants';
import { QueueName } from '@waha/apps/geneline/consumers/QueueName';
import { EventData } from '@waha/apps/geneline/consumers/types';
import { GenelineAPI } from '@waha/apps/geneline/client/GenelineAPI';
import { GenelineWAHABaseConsumer, IMessageInfo } from '@waha/apps/geneline/consumers/waha/base';
import { WAHASessionAPI } from '@waha/apps/chatwoot/session/WAHASelf';
import { SessionManager } from '@waha/core/abc/manager.abc';
import { RMutexService } from '@waha/modules/rmutex/rmutex.service';
import { WAHAEvents } from '@waha/structures/enums.dto';
import { WAMessage, MessageSource } from '@waha/structures/responses.dto';
import { WAHAWebhookMessageAny } from '@waha/structures/webhooks.dto';
import { Job } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';

@Processor(QueueName.WAHA_MESSAGE_ANY, { concurrency: JOB_CONCURRENCY })
export class GenelineMessageAnyConsumer extends GenelineWAHABaseConsumer {
  constructor(
    protected readonly manager: SessionManager,
    log: PinoLogger,
    rmutex: RMutexService,
  ) {
    super(manager, log, rmutex, 'GenelineMessageAnyConsumer');
  }

  GetChatId(event: WAHAWebhookMessageAny): string {
    return event.payload.from;
  }

  async Process(
    job: Job<EventData, any, WAHAEvents>,
    info: IMessageInfo,
  ): Promise<any> {
    const container = await this.DIContainer(job, job.data.app);
    const event: WAHAWebhookMessageAny = job.data.event as any;
    const session = new WAHASessionAPI(event.session, container.WAHASelf());
    const handler = new GenelineMessageAnyHandler(
      container.Logger(),
      info,
      session,
      container.GenelineAPI(),
      job.data.app,
    );
    return await handler.handle(event);
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
    if (payload.fromMe || payload.source === MessageSource.APP) {
      this.logger.debug('Skipping message from app itself to prevent loop');
      return;
    }

    // Skip non-text messages for now (Geneline might support more later)
    if (!payload.body) {
      this.logger.debug('Skipping non-text message');
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
        this.logger.info(`Sent AI response to ${payload.from}`);
      }
    } catch (error) {
      this.logger.error('Error processing message with Geneline AI:', error);
      throw error;
    }
  }
}
