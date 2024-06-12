import { Controller, Get, Query } from '@nestjs/common';
import { LeadsService } from './leads.service';

@Controller('api')
export class LeadsController {
    constructor(private readonly leadsService: LeadsService) {}

    @Get('leads')
    getLeads(@Query() query): Promise<any> {
      query = (query.query?.length >= 3) ? query.query : undefined;
      return this.leadsService.getLeads(query);
    }
}
