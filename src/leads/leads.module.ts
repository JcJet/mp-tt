import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { ConfigModule } from '@nestjs/config';
import { AmoCRMClient } from 'src/amoCRM/amoCRMClient';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.${process.env.NODE_ENV}.env`,
    }),
  ],
  providers: [LeadsService, AmoCRMClient],
  controllers: [LeadsController]
})
export class LeadsModule {}
