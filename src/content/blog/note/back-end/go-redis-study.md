---
title: go-redis入门
link: go
catalog: true
date: 2026-03-16 12:00:00
description: 基于 Go 生态的 Redis 入门学习笔记，包含基础概念、常用命令、客户端使用
tags:
  - Go
  - Redis
  - 后端

categories:
  - [笔记, 后端]
cover: /img/cover/23.webp
---

# Redis 学习笔记
菜鸟教程：https://www.runoob.com/redis

官网文档：https://redis.io/docs

黑马程序员： https://www.bilibili.com/video/BV1cr4y1671t

中文文档 1：https://redis.ac.cn/docs/latest/

中文文档 2：https://redis.com.cn/documentation.html

客户端指南：https://redis.ac.cn/docs/latest/develop/clients/



# 基础篇-初识 Redis
## 01 认识 NoSQL
**NoSQL = Not Only SQL**
直译是：**不仅仅是 SQL**，本质是：**非关系型数据库**。

它是相对于传统**关系型数据库（MySQL、Oracle、SQL Server）** 提出的一类数据库统称，用来解决关系型数据库在高并发、大数据、分布式场景下的短板。


### 一、关系型数据库（SQL）是什么样？
关系型数据库特点：
- 数据存在表（Table）里，行+列结构
- 必须先定义**表结构（Schema）**，字段固定
- 用 **SQL 语言** 统一查询
- 强事务（ACID），保证数据绝对可靠
- 横向扩展难，扛不住超高并发

典型场景：银行转账、订单支付、核心业务数据。


### 二、NoSQL 是什么？
NoSQL 不遵循传统表结构，**不强制固定 Schema**，更灵活、更快、更容易分布式扩展。

主要特点：
1. **非关系型**：没有表、行、列的严格约束
2. **灵活结构**：字段可随时增删，不用改表结构
3. **高性能**：大多基于内存或简单存储，读写极快
4. **易扩展**：天然支持分布式、集群、水平扩容
5. **弱事务**：大多不支持强事务，追求最终一致性
6. **数据模型多样**：键值、文档、列族、图等


### 三、NoSQL 四大主流类型
#### 1. 键值数据库（Key-Value）
- 结构：`key → value`
- 特点：最简单、速度最快
- 代表：**Redis**、Memcached
- 用途：缓存、会话、分布式锁、计数器

#### 2. 文档数据库
- 结构：类似 JSON/BSON 文档
- 特点：结构灵活，嵌套复杂数据
- 代表：**MongoDB**
- 用途：用户信息、文章、评论、大数据存储

#### 3. 列族数据库（列存储）
- 结构：按列存储，适合海量数据
- 代表：HBase、Cassandra
- 用途：大数据、日志、埋点、海量历史数据

#### 4. 图数据库
- 结构：节点+关系（图结构）
- 代表：Neo4j
- 用途：社交关系、推荐系统、知识图谱


### 四、SQL vs NoSQL 对比
| 对比项        | 关系型数据库（SQL）       | NoSQL                      |
|--------------|--------------------------|----------------------------|
| 数据结构      | 表、行、列，固定 Schema    | 灵活，无固定结构           |
| 数据关联      | 关联查询（JOIN）         | 无关联查询，独立存储       |
| 查询语言      | 标准 SQL                 | 各自语法，无统一标准       |
| 事务         | 强事务 ACID              | 大多弱事务，最终一致性     |
| 性能         | 高并发压力大             | 高并发、高性能             |
| 扩展         | 垂直扩展（升级机器）| 水平扩展（加机器集群）|
| 存储         | 基于磁盘存储             | 基于内存存储             |
| 典型代表      | MySQL、Oracle、PostgreSQL | Redis、MongoDB、HBase      |


### 五、什么时候用 NoSQL？
- 需要**超高并发读写**（秒杀、首页缓存）
- 数据结构**经常变化**，不想频繁改表
- 需要**快速开发、灵活存储**
- 海量数据，需要**分布式存储**
- 对**强事务要求不高**，可以接受最终一致

---


## 02 认识 Redis

### 一、Redis 核心定义
Redis 诞生于 2009 年，由意大利开发者 Salvatore Sanfilippo 开发，全称是 **Remote Dictionary Server（远程词典服务器）**，是一款**开源的、高性能的键值型 NoSQL 数据库**，核心定位是「基于内存存储，同时支持持久化」，也是目前最主流的键值数据库。

### 二、Redis 核心特征
- **键值型存储**：Key 为字符串类型，Value 支持多种复杂数据结构（String、Hash、List、Set、ZSet 等），功能远超 Memcached 等简单键值数据库；
- **单线程模型**：Redis 6.0 前完全单线程处理命令，6.0 引入多线程仅处理网络 IO，命令执行仍为单线程；**每个命令具备原子性**，无需担心并发问题；
- **极致性能**：官方测试读写速度可达 10 万+/秒，核心原因：
  - 数据基于内存存储，无磁盘 IO 瓶颈；
  - 采用 IO 多路复用（epoll）处理网络请求；
  - 底层用 C 语言开发，编码高效；
- **数据持久化**：支持将内存数据落地到磁盘，避免重启后数据丢失（核心方案：RDB、AOF）；
- **高可用架构**：支持主从复制、哨兵（Sentinel）、分片集群（Cluster），保证服务不宕机、数据不丢失；
- **多语言支持**：提供完善的客户端协议，支持 Go、Java、Python、PHP 等几乎所有主流编程语言；
- **功能扩展**：内置发布订阅、Lua 脚本、分布式锁、过期策略、事务等扩展功能，适配更多场景。

### 三、Redis 核心数据结构
Redis 的核心优势之一是丰富的 Value 数据结构，以下是最常用的 5 种：

| 数据结构 | 核心特点 | 典型用途 |
|----------|----------|----------|
| String（字符串） | 最基础类型，可存储文本、数字，支持自增/自减、批量操作 | 缓存、计数器（点赞数/阅读量）、分布式锁、会话存储 |
| Hash（哈希） | 键值对的集合，类似 JSON 对象，可单独操作字段 | 存储用户信息、商品详情（如 user:1 → {id:1, name:"张三", age:20}） |
| List（列表） | 有序、可重复的字符串集合，支持头尾增删、范围查询 | 消息队列（LPUSH/RPOP）、最新消息列表、评论列表 |
| Set（集合） | 无序、不可重复的字符串集合，支持交集/并集/差集 | 去重（如用户点赞列表）、共同好友、抽奖活动 |
| ZSet（有序集合） | 基于 Set 扩展，每个元素关联分数（score），按分数排序 | 排行榜（如销量榜、积分榜）、延迟队列 |

### 四、Redis 典型应用场景
1. **缓存**：最核心场景，将数据库热点数据缓存到 Redis，减轻数据库压力（如商品详情、首页数据）；
2. **分布式锁**：利用 Redis 的 SETNX 原子操作，解决多服务并发修改数据的问题（如秒杀下单、库存扣减）；
3. **计数器**：基于 String 的 INCR/DECR 原子操作，实现点赞数、阅读量、接口限流计数；
4. **排行榜**：基于 ZSet 的排序功能，实现实时更新的销量榜、积分榜；
5. **消息队列**：基于 List 的 LPUSH/RPOP 或发布订阅（Pub/Sub），实现简单的消息通知、异步任务；
6. **会话存储**：替代传统 Cookie/Session，将用户登录态存储到 Redis，实现分布式系统的会话共享；
7. **限流**：基于 String 或 ZSet，实现接口防刷、秒杀限流（如令牌桶、漏桶算法）。

---

## 03 安装 Redis

WSL（Windows Subsystem for Linux）是 Windows 系统下的 Linux 子系统，可无缝运行 Redis（原生 Linux 版本），相比 Windows 版 Redis 更贴近生产环境，是开发调试的优选方案。

### 一、前置条件
1. 已在 Windows 上安装 WSL（推荐 WSL2），并配置好 Ubuntu/Debian 等 Linux 发行版；
2. 确保 WSL 已联网，可通过 `ping www.baidu.com` 验证网络连通性。

### 二、安装 Redis（以 Ubuntu 为例）

[参考文档](https://blog.csdn.net/qq_35715148/article/details/131423507)

#### 步骤 1：更新系统包列表
打开 WSL 终端（如 Ubuntu），先更新本地包索引，确保安装最新版本：
```bash
sudo apt update && sudo apt upgrade -y
```

#### 步骤 2：安装 Redis
执行以下命令安装 Redis 官方稳定版：
```bash
sudo apt install redis-server -y
```
安装完成后，Redis 会自动注册为系统服务，并默认启动。

#### 步骤 3：验证安装状态
1. 检查 Redis 服务是否运行：
```bash
sudo systemctl status redis-server
```
输出中出现 `active (running)` 表示服务正常启动。

2. 测试 Redis 连接：
```bash
redis-cli ping
```
返回 `PONG` 则说明 Redis 安装并运行成功。

### 三、配置 Redis（可选）
Redis 默认配置文件路径为 `/etc/redis/redis.conf`，可按需修改核心配置：

#### 步骤 1：编辑配置文件
```bash
sudo nano /etc/redis/redis.conf
```

#### 步骤 2：常用配置修改
| 配置项 | 默认值 | 推荐修改（按需） | 说明 |
|--------|--------|----------------|------|
| `bind` | `127.0.0.1 ::1` | 注释该行或改为 `0.0.0.0` | 允许 Windows 主机/局域网访问（仅开发环境） |
| `protected-mode` | `yes` | `no` | 关闭保护模式（配合 bind 修改） |
| `port` | `6379` | 保持默认或自定义 | Redis 监听端口 |
| `requirepass` | 无 | `requirepass yourpassword` | 开启密码验证（增强安全性） |
| `appendonly` | `no` | `yes` | 开启 AOF 持久化（数据更安全） |

#### 步骤 3：重启 Redis 使配置生效
```bash
sudo systemctl restart redis-server
```

### 四、Windows 主机访问 WSL 中的 Redis
默认情况下，WSL 与 Windows 主机共享网络，可直接通过 WSL 的 IP 访问 Redis：

#### 步骤 1：获取 WSL 的 IP 地址
在 WSL 终端执行：
```bash
ip addr show eth0 | grep inet | awk '{print $2}' | cut -d/ -f1
```
输出的 IP（如 `172.17.0.2`）即为 WSL 的内网地址。

#### 步骤 2：Windows 端连接测试
1. 打开 Windows CMD/PowerShell，安装 Redis 客户端（可选，如 Redis CLI for Windows）；
2. 执行连接命令：
```cmd
redis-cli -h WSL的IP地址 -p 6379
# 若设置了密码，连接后执行 auth yourpassword
```
3. 执行 `ping`，返回 `PONG` 则表示 Windows 主机可正常访问 WSL 中的 Redis。

### 五、Redis 服务管理常用命令
| 功能 | 命令 |
|------|------|
| 启动 Redis | `sudo systemctl start redis-server` |
| 停止 Redis | `sudo systemctl stop redis-server` |
| 重启 Redis | `sudo systemctl restart redis-server` |
| 设置开机自启 | `sudo systemctl enable redis-server` |
| 关闭开机自启 | `sudo systemctl disable redis-server` |
| 查看日志 | `sudo tail -f /var/log/redis/redis-server.log` |

### 六、注意事项
1. **生产环境建议**：WSL 仅用于开发/测试，生产环境需部署在纯 Linux 服务器上；
2. **端口占用**：若 WSL 的 6379 端口被占用，可修改 `redis.conf` 中的 `port` 配置，或关闭占用进程；
3. **权限问题**：编辑配置文件需用 `sudo`，否则会提示权限不足；
4. **WSL 重启后 Redis 状态**：若设置了 `enable`，WSL 重启后 Redis 会自动启动；未设置则需手动 `start`。

### 总结
1. WSL 安装 Redis 的核心步骤：更新系统包 → 安装 redis-server → 验证服务 → 按需修改配置；
2. Windows 主机访问 WSL Redis 需获取 WSL 的 IP，并确保 Redis 配置允许外部访问；
3. 常用服务管理命令（start/stop/restart/status）可快速控制 Redis 运行状态。

---

## 04 Redis 命令行客户端和图形化界面客户端

Redis 的客户端分为**命令行客户端**（原生、轻量、功能完整）和**图形化界面客户端**（可视化、易操作、适合新手），以下详细讲解两者的使用方式，覆盖 Windows/WSL/Linux 环境。

### 一、Redis 命令行客户端（redis-cli）
`redis-cli` 是 Redis 官方自带的命令行工具，功能完整、无需额外安装，是运维/开发调试的首选。

#### 1. 基础使用（本地连接）
##### （1）直接启动（默认配置）
打开终端（WSL/Linux）或 CMD（Windows），执行以下命令即可连接本地 Redis（默认地址 127.0.0.1，端口 6379）：
```bash
# Linux/WSL
redis-cli

# Windows（Redis解压目录下）
redis-cli.exe
```
启动后进入交互模式，提示符为 `127.0.0.1:6379>`，可直接执行 Redis 命令：
```bash
127.0.0.1:6379> SET name "Redis客户端" EX 60  # 设置键值对，过期60秒
OK
127.0.0.1:6379> GET name                     # 获取值
"Redis客户端"
127.0.0.1:6379> KEYS *                       # 查看所有key
1) "name"
127.0.0.1:6379> DEL name                     # 删除key
(integer) 1
127.0.0.1:6379> exit                         # 退出客户端
```

##### （2）指定参数连接（远程/自定义配置）
若 Redis 不在本地、端口/密码自定义，可通过参数指定连接信息：
```bash
# 通用格式：redis-cli -h 地址 -p 端口 -a 密码
# 示例1：连接WSL中的Redis（假设WSL IP为172.17.0.2）
redis-cli -h 172.17.0.2 -p 6379 -a yourpassword

# 示例2：连接远程服务器Redis
redis-cli -h 192.168.1.100 -p 6380
```
> 注意：`-a` 参数会明文显示密码，生产环境建议连接后用 `AUTH 密码` 认证：
> ```bash
> 192.168.1.100:6380> AUTH yourpassword
> OK
> ```

#### 2. 常用快捷功能
##### （1）批量执行命令
通过管道符 `|` 或文件执行批量命令，适合批量操作：
```bash
# 方式1：单行批量执行
echo -e "SET age 20\nGET age\nDEL age" | redis-cli

# 方式2：从文件读取命令（新建cmd.txt，写入Redis命令）
redis-cli < cmd.txt
```

##### （2）查看命令帮助
对不熟悉的命令，可通过 `help` 查看用法：
```bash
127.0.0.1:6379> HELP SET  # 查看SET命令用法
127.0.0.1:6379> HELP @string  # 查看字符串类型所有命令
```

##### （3）性能测试
`redis-cli` 内置性能测试工具，可测试 Redis 读写性能：
```bash
# 测试：100个并发连接，总共执行100000次SET命令
redis-benchmark -t set -c 100 -n 100000

# 测试所有命令性能
redis-benchmark -c 50 -n 50000
```

#### 3. 核心命令速查（高频）
| 命令分类 | 常用命令 | 功能 |
|----------|----------|------|
| 通用命令 | KEYS *、DEL key、EXPIRE key 60、TTL key | 查看所有 key、删除 key、设置过期时间、查看剩余过期时间 |
| 字符串 | SET、GET、INCR、DECR、MSET、MGET | 设置、获取、自增、自减、批量设置/获取 |
| 哈希 | HSET、HGET、HGETALL、HDEL、HINCRBY | 设置哈希字段、获取字段、获取所有字段、删除字段、字段自增 |
| 列表 | LPUSH、RPOP、LRANGE、LLEN | 左加元素、右弹元素、查看范围元素、列表长度 |
| 集合 | SADD、SMEMBERS、SISMEMBER、SINTER | 添加元素、查看所有元素、判断元素是否存在、求交集 |
| 有序集合 | ZADD、ZRANGE、ZREM、ZSCORE | 添加元素（带分数）、按排名查看、删除元素、查看元素分数 |

### 二、Redis 图形化界面客户端
命令行客户端适合熟练使用，但图形化工具更直观，适合新手或日常管理。

#### 1. Redis for VSCode
- 特点：轻量级 VSCode 插件，无需独立安装，集成在编辑器中，适合开发时快速调试，开源免费、跨平台。
- 使用：VSCode 扩展商店搜索安装→左侧 Redis 图标→Add Connection 填写地址/端口/密码→保存即可管理 Key、执行命令。
- 参考文档：https://redis.ac.cn/docs/latest/develop/tools/redis-for-vscode/

#### 2. Redis Desktop Manager（RDM）
- 特点：经典独立客户端，功能完整（多连接管理、数据导入导出、命令控制台），跨平台；新版本收费，推荐 2022.04 前免费版本。
- 使用：下载安装→新建连接填写参数→测试连通后即可可视化管理 Redis 数据。
- 参考教程：
  1. https://blog.csdn.net/qq_46112274/article/details/116718416
  2. https://developer.aliyun.com/article/1571328



# 基础篇-Redis 命令

## 01 数据结构介绍

Redis 是一个 key-value 的数据库，key 一般是 string 类型，不过 value 的类型多种多样，不同数据类型适配不同的业务场景，是 Redis 核心能力之一。

### 一、常见数据类型
| 数据类型 | 核心特点 | 典型应用场景 |
|----------|----------|--------------|
| String（字符串） | 最基础类型，可存储文本/数字，支持自增/自减、批量操作、过期设置 | 缓存、计数器（点赞数/阅读量）、分布式锁、会话存储 |
| Hash（哈希） | 键值对集合，类似 JSON 对象，可单独操作字段，节省内存 | 存储用户信息、商品详情（如 user:1 → {id:1, name:"张三"}） |
| List（列表） | 有序、可重复的字符串集合，支持头尾增删、范围查询 | 消息队列、最新消息列表、评论列表 |
| Set（集合） | 无序、不可重复的字符串集合，支持交集/并集/差集 | 去重（点赞列表）、共同好友、抽奖活动 |
| ZSet（有序集合） | 基于 Set 扩展，元素关联分数（score），按分数排序 | 排行榜（销量榜/积分榜）、延迟队列 |

### 二、命令帮助文档查看方式
Redis 为了方便学习，将操作不同类型的命令按分组管理，可通过以下方式查看：
1. **官方文档**：访问 https://redis.io/docs/latest/commands，按数据类型/功能筛选命令；
2. **命令行 help 命令**：
   - 查看指定命令用法：`HELP SET`（示例：查看 SET 命令）；
   - 查看某类数据结构所有命令：`HELP @string`（示例：查看字符串类型命令）；
   - 查看所有命令分组：`HELP`（输出所有可用的 help 分类）。

---

## 02 通用命令



Redis 命令主要分为“通用命令”（对所有数据类型都有效）和“特定类型命令”（只对 String、Hash 等有效）。

对于初学者，掌握**通用命令**是管理 Redis 的基础。以下是最高频使用的通用命令详解：



### 1. 键的查询与管理

#### `KEYS pattern`
*   **作用**：查找所有符合给定模式的 key。
*   **常用示例**：
    *   `KEYS *`：查看当前数据库所有的 key。
    *   `KEYS user*`：查看所有以 `user` 开头的 key（如 `user:1`, `user:2`）。
*   **⚠️ 警告**：**生产环境（线上环境）严禁使用 `KEYS *`**！
    *   因为数据量巨大时，这个命令会阻塞 Redis 服务器，导致服务卡顿。生产环境查数据请使用 `SCAN`。

#### `EXISTS key`
*   **作用**：检查给定的 key 是否存在。
*   **返回值**：
    *   `1`：存在。
    *   `0`：不存在。
*   **示例**：
    ```bash
    EXISTS name
    # (integer) 1
    ```

#### `TYPE key`
*   **作用**：查看 key 存储的数据类型。
*   **返回值**：`string` (字符串), `hash` (哈希), `list` (列表), `set` (集合), `zset` (有序集合), `none` (不存在)。
*   **示例**：
    ```bash
    TYPE age
    # "string"
    ```



### 2. 删除与过期时间

#### `DEL key [key ...]`
*   **作用**：删除一个或多个 key。
*   **返回值**：被删除 key 的数量。
*   **示例**：
    ```bash
    DEL age
    # (integer) 1
    DEL name age address  # 删除多个
    ```

#### `EXPIRE key seconds`
*   **作用**：为 key 设置生存时间（TTL），过期后自动删除。
*   **场景**：验证码缓存、Session 管理、限时优惠活动。
*   **示例**：
    ```bash
    EXPIRE code 60  # 设置 code 这个 key 60秒后过期
    ```

#### `TTL key`
*   **作用**：查看 key 的剩余生存时间。
*   **返回值**：
    *   **正数**：剩余秒数。
    *   `-1`：永久存在（没有设置过期时间）。
    *   `-2`：key 不存在（已过期或被删除）。
*   **示例**：
    ```bash
    TTL code
    # (integer) 55  (还剩55秒)
    ```


### 3. 修改键名与移动

#### `RENAME key newkey`
*   **作用**：将 key 重命名。
*   **注意**：如果 newkey 已经存在，会被覆盖！
*   **示例**：
    ```bash
    RENAME username user:1001:name
    ```

#### `MOVE key db_index`
*   **作用**：将 key 从当前数据库移动到指定数据库（如 db0 移到 db1）。
*   **示例**：
    ```bash
    MOVE age 1  # 将 age 移动到 1 号库
    ```

---

### 4. 数据库操作（危险！）

#### `SELECT index`
*   **作用**：切换数据库。默认有 16 个库（0-15）。
*   **示例**：
    ```bash
    SELECT 1   # 切换到 1 号库
    SELECT 0   # 切回默认库
    ```

#### `FLUSHDB`
*   **作用**：**清空当前数据库**的所有 key。
*   **⚠️ 警告**：不可恢复，慎用！

#### `FLUSHALL`
*   **作用**：**清空所有数据库**（0-15）的所有 key。
*   **⚠️ 警告**：相当于“删库跑路”，绝对不要在执行环境执行！


### 5. 高级操作

#### `SCAN cursor [MATCH pattern] [COUNT count]`
*   **作用**：迭代数据库中的键。用于替代 `KEYS *`。
*   **特点**：不阻塞服务器，分批返回结果。
*   **原理**：基于游标。第一次传 `0`，返回一个新的游标，直到返回游标为 `0` 表示遍历结束。
*   **示例**：
    ```bash
    SCAN 0 MATCH user* COUNT 10
    # 返回：下一个游标值 和 本次查到的 key 列表
    ```

#### `OBJECT ENCODING key`
*   **作用**：查看 key 底层存储的数据结构（如 `embstr`, `int`, `raw` 等）。用于深度调优。


### 总结速记表

| 命令       | 作用         | 风险等级          |
| :--------- | :----------- | :---------------- |
| `KEYS *`   | 查所有 Key   | 🔥 高危 (生产禁用) |
| `DEL`      | 删除 Key     | ⚠️ 中危            |
| `EXISTS`   | 判断是否存在 | ✅ 安全            |
| `TYPE`     | 查看类型     | ✅ 安全            |
| `EXPIRE`   | 设置过期时间 | ✅ 常用            |
| `TTL`      | 查看过期时间 | ✅ 常用            |
| `SELECT`   | 切换数据库   | ✅ 常用            |
| `FLUSHDB`  | 清空当前库   | 🚫 极危            |
| `FLUSHALL` | 清空所有库   | 🚫 极危            |

掌握这些命令，你就可以在 CLI 或图形化工具中自如地管理 Redis 的基础数据了。

---



## 03 String 类型


### 一、基本介绍
String 类型（字符串类型）是 Redis 中**最简单、最常用**的存储类型，也是所有数据类型的基础。

其 value 本质是字符串，根据字符串格式不同，可细分为 3 类：
- `string`：普通字符串（如"Redis"、"用户 1001"）；
- `int`：整数型字符串（如"100"、"999"，支持数值运算）；
- `float`：浮点型字符串（如"3.14"、"9.9"，支持浮点运算）。

**核心特性**：
- 底层以字节数组形式存储，不同格式仅编码方式不同；
- 单个 String 类型 value 的最大存储空间不超过 512MB；
- 支持原子性操作，适合做计数器、分布式锁等场景。

### 二、常见命令
#### 1. SET
*   **语法**：`SET key value [EX seconds | PX milliseconds] [NX | XX]`
*   **作用**：设置指定 key 的值。
*   **示例**：
    ```bash
    SET name "muke"
    SET code "123456" EX 60  # 设置值并设置60秒过期时间
    ```
*   **可选参数**：
    *   `EX seconds`：设置过期时间（秒）。
    *   `PX milliseconds`：设置过期时间（毫秒）。
    *   `NX`：键不存在时才设置。
    *   `XX`：键存在时才设置。

#### 2. GET
*   **语法**：`GET key`
*   **作用**：获取指定 key 的值。如果 key 不存在，返回 `nil`。
*   **示例**：
    ```bash
    GET name
    # "muke"
    ```

#### 3. MSET
*   **语法**：`MSET key value [key value ...]`
*   **作用**：同时设置一个或多个 key-value 对。
*   **优点**：**原子性**操作，同时成功或同时失败，且减少网络传输次数，效率高于多次执行 `SET`。
*   **示例**：
    ```bash
    MSET k1 "v1" k2 "v2" k3 "v3"
    ```

#### 4. MGET
*   **语法**：`MGET key [key ...]`
*   **作用**：获取所有(一个或多个)给定 key 的值。
*   **示例**：
    ```bash
    MGET k1 k2 k3
    # 1) "v1"
    # 2) "v2"
    # 3) "v3"
    ```

#### 5. INCR
*   **语法**：`INCR key`
*   **作用**：将 key 中储存的数字值增一。
*   **注意**：
    *   如果 key 不存在，会先初始化为 `0` 再增一。
    *   如果 value 不是整数类型（如字符串 "hello"），会报错。
*   **场景**：文章阅读量计数、点赞数、分布式 ID 生成。
*   **示例**：
    ```bash
    INCR read_count
    # (integer) 1
    ```

#### 6. INCRBY
*   **语法**：`INCRBY key increment`
*   **作用**：将 key 所储存的值加上给定的增量。
*   **示例**：
    ```bash
    INCRBY score 10
    # (integer) 10
    ```

#### 7. INCRBYFLOAT
*   **语法**：`INCRBYFLOAT key increment`
*   **作用**：将 key 所储存的值加上给定的浮点增量。
*   **示例**：
    ```bash
    SET price 10.5
    INCRBYFLOAT price 0.5
    # "11"
    ```

#### 8. SETNX
*   **语法**：`SETNX key value`
*   **作用**：仅在 key **不存在**时设置值。
*   **返回值**：设置成功返回 `1`，失败返回 `0`。
*   **场景**：分布式锁的简单实现。
*   **示例**：
    ```bash
    SETNX lock "uuid_123"
    # (integer) 1 (成功)
    SETNX lock "uuid_456"
    # (integer) 0 (失败，lock已存在)
    ```

#### 9. SETEX
*   **语法**：`SETEX key seconds value`
*   **作用**：设置值并设置过期时间（秒）。
*   **等价于**：`SET key value EX seconds`。
*   **场景**：验证码存储（必须有过期时间）。
*   **示例**：
    ```bash
    SETEX verify_code 60 "888888"  # 存入验证码，60秒后过期
    ```


### 三、常用场景与注意事项
#### 1. 典型场景
- **缓存**：存储商品详情、用户信息等热点数据；
- **计数器**：点赞数、阅读量、接口调用次数（基于`INCR`/`INCRBY`）；
- **分布式锁**：基于`SETNX`/`SET key value NX EX`实现；
- **临时数据**：验证码、Session（基于`SETEX`设置过期时间）。

#### 2. 注意事项
- 非数值型字符串执行`INCR`/`INCRBY`会报错（如`SET name "张三"`后执行`INCR name`）；
- `SETNX`+`EXPIRE`非原子操作，生产环境优先用`SET key value NX EX seconds`（原子性设置+过期）；
- 单个 String 值建议控制在 100KB 以内，过大的 value 会影响 Redis 读写性能。

### 四、命令速记表
| 命令          | 核心作用                  | 关键特性                  |
|---------------|---------------------------|---------------------------|
| `SET`         | 设置单个 key-value         | 支持过期、NX/XX 参数       |
| `GET`         | 获取单个 key 的 value        | 不存在返回 nil             |
| `MSET`/`MGET` | 批量设置/获取 key-value    | 原子性，减少网络交互      |
| `INCR`/`INCRBY` | 整数自增/指定增量自增    | 原子操作，适合计数器      |
| `INCRBYFLOAT` | 浮点数值自增              | 支持小数运算              |
| `SETNX`       | 不存在时设置              | 分布式锁核心              |
| `SETEX`       | 设置 value 并指定过期时间   | 简化 SET+EXPIRE 操作        |



# 
## 04 Key 的层级结构

### 一、思考引入
**核心问题**：Redis 没有 MySQL 中「表（Table）」的概念，若直接用简单字符串（如`1`）作为 Key，不同业务的 Key 极易冲突（例如用户 ID=1 和商品 ID=1 会覆盖）。

**典型场景**：存储用户、商品信息时，用户 ID 和商品 ID 可能重复，直接用 ID 作为 Key 会导致数据覆盖，需通过规范的 Key 结构区分业务。

### 二、Key 的结构规范
Redis 的 Key 支持多单词组成**层级结构**，单词之间用**冒号 `:`** 分隔，推荐通用格式：
```plain
项目名:业务模块:数据类型:唯一标识
```

**核心说明**：
1. 格式非固定，可根据业务灵活调整层级（如新增「环境」层级：`heima:dev:user:1`）；
2. 层级命名在图形化客户端中会自动生成**文件夹式目录树**，大幅提升可读性；
3. 层级划分需遵循「语义化、唯一化」原则，避免模糊命名（如避免`heima:data:1`，无法区分是用户还是商品）。

### 三、Value 的存储建议
1. 若 Value 是结构化对象（如 User、Product），优先序列化为**JSON 字符串**存储（跨语言兼容、易解析）；
2. 若需频繁修改对象单个字段，可改用 Hash 类型存储（详见 05 Hash 类型）；
3. 避免存储超大 JSON（建议单 Value≤100KB），过大的 Value 会降低 Redis 读写性能。

### 四、实战示例
以`heima`项目为例，存储用户和商品信息的规范命名：

#### 1. 存储用户对象
- **Key**：`heima:user:1`（项目名:业务模块:唯一标识）
- **Value**：`{"id":1, "name":"Jack", "age":21}`（JSON 字符串）
- **命令**：
  ```bash
  SET heima:user:1 '{"id":1, "name":"Jack", "age":21}' EX 86400  # 附加过期时间（可选）
  ```

#### 2. 存储商品对象
- **Key**：`heima:product:1`（项目名:业务模块:唯一标识）
- **Value**：`{"id":1, "name":"iPhone", "price":6999}`（JSON 字符串）
- **命令**：
  ```bash
  SET heima:product:1 '{"id":1, "name":"iPhone", "price":6999}'
  ```

### 五、图形化界面展示效果
层级结构命名后，Redis 图形化客户端（如 ARDM、Redis for VSCode）会自动生成目录树，直观易管理：
```text
📂 heima
   ├── 📂 user          # 业务模块：用户
   │    └── 🔑 1        # 唯一标识：用户ID -> {"id":1, "name":"Jack", "age":21}
   └── 📂 product       # 业务模块：商品
        └── 🔑 1        # 唯一标识：商品ID -> {"id":1, "name":"iPhone", "price":6999}
```

### 六、扩展规范（生产环境建议）
| 层级扩展场景 | 示例 Key                | 说明                     |
|--------------|------------------------|--------------------------|
| 多环境区分   | `heima:dev:user:1`     | dev（开发）/test（测试）/prod（生产） |
| 多字段分类   | `heima:user:1:info`    | 区分用户基础信息/行为数据 |
| 分布式系统   | `heima:user:1:node1`   | 区分集群节点数据         |

---

## 05 Hash 类型

### 一、基本介绍
Hash 类型（散列）是 Redis 中的**键值对集合**，其 Value 是一个无序的「字段-值（field-value）」字典，类似 Java 中的`HashMap`、Python 中的`dict`。

#### 核心优势（对比 String 存储 JSON）
| 存储方式       | 优点                  | 缺点                          |
|----------------|-----------------------|-------------------------------|
| String（JSON） | 存储简单、跨语言兼容  | 修改单个字段需全量读写，效率低 |
| Hash           | 可单独操作单个字段    | 不支持嵌套结构，仅存储字符串  |

**适用场景**：用户信息、商品详情等需频繁修改单个字段的结构化数据存储。

### 二、直观示例
存储用户信息时，Hash 类型可将每个字段独立存储，无需序列化整个对象：
```text
# String存储（JSON）：修改age需重新序列化整个对象
heima:user:1 -> {"id":1, "name":"Jack", "age":21}

# Hash存储：可单独修改age字段
heima:user:1 -> {id:1, name:"Jack", age:21}
```

### 三、常见命令
#### 1. 单字段操作
##### `HSET key field value`
- **作用**：为 Hash 类型的 key 设置指定字段（field）和值（value）；
- **返回值**：`1`（字段不存在，设置成功）、`0`（字段已存在，覆盖成功）；
- **示例**：
  ```bash
  HSET heima:user:1 name "Jack" age 21
  # (integer) 2 （2个新字段设置成功）
  ```

##### `HGET key field`
- **作用**：获取 Hash 类型 key 中指定字段的值；
- **返回值**：字段存在返回对应值，不存在返回`(nil)`；
- **示例**：
  ```bash
  HGET heima:user:1 age
  # "21"
  ```

#### 2. 多字段操作
##### `HMSET key field value [field value ...]`
- **作用**：批量为 Hash 类型 key 设置多个字段和值；
- **示例**：
  ```bash
  HMSET heima:user:2 name "Rose" age 22 email "rose@test.com"
  # OK
  ```

##### `HMGET key field [field ...]`
- **作用**：批量获取 Hash 类型 key 中多个字段的值；
- **返回值**：按字段顺序返回值，不存在的字段返回`(nil)`；
- **示例**：
  ```bash
  HMGET heima:user:2 name age phone
  # 1) "Rose"
  # 2) "22"
  # 3) (nil)
  ```

#### 3. 全量操作
##### `HGETALL key`
- **作用**：获取 Hash 类型 key 中所有字段和值；
- **返回值**：字段和值交替的列表；
- **示例**：
  ```bash
  HGETALL heima:user:1
  # 1) "name"
  # 2) "Jack"
  # 3) "age"
  # 4) "21"
  ```

##### `HKEYS key`
- **作用**：获取 Hash 类型 key 中所有字段名；
- **示例**：
  ```bash
  HKEYS heima:user:1
  # 1) "name"
  # 2) "age"
  ```

##### `HVALS key`
- **作用**：获取 Hash 类型 key 中所有字段值；
- **示例**：
  ```bash
  HVALS heima:user:1
  # 1) "Jack"
  # 2) "21"
  ```

#### 4. 数值运算与条件设置
##### `HINCRBY key field increment`
- **作用**：将 Hash 类型 key 中指定字段的值（整数型）自增指定增量；
- **场景**：用户积分、商品库存修改；
- **示例**：
  ```bash
  HINCRBY heima:user:1 age 1  # age从21自增1
  # (integer) 22
  ```

##### `HSETNX key field value`
- **作用**：仅当字段不存在时，为 Hash 类型 key 设置字段和值；
- **返回值**：`1`（设置成功）、`0`（字段已存在，设置失败）；
- **示例**：
  ```bash
  HSETNX heima:user:1 name "Tom"  # name已存在，失败
  # (integer) 0
  HSETNX heima:user:1 gender "male"  # gender不存在，成功
  # (integer) 1
  ```

### 四、实战案例
#### 需求：存储并修改用户信息
```bash
# 1. 存储用户1的基础信息（Hash类型）
HMSET heima:user:1 id 1 name "Jack" age 21 score 100

# 2. 获取用户1的姓名和年龄
HMGET heima:user:1 name age
# 1) "Jack"
# 2) "21"

# 3. 给用户1的积分增加20
HINCRBY heima:user:1 score 20
# (integer) 120

# 4. 仅当邮箱字段不存在时设置
HSETNX heima:user:1 email "jack@test.com"
# (integer) 1
```

### 五、注意事项
1. Hash 类型的 field 和 value 均为字符串类型，不支持嵌套 JSON 或其他复杂结构；
2. 单个 Hash 类型 key 最多支持 2^32-1 个字段，实际使用中建议控制在 1000 个以内；
3. 若需存储嵌套对象（如用户的收货地址列表），优先用 String 存储 JSON，而非 Hash 嵌套。

### 六、命令速记表
| 命令         | 核心作用                  | 关键特性                  |
|--------------|---------------------------|---------------------------|
| `HSET`       | 设置单个字段值            | 覆盖已存在字段            |
| `HGET`       | 获取单个字段值            | 不存在返回 nil             |
| `HMSET/HMGET`| 批量设置/获取字段值       | 原子操作，减少网络交互    |
| `HGETALL`    | 获取所有字段和值          | 数据量大时阻塞 Redis，慎用 |
| `HKEYS/HVALS`| 获取所有字段名/字段值     | 快速筛选 Hash 结构数据      |
| `HINCRBY`    | 字段值整数自增            | 原子操作，适合计数器      |
| `HSETNX`     | 字段不存在时设置          | 防止字段覆盖              |



---


## 06 List 类型

### 一、基本介绍
Redis 中的 List 类型与 Java 中的`LinkedList`底层逻辑一致，本质是**双向链表结构**，元素有序且可重复。

#### 核心特征
1. 双向检索：支持从表头（左侧）、表尾（右侧）双向操作元素，时间复杂度 O(1)；
2. 元素可重复：同一个元素可多次加入列表；
3. 内存高效：链表结构无需连续内存，新增/删除元素性能高；
4. 长度限制：单个 List 最多支持 2^32-1 个元素（约 42 亿）。

#### 典型应用场景
- **消息队列**：基于 LPUSH+RPOP 实现简单队列，BLPOP/BRPOP 实现阻塞队列；
- **最新消息列表**：如朋友圈、评论区的最新动态（LPUSH+LRANGE）；
- **栈/队列模拟**：利用双向操作特性实现栈、普通队列、阻塞队列；
- **限流削峰**：临时存储请求，缓慢消费避免后端过载。

### 二、常见命令
#### 1. 基础增删操作
##### `LPUSH key element [element ...]`
- **作用**：将一个/多个元素从**列表左侧（表头）** 插入；
- **返回值**：插入后列表的长度；
- **示例**：
  ```bash
  LPUSH nums 1 2 3  # 列表变为 [3,2,1]
  # (integer) 3
  ```

##### `LPOP key`
- **作用**：从**列表左侧（表头）** 弹出一个元素；
- **返回值**：弹出的元素，列表为空返回`(nil)`；
- **示例**：
  ```bash
  LPOP nums  # 弹出3，列表变为 [2,1]
  # "3"
  ```

##### `RPUSH key element [element ...]`
- **作用**：将一个/多个元素从**列表右侧（表尾）** 插入；
- **返回值**：插入后列表的长度；
- **示例**：
  ```bash
  RPUSH nums 4 5  # 列表变为 [2,1,4,5]
  # (integer) 4
  ```

##### `RPOP key`
- **作用**：从**列表右侧（表尾）** 弹出一个元素；
- **返回值**：弹出的元素，列表为空返回`(nil)`；
- **示例**：
  ```bash
  RPOP nums  # 弹出5，列表变为 [2,1,4]
  # "5"
  ```

#### 2. 范围查询
##### `LRANGE key start end`
- **作用**：获取列表中`[start, end]`范围内的元素（闭区间）；
- **参数说明**：
  - `start/end`：索引从 0 开始，支持负数（-1 表示最后一个元素，-2 表示倒数第二个）；
- **示例**：
  ```bash
  LRANGE nums 0 -1  # 获取所有元素，返回 ["2","1","4"]
  LRANGE nums 0 1   # 获取前2个元素，返回 ["2","1"]
  ```

#### 3. 阻塞式弹出（核心）
##### `BLPOP key [key ...] timeout` / `BRPOP key [key ...] timeout`
- **作用**：与 LPOP/RPOP 逻辑一致，但列表为空时**阻塞等待**（而非直接返回 nil）；
- **参数说明**：
  - `timeout`：阻塞超时时间（秒），0 表示永久阻塞；
  - 支持同时监听多个列表，有元素时优先弹出第一个非空列表的元素；
- **场景**：阻塞队列（如消息消费），避免轮询消耗资源；
- **示例**：
  ```bash
  BLPOP empty_list 5  # 列表为空，阻塞5秒后返回nil
  # (nil)
  # (5.00s)
  
  BRPOP nums 0  # 永久阻塞，直到nums有元素弹出
  # 若此时另一个客户端LPUSH nums 6，立即返回 ["nums","6"]
  ```

### 三、核心思考：基于 List 模拟栈/队列/阻塞队列
#### 1. 模拟栈（先进后出，FILO）
栈的核心是「先进后出」，利用 List 的**同一侧**增删实现：
- 入栈：`LPUSH key element`（左侧插入）；
- 出栈：`LPOP key`（左侧弹出）；
- 示例：
  ```bash
  LPUSH stack 1 2 3  # 入栈：[3,2,1]
  LPOP stack         # 出栈：3 → 栈变为 [2,1]
  LPOP stack         # 出栈：2 → 栈变为 [1]
  ```

#### 2. 模拟普通队列（先进先出，FIFO）
队列的核心是「先进先出」，利用 List 的**两侧**增删实现：
- 入队：`LPUSH key element`（左侧插入）；
- 出队：`RPOP key`（右侧弹出）；
- 示例：
  ```bash
  LPUSH queue 1 2 3  # 入队：[3,2,1]
  RPOP queue         # 出队：1 → 队列变为 [3,2]
  RPOP queue         # 出队：2 → 队列变为 [3]
  ```

#### 3. 模拟阻塞队列（先进先出+空队列阻塞）
基于普通队列逻辑，将出队命令替换为**阻塞式弹出**：
- 入队：`LPUSH key element`（左侧插入）；
- 出队：`BRPOP key 0`（右侧阻塞弹出，0 表示永久等待）；
- 核心优势：消费者无需轮询，队列空时阻塞，有消息时立即消费，减少资源消耗；
- 示例：
  ```bash
  # 生产者
  LPUSH block_queue "order:1001"  # 入队
  # 消费者（永久阻塞等待）
  BRPOP block_queue 0  # 队列有元素时立即弹出"order:1001"，无元素则阻塞
  ```
  

### 四、注意事项
1. `LRANGE`命令在获取超大范围（如 0 -1）时，若列表元素过多会阻塞 Redis，生产环境需控制返回长度；
2. 阻塞命令（BLPOP/BRPOP）会占用客户端连接，需合理设置超时时间，避免连接泄漏；
3. List 作为消息队列仅适合简单场景，不支持消息确认、重试，复杂场景建议用 RabbitMQ/Kafka。

### 五、命令速记表
| 命令       | 核心作用                  | 适用场景                |
|------------|---------------------------|-------------------------|
| `LPUSH`    | 左侧插入元素              | 栈/队列入队             |
| `LPOP`     | 左侧弹出元素              | 栈出栈                  |
| `RPUSH`    | 右侧插入元素              | 反向队列入队            |
| `RPOP`     | 右侧弹出元素              | 普通队列出队            |
| `LRANGE`   | 范围查询元素              | 查看列表内容            |
| `BLPOP/BRPOP` | 阻塞式弹出元素        | 阻塞队列消费            |

### 总结
1. Redis List 是双向链表结构，支持双向增删、范围查询，核心优势是增删性能高；
2. 模拟栈用「LPUSH+LPOP」，模拟普通队列用「LPUSH+RPOP」，模拟阻塞队列用「LPUSH+BRPOP」；
3. 阻塞命令（BLPOP/BRPOP）是实现阻塞队列的核心，可避免轮询消耗资源。

---



## 07 Set 类型

### 一、基本介绍
Redis 的 Set 类型与 Java 中的`HashSet`底层逻辑一致，本质是**基于哈希表实现的无序集合**，可看作是 value 为空的`HashMap`（仅存储 key，利用哈希表保证唯一性）。

#### 核心特征
1. **元素不可重复**：向集合中添加已存在的元素会被自动忽略，天然支持去重；
2. **无序性**：元素存储无固定顺序，每次查询返回顺序可能不同；
3. **查询高效**：判断元素是否存在、获取元素的时间复杂度为 O(1)；
4. **集合运算**：原生支持交集、并集、差集等集合操作，适合多维度数据筛选；
5. **长度限制**：单个 Set 最多支持 2^32-1 个元素（约 42 亿）。

#### 典型应用场景
- **数据去重**：如用户点赞列表、访问记录、抽奖名单（避免重复参与）；
- **关系筛选**：如共同好友、共同关注、商品标签交集；
- **随机抽取**：如抽奖、随机推荐（SPOP/SRANDMEMBER）；
- **权限控制**：如用户角色集合、接口访问权限集合。

### 二、常见命令
#### 1. 基础增删与查询
##### `SADD key member [member ...]`
- **作用**：向集合中添加一个/多个元素；
- **返回值**：新增元素的数量（已存在的元素不计入）；
- **示例**：
  ```redis
  SADD user:1:likes post1 post2 post3  # 添加3个点赞帖子
  # (integer) 3
  SADD user:1:likes post1  # 重复添加，返回0
  # (integer) 0
  ```

##### `SREM key member [member ...]`
- **作用**：从集合中删除一个/多个元素；
- **返回值**：成功删除的元素数量；
- **示例**：
  ```redis
  SREM user:1:likes post2  # 删除post2
  # (integer) 1
  ```

##### `SCARD key`
- **作用**：获取集合的元素数量（长度）；
- **返回值**：集合元素个数，集合不存在返回 0；
- **示例**：
  ```redis
  SCARD user:1:likes  # 剩余post1、post3，返回2
  # (integer) 2
  ```

##### `SISMEMBER key member`
- **作用**：判断元素是否存在于集合中；
- **返回值**：`1`（存在）、`0`（不存在）；
- **场景**：快速校验用户是否点赞、是否参与活动；
- **示例**：
  ```redis
  SISMEMBER user:1:likes post1  # 存在，返回1
  # (integer) 1
  SISMEMBER user:1:likes post4  # 不存在，返回0
  # (integer) 0
  ```

##### `SMEMBERS key`
- **作用**：获取集合中所有元素；
- **⚠️ 警告**：集合元素过多时（如 10 万+），会阻塞 Redis，生产环境慎用；
- **示例**：
  ```redis
  SMEMBERS user:1:likes
  # 1) "post1"
  # 2) "post3"
  ```

#### 2. 集合运算（核心）
##### `SINTER key1 [key2 ...]`
- **作用**：求多个集合的**交集**（同时存在于所有集合的元素）；
- **场景**：共同好友、共同点赞、标签交集；
- **示例**：
  ```redis
  # 先初始化两个用户的点赞集合
  SADD user:1:likes post1 post2 post3
  SADD user:2:likes post2 post3 post4
  # 求共同点赞的帖子（交集）
  SINTER user:1:likes user:2:likes
  # 1) "post2"
  # 2) "post3"
  ```

##### `SDIFF key1 [key2 ...]`
- **作用**：求多个集合的**差集**（存在于 key1 但不存在于其他集合的元素）；
- **场景**：用户 A 点赞但用户 B 未点赞的内容、独有标签；
- **示例**：
  ```redis
  SDIFF user:1:likes user:2:likes  # user1有但user2没有的帖子
  # 1) "post1"
  ```

##### `SUNION key1 [key2 ...]`
- **作用**：求多个集合的**并集**（所有集合的元素，去重）；
- **场景**：合并多个用户的点赞列表、汇总标签；
- **示例**：
  ```redis
  SUNION user:1:likes user:2:likes  # 合并两个用户的点赞列表
  # 1) "post1"
  # 2) "post2"
  # 3) "post3"
  # 4) "post4"
  ```

### 三、扩展常用命令（补充）
| 命令          | 核心作用                  | 示例                          |
|---------------|---------------------------|-------------------------------|
| `SPOP key [count]` | 随机弹出 count 个元素      | `SPOP user:1:likes 1`（随机抽 1 个） |
| `SRANDMEMBER key [count]` | 随机获取 count 个元素（不弹出） | `SRANDMEMBER user:1:likes 2` |
| `SINTERSTORE dest key1 key2` | 将交集结果存入 dest 集合 | `SINTERSTORE common_likes user1 user2` |

### 四、实战案例：共同好友查询
```redis
# 1. 初始化两个用户的好友集合
SADD user:1001:friends 1002 1003 1004
SADD user:1002:friends 1001 1003 1005

# 2. 查询两人的共同好友
SINTER user:1001:friends user:1002:friends
# 1) "1003"

# 3. 查询user1001有但user1002没有的好友
SDIFF user:1001:friends user:1002:friends
# 1) "1004"

# 4. 统计user1001的好友数量
SCARD user:1001:friends
# (integer) 3
```

### 五、注意事项
1. `SMEMBERS`命令在元素过多时会阻塞 Redis，生产环境优先用`SSCAN`（分批遍历）替代；
2. 集合运算（SINTER/SDIFF/SUNION）的性能与参与运算的集合大小相关，超大集合运算需谨慎；
3. 如需有序的集合，可使用 ZSet（有序集合）替代 Set。

### 六、命令速记表
| 命令         | 核心作用                  | 关键特性                  |
|--------------|---------------------------|---------------------------|
| `SADD`       | 添加元素                  | 自动去重，返回新增数量    |
| `SREM`       | 删除元素                  | 返回删除数量              |
| `SCARD`      | 获取集合长度              | 快速统计，O(1)复杂度      |
| `SISMEMBER`  | 判断元素是否存在          | 核心去重校验，O(1)复杂度  |
| `SMEMBERS`   | 获取所有元素              | 大集合慎用，易阻塞        |
| `SINTER`     | 求交集                    | 多集合共同元素筛选        |
| `SDIFF`      | 求差集                    | 独有元素筛选              |
| `SUNION`     | 求并集                    | 多集合元素合并去重        |

### 总结
1. Redis Set 是基于哈希表的无序集合，核心特性是元素不可重复、查询高效、支持集合运算；
2. 基础操作（SADD/SREM/SCARD/SISMEMBER）是日常使用核心，集合运算（SINTER/SDIFF/SUNION）是 Set 的特色能力；
3. 适合数据去重、关系筛选（共同好友）、随机抽取等场景，大集合操作需避免阻塞 Redis。



---





## 08 SortedSet 类型（ZSet）

### 一、基本介绍
Redis 的 SortedSet（简称 ZSet）是**可排序的无重复集合**，与 Java 中的`TreeSet`功能相似，但底层实现完全不同（ZSet 基于「跳表+哈希表」实现，兼顾排序和查询性能）。

ZSet 中每个元素关联一个`score`（浮点型数值），核心基于`score`对元素排序，同时通过哈希表保证元素唯一性。

#### 核心特性
1. **有序性**：基于`score`排序，支持升序/降序查询，排序性能高；
2. **元素唯一**：集合内元素不可重复，但`score`可重复；
3. **查询高效**：获取元素排名、范围查询的时间复杂度为 O(logN)；
4. **双结构加持**：跳表保证排序，哈希表保证元素唯一性和快速查询；
5. **长度限制**：单个 ZSet 最多支持 2^32-1 个元素（约 42 亿）。

#### 典型应用场景
- **排行榜**：商品销量榜、用户积分榜、游戏战力榜；
- **延迟队列**：基于`score`存储时间戳，实现定时任务；
- **范围筛选**：按分数/排名筛选数据（如 TopN、分数区间查询）；
- **权重排序**：如搜索结果按相关性排序、评论按热度排序。

### 二、常见命令
#### 1. 基础增删与查询
##### `ZADD key score member [score member ...]`
- **作用**：向 ZSet 中添加一个/多个元素（指定 score）；
- **返回值**：新增元素的数量（已存在的元素仅更新 score，不计入返回值）；
- **示例**：
  ```bash
  ZADD score:math 95 zhangsan 88 lisi 92 wangwu  # 添加3个学生的数学成绩
  # (integer) 3
  ZADD score:math 90 lisi  # 更新lisi的分数，返回0
  # (integer) 0
  ```

##### `ZREM key member [member ...]`
- **作用**：从 ZSet 中删除一个/多个元素；
- **返回值**：成功删除的元素数量；
- **示例**：
  ```bash
  ZREM score:math lisi  # 删除lisi的成绩
  # (integer) 1
  ```

##### `ZSCORE key member`
- **作用**：获取指定元素的 score 值；
- **返回值**：score 的字符串形式，元素不存在返回`(nil)`；
- **示例**：
  ```bash
  ZSCORE score:math zhangsan
  # "95"
  ```

##### `ZRANK key member` / `ZREVRANK key member`
- **作用**：
  - `ZRANK`：获取元素的**升序排名**（从 0 开始）；
  - `ZREVRANK`：获取元素的**降序排名**（从 0 开始）；
- **返回值**：排名数值，元素不存在返回`(nil)`；
- **示例**：
  ```bash
  ZRANK score:math zhangsan  # 升序排名（92<95），返回1
  # (integer) 1
  ZREVRANK score:math zhangsan  # 降序排名，返回0（第一名）
  # (integer) 0
  ```

##### `ZCARD key`
- **作用**：获取 ZSet 的元素数量（长度）；
- **返回值**：元素个数，集合不存在返回 0；
- **示例**：
  ```bash
  ZCARD score:math  # 剩余zhangsan、wangwu，返回2
  # (integer) 2
  ```

##### `ZCOUNT key min max`
- **作用**：统计`score`在`[min, max]`范围内的元素数量；
- **参数说明**：`min/max`支持`(`表示开区间（如`(90`表示>90）；
- **示例**：
  ```bash
  ZCOUNT score:math 90 100  # 分数≥90且≤100的元素数量
  # (integer) 2
  ZCOUNT score:math (90 95  # 分数>90且≤95的元素数量
  # (integer) 2
  ```

##### `ZINCRBY key increment member`
- **作用**：将指定元素的 score 自增`increment`（可负数，即自减）；
- **场景**：积分增减、销量更新；
- **示例**：
  ```bash
  ZINCRBY score:math 2 wangwu  # 给wangwu加2分，score从92→94
  # "94"
  ```

#### 2. 范围查询（核心）
##### `ZRANGE key start end [WITHSCORES]` / `ZREVRANGE key start end [WITHSCORES]`
- **作用**：
  - `ZRANGE`：按**升序**获取排名`[start, end]`的元素（0 开始，-1 表示最后一名）；
  - `ZREVRANGE`：按**降序**获取排名`[start, end]`的元素；
  - `WITHSCORES`：可选参数，返回元素时附带 score；
- **场景**：TopN 排行榜（如前 10 名）；
- **示例**：
  ```bash
  # 升序获取所有元素（附带分数）
  ZRANGE score:math 0 -1 WITHSCORES
  # 1) "wangwu"
  # 2) "94"
  # 3) "zhangsan"
  # 4) "95"
  
  # 降序获取前1名（第一名）
  ZREVRANGE score:math 0 0 WITHSCORES
  # 1) "zhangsan"
  # 2) "95"
  ```

##### `ZRANGEBYSCORE key min max [WITHSCORES]` / `ZREVRANGEBYSCORE key max min [WITHSCORES]`
- **作用**：
  - `ZRANGEBYSCORE`：按**升序**获取`score`在`[min, max]`的元素；
  - `ZREVRANGEBYSCORE`：按**降序**获取`score`在`[max, min]`的元素；
- **场景**：分数区间筛选（如 90 分以上的学生）；
- **示例**：
  ```bash
  # 获取分数≥90且≤95的元素（附带分数）
  ZRANGEBYSCORE score:math 90 95 WITHSCORES
  # 1) "wangwu"
  # 2) "94"
  # 3) "zhangsan"
  # 4) "95"
  ```

#### 3. 集合运算
##### `ZDIFF numkeys key1 [key2 ...]` / `ZINTER numkeys key1 [key2 ...]` / `ZUNION numkeys key1 [key2 ...]`
- **作用**：
  - `ZDIFF`：求多个 ZSet 的差集（存在于第一个集合，不存在于其他集合）；
  - `ZINTER`：求多个 ZSet 的交集（同时存在于所有集合）；
  - `ZUNION`：求多个 ZSet 的并集（所有集合的元素，去重）；
- **参数说明**：`numkeys`表示参与运算的集合数量；
- **示例**：
  ```bash
  # 初始化两个学科的分数集合
  ZADD score:math 95 zhangsan 92 wangwu
  ZADD score:english 90 zhangsan 88 wangwu
  
  # 求两科都有成绩的学生（交集）
  ZINTER 2 score:math score:english
  # 1) "wangwu"
  # 2) "zhangsan"
  ```

### 三、核心规则
所有排名/范围查询命令默认**升序**，如需**降序**，在命令的`Z`后添加`REV`：
- 升序排名：`ZRANK` → 降序排名：`ZREVRANK`；
- 升序范围：`ZRANGE` → 降序范围：`ZREVRANGE`；
- 升序分数范围：`ZRANGEBYSCORE` → 降序分数范围：`ZREVRANGEBYSCORE`。

### 四、实战示例：学生分数排行榜
#### 需求：实现学生数学成绩的增删、排名查询、分数区间筛选
```redis
# 1. 新增/更新学生数学成绩
ZADD score:math 95 张三 88 李四 92 王五 85 赵六 98 钱七

# 2. 统计总人数
ZCARD score:math
# (integer) 5

# 3. 查询张三的分数
ZSCORE score:math 张三
# "95"

# 4. 查询张三的降序排名（第几名）
ZREVRANK score:math 张三
# (integer) 1  # 钱七98分第0名，张三95分第1名

# 5. 获取数学成绩前3名（降序）
ZREVRANGE score:math 0 2 WITHSCORES
# 1) "钱七"
# 2) "98"
# 3) "张三"
# 4) "95"
# 5) "王五"
# 6) "92"

# 6. 统计90分以上的学生数量
ZCOUNT score:math 90 +inf  # +inf表示正无穷
# (integer) 3

# 7. 给李四加5分（分数从88→93）
ZINCRBY score:math 5 李四
# "93"

# 8. 获取90-95分的学生（升序）
ZRANGEBYSCORE score:math 90 95 WITHSCORES
# 1) "王五"
# 2) "92"
# 3) "李四"
# 4) "93"
# 5) "张三"
# 6) "95"

# 9. 删除赵六的成绩
ZREM score:math 赵六
# (integer) 1
```

### 五、注意事项
1. `score`支持整数/浮点数，但浮点数运算可能有精度丢失，建议优先用整数（如分数乘以 100 存储）；
2. 范围查询时，`ZRANGE`按**排名**查，`ZRANGEBYSCORE`按**分数**查，需区分使用场景；
3. 超大 ZSet 的集合运算（ZINTER/ZUNION）会阻塞 Redis，生产环境建议异步执行或拆分数据。

### 六、命令速记表
| 命令                | 核心作用                  | 关键特性                  |
|---------------------|---------------------------|---------------------------|
| `ZADD`              | 添加/更新元素及 score      | 自动去重，更新 score 返回 0  |
| `ZREM`              | 删除元素                  | 返回删除数量              |
| `ZSCORE`            | 获取元素 score             | 不存在返回 nil             |
| `ZRANK/ZREVRANK`    | 获取元素排名              | 升序/降序，从 0 开始        |
| `ZCARD`             | 获取元素数量              | O(1)复杂度                |
| `ZCOUNT`            | 统计分数区间元素数量      | 支持开区间`(`             |
| `ZINCRBY`           | 元素 score 自增             | 原子操作，适合积分增减    |
| `ZRANGE/ZREVRANGE`  | 按排名范围查询            | 支持 WITHSCORES 返回分数    |
| `ZRANGEBYSCORE`     | 按分数范围查询            | 支持+inf/-inf 表示无穷     |
| `ZINTER/ZUNION`     | 集合交集/并集             | 需指定参与运算的集合数    |

### 总结
1. Redis ZSet 基于跳表+哈希表实现，核心特性是「有序、唯一、查询高效」，是实现排行榜的最佳选择；
2. 核心命令分三类：基础增删（ZADD/ZREM）、排名/分数查询（ZRANK/ZSCORE）、范围筛选（ZRANGE/ZRANGEBYSCORE）；
3. 所有排序默认升序，降序需加`REV`前缀，`WITHSCORES`参数可返回元素对应的分数，是排行榜场景的常用参数。



# 基础篇-Redis 的 Go 客户端

## 01 goredis 快速入门
`go-redis` 是 Redis 官方推荐的 Go 语言客户端（v9 为最新稳定版），封装了 Redis 所有核心命令，支持上下文（Context）、连接池、集群等特性，是 Go 操作 Redis 的首选库。

### 一、安装
使用 `go get` 命令安装 `go-redis/v9`（需保证 Go 版本 ≥ 1.18）：
```bash
go get github.com/redis/go-redis/v9
```

### 二、连接 Redis
#### 1. 基础连接（单机 Redis）
以下示例展示连接本地 Redis 的最简方式，包含核心配置项说明：
```go
package main

import (
	"context"
	"fmt"
	"github.com/redis/go-redis/v9"
)

func main() {
	// 1. 创建Redis客户端实例
	rdb := redis.NewClient(&redis.Options{
		Addr:     "localhost:6379", // Redis地址（IP:端口）
		Password: "",               // 密码（无则为空）
		DB:       0,                // 使用默认数据库（0-15）
		Protocol: 2,                // Redis协议版本（2/3，默认2）
		// 可选配置（生产环境建议添加）
		PoolSize:     10, // 连接池大小
		MinIdleConns: 5,  // 最小空闲连接数
		ReadTimeout:  1,  // 读超时（秒）
		WriteTimeout: 1,  // 写超时（秒）
	})

	// 2. 测试连接是否正常
	ctx := context.Background()
	_, err := rdb.Ping(ctx).Result()
	if err != nil {
		panic(fmt.Sprintf("Redis连接失败: %v", err))
	}
	fmt.Println("✅ Redis连接成功")
}
```

#### 2. 其他连接场景（补充）
| 场景         | 核心配置调整                     |
|--------------|----------------------------------|
| 带密码连接   | `Password: "your_password"`      |
| 远程 Redis    | `Addr: "192.168.1.100:6379"`     |
| WSL 中的 Redis | `Addr: "WSL的IP:6379"`（如 172.17.0.2:6379） |

### 三、基础操作示例
`go-redis` 提供两种操作方式：**封装方法**（推荐，类型安全）、**原生命令**（灵活，适配所有 Redis 命令）。

#### 1. 封装方法（推荐）
封装方法与 Redis 命令一一对应，返回值已做类型处理，无需手动解析：
```go
func main() {
	// 初始化客户端（省略，同上文）
	rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})
	ctx := context.Background()

	// 1. 设置键值对（过期时间0表示永久）
	err := rdb.Set(ctx, "test_key", "Hello from Windows!", 0).Err()
	if err != nil {
		fmt.Println("❌ 设置键失败:", err)
		return
	}
	fmt.Println("✅ 设置键成功: test_key = Hello from Windows!")

	// 2. 获取键值
	val, err := rdb.Get(ctx, "test_key").Result()
	if err != nil {
		fmt.Println("❌ 获取键失败:", err)
		return
	}
	fmt.Println("✅ 获取键成功:", val) // 输出：Hello from Windows!

	// 3. 设置带过期时间的键（10秒过期）
	err = rdb.Set(ctx, "expire_key", "10秒后过期", 10).Err()
	if err != nil {
		fmt.Println("❌ 设置过期键失败:", err)
		return
	}

	// 4. 删除键
	err = rdb.Del(ctx, "test_key").Err()
	if err != nil {
		fmt.Println("❌ 删除键失败:", err)
		return
	}
	fmt.Println("✅ 删除键成功")
}
```

#### 2. 原生命令（Do 方法）
通过 `rdb.Do()` 执行原生 Redis 命令，适配所有命令（包括封装方法未覆盖的小众命令），需手动解析返回值：
```go
func main() {
	rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})
	ctx := context.Background()

	// 执行原生SET命令：SET test_key "Hello from Windows!" EX 10
	cmd := rdb.Do(ctx, "SET", "test_key", "Hello from Windows!", "EX", 10)
	
	// 解析返回值（Text()适用于字符串结果，Result()返回interface{}）
	val, err := cmd.Text()
	if err != nil {
		fmt.Println("❌ 原生命令创建键失败:", err)
		return
	}
	fmt.Println("✅ 原生命令创建键成功:", val) // 输出：OK

	// 执行原生GET命令
	getCmd := rdb.Do(ctx, "GET", "test_key")
	getVal, err := getCmd.Text()
	if err != nil {
		fmt.Println("❌ 原生命令获取键失败:", err)
		return
	}
	fmt.Println("✅ 原生命令获取键成功:", getVal) // 输出：Hello from Windows!
}
```

### 四、核心 API 说明
| 方法/类型       | 作用                                  | 示例                          |
|-----------------|---------------------------------------|-------------------------------|
| `redis.NewClient` | 创建单机 Redis 客户端                    | `rdb := redis.NewClient(&redis.Options{})` |
| `rdb.Set(ctx, k, v, ttl)` | 设置键值对，ttl 为过期时间（秒）| `rdb.Set(ctx, "name", "张三", 0)` |
| `rdb.Get(ctx, k)` | 获取键值                              | `val, err := rdb.Get(ctx, "name").Result()` |
| `rdb.Del(ctx, k)` | 删除键                                | `rdb.Del(ctx, "name")`        |
| `rdb.Do(ctx, cmd, args...)` | 执行原生命令                          | `rdb.Do(ctx, "HSET", "user:1", "age", 20)` |
| `cmd.Result()`   | 获取原生命令结果（interface{}类型）   | `res, err := cmd.Result()`    |
| `cmd.Text()`     | 获取字符串类型结果（常用）| `str, err := cmd.Text()`      |
| `cmd.Int()`      | 获取整数类型结果（如计数器、长度）| `num, err := cmd.Int()`       |

### 五、错误处理最佳实践
`go-redis` 的错误主要分为两类，建议针对性处理：
```go
// 示例：获取键时的错误处理
val, err := rdb.Get(ctx, "non_exist_key").Result()
switch {
case err == redis.Nil:
	// 键不存在（最常见错误）
	fmt.Println("❌ 键不存在")
case err != nil:
	// 其他错误（如网络异常、Redis宕机）
	fmt.Println("❌ 获取键失败:", err)
default:
	// 成功
	fmt.Println("✅ 键值:", val)
}
```

### 六、注意事项
1. **上下文（Context）**：所有操作都需传入 `ctx`，可用于设置超时、取消操作（如 `ctx, cancel := context.WithTimeout(ctx, 2*time.Second)`）；
2. **连接池**：`go-redis` 自动管理连接池，生产环境建议配置 `PoolSize`（默认 10）、`MinIdleConns` 优化性能；
3. **数据类型转换**：存储复杂结构（如结构体）时，需序列化为 JSON 字符串，读取后反序列化；
4. **并发安全**：`redis.Client` 实例是并发安全的，可在多个 goroutine 中共享。

### 总结
1. `go-redis/v9` 是 Go 操作 Redis 的主流客户端，安装简单，支持单机/集群/哨兵等部署模式；
2. 推荐使用**封装方法**（类型安全、易维护），特殊场景用`Do()`执行原生命令；
3. 核心操作流程：创建客户端 → 测试连接 → 执行命令 → 处理错误（重点区分`redis.Nil`）；
4. 上下文（Context）是必传参数，可用于控制操作超时和取消，生产环境建议合理设置超时时间。

---



## 02 String 类型操作
`go-redis` 对 Redis String 类型的所有核心命令提供了封装方法，接口简洁且类型安全。以下是 String 类型高频操作的完整示例，包含详细注释和最佳实践。

### 一、完整示例代码
```go
package main

import (
	"context"
	"fmt"
	"github.com/redis/go-redis/v9"
)

func main() {
	// 1. 初始化Redis客户端
	rdb := redis.NewClient(&redis.Options{
		Addr:     "localhost:6379", // Redis地址
		Password: "",               // 无密码
		DB:       0,                // 默认数据库
	})
	ctx := context.Background() // 上下文（可设置超时：context.WithTimeout(ctx, 2*time.Second)）

	// 2. 测试连接
	_, err := rdb.Ping(ctx).Result()
	if err != nil {
		panic(fmt.Sprintf("Redis连接失败: %v", err))
	}
	fmt.Println("✅ Redis连接成功")

	// ==================== 核心操作 ====================
	// 1. SET：设置单个键值对（永久有效）
	err = rdb.Set(ctx, "gorediskey", "goredisvalue", 0).Err()
	if err != nil {
		panic(fmt.Sprintf("SET失败: %v", err))
	}
	fmt.Println("✅ SET成功: gorediskey = goredisvalue")

	// 2. GET：获取单个键值
	val, err := rdb.Get(ctx, "gorediskey").Result()
	if err != nil {
		panic(fmt.Sprintf("GET失败: %v", err))
	}
	fmt.Printf("✅ GET成功: gorediskey = %s\n", val)

	// 3. GetSet：先获取旧值，再设置新值（原子操作）
	oldVal, err := rdb.GetSet(ctx, "gorediskey", "goredisnewvalue").Result()
	if err != nil {
		panic(fmt.Sprintf("GetSet失败: %v", err))
	}
	fmt.Printf("✅ GetSet成功: 旧值=%s，新值=goredisnewvalue\n", oldVal)

	// 4. SetNX：仅当键不存在时设置（分布式锁核心）
	// 注意：SetNX返回bool类型，表示是否设置成功
	ok, err := rdb.SetNX(ctx, "gorediskey", "goredisnxvalue", 0).Result()
	if err != nil {
		panic(fmt.Sprintf("SetNX失败: %v", err))
	}
	if ok {
		fmt.Println("✅ SetNX成功: gorediskey = goredisnxvalue")
	} else {
		fmt.Println("❌ SetNX失败: gorediskey已存在，未覆盖")
	}

	// 5. MSet：批量设置多个键值对（原子操作）
	err = rdb.MSet(ctx, "gorediskey", "goredismsvalue", "gorediskey2", "goredismsvalue2").Err()
	if err != nil {
		panic(fmt.Sprintf("MSet失败: %v", err))
	}
	fmt.Println("✅ MSet成功: gorediskey = goredismsvalue, gorediskey2 = goredismsvalue2")

	// 6. MGet：批量获取多个键值
	vals, err := rdb.MGet(ctx, "gorediskey", "gorediskey2").Result()
	if err != nil {
		panic(fmt.Sprintf("MGet失败: %v", err))
	}
	fmt.Println("✅ MGet结果：")
	for i, key := range []string{"gorediskey", "gorediskey2"} {
		fmt.Printf("  %s = %v\n", key, vals[i])
	}

	// 7. Incr/IncrBy：整数自增（需确保键值为整数）
	// 先重置键值为整数1
	err = rdb.Set(ctx, "gorediskey", "1", 0).Err()
	if err != nil {
		panic(fmt.Sprintf("SET整数失败: %v", err))
	}
	// IncrBy：自增100（Incr等价于IncrBy(..., 1)）
	newVal, err := rdb.IncrBy(ctx, "gorediskey", 100).Result()
	if err != nil {
		panic(fmt.Sprintf("IncrBy失败: %v", err))
	}
	fmt.Printf("✅ IncrBy成功: gorediskey = %d\n", newVal) // 输出101

	// 8. Decr/DecrBy：整数自减
	// Decr：自减1
	newVal, err = rdb.Decr(ctx, "gorediskey").Result()
	if err != nil {
		panic(fmt.Sprintf("Decr失败: %v", err))
	}
	fmt.Printf("✅ Decr成功: gorediskey = %d\n", newVal) // 输出100

	// DecrBy：自减100
	newVal, err = rdb.DecrBy(ctx, "gorediskey", 100).Result()
	if err != nil {
		panic(fmt.Sprintf("DecrBy失败: %v", err))
	}
	fmt.Printf("✅ DecrBy成功: gorediskey = %d\n", newVal) // 输出0

	// 9. Expire：设置键的过期时间（秒）
	err = rdb.Expire(ctx, "gorediskey", 10).Err()
	if err != nil {
		panic(fmt.Sprintf("Expire失败: %v", err))
	}
	fmt.Println("✅ Expire成功: gorediskey 过期时间为10秒")

	// 10. TTL：查看剩余过期时间（补充）
	ttl, err := rdb.TTL(ctx, "gorediskey").Result()
	if err != nil {
		panic(fmt.Sprintf("TTL失败: %v", err))
	}
	fmt.Printf("✅ TTL成功: gorediskey 剩余过期时间 = %v\n", ttl)
}
```

### 二、关键知识点解析
#### 1. 核心方法说明
| 方法          | 作用                                  | 返回值/注意事项                          |
|---------------|---------------------------------------|------------------------------------------|
| `Set(ctx, k, v, ttl)` | 设置键值对                            | ttl=0 表示永久，支持`Set(ctx, k, v, 10*time.Second)`设置过期 |
| `Get(ctx, k)` | 获取键值                              | 键不存在返回`redis.Nil`错误              |
| `GetSet(ctx, k, v)` | 先获取旧值，再设置新值                | 返回旧值（原子操作，适合更新场景）|
| `SetNX(ctx, k, v, ttl)` | 仅键不存在时设置                      | 返回 bool：true=设置成功，false=键已存在   |
| `MSet/MGet`   | 批量设置/获取键值                     | MGet 返回[]interface{}，需按需类型转换    |
| `Incr/IncrBy` | 整数自增                              | 键值非整数会报错，返回自增后的值（int64）|
| `Decr/DecrBy` | 整数自减                              | 同上，返回自减后的值（int64）|
| `Expire(ctx, k, ttl)` | 设置过期时间                          | ttl 单位为秒，也可使用`ExpireNX`（仅未设置过期时生效） |
| `TTL(ctx, k)` | 查看剩余过期时间                      | 返回`time.Duration`，-1=永久，-2=键不存在 |

#### 2. 错误处理最佳实践
```go
// 推荐：区分“键不存在”和“其他错误”
val, err := rdb.Get(ctx, "non_exist_key").Result()
switch {
case err == redis.Nil:
	fmt.Println("❌ 键不存在")
case err != nil:
	fmt.Println("❌ GET失败:", err) // 网络异常、Redis宕机等
default:
	fmt.Println("✅ 键值:", val)
}
```

#### 3. 原子操作说明
- `GetSet`、`SetNX`、`Incr/Decr` 均为**原子操作**，无需额外加锁，适合并发场景（如分布式锁、计数器）；
- `MSet/MGet` 是批量原子操作：要么所有键都设置/获取成功，要么都失败。

#### 4. 类型注意事项
- `Incr/Decr` 仅支持整数类型的字符串，若键值为非整数（如"abc"），会返回`ERR value is not an integer or out of range`错误；
- 存储浮点数自增需使用 `IncrByFloat` 方法（补充）：
  ```go
  // 浮点数自增示例
  rdb.Set(ctx, "float_key", "1.5", 0)
  newFloatVal, _ := rdb.IncrByFloat(ctx, "float_key", 0.5).Result()
  fmt.Println(newFloatVal) // 输出2.0
  ```

### 三、输出示例
```plain
✅ Redis连接成功
✅ SET成功: gorediskey = goredisvalue
✅ GET成功: gorediskey = goredisvalue
✅ GetSet成功: 旧值=goredisvalue，新值=goredisnewvalue
❌ SetNX失败: gorediskey已存在，未覆盖
✅ MSet成功: gorediskey = goredismsvalue, gorediskey2 = goredismsvalue2
✅ MGet结果：
  gorediskey = goredismsvalue
  gorediskey2 = goredismsvalue2
✅ IncrBy成功: gorediskey = 101
✅ Decr成功: gorediskey = 100
✅ DecrBy成功: gorediskey = 0
✅ Expire成功: gorediskey 过期时间为10秒
✅ TTL成功: gorediskey 剩余过期时间 = 10s
```

### 总结
1. `go-redis` 对 String 类型的封装完全对齐 Redis 原生命令，方法名和参数直观易记；
2. 核心注意点：`SetNX` 返回 bool 类型（是否设置成功）、`Incr/Decr` 仅支持整数、`Get` 需处理`redis.Nil`（键不存在）；
3. 原子操作（`SetNX`/`Incr`/`GetSet`）是 String 类型的核心优势，适合分布式锁、计数器等并发场景；
4. 过期时间可通过 `Set` 的第三个参数（ttl）直接设置，也可通过 `Expire` 单独设置，推荐前者（减少一次网络请求）。

---



## 03 Hash 类型操作
`go-redis` 对 Redis Hash 类型（散列）的所有核心命令提供了简洁封装，支持单字段/多字段、数值运算、批量操作等场景，是存储结构化数据（如用户信息）的首选方式。以下是完整示例和关键知识点解析。

### 一、完整示例代码
```go
package main

import (
	"context"
	"fmt"
	"github.com/redis/go-redis/v9"
)

func main() {
	// 1. 初始化Redis客户端
	rdb := redis.NewClient(&redis.Options{
		Addr:     "localhost:6379", // Redis地址
		Password: "",               // 无密码
		DB:       0,                // 默认数据库
	})
	ctx := context.Background() // 上下文（可设置超时：context.WithTimeout(ctx, 2*time.Second)）

	// 2. 测试连接
	_, err := rdb.Ping(ctx).Result()
	if err != nil {
		panic(fmt.Sprintf("Redis连接失败: %v", err))
	}
	fmt.Println("✅ Redis连接成功")

	// ==================== Hash核心操作 ====================
	// 1. HSET：设置单个字段值
	err = rdb.HSet(ctx, "user", "name", "张三").Err()
	if err != nil {
		panic(fmt.Sprintf("HSET失败: %v", err))
	}
	fmt.Println("✅ HSET成功: user -> name=张三")

	// 2. HGET：获取单个字段值
	name, err := rdb.HGet(ctx, "user", "name").Result()
	if err != nil {
		panic(fmt.Sprintf("HGET失败: %v", err))
	}
	fmt.Printf("✅ HGET成功: user.name = %s\n", name)

	// 3. HGETALL：获取Hash中所有字段和值（返回map[string]string）
	user, err := rdb.HGetAll(ctx, "user").Result()
	if err != nil {
		panic(fmt.Sprintf("HGETALL失败: %v", err))
	}
	fmt.Printf("✅ HGETALL成功: user = %v\n", user)

	// 4. HINCRBY：字段值整数自增（自动初始化字段为0）
	age, err := rdb.HIncrBy(ctx, "user", "age", 1).Result()
	if err != nil {
		panic(fmt.Sprintf("HINCRBY失败: %v", err))
	}
	fmt.Printf("✅ HINCRBY成功: user.age自增1后 = %d\n", age) // 输出1

	// 5. HKEYS：获取Hash中所有字段名
	keys, err := rdb.HKeys(ctx, "user").Result()
	if err != nil {
		panic(fmt.Sprintf("HKEYS失败: %v", err))
	}
	fmt.Printf("✅ HKEYS成功: user的字段列表 = %v\n", keys) // 输出[name age]

	// 6. HLEN：获取Hash的字段数量
	len, err := rdb.HLen(ctx, "user").Result()
	if err != nil {
		panic(fmt.Sprintf("HLEN失败: %v", err))
	}
	fmt.Printf("✅ HLEN成功: user的字段数量 = %d\n", len) // 输出2

	// 7. HMGET：批量获取多个字段值（返回[]interface{}）
	values, err := rdb.HMGet(ctx, "user", "name", "age").Result()
	if err != nil {
		panic(fmt.Sprintf("HMGET失败: %v", err))
	}
	fmt.Printf("✅ HMGET成功: user[name,age] = %v\n", values) // 输出[张三 1]

	// 8. HMSET：批量设置多个字段值（传入map）
	data := make(map[string]interface{})
	data["name"] = "李四"
	data["age"] = 25
	err = rdb.HMSet(ctx, "user2", data).Err()
	if err != nil {
		panic(fmt.Sprintf("HMSET失败: %v", err))
	}
	fmt.Println("✅ HMSET成功: user2 -> name=李四, age=25")

	// 9. HSETNX：仅当字段不存在时设置（返回bool）
	ok, err := rdb.HSetNX(ctx, "user", "name", "王五").Result()
	if err != nil {
		panic(fmt.Sprintf("HSETNX失败: %v", err))
	}
	if ok {
		fmt.Println("✅ HSETNX成功: user.name设置为王五")
	} else {
		fmt.Println("❌ HSETNX失败: user.name已存在，未覆盖")
	}

	// 10. HDEL：删除Hash中的指定字段
	delCount, err := rdb.HDel(ctx, "user", "age").Result()
	if err != nil {
		panic(fmt.Sprintf("HDEL失败: %v", err))
	}
	fmt.Printf("✅ HDEL成功: 删除user.age，删除字段数 = %d\n", delCount) // 输出1

	// 补充：HVALS - 获取Hash中所有字段值（示例）
	vals, err := rdb.HVals(ctx, "user").Result()
	if err != nil {
		panic(fmt.Sprintf("HVALS失败: %v", err))
	}
	fmt.Printf("✅ HVALS成功: user的字段值列表 = %v\n", vals) // 输出[张三]
}
```

### 二、关键知识点解析
#### 1. 核心方法说明
| 方法            | 作用                                  | 返回值/注意事项                          |
|-----------------|---------------------------------------|------------------------------------------|
| `HSet(ctx, key, field, value)` | 设置单个字段值                        | 支持链式调用，Err()获取错误              |
| `HGet(ctx, key, field)` | 获取单个字段值                        | 字段不存在返回`redis.Nil`                |
| `HGetAll(ctx, key)` | 获取所有字段和值                      | 返回`map[string]string`，空 Hash 返回空 map  |
| `HIncrBy(ctx, key, field, incr)` | 字段值自增                            | 字段不存在时自动初始化为 0，返回自增后的值（int64） |
| `HKeys(ctx, key)` | 获取所有字段名                        | 返回[]string                             |
| `HLen(ctx, key)` | 获取字段数量                          | 返回 int64，O(1)复杂度                    |
| `HMGet(ctx, key, fields...)` | 批量获取字段值                        | 返回[]interface{}，需手动类型转换        |
| `HMSet(ctx, key, data map)` | 批量设置字段值                        | 原子操作，支持任意类型 value（自动转字符串） |
| `HSetNX(ctx, key, field, value)` | 字段不存在时设置                      | 返回 bool：true=成功，false=字段已存在     |
| `HDel(ctx, key, fields...)` | 删除指定字段                          | 返回删除成功的字段数（int64）|
| `HVals(ctx, key)` | 获取所有字段值                        | 返回[]string                             |

#### 2. 错误处理最佳实践
```go
// 区分“字段不存在”和“其他错误”
val, err := rdb.HGet(ctx, "user", "gender").Result()
switch {
case err == redis.Nil:
	fmt.Println("❌ 字段gender不存在")
case err != nil:
	fmt.Println("❌ HGET失败:", err) // 网络异常等
default:
	fmt.Println("✅ 字段值:", val)
}
```

#### 3. 实用技巧
1. **结构化数据存储**：将 Go 结构体序列化为 map 后通过`HMSet`存储，读取后反序列化：
   ```go
   // 示例：User结构体转map存储
   type User struct {
       Name string
       Age  int
   }
   u := User{Name: "张三", Age: 20}
   userMap := map[string]interface{}{
       "name": u.Name,
       "age":  u.Age,
   }
   rdb.HMSet(ctx, "user:1001", userMap)
   ```
2. **避免 HGETALL 阻塞**：若 Hash 字段数量极多（如 1000+），优先用`HSCAN`分批遍历，而非`HGETALL`。
3. **数值字段初始化**：`HIncrBy`无需提前初始化字段，不存在时自动设为 0 后自增，简化代码。

### 三、输出示例
```plain
✅ Redis连接成功
✅ HSET成功: user -> name=张三
✅ HGET成功: user.name = 张三
✅ HGETALL成功: user = map[name:张三]
✅ HINCRBY成功: user.age自增1后 = 1
✅ HKEYS成功: user的字段列表 = [name age]
✅ HLEN成功: user的字段数量 = 2
✅ HMGET成功: user[name,age] = [张三 1]
✅ HMSET成功: user2 -> name=李四, age=25
❌ HSETNX失败: user.name已存在，未覆盖
✅ HDEL成功: 删除user.age，删除字段数 = 1
✅ HVALS成功: user的字段值列表 = [张三]
```

### 总结
1. `go-redis` 对 Hash 类型的封装完全对齐 Redis 原生命令，支持单/多字段、数值运算、条件设置等所有核心场景；
2. 核心优势：可单独操作字段，无需序列化整个对象，适合频繁修改结构化数据的场景（如用户信息、商品详情）；
3. 关键注意点：`HSetNX` 返回 bool（字段是否不存在）、`HIncrBy` 自动初始化字段、`HMGet` 返回[]interface{}需类型转换；
4. 性能建议：大 Hash 避免使用`HGETALL`，优先用`HSCAN`分批读取，减少 Redis 阻塞。



---



## 04 List 类型操作
`go-redis` 对 Redis List 类型（双向链表）的核心命令提供了完整封装，支持头尾增删、范围查询、阻塞弹出等操作，是实现消息队列、栈、最新列表的核心方式。以下是完善后的示例代码和关键知识点解析。

### 一、完整示例代码
```go
package main

import (
	"context"
	"fmt"
	"github.com/redis/go-redis/v9"
)

func main() {
	// 1. 初始化Redis客户端
	rdb := redis.NewClient(&redis.Options{
		Addr:     "localhost:6379", // Redis地址
		Password: "",               // 无密码
		DB:       0,                // 默认数据库
	})
	ctx := context.Background() // 上下文（可设置超时：ctx, _ = context.WithTimeout(ctx, 3*time.Second)）

	// 2. 测试连接
	_, err := rdb.Ping(ctx).Result()
	if err != nil {
		panic(fmt.Sprintf("Redis连接失败: %v", err))
	}
	fmt.Println("✅ Redis连接成功")

	// ==================== List核心操作 ====================
	// 1. LPUSH：将一个/多个值推送到列表左侧（表头），返回新长度
	lpushLen, err := rdb.LPush(ctx, "mylist", "item1", "item2", "item3").Result()
	if err != nil {
		panic(fmt.Sprintf("LPUSH失败: %v", err))
	}
	fmt.Printf("✅ LPUSH成功: 列表新长度 = %d\n", lpushLen) // 输出3

	// 2. LPUSHX：仅当列表存在时，向左侧推送元素（返回新长度）
	lpushxLen, err := rdb.LPushX(ctx, "mylist", "item4", "item5", "item6").Result()
	if err != nil {
		panic(fmt.Sprintf("LPUSHX失败: %v", err))
	}
	fmt.Printf("✅ LPUSHX成功: 列表新长度 = %d\n", lpushxLen) // 输出6

	// 3. RPOP：从列表右侧（表尾）弹出一个元素
	rpopVal, err := rdb.RPop(ctx, "mylist").Result()
	if err != nil {
		if err == redis.Nil {
			fmt.Println("❌ RPOP失败: 列表为空")
		} else {
			panic(fmt.Sprintf("RPOP失败: %v", err))
		}
	} else {
		fmt.Printf("✅ RPOP成功: 弹出元素 = %s\n", rpopVal) // 输出item1（LPUSH后列表是[item6,item5,item4,item3,item2,item1]，RPOP弹出item1）
	}

	// 4. RPUSH：向列表右侧（表尾）推送元素（补充示例）
	rpushLen, err := rdb.RPush(ctx, "mylist", "item7").Result()
	if err != nil {
		panic(fmt.Sprintf("RPUSH失败: %v", err))
	}
	fmt.Printf("✅ RPUSH成功: 列表新长度 = %d\n", rpushLen) // 输出6

	// 5. LPOP：从列表左侧（表头）弹出元素（补充示例）
	lpopVal, err := rdb.LPop(ctx, "mylist").Result()
	if err != nil {
		if err == redis.Nil {
			fmt.Println("❌ LPOP失败: 列表为空")
		} else {
			panic(fmt.Sprintf("LPOP失败: %v", err))
		}
	} else {
		fmt.Printf("✅ LPOP成功: 弹出元素 = %s\n", lpopVal) // 输出item6
	}

	// 6. LLEN：获取列表长度
	len, err := rdb.LLen(ctx, "mylist").Result()
	if err != nil {
		panic(fmt.Sprintf("LLEN失败: %v", err))
	}
	fmt.Printf("✅ LLEN成功: 列表长度 = %d\n", len) // 输出5

	// 7. LRANGE：获取列表指定范围元素（0=-1表示所有）
	items, err := rdb.LRange(ctx, "mylist", 0, -1).Result()
	if err != nil {
		panic(fmt.Sprintf("LRANGE失败: %v", err))
	}
	fmt.Printf("✅ LRANGE成功: 列表所有元素 = %v\n", items) // 输出[item5,item4,item3,item2,item7]

	// 8. LINDEX：获取列表指定索引的元素（索引从0开始，负数表示倒数）
	indexVal, err := rdb.LIndex(ctx, "mylist", 0).Result()
	if err != nil {
		if err == redis.Nil {
			fmt.Println("❌ LINDEX失败: 索引不存在")
		} else {
			panic(fmt.Sprintf("LINDEX失败: %v", err))
		}
	} else {
		fmt.Printf("✅ LINDEX成功: 索引0的元素 = %s\n", indexVal) // 输出item5
	}

	// 9. LREM：删除列表中指定值的元素（count规则：0=删除所有，正数=从左删count个，负数=从右删count个）
	remCount, err := rdb.LRem(ctx, "mylist", 0, "item2").Result()
	if err != nil {
		panic(fmt.Sprintf("LREM失败: %v", err))
	}
	fmt.Printf("✅ LREM成功: 删除item2的数量 = %d\n", remCount) // 输出1

	// 10. LINSERT：在指定元素前/后插入新元素
	insertLen, err := rdb.LInsert(ctx, "mylist", "before", "item3", "item1").Result()
	if err != nil {
		panic(fmt.Sprintf("LINSERT失败: %v", err))
	}
	fmt.Printf("✅ LINSERT成功: 插入后列表长度 = %d\n", insertLen) // 输出5

	// 补充：阻塞弹出（BRPOP/BLPOP）- 消息队列核心
	// brpopVal, err := rdb.BRPop(ctx, 0, "mylist").Result() // 0表示永久阻塞
	// if err != nil {
	// 	panic(fmt.Sprintf("BRPOP失败: %v", err))
	// }
	// fmt.Printf("✅ BRPOP成功: 弹出元素 = %v\n", brpopVal) // 返回[列表名, 元素值]

	// 补充：清空列表（实战常用）
	_, err = rdb.Del(ctx, "mylist").Result()
	if err != nil {
		panic(fmt.Sprintf("Del失败: %v", err))
	}
	fmt.Println("✅ Del成功: 清空mylist列表")
}
```

### 二、关键知识点解析
#### 1. 核心方法说明
| 方法                | 作用                                  | 返回值/注意事项                          |
|---------------------|---------------------------------------|------------------------------------------|
| `LPush(ctx, key, vals...)` | 左侧（表头）插入元素                  | 返回新列表长度（int64）|
| `LPushX(ctx, key, vals...)` | 仅列表存在时左侧插入                  | 返回新长度，列表不存在返回 0              |
| `RPush/RPushX`      | 右侧（表尾）插入/条件插入             | 同 LPush/LPushX，方向相反                 |
| `LPop/RPop`         | 左侧/右侧弹出元素                     | 元素不存在返回`redis.Nil`                |
| `LLen(ctx, key)`    | 获取列表长度                          | O(1)复杂度，空列表返回 0                  |
| `LRange(ctx, key, start, end)` | 范围查询元素                  | `start/end`支持负数（-1=最后一个元素）|
| `LIndex(ctx, key, idx)` | 获取指定索引元素                  | 索引越界返回`redis.Nil`                  |
| `LRem(ctx, key, count, val)` | 删除指定值元素               | count=0 删除所有，正数从左删，负数从右删  |
| `LInsert(ctx, key, op, pivot, val)` | 插入元素              | op="before"/"after"，pivot 为参考元素，返回新长度 |
| `BRPop/BLPop`       | 阻塞式弹出元素                        | 第一个参数为超时时间（秒），0=永久阻塞   |

#### 2. 常见错误处理
```go
// 弹出/查询类操作的标准错误处理
val, err := rdb.RPop(ctx, "empty_list").Result()
switch {
case err == redis.Nil:
	fmt.Println("❌ 列表为空/索引不存在")
case err != nil:
	fmt.Println("❌ 命令执行失败:", err) // 网络异常、Redis宕机等
default:
	fmt.Println("✅ 操作成功:", val)
}
```

#### 3. 实战场景示例
##### （1）模拟栈（先进后出）
```go
// 入栈：LPush
rdb.LPush(ctx, "stack", "a", "b", "c")
// 出栈：LPop
val, _ := rdb.LPop(ctx, "stack").Result() // 弹出c
```

##### （2）模拟普通队列（先进先出）
```go
// 入队：LPush
rdb.LPush(ctx, "queue", "order1", "order2")
// 出队：RPop
val, _ := rdb.RPop(ctx, "queue").Result() // 弹出order1
```

##### （3）模拟阻塞队列（消息消费）
```go
// 消费者（永久阻塞等待）
for {
	res, err := rdb.BRPop(ctx, 0, "block_queue").Result()
	if err != nil {
		fmt.Println("消费失败:", err)
		continue
	}
	// res格式：[队列名, 消息内容]
	fmt.Println("消费消息:", res[1])
}
```

### 三、输出示例
```plain
✅ Redis连接成功
✅ LPUSH成功: 列表新长度 = 3
✅ LPUSHX成功: 列表新长度 = 6
✅ RPOP成功: 弹出元素 = item1
✅ RPUSH成功: 列表新长度 = 6
✅ LPOP成功: 弹出元素 = item6
✅ LLEN成功: 列表长度 = 5
✅ LRANGE成功: 列表所有元素 = [item5 item4 item3 item2 item7]
✅ LINDEX成功: 索引0的元素 = item5
✅ LREM成功: 删除item2的数量 = 1
✅ LINSERT成功: 插入后列表长度 = 5
✅ Del成功: 清空mylist列表
```

### 四、注意事项
1. `LRange` 查询超大列表（如百万级元素）会阻塞 Redis，生产环境需限制返回长度（如`0 99`仅查前 100 个）；
2. 阻塞命令（`BRPop/BLPop`）会占用客户端连接，需合理设置超时时间，避免连接泄漏；
3. `LInsert` 的参考元素（pivot）不存在时，会返回`redis.Nil`错误，需提前校验；
4. List 作为消息队列仅适合简单场景，不支持消息确认、重试，复杂场景建议用专业 MQ（如 RabbitMQ）。

### 总结
1. Redis List 是双向链表结构，`go-redis` 封装的核心操作分为「增删（LPush/RPop）、查询（LLen/LRange）、修改（LRem/LInsert）」三类；
2. 方向是核心：`L` 开头为左侧（表头）操作，`R` 开头为右侧（表尾）操作；
3. 阻塞弹出（`BRPop/BLPop`）是实现阻塞队列的关键，避免轮询消耗资源；
4. 错误处理需区分 `redis.Nil`（列表为空/索引不存在）和其他运行时错误。



---



## 05 Set 类型操作
`go-redis` 对 Redis Set 类型（无序无重复集合）的核心命令提供了完整封装，支持元素增删、成员校验、随机抽取、集合运算等操作，是实现数据去重、共同好友、随机抽奖的核心方式。以下是完善后的示例代码和关键知识点解析。

### 一、完整示例代码
```go
package main

import (
	"context"
	"fmt"
	"github.com/redis/go-redis/v9"
)

func main() {
	// 1. 初始化Redis客户端
	rdb := redis.NewClient(&redis.Options{
		Addr:     "localhost:6379", // Redis地址
		Password: "",               // 无密码
		DB:       0,                // 默认数据库
	})
	ctx := context.Background() // 上下文（可设置超时：ctx, _ = context.WithTimeout(ctx, 3*time.Second)）

	// 2. 测试连接
	_, err := rdb.Ping(ctx).Result()
	if err != nil {
		panic(fmt.Sprintf("Redis连接失败: %v", err))
	}
	fmt.Println("✅ Redis连接成功")

	// ==================== Set核心操作 ====================
	// 1. SADD：向集合添加一个/多个元素（自动去重），返回新增元素数量
	addCount, err := rdb.SAdd(ctx, "myset", "item1", "item2", "item3", "item2").Result()
	if err != nil {
		panic(fmt.Sprintf("SADD失败: %v", err))
	}
	fmt.Printf("✅ SADD成功: 新增元素数量 = %d\n", addCount) // 输出3（item2重复，不计入）

	// 2. SCARD：获取集合的元素数量（长度）
	card, err := rdb.SCard(ctx, "myset").Result()
	if err != nil {
		panic(fmt.Sprintf("SCARD失败: %v", err))
	}
	fmt.Printf("✅ SCARD成功: 集合元素数量 = %d\n", card) // 输出3

	// 3. SIsMember：判断元素是否存在于集合中（返回bool）
	isMember, err := rdb.SIsMember(ctx, "myset", "item1").Result()
	if err != nil {
		panic(fmt.Sprintf("SIsMember失败: %v", err))
	}
	fmt.Printf("✅ SIsMember成功: item1是否在集合中 = %v\n", isMember) // 输出true

	// 4. SREM：删除集合中指定元素，返回删除成功的数量
	remCount, err := rdb.SRem(ctx, "myset", "item1").Result()
	if err != nil {
		panic(fmt.Sprintf("SREM失败: %v", err))
	}
	fmt.Printf("✅ SREM成功: 删除item1的数量 = %d\n", remCount) // 输出1

	// 5. SMEMBERS：获取集合中所有元素（⚠️ 大集合慎用，易阻塞Redis）
	members, err := rdb.SMembers(ctx, "myset").Result()
	if err != nil {
		panic(fmt.Sprintf("SMEMBERS失败: %v", err))
	}
	fmt.Printf("✅ SMEMBERS成功: 集合元素 = %v\n", members) // 输出[item2 item3]

	// 6. SPOP：随机弹出集合中的1个元素
	popItem, err := rdb.SPop(ctx, "myset").Result()
	if err != nil {
		if err == redis.Nil {
			fmt.Println("❌ SPOP失败: 集合为空")
		} else {
			panic(fmt.Sprintf("SPOP失败: %v", err))
		}
	} else {
		fmt.Printf("✅ SPOP成功: 随机弹出元素 = %s\n", popItem) // 随机输出item2或item3
	}

	// 7. SPopN：随机弹出集合中的N个元素（返回切片）
	// 先补充元素，避免集合为空
	rdb.SAdd(ctx, "myset", "item4", "item5", "item6")
	popNItems, err := rdb.SPopN(ctx, "myset", 2).Result()
	if err != nil {
		panic(fmt.Sprintf("SPopN失败: %v", err))
	}
	fmt.Printf("✅ SPopN成功: 随机弹出2个元素 = %v\n", popNItems) // 如[item4 item5]

	// 补充：SRANDMEMBER - 随机获取N个元素（不弹出，仅查询）
	randomItems, err := rdb.SRandMemberN(ctx, "myset", 1).Result()
	if err != nil {
		panic(fmt.Sprintf("SRandMemberN失败: %v", err))
	}
	fmt.Printf("✅ SRandMemberN成功: 随机获取1个元素（不弹出） = %v\n", randomItems)

	// 补充：集合运算（交集/并集/差集）- 核心场景
	// 初始化两个测试集合
	rdb.SAdd(ctx, "set1", "a", "b", "c")
	rdb.SAdd(ctx, "set2", "b", "c", "d")
	// 交集（同时存在于set1和set2的元素）
	inter, err := rdb.SInter(ctx, "set1", "set2").Result()
	if err != nil {
		panic(fmt.Sprintf("SInter失败: %v", err))
	}
	fmt.Printf("✅ SInter成功: set1和set2的交集 = %v\n", inter) // 输出[b c]

	// 并集（set1和set2的所有元素，去重）
	union, err := rdb.SUnion(ctx, "set1", "set2").Result()
	if err != nil {
		panic(fmt.Sprintf("SUnion失败: %v", err))
	}
	fmt.Printf("✅ SUnion成功: set1和set2的并集 = %v\n", union) // 输出[a b c d]

	// 差集（存在于set1但不存在于set2的元素）
	diff, err := rdb.SDiff(ctx, "set1", "set2").Result()
	if err != nil {
		panic(fmt.Sprintf("SDiff失败: %v", err))
	}
	fmt.Printf("✅ SDiff成功: set1相对set2的差集 = %v\n", diff) // 输出[a]

	// 清空测试集合（实战常用）
	rdb.Del(ctx, "myset", "set1", "set2")
	fmt.Println("✅ Del成功: 清空所有测试集合")
}
```

### 二、关键知识点解析
#### 1. 核心方法说明
| 方法                  | 作用                                  | 返回值/注意事项                          |
|-----------------------|---------------------------------------|------------------------------------------|
| `SAdd(ctx, key, vals...)` | 添加元素到集合                        | 返回新增元素数量（int64），重复元素不计入 |
| `SCard(ctx, key)`     | 获取集合元素数量                      | O(1)复杂度，空集合返回 0                  |
| `SIsMember(ctx, key, val)` | 判断元素是否在集合中              | 返回 bool，O(1)复杂度（核心去重校验）|
| `SRem(ctx, key, vals...)` | 删除集合中指定元素                  | 返回删除成功的数量（int64）|
| `SMembers(ctx, key)`  | 获取集合所有元素                      | 返回[]string，大集合（10 万+）慎用，易阻塞 |
| `SPop(ctx, key)`      | 随机弹出 1 个元素                       | 集合为空返回`redis.Nil`                  |
| `SPopN(ctx, key, n)`  | 随机弹出 n 个元素                       | 返回[]string，n 超过集合长度则返回所有元素 |
| `SRandMemberN(ctx, key, n)` | 随机获取 n 个元素（不弹出）        | 非破坏性查询，适合随机推荐/抽奖          |
| `SInter/SUnion/SDiff` | 集合交集/并集/差集                    | 支持多个集合运算，返回[]string           |

#### 2. 错误处理最佳实践
```go
// 弹出/查询类操作的标准错误处理
val, err := rdb.SPop(ctx, "empty_set").Result()
switch {
case err == redis.Nil:
	fmt.Println("❌ 操作失败: 集合为空")
case err != nil:
	fmt.Println("❌ 命令执行失败:", err) // 网络异常、Redis宕机等
default:
	fmt.Println("✅ 操作成功:", val)
}
```

#### 3. 实战场景示例
##### （1）用户点赞去重
```go
// 点赞（添加元素，自动去重）
rdb.SAdd(ctx, "user:1001:likes", "post:2001")
// 取消点赞（删除元素）
rdb.SRem(ctx, "user:1001:likes", "post:2001")
// 校验是否点赞
isLike, _ := rdb.SIsMember(ctx, "user:1001:likes", "post:2001").Result()
```

##### （2）随机抽奖
```go
// 初始化抽奖名单
rdb.SAdd(ctx, "lottery", "user1", "user2", "user3", "user4", "user5")
// 抽取1名一等奖
firstPrize, _ := rdb.SPop(ctx, "lottery").Result()
// 抽取2名二等奖（不弹出，可重复抽）
secondPrize, _ := rdb.SRandMemberN(ctx, "lottery", 2).Result()
fmt.Printf("一等奖: %s，二等奖: %v\n", firstPrize, secondPrize)
```

##### （3）共同好友查询
```go
// 初始化两个用户的好友集合
rdb.SAdd(ctx, "user:1001:friends", "1002", "1003", "1004")
rdb.SAdd(ctx, "user:1002:friends", "1001", "1003", "1005")
// 查询共同好友
commonFriends, _ := rdb.SInter(ctx, "user:1001:friends", "user:1002:friends").Result()
fmt.Println("共同好友:", commonFriends) // 输出[1003]
```

### 三、输出示例
```plain
✅ Redis连接成功
✅ SADD成功: 新增元素数量 = 3
✅ SCARD成功: 集合元素数量 = 3
✅ SIsMember成功: item1是否在集合中 = true
✅ SREM成功: 删除item1的数量 = 1
✅ SMEMBERS成功: 集合元素 = [item2 item3]
✅ SPOP成功: 随机弹出元素 = item2
✅ SPopN成功: 随机弹出2个元素 = [item6 item4]
✅ SRandMemberN成功: 随机获取1个元素（不弹出） = [item5]
✅ SInter成功: set1和set2的交集 = [b c]
✅ SUnion成功: set1和set2的并集 = [a b c d]
✅ SDiff成功: set1相对set2的差集 = [a]
✅ Del成功: 清空所有测试集合
```

### 四、注意事项
1. `SMembers` 命令在元素过多时会阻塞 Redis，生产环境优先用 `SScan` 分批遍历（替代方案）：
   ```go
   // SScan分批遍历集合（避免阻塞）
   var cursor uint64
   var allMembers []string
   for {
       var members []string
       cursor, members, err = rdb.SScan(ctx, "myset", cursor, "", 10).Result()
       if err != nil {
           panic(err)
       }
       allMembers = append(allMembers, members...)
       if cursor == 0 {
           break
       }
   }
   fmt.Println("分批遍历结果:", allMembers)
   ```
2. `SPop/SPopN` 是破坏性操作（弹出元素），`SRandMemberN` 是非破坏性操作（仅查询），根据场景选择；
3. 集合运算（`SInter/SUnion/SDiff`）的性能与集合大小正相关，超大集合运算需异步执行。

### 总结
1. Redis Set 是无序无重复集合，`go-redis` 封装的核心操作分为「增删（SAdd/SRem）、校验（SIsMember）、查询（SCard/SMembers）、随机操作（SPop/SRandMemberN）、集合运算（SInter）」五类；
2. 核心优势：元素自动去重、成员校验 O(1)复杂度、原生支持集合运算，适合去重、抽奖、共同好友等场景；
3. 性能注意：大集合避免使用`SMembers`，优先用`SScan`分批遍历；
4. 错误处理需区分 `redis.Nil`（集合为空）和其他运行时错误。

---

## 06 SortedSet (ZSet) 类型操作
`go-redis` 对 Redis **SortedSet（有序集合）** 提供完整封装，它是**可排序、无重复、带分数**的集合类型，结合了 Set 的去重特性 + 有序排序特性，是实现**排行榜、热度排序、延时队列、范围筛选**的核心数据结构。

SortedSet 核心特点：
1. 每个元素绑定一个**分数（Score）**，Redis 根据分数自动排序
2. 元素唯一，分数可重复
3. 支持正序/倒序查询、范围查询、分数增减、排名查询
4. 时间复杂度低，高性能排序场景首选



### 一、完整示例代码
```go
package main

import (
	"context"
	"fmt"
	"github.com/redis/go-redis/v9"
)

func main() {
	// 1. 初始化Redis客户端
	rdb := redis.NewClient(&redis.Options{
		Addr:     "localhost:6379", // Redis地址
		Password: "",               // 无密码
		DB:       0,                // 默认数据库
	})
	ctx := context.Background() // 上下文（可设置超时）

	// 2. 测试连接
	_, err := rdb.Ping(ctx).Result()
	if err != nil {
		panic(fmt.Sprintf("Redis连接失败: %v", err))
	}
	fmt.Println("✅ Redis连接成功")

	// ==================== SortedSet 核心操作 ====================
	// 1. ZADD：向有序集合添加元素（指定分数+成员，自动去重+排序）
	err = rdb.ZAdd(ctx, "rank:user",
		redis.Z{Score: 90, Member: "user01"},
		redis.Z{Score: 85, Member: "user02"},
		redis.Z{Score: 95, Member: "user03"},
		redis.Z{Score: 90, Member: "user04"}, // 分数可重复
	).Err()
	if err != nil {
		panic(fmt.Sprintf("ZADD失败: %v", err))
	}
	fmt.Println("✅ ZADD成功：添加用户分数")

	// 2. ZCARD：获取有序集合元素总数
	card, err := rdb.ZCard(ctx, "rank:user").Result()
	if err != nil {
		panic(fmt.Sprintf("ZCARD失败: %v", err))
	}
	fmt.Printf("✅ ZCARD成功：集合总元素数 = %d\n", card)

	// 3. ZCOUNT：统计指定分数区间内的元素数量
	count, err := rdb.ZCount(ctx, "rank:user", "90", "100").Result()
	if err != nil {
		panic(fmt.Sprintf("ZCOUNT失败: %v", err))
	}
	fmt.Printf("✅ ZCOUNT成功：90-100分的用户数 = %d\n", count)

	// 4. ZINCRBY：给指定元素增加/减少分数（加分/减分）
	newScore, err := rdb.ZIncrBy(ctx, "rank:user", 5, "user01").Result()
	if err != nil {
		panic(fmt.Sprintf("ZINCRBY失败: %v", err))
	}
	fmt.Printf("✅ ZINCRBY成功：user01加分后分数 = %.0f\n", newScore)

	// 5. ZRANGE：正序获取元素（分数从低到高）0~-1代表全部
	ascMembers, err := rdb.ZRange(ctx, "rank:user", 0, -1).Result()
	if err != nil {
		panic(fmt.Sprintf("ZRANGE失败: %v", err))
	}
	fmt.Printf("✅ ZRANGE成功：正序(低→高) = %v\n", ascMembers)

	// 6. ZRANGE 带分数（新版推荐，替代旧方法）
	withScore, err := rdb.ZRangeWithScores(ctx, "rank:user", 0, -1).Result()
	if err != nil {
		panic(fmt.Sprintf("ZRANGEWithScores失败: %v", err))
	}
	fmt.Println("✅ ZRANGEWithScores成功：正序+分数")
	for _, z := range withScore {
		fmt.Printf("  用户：%s，分数：%.0f\n", z.Member, z.Score)
	}

	// 7. ZRangeArgs：全能查询（支持倒序、按分数范围、分页等，官方推荐）
	// 倒序查询（高→低，排行榜常用）
	descMembers, err := rdb.ZRangeArgs(ctx, redis.ZRangeArgs{
		Key:     "rank:user",
		Start:   0,
		Stop:    -1,
		ByScore: false, // 按索引排序
		Rev:     true,  // 倒序
	}).Result()
	if err != nil {
		panic(fmt.Sprintf("ZRangeArgs失败: %v", err))
	}
	fmt.Printf("✅ ZRangeArgs成功：倒序(高→低) = %v\n", descMembers)

	// 8. ZRANK：获取元素正序排名（从0开始，分数越低排名越靠前）
	rank, err := rdb.ZRank(ctx, "rank:user", "user03").Result()
	if err != nil {
		panic(fmt.Sprintf("ZRANK失败: %v", err))
	}
	fmt.Printf("✅ ZRANK成功：user03正序排名 = %d\n", rank)

	// 9. ZREVRANK：获取元素倒序排名（排行榜第一名=0）
	revRank, err := rdb.ZRevRank(ctx, "rank:user", "user03").Result()
	if err != nil {
		panic(fmt.Sprintf("ZREVRANK失败: %v", err))
	}
	fmt.Printf("✅ ZREVRANK成功：user03倒序排名(排行榜) = %d\n", revRank)

	// 10. ZSCORE：查询指定元素的分数
	score, err := rdb.ZScore(ctx, "rank:user", "user01").Result()
	if err != nil {
		panic(fmt.Sprintf("ZSCORE失败: %v", err))
	}
	fmt.Printf("✅ ZSCORE成功：user01当前分数 = %.0f\n", score)

	// 11. ZREM：删除指定元素
	remCount, err := rdb.ZRem(ctx, "rank:user", "user02").Result()
	if err != nil {
		panic(fmt.Sprintf("ZREM失败: %v", err))
	}
	fmt.Printf("✅ ZREM成功：删除元素数量 = %d\n", remCount)

	// 12. ZREMRANGEBYRANK：按排名范围删除
	delRankCount, err := rdb.ZRemRangeByRank(ctx, "rank:user", 0, 0).Result()
	if err != nil {
		panic(fmt.Sprintf("ZREMRANGEBYRANK失败: %v", err))
	}
	fmt.Printf("✅ ZREMRANGEBYRANK成功：按排名删除数量 = %d\n", delRankCount)

	// 13. ZREMRANGEBYSCORE：按分数范围删除
	delScoreCount, err := rdb.ZRemRangeByScore(ctx, "rank:user", "0", "80").Result()
	if err != nil {
		panic(fmt.Sprintf("ZREMRANGEBYSCORE失败: %v", err))
	}
	fmt.Printf("✅ ZREMRANGEBYSCORE成功：按分数删除数量 = %d\n", delScoreCount)

	// 清空测试数据
	rdb.Del(ctx, "rank:user")
	fmt.Println("✅ 清空测试集合成功")
}
```



### 二、关键知识点解析
#### 1. 核心方法说明
| 方法                          | 作用                                       | 核心说明                                  |
|-------------------------------|--------------------------------------------|-------------------------------------------|
| `ZAdd`                        | 添加带分数的元素                           | 自动去重，按分数排序                      |
| `ZCard`                       | 获取元素总数                               | O(1) 复杂度                               |
| `ZCount`                      | 统计指定分数区间的元素数量                 | 分数参数为字符串                          |
| `ZIncrBy`                     | 增减元素分数                               | 支持负数减分，返回最新分数                |
| `ZRange`                      | 正序获取元素（低→高）| 0~-1 查全部                               |
| `ZRangeWithScores`            | 正序获取元素+分数                          | 排行榜展示必备                            |
| `ZRangeArgs`                  | 全能查询（倒序/分数范围/分页）| Redis 6.2+ 推荐，替代所有旧范围命令       |
| `ZRank/ZRevRank`              | 查询正序/倒序排名                          | 排名从 0 开始                             |
| `ZScore`                      | 查询元素分数                               | 不存在返回 `redis.Nil`                    |
| `ZRem`                        | 删除指定元素                               | 返回删除数量                              |
| `ZRemRangeByRank`             | 按排名范围删除                             | 清理垫底数据                              |
| `ZRemRangeByScore`            | 按分数范围删除                             | 清理低分/过期数据                         |

#### 2. 重要说明
1. **排名规则**
   - `ZRank`：**分数从小到大**排名，第一名（最低分）= 0
   - `ZRevRank`：**分数从大到小**排名，排行榜第一名 = 0
2. **废弃命令**
   - `ZRevRange` / `ZRangeByScore` 已弃用
   - 统一使用 **`ZRangeArgs`** 实现所有排序/范围需求
3. **错误处理**
   - 查询不存在的元素会返回 `redis.Nil`，必须做判断



### 三、实战场景示例
#### （1）游戏/积分排行榜（最常用场景）
```go
ctx := context.Background()
key := "game:rank"

// 1. 上传分数
rdb.ZAdd(ctx, key, redis.Z{Score: 1200, Member: "player_1001"})

// 2. 加分（连胜奖励）
rdb.ZIncrBy(ctx, key, 100, "player_1001")

// 3. 获取前10名排行榜（倒序）
top10, _ := rdb.ZRevRangeWithScores(ctx, key, 0, 9).Result()
fmt.Println("🏆 排行榜前10：")
for i, item := range top10 {
    fmt.Printf("第%d名：%s 分数：%.0f\n", i+1, item.Member, item.Score)
}

// 4. 查询个人排名
	rank, _ := rdb.ZRevRank(ctx, key, "player_1001").Result()
	fmt.Printf("你的排名：%d\n", rank+1)
```

#### （2）延时任务队列
利用分数=时间戳，按时间自动排序，实现延时执行：
```go
// 添加延时任务（5秒后执行）
delayTime := time.Now().Unix() + 5
rdb.ZAdd(ctx, "delay:task", redis.Z{Score: float64(delayTime), Member: "task_001"})

// 轮询查询到期任务
now := time.Now().Unix()
tasks, _ := rdb.ZRangeByScore(ctx, "delay:task", redis.ZRangeBy{
    Min: "0",
    Max: fmt.Sprintf("%d", now),
}).Result()
```

#### （3）按分数筛选数据
```go
// 筛选 80~100 分的用户
users, _ := rdb.ZRangeByScore(ctx, "score:user", redis.ZRangeBy{
    Min: "80",
    Max: "100",
}).Result()
```


### 四、输出示例
```plain
✅ Redis连接成功
✅ ZADD成功：添加用户分数
✅ ZCARD成功：集合总元素数 = 4
✅ ZCOUNT成功：90-100分的用户数 = 3
✅ ZINCRBY成功：user01加分后分数 = 95
✅ ZRANGE成功：正序(低→高) = [user02 user04 user01 user03]
✅ ZRANGEWithScores成功：正序+分数
  用户：user02，分数：85
  用户：user04，分数：90
  用户：user01，分数：95
  用户：user03，分数：95
✅ ZRangeArgs成功：倒序(高→低) = [user01 user03 user04 user02]
✅ ZRANK成功：user03正序排名 = 3
✅ ZREVRANK成功：user03倒序排名(排行榜) = 1
✅ ZSCORE成功：user01当前分数 = 95
✅ ZREM成功：删除元素数量 = 1
✅ ZREMRANGEBYRANK成功：按排名删除数量 = 1
✅ ZREMRANGEBYSCORE成功：按分数删除数量 = 0
✅ 清空测试集合成功
```



### 五、注意事项
1. **大数据量性能**
   - `ZRange` / `ZRevRange` 性能极高，适合分页查询
   - 避免一次性查询全量超大集合，搭配 `Limit` 使用
2. **分数类型**
   - 支持整数/浮点数，内部以浮点数存储
3. **成员唯一性**
   - 同 Key 下成员唯一，重复添加会**覆盖分数**
4. **排名展示**
   - Redis 排名从 0 开始，前端展示需 +1



### 总结
1. **SortedSet = 有序 + 无重复 + 带分数**，是 Redis 最实用的数据结构之一
2. 核心操作：**增(ZAdd)、删(ZRem)、查(ZRange/ZRank)、改(ZIncrBy)、统计(ZCount)**
3. 最佳实战场景：**排行榜、延时队列、热度排序、范围筛选**
4. 新版统一使用 `ZRangeArgs` 实现复杂排序/查询，代码更规范
5. 错误处理必须判断 `redis.Nil`（元素不存在）



---



## 07 Redis 发布订阅
Redis 发布订阅是**消息传输/消息通知**的核心机制，由三个核心角色组成：
- **发布者**：Redis 客户端，负责发送消息
- **订阅者**：Redis 客户端，负责接收消息
- **Channel（频道）**：Redis 服务端，消息的中转通道

**工作流程**：发布者向指定频道发送消息 → 所有订阅了该频道的订阅者**实时接收**消息。



### 1. Subscribe 普通订阅
**作用**：订阅**固定名称**的频道，精准接收该频道的消息。

提供两种接收消息方式：
1. 遍历 Go Channel（推荐）
2. 循环接收消息

```go
// 1. 订阅固定频道：channel1
sub := rdb.Subscribe(ctx, "channel1")

// 方式一：遍历 Go Channel 接收消息（简洁常用）
for msg := range sub.Channel() {
	fmt.Println("频道名：", msg.Channel)  // 消息所属频道
	fmt.Println("消息内容：", msg.Payload) // 消息正文
}

// 方式二：循环接收消息（可处理错误）
for {
	msg, err := sub.ReceiveMessage(ctx)
	if err != nil {
		panic(err) // 接收失败处理
	}
	fmt.Println(msg.Channel, msg.Payload)
}
```



### 2. Publish 发布消息
**作用**：向**指定频道**发送消息，所有订阅者都会收到。

```go
// 参数：上下文、目标频道、消息内容
rdb.Publish(ctx, "channel1", "这是一条测试消息")
```



### 3. PSubscribe 模式订阅
**作用**：支持**通配符模式匹配**订阅，一次性订阅多个符合规则的频道。
- 区别：`Subscribe` 订阅固定频道，`PSubscribe` 支持模糊匹配

```go
// 订阅所有以 ch_user_ 开头的频道（如 ch_user_1、ch_user_2 都能收到消息）
sub := rdb.PSubscribe(ctx, "ch_user_*")

// 接收消息方式和 Subscribe 完全一致
for msg := range sub.Channel() {
	fmt.Println(msg.Channel, msg.Payload)
}
```



### 4. Unsubscribe 取消订阅
**作用**：主动取消对指定频道的订阅，不再接收该频道消息。

```go
// 先订阅频道
sub := rdb.Subscribe(ctx, "channel1")

// 取消订阅 channel1
sub.Unsubscribe(ctx, "channel1")
```



### 5. PubSubNumSub 查询订阅者数量
**作用**：查看**指定频道**当前有多少个订阅者。

```go
// 查询 channel_1 的订阅者数量
result, err := rdb.PubSubNumSub(ctx, "channel_1").Result()
if err != nil {
	panic(err)
}

// 遍历结果：key=频道名，value=订阅者数量
for channel, count := range result {
	fmt.Println("频道：", channel)
	fmt.Println("订阅者数量：", count)
}
```



### 核心总结
1. **Subscribe**：订阅**固定名称**频道
2. **Publish**：向频道**发送消息**
3. **PSubscribe**：**模式匹配**订阅（通配符*）
4. **Unsubscribe**：**取消订阅**
5. **PubSubNumSub**：查询频道**订阅者数量**

---

## 08 事务处理
Redis 事务是**将多个命令打包、一次性顺序执行**的机制，解决多命令执行的原子性、隔离性问题，核心是**命令批量执行 + 防并发干扰**。

### 核心特性
Redis 事务有两个核心保证，同时有特殊机制需要注意：
1. **隔离性**
   事务内的命令会**序列化、按顺序执行**，执行过程中不会被其他客户端的命令打断，完全独占执行权。
   ✘ 注意：Redis 事务**不支持回滚**，若事务中某条命令执行失败（如语法错误），后续命令仍会正常执行，不会停止。
2. **原子性**
   事务中的命令**要么全部入队等待执行，要么全部不执行**（入队阶段报错则直接放弃整个事务）。



### 1. TxPipeline 事务流水线（批量原子操作）
#### 核心概念
- **Pipeline**：流水线，把多个命令打包一次性发送给 Redis，**减少多次网络请求的开销**。
- **TxPipeline**：带事务的流水线，**自动包裹 `MULTI`（开启事务）和 `EXEC`（执行事务）**，保证打包的命令**原子执行**。

#### 适用场景
不需要依赖旧值计算新值，单纯批量执行命令：批量设置缓存、批量过期、简单计数增减。

#### 执行逻辑
1. 开启 TxPipeline，命令先存在**本地队列**，不发送给 Redis；
2. 批量添加要执行的命令；
3. 调用 `Exec()` 一次性发送所有命令，Redis 原子执行。

```go
// 1. 开启事务流水线
pipe := rdb.TxPipeline()

// 2. 命令入队（本地缓存，未执行）
// 计数器+1
incrCmd := pipe.Incr(ctx, "tx_pipeline_counter")
// 设置1小时过期
pipe.Expire(ctx, "tx_pipeline_counter", time.Hour)

// 3. 执行事务（发送MULTI+所有命令+EXEC）
_, err := pipe.Exec(ctx)
if err != nil {
    panic(err)
}

// 4. 获取执行结果（必须在Exec之后调用）
fmt.Println("当前计数值:", incrCmd.Val())
```

#### 关键点
- 调用 `Exec()` 前，命令只在本地，不会发给 Redis；
- 命令结果必须在 `Exec()` 执行成功后才能获取。



### 2. Watch 监听（乐观锁核心机制）
#### 前置概念
1. **乐观锁**
   假设并发冲突很少发生，不加锁，仅在**最终更新时**检查数据是否被修改：
   - 若没被改 → 执行更新
   - 若被改 → 放弃执行，重新尝试
   对比：悲观锁（全程加锁阻塞），乐观锁**无阻塞、高性能**。

2. **Watch 作用**
   监控一个/多个 Key，**事务执行前**如果被监控的 Key 被其他客户端修改，整个事务直接拒绝执行。

3. **回调函数**
   传给 `Watch` 的业务逻辑函数，Redis 框架会自动管理：
   - 监控 Key
   - 执行业务逻辑
   - 冲突时**自动重试回调函数**

#### 适用场景
需要**先查旧值 → 计算新值 → 再更新**的场景：秒杀库存扣减、抢红包、余额变更、版本控制。

#### 完整执行流程
1. 开启 Watch，监听指定 Key；
2. 在回调中**读取最新值**；
3. 本地执行业务计算（如库存 -1）；
4. 打包更新命令，尝试提交事务；
5. 校验：监控的 Key 没变化 → 执行成功；Key 被修改 → 事务失败，自动重新执行回调。

```go
ctx := context.Background()

// 回调函数：封装事务业务逻辑
fn := func(tx *redis.Tx) error {
    // 1. 读取最新值（事务上下文内查询）
    currentNum, err := tx.Get(ctx, "stock").Int()
    // 非空值异常直接返回
    if err != nil && err != redis.Nil {
        return err
    }

    // 2. 业务逻辑：库存扣减（依赖旧值计算新值）
    if currentNum <= 0 {
        return fmt.Errorf("库存不足")
    }
    newNum := currentNum - 1

    // 3. 事务内批量执行更新
    _, err = tx.Pipelined(ctx, func(pipe redis.Pipeliner) error {
        pipe.Set(ctx, "stock", newNum, 0)
        return nil
    })
    return err
}

// 4. 启动Watch：监听 stock key，自动执行/重试回调
err := rdb.Watch(ctx, fn, "stock") 
if err != nil {
    fmt.Println("事务执行失败：", err)
}
```



### 总结对比
| 方式 | 核心机制 | 特点 | 适用场景 |
| :--- | :--- | :--- | :--- |
| **TxPipeline** | `MULTI`+`EXEC` 批量执行 | 命令本地打包，无锁，不依赖旧值 | 批量写入、简单计数、批量设置缓存 |
| **Watch + 事务** | `WATCH` + 乐观锁 + 自动重试 | 监控 Key 变化，检查再更新，解决并发冲突 | 库存扣减、余额变更、抢单、CAS 操作 |

### 核心关键词说明
1. **Pipeline**：命令打包发送，降低网络开销；
2. **回调函数**：Watch 的业务载体，冲突自动重试；
3. **Watch**：监控 Key，防止事务执行中数据被篡改；
4. **乐观锁**：无阻塞并发控制，Watch 是 Redis 乐观锁的实现方式。
