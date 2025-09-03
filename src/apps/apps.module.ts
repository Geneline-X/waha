import * as process from 'node:process';

import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { BullModule } from '@nestjs/bullmq';
import { AppsController } from '@waha/apps/app_sdk/api/apps.controller';
import { BullAuthMiddleware } from '@waha/apps/app_sdk/auth';
import { AppsDisabledService } from '@waha/apps/app_sdk/services/AppsDisabledService';
import { AppsEnabledService } from '@waha/apps/app_sdk/services/AppsEnabledService';
import { AppsService } from '@waha/apps/app_sdk/services/IAppsService';
import { ChatwootLocalesController } from '@waha/apps/chatwoot/api/chatwoot.locales.controller';
import { ChatWootExports } from '@waha/apps/chatwoot/chatwoot.module';
import { GenelineExports } from '@waha/apps/geneline/geneline.module';
import { parseBool } from '@waha/helpers';
import { RMutexModule } from '@waha/modules/rmutex';

const IMPORTS = [
  BullModule.forRoot({
    connection: {
      url: process.env.REDIS_URL || 'redis://:redis@localhost:6379',
      maxRetriesPerRequest: null,
    },
    prefix: `waha-${process.env.WAHA_WORKER_ID}`,
  }),
  RedisModule.forRoot({
    closeClient: true,
    config: {
      url: process.env.REDIS_URL || 'redis://:redis@localhost:6379',
      onClientCreated: async (client) => {
        try {
          await client.ping();
        } catch (err) {
          console.error('[Redis] Connection failed:', err);
          process.exit(1); // Stop the app if Redis is unavailable
        }
      },
    },
  }),
  RMutexModule,
  BullBoardModule.forRoot({
    route: '/jobs',
    adapter: ExpressAdapter,
    middleware: BullAuthMiddleware(),
    boardOptions: {
      uiConfig: {
        boardTitle: 'Jobs | WAHA',
        boardLogo: {
          path: '/dashboard/layout/images/logo-white.svg',
          width: 35,
          height: 35,
        },
        favIcon: {
          default: '/dashboard/favicon.ico',
          alternative: '/dashboard/favicon.ico',
        },
        miscLinks: [
          {
            text: '📊 Dashboard',
            url: '/dashboard',
          },
          {
            text: '📚 Swagger (OpenAPI)',
            url: '/',
          },
        ],
      },
    },
  }),
  ...ChatWootExports.imports,
  ...GenelineExports.imports,
];

const AppsEnabled = {
  imports: IMPORTS,
  controllers: [AppsController, ...ChatWootExports.controllers, ...GenelineExports.controllers],
  providers: [
    {
      provide: AppsService,
      useClass: AppsEnabledService,
    },
    ...ChatWootExports.providers,
    ...GenelineExports.providers,
  ],
};

const AppsDisabled = {
  providers: [
    {
      provide: AppsService,
      useClass: AppsDisabledService,
    },
  ],
  imports: [],
  controllers: [AppsController, ChatwootLocalesController],
};

function checkApiKey() {
  const key = process.env.WHATSAPP_API_KEY || process.env.WAHA_API_KEY;
  if (!key) {
    return;
  }
  const plain = process.env.WAHA_API_KEY_PLAIN;
  if (!plain) {
    throw Error(
      'WAHA_API_KEY set, please provide WAHA_API_KEY_PLAIN when WAHA_APPS_ENABLED',
    );
  }
}

const enabled = true; // Force enable apps module
if (enabled) {
  checkApiKey();
}
export const AppsModuleExports = enabled ? AppsEnabled : AppsDisabled;
