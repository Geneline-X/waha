import { Job, DelayedError } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';
import { SessionManager } from '@waha/core/abc/manager.abc';
import { RMutexService } from '@waha/modules/rmutex/rmutex.service';
import { WAHAWebhook } from '@waha/structures/webhooks.dto';
import { WAHAEvents } from '@waha/structures/enums.dto';
import { EventData } from '@waha/apps/geneline/consumers/types';
import { GenelineAppConfig } from '@waha/apps/geneline/dto/config.dto';
import { WhatsAppChatIdKey } from '@waha/apps/geneline/consumers/mutex';
import { JOB_DELAY } from '@waha/apps/app_sdk/constants';
import { GenelineDIContainer } from '@waha/apps/geneline/di/DIContainer';

export interface IMessageInfo {
  fromMe: boolean;
  source?: string;
}

export abstract class GenelineWAHABaseConsumer {
  protected constructor(
    protected readonly manager: SessionManager,
    protected readonly logger: PinoLogger,
    protected readonly rmutex: RMutexService,
    protected readonly consumerName: string,
  ) {}

  abstract GetChatId(event: WAHAWebhook): string;

  abstract Process(
    job: Job<EventData, any, WAHAEvents>,
    info: IMessageInfo,
  ): Promise<any>;

  async DIContainer(
    job: Job<EventData, any, WAHAEvents>,
    appId: string,
  ): Promise<GenelineDIContainer> {
    const knex = this.manager.store.getWAHADatabase();
    const { AppRepository } = await import('@waha/apps/app_sdk/storage/AppRepository');
    const appRepository = new AppRepository(knex);
    const app = await appRepository.getById(appId);
    
    if (!app) {
      throw new Error(`Geneline app with ID '${appId}' not found`);
    }
    
    return new GenelineDIContainer(app.config as GenelineAppConfig, this.logger);
  }

  async processJob(job: Job<EventData, any, WAHAEvents>): Promise<any> {
    const event: WAHAWebhook = job.data.event as any;
    const key = WhatsAppChatIdKey(job.data.app, this.GetChatId(event));
    return await this.withMutex(job, key, () =>
      this.ProcessAndReportErrors(job),
    );
  }

  private async withMutex<T>(
    job: Job,
    key: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const ttl = 5 * 60 * 1000; // 5 minutes
    const mutex = this.rmutex.get(key, ttl);
    const lock = await mutex.lock();

    if (!lock) {
      this.logger.debug(
        `Postponing job '${job.id}' for ${JOB_DELAY}ms, another job is already running the mutex.key='${key}'`,
      );
      await job.moveToDelayed(Date.now() + JOB_DELAY);
      throw new DelayedError();
    }

    try {
      return await fn();
    } finally {
      await lock.release();
    }
  }

  private async ProcessAndReportErrors(
    job: Job<EventData, any, WAHAEvents>,
  ): Promise<any> {
    try {
      const event: WAHAWebhook = job.data.event as any;
      const info: IMessageInfo = {
        fromMe: event.payload?.fromMe || false,
        source: event.payload?.source,
      };

      return await this.Process(job, info);
    } catch (error) {
      this.logger.error(
        {
          jobId: job.id,
          event: job.data.event.event,
          session: job.data.event.session,
          error: error.message,
        },
        `${this.consumerName}: Error processing job`,
      );
      throw new DelayedError();
    }
  }
}
