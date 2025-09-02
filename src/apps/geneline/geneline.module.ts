import { Module } from '@nestjs/common';
import { RegisterAppQueue } from '@waha/apps/app_sdk/BullUtils';
import {
  ExponentialRetriesJobOptions,
  JobRemoveOptions,
  merge,
} from '@waha/apps/app_sdk/constants';
import lodash from 'lodash';

import { QueueName } from './consumers/QueueName';
import { GenelineMessageAnyConsumer } from './consumers/waha/message.any';
import { GenelineWAHAQueueService } from './services/GenelineWAHAQueueService';
import { GenelineAppService } from './services/GenelineAppService';

const CONTROLLERS = [];

const IMPORTS = lodash.flatten([
  RegisterAppQueue({
    name: QueueName.WAHA_MESSAGE_ANY,
    defaultJobOptions: merge(ExponentialRetriesJobOptions, JobRemoveOptions),
  }),
  RegisterAppQueue({
    name: QueueName.WAHA_MESSAGE_REACTION,
    defaultJobOptions: merge(ExponentialRetriesJobOptions, JobRemoveOptions),
  }),
  RegisterAppQueue({
    name: QueueName.WAHA_MESSAGE_EDITED,
    defaultJobOptions: merge(ExponentialRetriesJobOptions, JobRemoveOptions),
  }),
  RegisterAppQueue({
    name: QueueName.WAHA_MESSAGE_REVOKED,
    defaultJobOptions: merge(ExponentialRetriesJobOptions, JobRemoveOptions),
  }),
  RegisterAppQueue({
    name: QueueName.WAHA_SESSION_STATUS,
    defaultJobOptions: merge(ExponentialRetriesJobOptions, JobRemoveOptions),
  }),
]);

const PROVIDERS = [
  GenelineMessageAnyConsumer,
  GenelineWAHAQueueService,
  GenelineAppService,
];

export const GenelineExports = {
  providers: PROVIDERS,
  imports: IMPORTS,
  controllers: CONTROLLERS,
};
