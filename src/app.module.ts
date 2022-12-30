import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TelegrafModule } from 'nestjs-telegraf';
import * as process from 'process';
import { ConfigModule } from '@nestjs/config';
ConfigModule.forRoot();

@Module({
  imports: [
    TelegrafModule.forRoot({
      token: process.env.TELEGRAM_BOT_TOKEN,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
