import Axios, { AxiosRequestConfig } from 'axios';
import { HttpService as NestHttpService } from '@nestjs/axios';
import { Global, Injectable } from '@nestjs/common';

@Global()
@Injectable()
export class HttpService extends NestHttpService {
	constructor(config: AxiosRequestConfig<any>) {
		const instance = Axios.create(config);
		super(instance);
	}
}
