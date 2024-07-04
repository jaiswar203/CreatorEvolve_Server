import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { AudioService } from '../services/audio.service';
import {
  DUBBING_QUEUE,
  DUBBING_QUEUE_HANDLER,
} from '@/common/constants/queue.contant';
import { LoggerService } from '@/common/logger/services/logger.service';
import { MINUTES } from '@/common/constants/time';

interface ICheckStatusAndUpdate {
  id: string;
  attempt: number;
  requestId: string;
}

@Processor(DUBBING_QUEUE)
export class DubbingConsumer {
  constructor(
    private readonly audioService: AudioService,
    private readonly loggerService: LoggerService,
  ) {}

  @Process(DUBBING_QUEUE_HANDLER)
  async checkStatusAndUpdate(job: Job<ICheckStatusAndUpdate>) {
    const data = job.data;

    this.loggerService.log(
      `Queue(checkStatusAndUpdate): Started updating dubbing status for dubbing id ${data.id}. Attempt ${data.attempt} of ${job.opts.attempts}, Request Id: ${data.requestId}`,
    );

    try {
      const dubStatus = await this.audioService.getDubbedStatus(data.id);

      if (dubStatus.status !== 'dubbed' && dubStatus.status === 'dubbing') {
        this.loggerService.log(
          `Queue(checkStatusAndUpdate): Dubbing is still pending for id ${data.id}.`,
        );

        job.queue.add(
          DUBBING_QUEUE_HANDLER,
          { id: data.id, attempt: data.attempt + 1, requestId: data.requestId },
          { delay: MINUTES.ONE },
        );
        return;
      } else if (dubStatus.status === 'dubbed') {
        this.loggerService.log(
          `Queue(checkStatusAndUpdate): Saving dubbing in db - started for id ${data.id}.`,
        );
        await this.audioService.downlaodDubFile(data.id);
        this.loggerService.log(
          `Queue(checkStatusAndUpdate): Saving dubbing in db - completed for id ${data.id}.`,
        );
        this.audioService.notifyClient(data.requestId, { status: 'completed' });
      } else {
        this.loggerService.log(
          `Queue(checkStatusAndUpdate): Dubbing dubbing failed for ${data.id}`,
        );
        await this.audioService.handleDubFail(data.id);
        this.audioService.notifyClient(data.requestId, { status: 'failed' });
        return;
      }
    } catch (error: any) {
      this.loggerService.error(
        `Queue(checkStatusAndUpdate): Error occurred for dubbing id ${data.id}. Attempt ${job.attemptsMade + 1} of ${job.opts.attempts}. Error: ${error.message}`,
      );
      throw error; // rethrow to trigger retry
    }
  }

  @OnQueueFailed()
  handleFailedJob(job: Job<ICheckStatusAndUpdate>, error: any) {
    this.loggerService.error(
      `Queue(checkStatusAndUpdate): Job failed for dubbing id ${job.data.id}. Attempt ${job.attemptsMade} of ${job.opts.attempts}. Error: ${error.message}`,
    );
  }
}
