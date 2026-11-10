import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GraphqlService } from './graphql.service';

@Module({
  imports: [HttpModule],
  providers: [GraphqlService],
  exports: [GraphqlService],
})
export class GraphqlModule {}
