# Humanity Reward System

多账户自动奖励领取系统，基于 Node.js 实现，通过 API 自动调度领取奖励。

## 功能简介
- 支持多账户自动领取奖励
- 精确根据 API 返回时间调度
- 控制台实时显示账户状态
- 错误自动重试

## 环境要求
- Node.js 16 及以上
- npm 包管理器
- bash（如在 Windows 下可用 Git Bash 或 WSL）

## 安装依赖
```bash
npm install
```

## 账户配置
编辑 `accounts.json` 文件，添加你的账户信息：

```json
[
  {
    "name": "账户1",
    "authToken": "你的Token1"
  },
  {
    "name": "账户2",
    "authToken": "你的Token2"
  }
]
```
- `name`：账户昵称，仅用于显示
- `authToken`：每个账户的授权 Token

## 启动项目
```bash
npm start
```
或使用部署脚本：
```bash
bash deploy.sh
```

## 控制台说明
- 实时显示每个账户的领取状态、次数、余额、下次领取时间和等待时间
- 支持多账户并发调度
- 错误会自动重试

## 常见问题
1. **依赖安装失败**：请确保已安装 Node.js 和 npm。
2. **Token 无效或领取失败**：请检查 `accounts.json` 中的 Token 是否正确。
3. **Windows 下 bash 脚本无法运行**：请使用 Git Bash 或 WSL。

## 许可证
MIT License 
