import { Injectable } from '@nestjs/common';
import { Hears, Help, On, Start, Update } from 'nestjs-telegraf';
import { Message, Update as UpdateT } from 'telegraf/types';
import { Context } from 'telegraf';
import { YaDisk } from 'ya-disk-rest-api';
import * as process from 'process';
import * as fs from 'fs';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const axios = require('axios');

type FileContext =
  | Context<UpdateT.MessageUpdate<Message.VideoMessage>>
  | Context<UpdateT.MessageUpdate<Message.DocumentMessage>>
  | Context<UpdateT.MessageUpdate<Message.PhotoMessage>>;

@Update()
@Injectable()
export class AppService {
  @Start()
  async startCommand(ctx: Context) {
    await ctx.reply('Welcome');
  }
  @Help()
  async helpCommand(ctx: Context) {
    await ctx.reply('Send me a sticker');
  }
  @On('sticker')
  async onSticker(ctx: Context) {
    await ctx.reply('👍');
  }
  @On('photo')
  async onPhoto(ctx: any) {
    await this.uploadPic(ctx);
  }
  @On('video')
  @On('document')
  async onDoc(ctx: FileContext) {
    await this.uploadDocument(ctx);
  }
  @Hears('hi')
  async hearsHi(ctx: Context) {
    await ctx.reply('Hey there');
  }
  getHello(): string {
    return 'Hello World!';
  }
  async uploadPic(ctx: any) {
    try {
      const photo_name =
        ctx.message.photo[ctx.message.photo.length - 1].file_unique_id + '.jpg';
      const disk = new YaDisk(process.env.DISK_TOKEN);
      await ctx.telegram
        .getFileLink(ctx.message.photo[ctx.message.photo.length - 1].file_id)
        .then((url) => {
          axios({ url, responseType: 'stream' }).then((response) => {
            return new Promise(() => {
              response.data
                .pipe(fs.createWriteStream('./downloads/' + photo_name))
                .on('finish', async () => {
                  const filestream = await fs.createReadStream(
                    './downloads/' + photo_name,
                  );
                  try {
                    await disk.upload({
                      path: 'telegram_bot/' + photo_name,
                      file: filestream,
                      overwrite: true,
                    });
                    await fs.unlink('./downloads/' + photo_name, (callback) => {
                      console.log(callback ? callback : 'ok delete');
                    });
                  } catch (error) {
                    console.log('error upload');
                  }
                })
                .on('error', () => {
                  console.log('error download');
                });
            });
          });
        });
    } catch (e) {
      console.log(e);
    }
  }
  async uploadDocument(ctx: any) {
    try {
      const type = ctx.message.video
        ? 'video'
        : ctx.message.document
        ? 'document'
        : '';
      console.log(ctx.message[type]);
      const disk = new YaDisk(process.env.DISK_TOKEN);
      await ctx.telegram.getFileLink(ctx.message[type].file_id).then((url) => {
        axios({ url, responseType: 'stream' }).then((response) => {
          return new Promise(() => {
            response.data
              .pipe(
                fs.createWriteStream(
                  './downloads/' + ctx.message[type].file_name,
                ),
              )
              .on('finish', async () => {
                console.log('ok download');
                try {
                  await disk.upload({
                    path: 'telegram_bot/' + ctx.message[type].file_name,
                    file: './downloads/' + ctx.message[type].file_name,
                  });
                  console.log('ok upload');
                  await fs.unlink(
                    './downloads/' + ctx.message[type].file_name,
                    (callback) => {
                      console.log(callback ? callback : 'ok delete');
                    },
                  );
                } catch (error) {
                  console.log('error upload');
                  await fs.unlink(
                    './downloads/' + ctx.message[type].file_name,
                    (callback) => {
                      console.log(callback ? callback : 'ok delete');
                    },
                  );
                }
              })
              .on('error', () => {
                console.log('error download');
              });
          });
        });
      });
    } catch (e) {
      console.log(e);
    }
  }
}
