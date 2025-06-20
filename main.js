import fetch from 'node-fetch';
import moment from 'moment';
import chalk from 'chalk';
import readline from 'readline';
import fs from 'fs';
import { setTimeout as sleep } from 'timers/promises';

// 全局配置
const config = {
  baseUrl: "https://testnet.humanity.org/api/rewards/daily",
  accountsPath: "./accounts.json",
  headers: {
    "accept": "application/json, text/plain, */*",
    "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
    "priority": "u=1, i",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin"
  }
};

// 加载账户配置
const accounts = JSON.parse(fs.readFileSync(config.accountsPath));

// 账户状态管理
const accountStates = new Map();

// 初始化账户状态
accounts.forEach(account => {
  accountStates.set(account.authToken, {
    name: account.name,
    authToken: account.authToken,
    status: "初始化中",
    lastClaimTime: null,
    nextClaimTime: null,
    claimCount: 0,
    balance: 0,
    error: null,
    scheduler: null
  });
});

// 初始化请求头
function initHeaders(authToken) {
  return {
    ...config.headers,
    "authorization": `Bearer ${authToken}`,
    "token": authToken
  };
}

// 计算等待时间
function calculateWaitTime(nextClaimTime) {
  const currentTime = Date.now();
  
  if (!nextClaimTime || isNaN(nextClaimTime) || nextClaimTime <= currentTime) {
    return 0;
  }
  
  return nextClaimTime - currentTime;
}

// 格式化时间
function formatTime(timestamp) {
  if (!timestamp || isNaN(timestamp)) {
    return "等待数据";
  }
  return moment(timestamp).format("YYYY-MM-DD HH:mm:ss");
}

// 格式化持续时间
function formatDuration(ms) {
  if (!ms || isNaN(ms) || ms < 0) {
    return "0秒";
  }
  
  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  
  if (hours > 0) {
    return `${hours}小时${minutes}分${seconds}秒`;
  } else if (minutes > 0) {
    return `${minutes}分${seconds}秒`;
  } else {
    return `${seconds}秒`;
  }
}

// 发送领取请求
async function claimReward(authToken) {
  const account = accountStates.get(authToken);
  
  try {
    account.status = "正在领取奖励...";
    updateDisplay();
    
    const response = await fetch(`${config.baseUrl}/claim`, {
      method: "POST",
      headers: initHeaders(authToken),
      body: null
    });

    if (!response.ok) {
      throw new Error(`请求失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // 更新账户状态
    account.lastClaimTime = Date.now();
    account.claimCount++;
    account.balance = data.balance || account.balance;
    account.status = "领取成功";
    account.error = null;
    
    return true;
  } catch (error) {
    account.status = "领取失败";
    account.error = error.message;
    return false;
  } finally {
    updateDisplay();
  }
}

// 获取下次领取时间
async function getNextClaimTime(authToken) {
  const account = accountStates.get(authToken);
  
  try {
    account.status = "获取下次领取时间...";
    updateDisplay();
    
    const response = await fetch(`${config.baseUrl}/check`, {
      method: "POST",
      headers: initHeaders(authToken),
      body: null
    });

    if (!response.ok) {
      throw new Error(`检查失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // 尝试解析时间戳
    let nextTimestamp;
    
    if (typeof data.next_daily_award === 'number') {
      // 检查时间戳格式
      if (data.next_daily_award < 10000000000) {
        nextTimestamp = data.next_daily_award * 1000; // 秒转为毫秒
      } else {
        nextTimestamp = data.next_daily_award; // 毫秒时间戳
      }
    } else if (typeof data.next_daily_award === 'string') {
      // 尝试解析日期字符串
      nextTimestamp = new Date(data.next_daily_award).getTime();
      
      // 如果无法解析日期格式，尝试作为时间戳处理
      if (isNaN(nextTimestamp)) {
        nextTimestamp = parseInt(data.next_daily_award);
      }
    }
    
    // 验证时间戳有效性
    if (!nextTimestamp || isNaN(nextTimestamp)) {
      throw new Error(`无法解析下次领取时间: ${JSON.stringify(data)}`);
    }
    
    // 更新账户状态
    account.nextClaimTime = nextTimestamp;
    account.status = "获取成功";
    account.error = null;
    
    return nextTimestamp;
  } catch (error) {
    account.status = "获取失败";
    account.error = error.message;
    return null;
  } finally {
    updateDisplay();
  }
}

// 账户调度器
async function scheduleAccount(authToken) {
  const account = accountStates.get(authToken);
  
  while (true) {
    try {
      // 获取下次领取时间
      const nextTime = await getNextClaimTime(authToken);
      
      if (!nextTime) {
        // 如果获取失败，等待1分钟后重试
        account.status = "等待重试 (1分钟)";
        updateDisplay();
        await sleep(60000);
        continue;
      }
      
      // 计算需要等待的时间
      const waitTime = calculateWaitTime(nextTime);
      
      if (waitTime > 0) {
        // 还未到领取时间，等待到指定时间
        account.status = `等待领取 (${formatDuration(waitTime)})`;
        updateDisplay();
        
        // 精确等待到领取时间
        await sleep(waitTime);
      }
      
      // 领取奖励
      const success = await claimReward(authToken);
      
      if (!success) {
        // 领取失败，等待10秒后重试
        account.status = "领取失败，等待重试";
        updateDisplay();
        await sleep(10000);
      } else {
        // 领取成功，稍作等待后获取新的下次领取时间
        await sleep(5000);
      }
    } catch (error) {
      account.status = "调度错误";
      account.error = error.message;
      updateDisplay();
      
      // 发生错误后等待1分钟再重试
      await sleep(60000);
    }
  }
}

// 更新控制台显示
function updateDisplay() {
  if (process.stdout.isTTY) {
    readline.cursorTo(process.stdout, 0, 0);
    readline.clearScreenDown(process.stdout);
  } else {
    console.log('\n'.repeat(accountStates.size + 10)); // 非TTY环境打印空行
  }
  
  console.log(chalk.bold.cyan("=== 多账户奖励轮询系统 (基于API时间调度) ==="));
  console.log(chalk.bold.yellow(`当前时间: ${moment().format('YYYY-MM-DD HH:mm:ss')}`));
  console.log(chalk.bold.green(`运行状态: 运行中`));
  console.log(chalk.bold.cyan("========================================="));
  
  // 显示表头
  console.log(
    chalk.bold.white(
      "账户名称".padEnd(15) + 
      "状态".padEnd(25) + 
      "次数".padEnd(8) + 
      "余额".padEnd(8) + 
      "下次领取时间".padEnd(20) + 
      "等待时间"
    )
  );
  
  // 显示每个账户状态
  for (const account of accountStates.values()) {
    let statusColor;
    
    switch (true) {
      case account.status.includes("成功"):
        statusColor = chalk.bold.green;
        break;
      case account.status.includes("失败"):
        statusColor = chalk.bold.red;
        break;
      case account.status.includes("等待"):
        statusColor = chalk.bold.yellow;
        break;
      default:
        statusColor = chalk.white;
    }
    
    const waitTime = account.nextClaimTime 
      ? formatDuration(calculateWaitTime(account.nextClaimTime))
      : "等待数据";
    
    console.log(
      chalk.cyan(account.name.padEnd(15)) +
      statusColor(account.status.padEnd(25)) +
      chalk.yellow(String(account.claimCount).padEnd(8)) +
      chalk.yellow(String(account.balance).padEnd(8)) +
      chalk.magenta(formatTime(account.nextClaimTime).padEnd(20)) +
      chalk.blue(waitTime)
    );
    
    if (account.error) {
      console.log(chalk.gray(`    ↳ 错误: ${account.error}`));
    }
  }
  
  console.log(chalk.bold.cyan("========================================="));
  console.log(chalk.gray("按 Ctrl+C 退出程序"));
  console.log(chalk.gray("注意：每个账户独立调度，根据API返回时间精确等待"));
}

// 主函数 - 启动账户调度器
async function main() {
  try {
    // 为每个账户启动独立的调度器
    for (const account of accountStates.values()) {
      // 启动独立调度线程
      account.scheduler = scheduleAccount(account.authToken);
    }
    
    // 每5秒更新一次状态显示
    while (true) {
      updateDisplay();
      await sleep(5000);
    }
    
  } catch (error) {
    console.error(chalk.bold.red("系统启动失败:"), error.message);
  }
}

// 启动系统
main();
