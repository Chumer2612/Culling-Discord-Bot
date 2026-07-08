import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { PlayersModule } from './players/players.module';
import { ActionsModule } from './actions/actions.module';
import { StatsModule } from './stats/stats.module';
import { ChatModule } from './chat/chat.module';
import { RulesModule } from './rules/rules.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    PlayersModule,
    ActionsModule,
    StatsModule,
    ChatModule,
    RulesModule,
  ],
})
export class AppModule {}
