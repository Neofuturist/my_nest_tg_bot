import { Injectable } from '@nestjs/common';
import { On, Start, Update } from 'nestjs-telegraf';
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
    await ctx.reply(
      'Можешь прислать или переслать файл, я загружу его на Диск.',
    );
  }
  @On('photo')
  async onPhoto(ctx: any) {
    await this.loadFile(ctx, 'photo');
  }
  @On('video')
  async onVideo(ctx: any) {
    await this.loadFile(ctx, 'video');
  }
  @On('document')
  async onDoc(ctx: any) {
    await this.loadFile(ctx, 'document');
  }
  getHello(): string {
    return 'Hello World!';
  }
  async loadFile(ctx: any, type: string) {
    try {
      const disk = new YaDisk(process.env.DISK_TOKEN);
      const fileName =
        type == 'photo'
          ? ctx.message.photo[ctx.message.photo.length - 1].file_unique_id
          : ctx.message[type].file_name
          ? ctx.message[type].file_name
          : 'file';
      const fileIdLink =
        type == 'photo'
          ? ctx.message.photo[ctx.message.photo.length - 1].file_id
          : ctx.message[type].file_id;
      const localFilePath = './downloads/' + fileName;
      const remoteFilePath = await this.createDir(disk, fileName);

      await ctx.telegram.getFileLink(fileIdLink).then((url) => {
        axios({ url, responseType: 'stream' }).then((response) => {
          return new Promise(() => {
            response.data
              .pipe(fs.createWriteStream(localFilePath))
              .on('finish', async () => {
                const filestream = await fs.createReadStream(localFilePath);
                try {
                  await disk.upload({
                    path: remoteFilePath,
                    file: filestream,
                    overwrite: true,
                  });
                  await fs.unlink(localFilePath, (callback) => {
                    callback ? console.log(callback) : {};
                  });
                } catch (error) {
                  console.log(error);
                  try {
                    await fs.unlink(localFilePath, (callback) => {
                      callback ? console.log(callback) : {};
                    });
                  } catch {}
                }
              })
              .on('error', (error) => {
                console.log(error);
              });
          });
        });
      });
    } catch (error) {
      console.log(error);
    }
  }

  async createDir(disk: YaDisk, file_name: string): Promise<string> {
    const base_dir = 'telegram_bot_files';
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

    let flag = false;
    let index = 2;
    let new_name = file_name;
    while (!flag) {
      const checked = await disk.isFileExist(
        base_dir + '/' + year + '/' + month + '/' + new_name,
      );
      if (checked) {
        new_name = index + '_' + file_name;
        index++;
      } else {
        flag = true;
      }
    }

    return base_dir + '/' + year + '/' + month + '/' + new_name;
  }
}
