import { Injectable } from '@nestjs/common';
import { IAppService } from '@waha/apps/app_sdk/services/IAppService';
import { GenelineAppConfig } from '@waha/apps/geneline/dto/config.dto';
import { GenelineWAHAQueueService } from '@waha/apps/geneline/services/GenelineWAHAQueueService';
import { App } from '@waha/apps/app_sdk/dto/app.dto';
import { WhatsappSession } from '@waha/core/abc/session.abc';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class GenelineAppService implements IAppService {
  constructor(
    private genelineWAHAQueueService: GenelineWAHAQueueService,
    @InjectPinoLogger('GenelineAppService')
    protected logger: PinoLogger,
  ) {}

  async beforeCreated(app: App<GenelineAppConfig>) {
    this.logger.info(`Geneline app created: ${app.id} for session: ${app.session}`);
  }

  async beforeUpdated(
    savedApp: App<GenelineAppConfig>,
    newApp: App<GenelineAppConfig>,
  ) {
    this.logger.info(`Geneline app updated: ${newApp.id} for session: ${newApp.session}`);
  }

  async beforeDeleted(app: App<GenelineAppConfig>): Promise<void> {
    this.logger.info(`Geneline app deleted: ${app.id} for session: ${app.session}`);
  }

  async beforeSessionStart(app: App<GenelineAppConfig>, session: WhatsappSession): Promise<void> {
    this.genelineWAHAQueueService.listenEvents(app.id, session);
  }
}
