import { PinoLogger } from 'nestjs-pino';
import { WAHASelf } from '@waha/apps/chatwoot/session/WAHASelf';
import { AxiosLogging } from '@waha/apps/app_sdk/AxiosLogging';
import { GenelineAppConfig } from '@waha/apps/geneline/dto/config.dto';
import { GenelineAPI } from '@waha/apps/geneline/client/GenelineAPI';

export class GenelineDIContainer {
  private wahaSelf?: WAHASelf;
  private genelineAPI?: GenelineAPI;

  constructor(
    private config: GenelineAppConfig,
    private logger: PinoLogger,
  ) {}

  WAHASelf(): WAHASelf {
    if (!this.wahaSelf) {
      this.wahaSelf = new WAHASelf();
      const logging = new AxiosLogging(this.Logger());
      logging.applyTo(this.wahaSelf.client);
    }
    return this.wahaSelf;
  }

  GenelineAPI(): GenelineAPI {
    if (!this.genelineAPI) {
      this.genelineAPI = new GenelineAPI(this.config, this.Logger());
    }
    return this.genelineAPI;
  }

  Logger(): PinoLogger {
    return this.logger;
  }
}
