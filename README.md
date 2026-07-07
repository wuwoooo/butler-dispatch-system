# 管家调配系统

旅游区酒店管家调配系统，用于支撑 Web 管理后台和后续微信小程序 API。当前已完成第四阶段：项目底座、登录认证、角色权限、订单管理、多管家派单、管家请假与审核、评价管理、管家统计、财务统计与导出、Dashboard、通知中心、操作日志、系统字典和异常记录。

## 技术栈

- Node.js
- Next.js App Router
- TypeScript
- MySQL 8.0
- Prisma ORM
- 自定义 JWT Cookie 登录认证
- Zod 参数校验
- Ant Design 后台 UI
- ExcelJS 导出

## 目录结构

```text
butler-dispatch-system/
  app/
    login/
    (admin)/
      dashboard/
      orders/
      dispatch/
      butlers/
      hotels/
      leaves/
      reviews/
      finance/
      notifications/
      abnormal-records/
      settings/
      logs/
    api/
  components/
    layout/
    orders/
    dispatch/
    leaves/
    reviews/
    butlers/
    tables/
    forms/
    status/
  lib/
    prisma.ts
    auth.ts
    auth-token.ts
    permissions.ts
    response.ts
    validators.ts
    logger.ts
    notification.ts
    order-status.ts
    orders.ts
    leaves.ts
    reviews.ts
    statistics.ts
    finance.ts
    dashboard.ts
    export.ts
    export-data.ts
    notifications-center.ts
    logs.ts
    abnormal-records.ts
    selects.ts
  prisma/
    schema.prisma
    seed.ts
  types/
  utils/
  proxy.ts
```

## 环境变量

复制 `.env.example` 为 `.env`，按本地环境修改：

```env
DATABASE_URL="mysql://user:password@localhost:3306/butler_dispatch"
NEXTAUTH_SECRET="replace-with-your-secret"
NEXTAUTH_URL="http://localhost:3000"
JWT_SECRET="replace-with-your-jwt-secret"
WECHAT_MINIPROGRAM_APPID="your-appid"
WECHAT_MINIPROGRAM_SECRET="your-secret"
WECHAT_MOCK_LOGIN="true"
```

本工作区已按本地 Docker MySQL 参考配置创建 `.env`：

```env
DATABASE_URL="mysql://root:123456@127.0.0.1:3306/butler_dispatch"
```

## MySQL 数据库配置

本地 MySQL 8.0 需先创建数据库：

```bash
mysql -h127.0.0.1 -uroot -p123456 -e "CREATE DATABASE IF NOT EXISTS butler_dispatch CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

如果 MySQL 运行在 Docker 容器中，且容器名为 `mysql8`，可以使用：

```bash
docker exec mysql8 mysql -uroot -p123456 -e "CREATE DATABASE IF NOT EXISTS butler_dispatch CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

## 安装依赖

```bash
npm ci
```

如果没有 `package-lock.json`，再使用 `npm install`。

## 运行 Migration

```bash
npm run db:migrate
```

当前仓库包含初始化、订单派单、请假评价统计相关 migration。检查数据库状态可运行：

```bash
npx prisma migrate status
```

## 运行 Seed

```bash
npm run db:seed
```

## 启动开发服务

```bash
npm run dev
```

默认访问地址：[http://localhost:3000](http://localhost:3000)

如果 3000 端口已被其他服务占用，可以指定端口：

```bash
npm run dev -- --port 3001
```

## 默认测试账号

| 角色 | 用户名 | 密码 |
| --- | --- | --- |
| 管理员 | admin | admin123456 |
| 调配员 | dispatcher | dispatcher123456 |
| 酒店前台 | frontdesk | frontdesk123456 |
| 酒店前台 | frontdesk02 | frontdesk123456 |
| 管家 | zhaoyi | butler123456 |
| 管家 | qianer | butler123456 |
| 管家 | sunsan | butler123456 |
| 管家 | lisi | butler123456 |
| 管家 | wangwu | butler123456 |
| 财务人员 | finance | finance123456 |

`disabled_dispatcher / disabled123456` 是停用账号示例，用于验证停用账号不能登录；它不应作为正常测试账号使用。

## 当前阶段已完成功能

- Next.js App Router + TypeScript 项目骨架
- Prisma + MySQL 配置
- User、Role、Hotel、Butler、ServiceOrder、OrderButlerAssignment、RejectRecord、ButlerLeave、ServiceReview、Notification、OperationLog、SystemDict 模型
- 自定义 JWT Cookie 登录、退出和当前用户接口
- 未登录后台访问跳转登录页
- 角色权限矩阵、菜单权限展示、API 角色校验工具
- Ant Design 后台基础布局、顶部栏、左侧菜单、用户信息和基础工作台
- 用户、酒店、管家、操作日志基础 API
- 订单管理页面：列表、筛选、分页、新建、编辑、详情
- 派单管理页面：待派单订单列表、多管家选择、不可选原因展示、二次确认
- 订单 API：创建、查询、详情、修改、可派管家查询、派单
- 管家端 API：我的订单、确认接单、拒单、已接到客人、完成服务
- 请假管理：管家提交请假、冲突校验、撤销请假、调配员审核通过/驳回、状态刷新
- 评价管理：前台/调配员评价订单下的具体管家、评价列表、管家自查评价
- 管家统计：个人统计、接单明细、后台管家统计列表
- 财务统计：订单明细、管家服务明细、酒店统计、结算状态维护
- Excel 导出：订单、管家服务、酒店统计、管家统计、评价、拒单、请假、财务总表
- Dashboard：今日指标、本月指标、订单/管家状态概览、排行榜
- 通知中心：通知列表、筛选、单条已读、全部已读、未读数量
- 系统设置：系统字典列表、筛选、启停、排序、管理员 CRUD
- 异常记录：列表、筛选、新增、处理、详情
- 订单状态流转工具：派单、确认、拒单、已接到客人、完成服务后的状态更新
- 站内通知：派单、确认、拒单、已接到客人、完成服务、请假提交、审核结果、收到评价
- 统一 JSON 响应格式
- 操作日志工具与关键操作日志记录
- Seed 测试数据：酒店、前台、管家、待分配订单、已分配订单、多管家订单、请假、评价、通知、日志、异常记录、已结算订单示例
- 第五阶段账号体系：后台账号管理、管家账号随管家档案维护、账号启停、密码重置、小程序 openid 绑定与解绑

## 核心 API

### 订单

- `GET /api/orders`
- `POST /api/orders`
- `GET /api/orders/:id`
- `PUT /api/orders/:id`
- `GET /api/orders/:id/available-butlers`
- `POST /api/orders/:id/dispatch`

### 管家端

- `GET /api/butler/my-orders`
- `POST /api/butler/orders/:assignmentId/confirm`
- `POST /api/butler/orders/:assignmentId/reject`
- `POST /api/butler/orders/:assignmentId/picked-guest`
- `POST /api/butler/orders/:assignmentId/complete`
- `GET /api/butler/leaves`
- `POST /api/butler/leaves`
- `POST /api/butler/leaves/:id/cancel`
- `GET /api/butler/reviews`
- `GET /api/butler/statistics`
- `GET /api/butler/order-records`

### 请假、评价和统计

- `GET /api/leaves`
- `POST /api/leaves/:id/approve`
- `POST /api/leaves/:id/reject`
- `GET /api/reviews`
- `POST /api/reviews`
- `GET /api/statistics/butlers`
- `GET /api/statistics/dashboard`

### 财务、通知、设置与异常

- `GET /api/finance/orders`
- `GET /api/finance/butler-services`
- `GET /api/finance/hotel-statistics`
- `POST /api/finance/orders/:id/settlement`
- `GET /api/export/orders`
- `GET /api/export/butler-services`
- `GET /api/export/hotel-statistics`
- `GET /api/export/butler-statistics`
- `GET /api/export/reviews`
- `GET /api/export/rejections`
- `GET /api/export/leaves`
- `GET /api/export/finance`
- `GET /api/notifications`
- `POST /api/notifications/:id/read`
- `POST /api/notifications/read-all`
- `GET /api/notifications/unread-count`
- `GET /api/system-dicts`
- `POST /api/system-dicts`
- `PUT /api/system-dicts/:id`
- `DELETE /api/system-dicts/:id`
- `GET /api/abnormal-records`
- `POST /api/abnormal-records`
- `PUT /api/abnormal-records/:id`
- `POST /api/abnormal-records/:id/resolve`

所有 API 都使用统一 JSON 返回格式，并通过登录态和角色权限校验。

### 账号与小程序

- `GET /api/accounts`、`POST /api/accounts`
- `GET /api/accounts/:id`、`PUT /api/accounts/:id`
- `POST /api/accounts/:id/enable`
- `POST /api/accounts/:id/disable`
- `POST /api/accounts/:id/reset-password`
- `POST /api/accounts/:id/unbind-miniprogram`
- `POST /api/butlers/:id/account`
- `POST /api/butlers/:id/account/enable`
- `POST /api/butlers/:id/account/disable`
- `POST /api/butlers/:id/account/reset-password`
- `POST /api/butlers/:id/account/unbind-miniprogram`
- `POST /api/miniprogram/auth/wechat-login`
- `POST /api/miniprogram/auth/bind`
- `POST /api/miniprogram/auth/unbind`
- `GET /api/miniprogram/auth/me`
- `GET /api/mobile/dashboard/butler`
- `GET /api/mobile/dashboard/dispatcher`

## 账号管理与微信绑定

后台账号在 `/accounts` 维护，只包含管理员、调配员、酒店前台和财务人员。酒店前台必须绑定酒店，账号禁用后不能登录后台或通过小程序自动登录。用户名创建后不可修改，密码只保存 bcrypt 哈希，操作日志不会写入密码明文。

管家账号在 `/butlers` 的“管家档案”中维护。新增管家会自动开通账号，用户名按管家姓名生成全小写拼音，重名时自动追加数字；已有无账号管家可在详情页补开通。停用管家账号前必须完成或改派其活跃订单，避免中断在途服务。

管家的“当前服务状态”按活跃订单分配自动展示为空闲、待接单、准备接待、接待中四类，不能在编辑页手动改为空闲；“接单设置”只控制是否接受新的派单，不会覆盖待接单、准备接待或接待中的真实状态。

管家、调配员和管理员可绑定微信小程序；酒店前台和财务人员不能绑定。一个 openid 只能绑定一个系统账号，一个系统账号也只能绑定一个 openid。后台只展示绑定状态与时间，不直接返回完整 openid。

### Mock 微信登录测试

本地 `.env` 设置 `WECHAT_MOCK_LOGIN=true` 后，`code` 会直接作为模拟 openid，不会请求微信服务。例如：

```bash
curl -X POST http://localhost:3000/api/miniprogram/auth/bind \
  -H 'Content-Type: application/json' \
  -d '{"code":"mock_butler_openid_001","username":"zhaoyi","password":"butler123456"}'
```

绑定后，用同一个 `code` 请求 `/api/miniprogram/auth/wechat-login`，会返回 `needBind: false`、Bearer Token 和安全的用户信息。使用该 Token 请求小程序受保护接口时传入 `Authorization: Bearer <token>`。

## 微信小程序端

小程序源码位于 `miniprogram/`，使用微信小程序原生 TypeScript 开发。打开微信开发者工具时选择该目录作为小程序根目录，`project.config.json` 已设置 `miniprogramRoot`。

本地调试步骤：

1. 后端启动：`npm run dev`，默认地址 `http://localhost:3000`。
2. `.env` 设置 `WECHAT_MOCK_LOGIN=true`，本地可使用 mock code 绑定账号。
3. 微信开发者工具导入 `miniprogram/`。
4. 开发者工具中关闭“校验合法域名”，或将本机后端配置为合法域名。
5. 如果真机预览，需要把 `miniprogram/app.ts` 里的 `baseURL` 改为局域网可访问地址，例如 `http://192.168.x.x:3000`。

已实现小程序页面：

- 登录与绑定：`pages/login/index`、`pages/bind-account/index`
- 管家端：首页、我的订单、订单详情、请假申请、请假记录、我的数据、消息通知、个人中心
- 调配员端：首页、订单调配、派单详情、管家状态、管家详情、请假审核、消息通知、个人中心

小程序 UI 采用浅灰蓝页面背景、白色圆角卡片、浅色状态标签、蓝色渐变工作台头部和固定底部操作区。关键操作均有二次确认，列表均配置空状态，接口统一通过 `services/request.ts` 携带 Bearer Token 并处理统一 JSON 响应。

当前小程序派单遵循现行业务规则：一个订单可选择多个管家，不再区分主负责和协同；每个管家独立确认接单、已接到自己负责的客人、确认自己负责客人离店并完成服务。

## 核心业务规则预留

1. 一个订单可以分配多个管家。
2. 同一订单下多个管家彼此独立服务，不区分主负责和协同。
3. 管家确认接单不等于开始服务。
4. 任一管家点击“已接到客人”后，订单进入服务中；该管家的状态独立进入服务中。
5. 管家只能在待确认阶段拒单。
6. 拒单必须填写原因。
7. 管家请假需要由调配员审核。
8. 管家请假不能与已有订单冲突。
9. 评价对象是“某个订单下的某个管家”，不是只评价订单。
10. 财务结算规则暂不固定，当前阶段以订单数据、统计、结算状态维护和导出扩展为主。

## 本地测试建议

1. 使用 `admin / admin123456` 登录后台，进入 `/orders` 查看订单列表和详情。
2. 使用 `frontdesk / frontdesk123456` 新建订单，确认订单初始状态为 `pending_dispatch`。
3. 使用 `dispatcher / dispatcher123456` 进入 `/dispatch`，选择一个或多个服务管家派单。
4. 使用 `zhaoyi / butler123456` 调用管家端 API，完成确认接单、已接到客人和完成服务动作。
5. 使用 `butler03 / butler123456` 调用 `/api/butler/leaves` 提交无冲突请假，再用调配员审核。
6. 使用 `frontdesk / frontdesk123456` 在 `/reviews` 对 `OD-SEED-REVIEW-001` 的参与管家提交评价。
7. 使用 `dispatcher / dispatcher123456` 在 `/leaves`、`/reviews`、`/butlers` 查看请假、评价和统计。
8. 使用 `admin / admin123456` 进入 `/finance`、`/notifications`、`/logs`、`/settings`、`/abnormal-records` 验证第四阶段页面与接口。
9. 使用导出接口或页面按钮测试 Excel 下载，例如 `/api/export/orders?page=1&pageSize=20`。
10. 使用 `admin / admin123456` 进入 `/accounts`，新增、编辑、启用/停用、重置后台账号密码，并验证酒店前台必须选择所属酒店。
11. 进入 `/butlers` 的“管家档案”，为未开通账号的管家开通账号，再测试重置密码、启用/停用和解绑小程序。
12. 使用上方 mock 微信登录接口，验证首次 `wechat-login` 返回 `needBind: true`，绑定后返回 Token，停用账号后自动登录被拒绝。

## 后续开发计划

- 微信订阅消息模板接入
- 小程序登录态刷新与设备管理
- 财务结算公式和账单核算
- 订单改派流程的更完整页面化处理
- 请假定时任务 cron
- 评价完成条件扩展为“所有参与管家完成前台和调配员评价”
