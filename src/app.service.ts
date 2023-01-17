import { Injectable } from '@nestjs/common';
import { Hears, Help, On, Start, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { YaDisk } from 'ya-disk-rest-api';
import * as process from 'process';
import * as fs from 'fs';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const axios = require('axios');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const moment = require('moment');

@Update()
@Injectable()
export class AppService {
  @Start()
  async startCommand(ctx: Context) {
    await ctx.reply('Welcome');
  }
  @On('photo')
  async onPhoto(ctx: any) {
    await this.uploadPic(ctx);
  }
  @On('video')
  @On('document')
  async onDoc(ctx: any) {
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
      const file_path = await this.createDir(disk, photo_name);
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
                  console.log('ok download');
                  try {
                    await disk.upload({
                      path: file_path,
                      file: filestream,
                      overwrite: true,
                    });
                    await fs.unlink('./downloads/' + photo_name, (callback) => {
                      console.log(callback ? callback : 'ok delete');
                    });
                  } catch (error) {
                    console.log(error);
                    await fs.unlink('./downloads/' + photo_name, (callback) => {
                      console.log(callback ? callback : 'ok delete');
                    });
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
      const disk = new YaDisk(process.env.DISK_TOKEN);
      const fileName = ctx.message[type].file_name
        ? ctx.message[type].file_name
        : 'file';
      const year = moment().format('YYYY');
      const month = moment().format('MM');
      try {
        await disk.createDir('telegram');
      } catch {}
      try {
        await disk.createDir('telegram/' + year);
      } catch {}
      try {
        await disk.createDir('telegram/' + year + '/' + month);
      } catch {}
      const file_path = 'telegram/' + year + '/' + month + '/' + fileName;
      await ctx.telegram.getFileLink(ctx.message[type].file_id).then((url) => {
        axios({ url, responseType: 'stream' }).then((response) => {
          return new Promise(() => {
            response.data
              .pipe(fs.createWriteStream('./downloads/' + fileName))
              .on('finish', async () => {
                const filestream = await fs.createReadStream(
                  './downloads/' + fileName,
                );
                console.log('ok download');
                try {
                  await disk.upload({
                    path: file_path,
                    file: filestream,
                    overwrite: true,
                  });
                  console.log('ok upload');
                  await fs.unlink('./downloads/' + fileName, (callback) => {
                    console.log(callback ? callback : 'ok delete');
                  });
                } catch (error) {
                  console.log('error upload');
                  await fs.unlink('./downloads/' + fileName, (callback) => {
                    console.log(callback ? callback : 'ok delete');
                  });
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
  async createDir(
    // tmp_dir: string,
    disk: YaDisk,
    file_name: string,
  ): Promise<string> {
    // if (!fs.existsSync(tmp_dir)) {
    //   await fs.mkdirSync(tmp_dir);
    // }
    const base_dir = 'telegram_bot';
    const year = moment().format('YYYY');
    const month = moment().format('MM');
    try {
      await disk.createDir(base_dir);
    } catch {}
    try {
      await disk.createDir(base_dir + '/' + year);
    } catch {}
    try {
      await disk.createDir(base_dir + '/' + year + '/' + month);
    } catch {}
    return base_dir + '/' + year + '/' + month + '/' + file_name;
  }
}
