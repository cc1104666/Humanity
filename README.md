# Humanity 多账户奖励自动领取系统
概述
这是一个自动化领取 Humanity 奖励的 Node.js 系统，支持多账户管理，实现自动循环领取奖励的功能。

主要特性
🚀 ​​多账户支持​​：管理多个账户的认证令牌
⏱ ​​精准调度​​：根据每个账户的 API 返回时间精确设置等待时间
📊 ​​实时监控​​：控制台实时显示所有账户状态
🛡 ​​进程守护​​：通过 PM2 确保进程持续运行
🔄 ​​自动恢复​​：意外退出后自动重启
📝 ​​详细日志​​：完整记录所有操作和错误信息
系统架构
graph TD
    A[用户账户] --> B(账户配置文件 accounts.json)
    B --> C[主程序]
    C --> D[PM2进程管理器]
    D --> E[日志文件]
    C --> F[Humanity API]
    
    subgraph 功能模块
        C --> G[账户调度器]
        G --> H[奖励领取模块]
        G --> I[时间获取模块]
        G --> J[等待时间计算]
    end

# 安装部署
前提条件
Ubuntu 18.04+ 或其他 Linux 系统
Node.js 18.x
Git
快速部署
​​下载部署脚本​​：
curl -O https://raw.githubusercontent.com/yourusername/humanity-reward-system/main/deploy.sh
chmod +x deploy.sh
​​运行部署脚本​​：
sudo ./deploy.sh
手动安装
​​克隆仓库​​：
git clone https://github.com/yourusername/humanity-reward-system.git
cd humanity-reward-system
​​安装依赖​​：
npm install
​​配置账户信息​​：
编辑 accounts.json 文件：
[
  {
    "name": "主账户",
    "authToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  {
    "name": "备用账户",
    "authToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
]
​​启动服务​​：
pm2 start ecosystem.config.js
使用说明
启动应用
./deploy.sh start
查看状态
./deploy.sh status
查看日志
./deploy.sh logs
停止应用
./deploy.sh stop
重启应用
./deploy.sh restart
卸载应用
./deploy.sh uninstall
配置文件说明
账户配置文件 (accounts.json)
字段	描述	必填
name	账户名称（显示用）	是
authToken	API 认证令牌	是
PM2 配置文件 (ecosystem.config.js)
选项	默认值	描述
name	"humanity-reward-system"	应用名称
script	"/opt/humanity-reward-system/main.js"	主入口文件
cwd	"/opt/humanity-reward-system"	工作目录
watch	false	是否监控文件变化重启
log_date_format	"YYYY-MM-DD HH:mm:ss"	日志时间格式
out_file	"./logs/out.log"	标准输出日志文件
error_file	"./logs/error.log"	错误日志文件
控制台界面
=== 多账户奖励轮询系统 (基于API时间调度) ===
当前时间: 2025-06-20 10:30:00
运行状态: 运行中
=========================================
账户名称       状态                     次数    余额    下次领取时间       等待时间
主账户         等待领取 (1小时30分15秒)  15     32     2025-06-20 12:00:00  1小时30分
备用账户       领取成功                  22     41     2025-06-20 15:00:00  4小时30分
=========================================
按 Ctrl+C 退出程序
注意：每个账户独立调度，根据API返回时间精确等待
目录结构
humanity-reward-system/
├── deploy.sh           # 自动部署脚本
├── main.js             # 主程序
├── accounts.json        # 账户配置文件
├── ecosystem.config.js # PM2配置文件
├── logs/               # 日志目录
│   ├── out.log         # 标准输出日志
│   └── error.log       # 错误日志
├── node_modules/       # 依赖模块
└── package.json        # 项目配置
故障排除
常见问题
​​部署脚本卡在安装依赖​​
检查网络连接
尝试手动安装：npm install -g node@18 pm2
​​应用启动后立即退出​​
检查 accounts.json 格式
查看错误日志：pm2 logs
​​等待时间显示异常​​
检查 API 返回的时间格式
启用调试模式查看原始响应
获取日志
# 查看最近100行日志
pm2 logs humanity-reward-system --lines 100

# 实时监控日志
pm2 monit
