import { Injectable } from '@nestjs/common';
import { AmoCRMClient } from 'src/amoCRM/amoCRMClient';

@Injectable()
export class LeadsService {
  constructor(private readonly client: AmoCRMClient) {}
    getLeads(query: string): Promise<any> {
      return this.client.getLeads(query);
      }
}
