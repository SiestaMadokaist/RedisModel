import Redis from 'redis';
import * as Stream from 'stream';
import fs from 'fs';
import { LogStream } from 'LogStream';
import { Transform } from 'stream';

type Resolve<T> = (data: T) => any;
type Reject = (error: Error) => any;

// const pathToScript = Symbol('pathToScript');
const pathToScript = 'pathToScript';

export class RedisModel extends LogStream(Redis.RedisClient){
  static config(){
    const port = parseInt(process.env.REDIS_PORT);
    const host = process.env.REDIS_HOST;
    const db = parseInt(process.env.REDIS_DB);
    return {
      port: 6379,
      host: '127.0.0.1',
      ...{ port, host }
    };
  };

  private static _instance?: RedisModel

  static ['getInstance']<T extends RedisModel>(): T {
    if(this._instance === undefined){
      const instance = new this(this.config())
      this._instance = instance as T;
    }
    return this._instance as T;
  }

  dirname(): string {
    return __dirname;
  }

  [pathToScript](scriptName: string): string{
    return `${this.dirname()}/luascripts/${scriptName}.lua`;
  };

  async loadScript(scriptName: string): Promise<string> {
    return new Promise((resolve: Resolve<string>, reject: Reject) => {
      const fpath = this[pathToScript](scriptName);
      fs.readFile(fpath, {}, (err: Error, data: string|Buffer) => {
        if(err){ reject(err); }
        else{ resolve(data.toString()); }
      });
    });
  }

  async evalScript<T>(scriptName: string, keys: Array<string|number>, values: Array<string|number>): Promise<T> {
    const script = await this.loadScript(scriptName);
    const keyLength = keys.length;
    this.log({
      action: 'evalScript',
      scriptName,
      keys,
    });
    return new Promise((resolve: Resolve<T>, reject: Reject) => {
      this.eval(script, keyLength, ...keys, ...values, (err: Error, data: string) => {
        if(err){ reject(err); }
        else{ resolve(JSON.parse(data) as T); }
      });
    });
  };

  static async test(){
    const i = this.getInstance();
    await i.evalScript('helloworld', ['keys'], ['value']);
    i.end(true);
  };

}
