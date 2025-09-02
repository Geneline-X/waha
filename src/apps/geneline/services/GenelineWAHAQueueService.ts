import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { populateSessionInfo } from '@waha/core/abc/manager.abc';
import { WhatsappSession } from '@waha/core/abc/session.abc';
import { WAHAEvents } from '@waha/structures/enums.dto';
import { Queue } from 'bullmq';

import { QueueName } from '../consumers/QueueName';

function ListenEventsForGeneline() {
  return [
    WAHAEvents.MESSAGE_ANY,
    WAHAEvents.MESSAGE_REACTION,
    WAHAEvents.MESSAGE_EDITED,
    WAHAEvents.MESSAGE_REVOKED,
    WAHAEvents.SESSION_STATUS,
  ];
}

@Injectable()
export class GenelineWAHAQueueService {
  constructor(
    @InjectQueue(QueueName.WAHA_MESSAGE_ANY)
    private readonly queueMessageAny: Queue,
    @InjectQueue(QueueName.WAHA_MESSAGE_REACTION)
    private readonly queueMessageReaction: Queue,
    @InjectQueue(QueueName.WAHA_MESSAGE_EDITED)
    private readonly queueMessageEdited: Queue,
    @InjectQueue(QueueName.WAHA_MESSAGE_REVOKED)
    private readonly queueMessageRevoked: Queue,
    @InjectQueue(QueueName.WAHA_SESSION_STATUS)
    private readonly queueSessionStatus: Queue,
  ) {}

  private getQueueForEvent(event: WAHAEvents): Queue | null {
    switch (event) {
      case WAHAEvents.MESSAGE_ANY:
        return this.queueMessageAny;
      case WAHAEvents.MESSAGE_REACTION:
        return this.queueMessageReaction;
      case WAHAEvents.MESSAGE_EDITED:
        return this.queueMessageEdited;
      case WAHAEvents.MESSAGE_REVOKED:
        return this.queueMessageRevoked;
      case WAHAEvents.SESSION_STATUS:
        return this.queueSessionStatus;
      default:
        return null;
    }
  }

  private async addJobToQueue(event: WAHAEvents, data: any, appId: string) {
    const queue = this.getQueueForEvent(event);
    if (queue) {
      await queue.add(data.event, { app: appId, event: data });
    }
  }

  listenEvents(appId: string, session: WhatsappSession): void {
    const events = ListenEventsForGeneline();
    for (const event of events) {
      const obs$ = session.getEventObservable(event);
      obs$.subscribe(async (payload) => {
        const data = populateSessionInfo(event, session)(payload);
        await this.addJobToQueue(event, data, appId);
      });
    }
  }
}
