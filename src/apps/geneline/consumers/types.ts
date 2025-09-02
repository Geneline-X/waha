import { WAHAWebhook } from '@waha/structures/webhooks.dto';

export interface EventData {
  app: string;
  event: WAHAWebhook;
}
