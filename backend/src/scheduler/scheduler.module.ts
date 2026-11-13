import { Module } from '@nestjs/common';
import { SchedulerController } from './scheduler.controller';
import { SchedulerService } from './scheduler.service';
import { SupabaseService } from '../supabase/supabase.service';

@Module({
  controllers: [SchedulerController],
  providers: [SchedulerService, SupabaseService],
  exports: [SchedulerService]
})
export class SchedulerModule {}

