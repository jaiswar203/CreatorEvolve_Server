import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class LoggerService {
	readonly contextName: string;

	constructor(
		private readonly logger: PinoLogger
	) {
		this.contextName = 'context';
	}

	setContext(name: string) {
		this.logger.setContext(name);
	}

	verbose(message: any, context?: string, ...args: any[]) {
		if (context) {
			this.logger.info({ [this.contextName]: context }, message, ...args);
		} else {
			this.logger.info(message, ...args);
		}
	}

	debug(message: any, context?: string, ...args: any[]) {
		if (context) {
			this.logger.debug(
				{ [this.contextName]: context },
				message,
				...args,
			);
		} else {
			this.logger.debug(message, ...args);
		}
	}

	trace(message: any, trace?: string, context?: string, ...args: any[]) {
		if (context) {
			this.logger.trace(
				{ [this.contextName]: context, trace },
				message,
				...args,
			);
		} else if (trace) {
			this.logger.trace({ trace }, message, ...args);
		} else {
			this.logger.trace(message, ...args);
		}
	}

	log(message: any, context?: string, ...args: any[]) {
		if (context) {
			this.logger.info({ [this.contextName]: context }, message, ...args);
		} else {
			this.logger.info(message, ...args);
		}
	}

	warn(message: any, context?: string, ...args: any[]) {
		if (context) {
			this.logger.warn({ [this.contextName]: context }, message, ...args);
		} else {
			this.logger.warn(message, ...args);
		}
	}

	error(message: any, trace?: string, context?: string, ...args: any[]) {
		if (context) {
			this.logger.error(
				{ [this.contextName]: context, trace },
				message,
				...args,
			);
		} else if (trace) {
			this.logger.error({ trace }, message, ...args);
		} else {
			this.logger.error(message, ...args);
		}
	}

	eventInsights(name: string, properties: Record<string, unknown>) {
		this.logger.info({ name, properties });
	}

	exception(error: Error, severity: number) {
		this.logger.fatal({ exception: error, severity });
	}

	metricInsights(name: string, value: number) {
		this.logger.info({ name, value });
	}
}
