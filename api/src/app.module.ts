import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { PlayersModule } from './players/players.module';
import { ActionsModule } from './actions/actions.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    PlayersModule,
    ActionsModule,
  ],
})
export class AppModule {}
