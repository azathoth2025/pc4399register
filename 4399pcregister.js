import fs from 'fs/promises';
import axios from 'axios';
import * as pc4399 from 'pc4399';
import { DdddOcr } from 'ddddocr-node';
import crypto from 'crypto';

function randomString(len) {
  const dict = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
  let result = '';
  for (let i = 0; i < len; i++) {
    result = result + dict[crypto.randomInt(0, 61)];
  }
  return result;
}

async function register({ username, captchaUrl, captchaId, password }) {
  let captcha;
  if (captchaUrl) {
    try {
      captcha = await ddddOcr.classification(captchaUrl);
    } catch (error) {
      console.log("识别验证码失败");
      return await register({
        username,
        captchaUrl,
        captchaId,
        password,
        params,
      });
    }
  }
  try {
    const channel = await pc4399.channel.games4399.ClientPCImpl.register({
      username,
      password,
      captcha_id: captchaId,
      captcha,
    });
    return channel.getCookies();
  } catch (error) {
    if (error.message === '请输入验证码') {
      console.log("验证码错误");
      return register({
        username,
        captchaUrl: error.captchaUrl,
        captchaId: error.captchaId,
        password,
      });
    }
    if (
      error instanceof pc4399.channel.games4399.Games4399LoginError ||
      error.message === '用户名包含敏感字符' ||
      error.message === '用户名已被注册'
    ) {
      console.log("用户名已被注册");
      return register({
        username,
        captchaUrl,
        captchaId,
        password,
      });
    }
    if (axios.isAxiosError(error)) {
      console.log("503错误，将在30秒后重试");
      await new Promise((resolve) => setTimeout(resolve, 30000));
      return await register({
        username,
        password,
      });
    }
    throw error;
  }
}
async function registerMain() {
  const username = randomString(20);
  const password = '123456';
  // 自动regist处理验证码问题
  const cookies = await register({
    username,
    /* 自行设置代理，要不然会503不可用错误
    proxy: {
      host: '127.0.0.1',
      port: 6006,
      protocol: 'http',
    },
    */
    password,
  });
  // 构建一个多出逗号的json
  const data =
    JSON.stringify({
      username,
      password,
      cookies,
    }) + ',';
  // 追加进文件
  console.log(username);
  await fs.appendFile('./4399pcregister.json', data);
}

async function main() {
  const allTasks = [];
  for (let i = 0; i < batchCount; i++) {
    const task = registerMain();
    allTasks.push(task);
  }
  await Promise.all(allTasks);
}

const ddddOcr = new DdddOcr();
const batchCount = 10;
const count = 1;

for (let i = 0; i < count; i++) {
  main();
}

//请自行在80行处设置代理，要不然注册多了会503不可用错误
