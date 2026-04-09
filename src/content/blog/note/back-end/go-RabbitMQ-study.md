---
title: RabbitMQ入门
link: go-RabbitMQ-study
catalog: true
date: 2026-03-16 12:00:00
description: 基于 Go 生态的 RabbitMQ 入门学习笔记
tags:
  - Go
  - Rabbit
  - 后端
  - 消息队列

categories:
  - [笔记, 后端]
---



# 01_初识 RabbitMQ

## 1.1 为什么需要 RabbitMQ

### 同步调用



什么是同步调用？



同步调用是一种线性执行模式。当你调用一个函数后，程序会暂停在当前位置，直到这个函数执行完毕并返回结果后，才会继续执行下一行代码。这就像你在餐厅点餐后，站在柜台前一直等到厨师做好餐品拿到手后才离开。



同步调用的缺点：



1.   拓展性差  ：拓展服务需要更改通知代码
2.   性能下降  ：串行执行，效果慢
3.   级联失败  ：前面服务失败，后面服务也失败



使用场景：

&#x20;下一步操作需要上一步操作的结果才使用同步调用，否则可优化为异步调用。

### 异步调用



什么是异步调用？



异步调用是一种非阻塞的执行模式。发出调用后，程序不会傻等，而是立即继续执行后续代码。被调用的函数（或任务）会在后台执行，当它完成时，会通过一种通知机制来告知调用方结果已就绪。这就像你在餐厅点餐后，拿到一个取餐号，然后可以回座位玩手机，当餐准备好时，服务员会叫号通知你取餐。



异步调用的三个角色：



1.   消息发送者  ：消息生产者
2.   消息代理  ：管理、暂存、转发消息
3.   消息接收者  ：消息消费者



异步调用的优点：



1.   解除耦合  ：拓展性强
2.   无需等待  ：性能好
3.   故障隔离  ：服务之间相互独立
4.   缓存消息  ：流量削峰填谷



异步调用的缺点：



1.   时效性差  ：消息处理存在延迟
2.   无法确认  ：下游服务对消息的处理情况
3.   依赖 Broker  ：业务安全依赖于消息队列的可靠性

### 同步与异步对比

| 特性维度      | 同步调用             | 异步调用                |
| --------- | ---------------- | ------------------- |
|   核心机制    | 调用后必须等待返回结果才继续执行 | 调用后无需等待，可立即执行后续操作   |
|   执行时序    | 强时序性，顺序执行，上下文一致  | 非线性，完成顺序不确定         |
|   线程状态    | 调用线程可能被阻塞（挂起）    | 调用线程非阻塞，可自由执行其他任务   |
|   结果获取    | 直接通过函数返回值获取      | 通过回调函数、事件通知等方式获取    |
|   资源利用率   | 较低，等待期间线程资源可能闲置  | 较高，线程资源可被充分利用       |
|   代码复杂度   | 逻辑简单直观，易于理解和调试   | 相对复杂，需要处理回调、线程安全等问题 |
|   典型应用    | 简单的顺序任务、短时间操作    | 高并发服务、I/O 密集型任务      |

### MQ 技术选型

MQ（MessageQueue），中文是消息队列，字面来看就是存放消息的队列，也就是异步调用中的 Broker。



主流消息队列对比：



| 特性维度     | Kafka      | RabbitMQ          | RocketMQ  | ActiveMQ        |
| -------- | ---------- | ----------------- | --------- | --------------- |
|   核心协议   | 自定义协议      | AMQP, MQTT, STOMP | 自研协议      | JMS, AMQP, MQTT |
|   吞吐量    | 极高（百万级 TPS） | 中等（万级 TPS）         | 高（十万级 TPS） | 低（万级 TPS）        |
|   延迟     | 较高（毫秒-秒级）  | 极低（毫秒级）           | 低（毫秒级）    | 毫秒级             |
|   可靠性    | 高（多副本机制）   | 高（ACK 机制）          | 极高（金融级）   | 中（依赖配置）         |
|   事务消息   | 不支持        | 插件支持              | 原生支持      | 支持              |
|   顺序消息   | 分区内有序      | 单队列有序             | 分区内严格有序   | 单队列有序           |
|   扩展性    | 水平扩展极佳     | 集群扩展复杂            | 水平扩展良好    | 垂直扩展为主          |
|   学习成本   | 高          | 中（文档详细，社区支持全面）    | 中         | 低               |



选型建议：



1.   业务系统  ：优先选择 RabbitMQ，功能丰富、可靠性高
2.   大数据场景  ：选择 Kafka，吞吐量高、扩展性好
3.   金融场景  ：选择 RocketMQ，支持事务消息
4.   传统企业  ：可以选择 ActiveMQ，简单易用

## 1.2 RabbitMQ 介绍

### RabbitMQ 简介



什么是 RabbitMQ？



RabbitMQ 是基于 Erlang 语言开发的开源消息通信中间件，官网地址：<https://www.rabbitmq.com/>



核心概念：



| 概念              | 说明          |
| --------------- | ----------- |
|   publisher     | 消息发送者       |
|   consumer      | 消息消费者       |
|   queue         | 队列，存储消息     |
|   exchange      | 交换机，负责消息的路由 |
|   binding       | 交换机绑定队列     |
|   routing key   | 路由条件        |



使用场景：



1.   异步处理  ：发送邮件、短信通知、图片处理、视频转码、报表生成
2.   应用解耦  ：订单系统与库存系统解耦、支付系统与通知系统解耦
3.   流量削峰  ：秒杀活动、限时抢购
4.   日志处理  ：应用日志收集、用户行为追踪
5.   分布式事务  ：最终一致性保证、补偿机制

### RabbitMQ 特点



核心特点：



1.   可靠性  ：消息持久化、消息确认、镜像队列
2.   灵活路由  ：多种交换机类型（Direct、Topic、Fanout、Headers）
3.   扩展性  ：集群部署、联邦插件
4.   高可用  ：镜像队列、自动故障转移
5.   多协议支持  ：AMQP 0-9-1、AMQP 1.0、MQTT、STOMP
6.   多语言客户端  ：Java、Python、Go、PHP、Ruby、.NET 等
7.   管理界面  ：Web 管理界面、REST API、命令行工具

### RabbitMQ 架构



核心组件：



1.   Producer（生产者）  ：创建消息并发送到 Exchange
2.   Consumer（消费者）  ：从 Queue 获取消息并发送 ACK 确认
3.   Exchange（交换机）  ：接收消息并根据路由规则路由到队列
4.   Queue（队列）  ：存储消息的缓冲区，先进先出（FIFO）
5.   Binding（绑定）  ：Exchange 与 Queue 之间的关系，定义路由规则
6.   Virtual Host（虚拟主机）  ：逻辑隔离单位，类似数据库的概念
7.   Connection（连接）  ：TCP 长连接，客户端与 Broker 之间的通信通道
8.   Channel（通道）  ：Connection 上的轻量级连接



交换机类型：



| 类型                   | 说明                            |
| -------------------- | ----------------------------- |
|   Direct Exchange    | 直连交换机，精确匹配路由键                 |
|   Topic Exchange     | 主题交换机，模式匹配路由键，支持通配符`*`和`#`    |
|   Fanout Exchange    | 扇出交换机，广播到所有绑定队列，忽略 routing key |
|   Headers Exchange   | 头交换机，根据消息头匹配，不常用              |

## 1.3 RabbitMQ 安装

### Docker 安装（推荐）



1\. 拉取镜像



```bash
# 拉取RabbitMQ镜像，3.12为版本号，management包含Web管理界面
docker pull rabbitmq:3.12-management
```

说明：`3.12`为版本号，`management`包含 Web 管理界面



2\. 启动容器



```bash
# 后台运行RabbitMQ容器
docker run -d \                    # -d: 后台运行容器
  --name rabbitmq \                # --name: 设置容器名称为rabbitmq
  -p 5672:5672 \                   # -p: 映射AMQP协议端口，用于消息通信
  -p 15672:15672 \                 # -p: 映射Web管理界面端口
  -v rabbitmq_data:/var/lib/rabbitmq \  # -v: 挂载数据卷实现数据持久化
  -e RABBITMQ_DEFAULT_USER=admin \      # -e: 设置默认用户名
  -e RABBITMQ_DEFAULT_PASS=admin123 \   # -e: 设置默认密码
  rabbitmq:3.12-management         # 使用的镜像名称
```

参数说明：

- `-p 5672:5672`：AMQP 协议端口
- `-p 15672:15672`：Web 管理界面端口
- `-v`：数据持久化
- `-e RABBITMQ_DEFAULT_USER`：默认用户名
- `-e RABBITMQ_DEFAULT_PASS`：默认密码



3\. 常用命令



```bash
docker ps | grep rabbitmq          # 查看容器运行状态
docker logs rabbitmq               # 查看容器日志，用于排查问题
docker exec -it rabbitmq /bin/bash # 进入容器内部执行命令
docker stop rabbitmq               # 停止运行中的容器
docker start rabbitmq              # 启动已停止的容器
docker rm -f rabbitmq              # 强制删除容器（需要先停止）
```

### macOS 安装



Homebrew 安装



```bash
brew install rabbitmq              # 使用Homebrew安装RabbitMQ
brew services start rabbitmq       # 启动RabbitMQ服务
brew services stop rabbitmq        # 停止RabbitMQ服务
brew services restart rabbitmq     # 重启RabbitMQ服务
brew services list                 # 查看所有Homebrew服务状态
```

### Web 管理界面



访问地址：

&#x20;`http://localhost:15672`



默认账号：

 guest/guest（Docker 安装时使用自定义账号密码）



管理界面功能：



1.   Overview（概览）  ：消息总数、节点信息、端口和上下文信息
2.   Connections（连接）  ：显示所有客户端连接
3.   Channels（通道）  ：显示所有通道
4.   Exchanges（交换机）  ：管理交换机，创建、删除、查看绑定关系
5.   Queues（队列）  ：管理队列，创建、删除、发送测试消息、获取消息
6.   Admin（管理）  ：用户管理、虚拟主机管理、权限管理、策略管理、插件管理

# 02_RabbitMQ 快速入门

## 2.1 管理界面使用

### 新建队列



步骤：



1. 点击顶部菜单 `Queues`
2. 点击 `Add a new queue`
3. 填写队列参数
4. 点击 `Add queue` 按钮



队列参数说明：



| 参数              | 说明                     | 默认值     |
| --------------- | ---------------------- | ------- |
|   Name          | 队列名称                   | 必填      |
|   Type          | 队列类型（classic/quorum）   | classic |
|   Durability    | 持久化（Durable/Transient） | Durable |
|   Auto delete   | 自动删除                   | No      |
|   Arguments     | 其他参数                   | -       |



Arguments 参数：



| 参数                        | 说明                |
| ------------------------- | ----------------- |
| x-message-ttl             | 消息存活时间（毫秒）        |
| x-expires                 | 队列空闲时间（毫秒），超时自动删除 |
| x-max-length              | 队列最大消息数           |
| x-max-length-bytes        | 队列最大字节数           |
| x-dead-letter-exchange    | 死信交换机             |
| x-dead-letter-routing-key | 死信路由键             |
| x-single-active-consumer  | 单一活跃消费者           |



队列类型：



1.   Classic（经典队列）  ：传统队列类型，支持所有功能，适合大多数场景
2.   Quorum（仲裁队列）  ：Raft 协议实现，高可用性，数据安全，RabbitMQ 3.8+支持

### 绑定队列与交换机



绑定概念：



绑定（Binding）定义了 Exchange 与 Queue 之间的关系，决定了消息如何从 Exchange 路由到 Queue。



绑定步骤：



1. 点击顶部菜单 `Exchanges`
2. 点击要绑定的交换机名称
3. 在 `Bindings` 区域点击 `Add binding from this exchange`
4. 填写绑定参数（To queue、Routing key、Arguments）
5. 点击 `Bind` 按钮



交换机类型与绑定：



1.   Direct 交换机  ：精确匹配 routing key
2.   Topic 交换机  ：模式匹配 routing key，`*`匹配一个单词，`#`匹配零个或多个单词
3.   Fanout 交换机  ：广播到所有绑定的队列，忽略 routing key

### 发送消息



通过管理界面发送消息：



1. 点击顶部菜单 `Queues`
2. 点击要发送消息的队列名称
3. 点击 `Publish message` 展开
4. 填写消息参数（Payload、Content type、Payload encoding、Properties）
5. 点击 `Publish message` 按钮



消息属性：



| 属性              | 说明         |
| --------------- | ---------- |
| delivery\_mode  | 持久化（2=持久化） |
| priority        | 优先级（0-9）   |
| content\_type   | 内容类型       |
| correlation\_id | 关联 ID       |
| reply\_to       | 回复队列       |
| expiration      | 过期时间（毫秒）   |
| message\_id     | 消息 ID       |
| timestamp       | 时间戳        |



查看队列消息：



1. 点击队列名称
2. 点击 `Get messages` 展开
3. 设置获取模式（Ack mode、Encoding、Messages）
4. 点击 `Get Message(s)` 按钮

## 2.2 数据隔离

### 数据隔离概念



为什么需要数据隔离？



在多租户或多应用场景下，需要将不同应用的消息进行隔离，避免相互影响。



隔离方式：



1.   用户隔离  ：不同用户有不同的权限
2.   虚拟主机隔离  ：不同虚拟主机完全隔离

### 用户管理



创建用户：



1. 点击顶部菜单 `Admin`
2. 在 `Users` 区域点击 `Add a user`
3. 填写用户信息（Username、Password、Tags）
4. 点击 `Add user` 按钮



用户标签（Tags）：



| 标签                | 权限       |
| ----------------- | -------- |
|   Administrator   | 完全管理权限   |
|   Monitoring      | 监控权限     |
|   Policymaker     | 策略管理权限   |
|   Management      | 管理界面访问权限 |
|   None            | 无特殊权限    |



命令行创建用户：



```bash
rabbitmqctl add_user username password              # 创建新用户，指定用户名和密码
rabbitmqctl set_user_tags username administrator    # 为用户设置管理员标签
rabbitmqctl set_permissions -p / username ".*" ".*" ".*"  # 设置用户对虚拟主机/的权限
```



权限说明：

&#x20;权限格式为 `configure write read`

-   configure  ：配置权限（创建/删除资源）
-   write  ：写入权限（发布消息）
-   read  ：读取权限（消费消息）

### 虚拟主机管理



创建虚拟主机：



1. 点击顶部菜单 `Admin`
2. 在 `Virtual Hosts` 区域点击 `Add a new virtual host`
3. 填写虚拟主机名称
4. 点击 `Add virtual host` 按钮



命令行创建虚拟主机：



```bash
rabbitmqctl add_vhost /app1    # 创建虚拟主机/app1
rabbitmqctl add_vhost /app2    # 创建虚拟主机/app2
```



设置用户对虚拟主机的权限：



```bash
# 设置app1_user用户对/app1虚拟主机的全部权限
rabbitmqctl set_permissions -p /app1 app1_user ".*" ".*" ".*"
# 设置app2_user用户对/app2虚拟主机的全部权限
rabbitmqctl set_permissions -p /app2 app2_user ".*" ".*" ".*"
```



虚拟主机最佳实践：



1.   按应用隔离  ：每个应用使用独立的虚拟主机
2.   按环境隔离  ：开发、测试、生产使用不同虚拟主机
3.   权限最小化  ：用户只分配必要的权限
4.   命名规范  ：使用有意义的命名，如 `/app-order`、`/app-payment`



虚拟主机规划示例：



```plain
/              # 默认虚拟主机，guest用户使用
/app-order     # 订单系统
/app-payment   # 支付系统
/app-user      # 用户系统
/app-notify    # 通知系统
```



查看虚拟主机信息：



```bash
rabbitmqctl list_vhosts              # 列出所有虚拟主机
rabbitmqctl list_permissions -p /app1  # 查看/app1虚拟主机的权限配置
```



删除虚拟主机：



```bash
rabbitmqctl delete_vhost /app1       # 删除虚拟主机/app1及其所有资源
```

注意：删除虚拟主机会删除其中的所有资源（交换机、队列等）

## 2.3 Go 操作交换机与队列

### 三种常用交换机

#### 1. Direct 交换机（直连交换机）



特点：

&#x20;精确匹配路由键，消息只发送到路由键完全匹配的队列。

```go
// DeclareDirectExchange 声明一个Direct类型的交换机
// 参数:
//   - ch: AMQP通道
//   - exchangeName: 交换机名称
// 返回: 错误信息
func DeclareDirectExchange(ch *amqp.Channel, exchangeName string) error {
    return ch.ExchangeDeclare(
        exchangeName,  // 交换机名称
        "direct",      // 交换机类型：直连交换机，精确匹配路由键
        true,          // durable: 是否持久化，true表示重启后交换机仍然存在
        false,         // autoDelete: 是否自动删除，false表示没有队列绑定时也不删除
        false,         // internal: 是否为内部交换机，false表示可以被客户端直接使用
        false,         // noWait: 是否等待服务器响应
        nil,           // args: 额外参数
    )
}

// PublishDirect 发布消息到Direct交换机
// 参数:
//   - ch: AMQP通道
//   - exchange: 交换机名称
//   - routingKey: 路由键，必须与队列绑定的路由键完全匹配
//   - message: 消息内容
// 返回: 错误信息
func PublishDirect(ch *amqp.Channel, exchange, routingKey, message string) error {
    return ch.Publish(
        exchange,    // 交换机名称
        routingKey,  // 路由键，消息将发送到绑定此路由键的队列
        false,       // mandatory: 如果为true且没有队列匹配，则返回消息给发送者
        false,       // immediate: 是否立即投递（RabbitMQ已废弃此参数）
        amqp.Publishing{
            ContentType: "text/plain",  // 消息内容类型
            Body:        []byte(message), // 消息体，需要转换为字节数组
        },
    )
}
```



使用示例：



```go
package main

import (
    "log"
    amqp "github.com/rabbitmq/amqp091-go"
)

func main() {
    // 建立与RabbitMQ服务器的连接
    conn, _ := amqp.Dial("amqp://admin:admin123@127.0.0.1:5672/")
    defer conn.Close() // 函数退出时关闭连接
    
    // 创建一个AMQP通道，大部分操作都在通道上进行
    ch, _ := conn.Channel()
    defer ch.Close() // 函数退出时关闭通道
    
    // 声明一个Direct类型的交换机，用于日志分发
    ch.ExchangeDeclare("logs_direct", "direct", true, false, false, false, nil)
    
    // 声明两个队列：一个用于存储错误日志，一个用于存储信息日志
    ch.QueueDeclare("error_queue", true, false, false, false, nil)
    ch.QueueDeclare("info_queue", true, false, false, false, nil)
    
    // 将队列绑定到交换机，并指定路由键
    // error_queue只接收路由键为"error"的消息
    ch.QueueBind("error_queue", "error", "logs_direct", false, nil)
    // info_queue只接收路由键为"info"的消息
    ch.QueueBind("info_queue", "info", "logs_direct", false, nil)
    
    // 发送一条错误日志消息，路由键为"error"
    ch.Publish("logs_direct", "error", false, false, amqp.Publishing{
        ContentType: "text/plain",
        Body:        []byte("这是一条错误日志"),
    })
    log.Println("发送错误日志成功")
}
```

#### 2. Fanout 交换机（扇出交换机）



特点：

&#x20;广播消息到所有绑定的队列，忽略路由键。

```go
// DeclareFanoutExchange 声明一个Fanout类型的交换机
// Fanout交换机会将消息广播到所有绑定的队列，忽略路由键
func DeclareFanoutExchange(ch *amqp.Channel, exchangeName string) error {
    return ch.ExchangeDeclare(
        exchangeName,  // 交换机名称
        "fanout",      // 交换机类型：扇出交换机，广播模式
        true,          // durable: 是否持久化
        false,         // autoDelete: 是否自动删除
        false,         // internal: 是否为内部交换机
        false,         // noWait: 是否等待服务器响应
        nil,           // args: 额外参数
    )
}

// PublishFanout 发布消息到Fanout交换机
// 注意：Fanout交换机忽略路由键，消息会发送到所有绑定的队列
func PublishFanout(ch *amqp.Channel, exchange, message string) error {
    return ch.Publish(
        exchange,  // 交换机名称
        "",        // 路由键为空，Fanout交换机会忽略此参数
        false,     // mandatory
        false,     // immediate
        amqp.Publishing{
            ContentType: "text/plain",    // 消息内容类型
            Body:        []byte(message), // 消息体
        },
    )
}
```



使用示例：



```go
package main

import (
    "log"
    amqp "github.com/rabbitmq/amqp091-go"
)

func main() {
    // 建立连接
    conn, _ := amqp.Dial("amqp://admin:admin123@127.0.0.1:5672/")
    defer conn.Close()
    
    // 创建通道
    ch, _ := conn.Channel()
    defer ch.Close()
    
    // 声明Fanout交换机，用于广播消息
    ch.ExchangeDeclare("logs_fanout", "fanout", true, false, false, false, nil)
    
    // 声明两个临时队列（名称为空，RabbitMQ会自动生成唯一名称）
    // exclusive=true表示连接断开时队列自动删除
    q1, _ := ch.QueueDeclare("", false, false, true, false, nil)
    q2, _ := ch.QueueDeclare("", false, false, true, false, nil)
    
    // 将两个队列绑定到Fanout交换机
    // Fanout交换机忽略路由键，所以路由键为空
    ch.QueueBind(q1.Name, "", "logs_fanout", false, nil)
    ch.QueueBind(q2.Name, "", "logs_fanout", false, nil)
    
    // 发送广播消息，所有绑定的队列都会收到
    ch.Publish("logs_fanout", "", false, false, amqp.Publishing{
        ContentType: "text/plain",
        Body:        []byte("广播消息"),
    })
    log.Println("广播消息成功")
}
```

#### 3. Topic 交换机（主题交换机）



特点：

&#x20;支持通配符匹配，`*`匹配一个单词，`#`匹配零个或多个单词。

```go
// DeclareTopicExchange 声明一个Topic类型的交换机
// Topic交换机支持通配符路由，适合复杂的消息路由场景
func DeclareTopicExchange(ch *amqp.Channel, exchangeName string) error {
    return ch.ExchangeDeclare(
        exchangeName,  // 交换机名称
        "topic",       // 交换机类型：主题交换机
        true,          // durable: 是否持久化
        false,         // autoDelete: 是否自动删除
        false,         // internal: 是否为内部交换机
        false,         // noWait: 是否等待服务器响应
        nil,           // args: 额外参数
    )
}

// PublishTopic 发布消息到Topic交换机
// routingKey支持点号分隔的多单词格式，如"order.create.success"
func PublishTopic(ch *amqp.Channel, exchange, routingKey, message string) error {
    return ch.Publish(
        exchange,    // 交换机名称
        routingKey,  // 路由键，支持通配符匹配
        false,       // mandatory
        false,       // immediate
        amqp.Publishing{
            ContentType: "text/plain",    // 消息内容类型
            Body:        []byte(message), // 消息体
        },
    )
}
```



使用示例：



```go
package main

import (
    "log"
    amqp "github.com/rabbitmq/amqp091-go"
)

func main() {
    // 建立连接
    conn, _ := amqp.Dial("amqp://admin:admin123@127.0.0.1:5672/")
    defer conn.Close()
    
    // 创建通道
    ch, _ := conn.Channel()
    defer ch.Close()
    
    // 声明Topic交换机
    ch.ExchangeDeclare("logs_topic", "topic", true, false, false, false, nil)
    
    // 声明两个临时队列
    q1, _ := ch.QueueDeclare("", false, false, true, false, nil)
    q2, _ := ch.QueueDeclare("", false, false, true, false, nil)
    
    // 绑定队列到交换机，使用通配符
    // "order.*" 匹配一个单词，如 order.create、order.update
    ch.QueueBind(q1.Name, "order.*", "logs_topic", false, nil)
    // "order.#" 匹配零个或多个单词，如 order、order.create、order.create.success
    ch.QueueBind(q2.Name, "order.#", "logs_topic", false, nil)
    
    // 发送消息，路由键为"order.create"，两个队列都能匹配到
    ch.Publish("logs_topic", "order.create", false, false, amqp.Publishing{
        ContentType: "text/plain",
        Body:        []byte("订单创建消息"),
    })
    // 发送消息，路由键为"order.create.success"，只有q2能匹配到（order.#）
    ch.Publish("logs_topic", "order.create.success", false, false, amqp.Publishing{
        ContentType: "text/plain",
        Body:        []byte("订单创建成功消息"),
    })
    log.Println("发送主题消息成功")
}
```

### 声明队列和交换机的方式

#### 1. 声明队列

```go
// DeclareQueue 声明一个基础队列
// 参数:
//   - ch: AMQP通道
//   - queueName: 队列名称
// 返回: 队列对象和错误信息
func DeclareQueue(ch *amqp.Channel, queueName string) (*amqp.Queue, error) {
    return ch.QueueDeclare(
        queueName,  // 队列名称
        true,       // durable: 是否持久化，true表示重启后队列仍然存在
        false,      // autoDelete: 是否自动删除，false表示没有消费者时也不删除
        false,      // exclusive: 是否排他，false表示其他连接也可以访问
        false,      // noWait: 是否等待服务器响应
        nil,        // args: 额外参数
    )
}

// DeclareQueueWithArgs 声明一个带额外参数的队列
// 可以设置TTL、最大长度、死信交换机等高级特性
func DeclareQueueWithArgs(ch *amqp.Channel, queueName string) (*amqp.Queue, error) {
    // 设置队列的额外参数
    args := amqp.Table{
        "x-message-ttl":          60000,        // 消息存活时间：60秒
        "x-max-length":           1000,         // 队列最大消息数：1000条
        "x-dead-letter-exchange": "dlx_exchange", // 死信交换机：消息过期或被拒绝时发送到此交换机
    }
    return ch.QueueDeclare(
        queueName,  // 队列名称
        true,       // durable: 是否持久化
        false,      // autoDelete: 是否自动删除
        false,      // exclusive: 是否排他
        false,      // noWait: 是否等待服务器响应
        args,       // args: 额外参数
    )
}
```



QueueDeclare 参数说明：



| 参数         | 类型     | 说明        |
| ---------- | ------ | --------- |
| name       | string | 队列名称      |
| durable    | bool   | 是否持久化     |
| autoDelete | bool   | 是否自动删除    |
| exclusive  | bool   | 是否排他      |
| noWait     | bool   | 是否等待服务器响应 |
| args       | Table  | 额外参数      |

#### 2. 声明交换机

```go
// DeclareExchange 声明一个交换机
// 参数:
//   - ch: AMQP通道
//   - exchangeName: 交换机名称
//   - exchangeType: 交换机类型（direct/fanout/topic/headers）
// 返回: 错误信息
func DeclareExchange(ch *amqp.Channel, exchangeName, exchangeType string) error {
    return ch.ExchangeDeclare(
        exchangeName,  // 交换机名称
        exchangeType,  // 交换机类型
        true,          // durable: 是否持久化
        false,         // autoDelete: 是否自动删除
        false,         // internal: 是否为内部交换机
        false,         // noWait: 是否等待服务器响应
        nil,           // args: 额外参数
    )
}

// DeclareExchangeWithArgs 声明一个带额外参数的交换机
// 可以设置备用交换机等高级特性
func DeclareExchangeWithArgs(ch *amqp.Channel, exchangeName, exchangeType string) error {
    // 设置交换机的额外参数
    args := amqp.Table{
        "alternate-exchange": "backup_exchange", // 备用交换机：当消息无法路由时发送到此交换机
    }
    return ch.ExchangeDeclare(
        exchangeName,  // 交换机名称
        exchangeType,  // 交换机类型
        true,          // durable: 是否持久化
        false,         // autoDelete: 是否自动删除
        false,         // internal: 是否为内部交换机
        false,         // noWait: 是否等待服务器响应
        args,          // args: 额外参数
    )
}
```



ExchangeDeclare 参数说明：



| 参数         | 类型     | 说明                                 |
| ---------- | ------ | ---------------------------------- |
| name       | string | 交换机名称                              |
| kind       | string | 交换机类型（direct/fanout/topic/headers） |
| durable    | bool   | 是否持久化                              |
| autoDelete | bool   | 是否自动删除                             |
| internal   | bool   | 是否为内部交换机                           |
| noWait     | bool   | 是否等待服务器响应                          |
| args       | Table  | 额外参数                               |

#### 3. 绑定队列与交换机

```go
// BindQueue 将队列绑定到交换机
// 参数:
//   - ch: AMQP通道
//   - queueName: 队列名称
//   - routingKey: 路由键
//   - exchangeName: 交换机名称
// 返回: 错误信息
func BindQueue(ch *amqp.Channel, queueName, routingKey, exchangeName string) error {
    return ch.QueueBind(
        queueName,     // 队列名称
        routingKey,    // 路由键，用于消息路由匹配
        exchangeName,  // 交换机名称
        false,         // noWait: 是否等待服务器响应
        nil,           // args: 额外参数
    )
}

func BindQueueWithArgs(ch *amqp.Channel, queueName, routingKey, exchangeName string) error {
    args := amqp.Table{
        "x-match": "all",
        "type":    "order",
    }
    return ch.QueueBind(
        queueName,
        routingKey,
        exchangeName,
        false,
        args,
    )
}
```

### 消息转换器

RabbitMQ 消息体为字节数组，需要手动进行序列化和反序列化。

#### 1. JSON 消息转换器

```go
package rabbitmq

import (
    "encoding/json"
    amqp "github.com/rabbitmq/amqp091-go"
)

// Message 通用消息结构体
type Message struct {
    ID      string      `json:"id"`      // 消息唯一标识
    Type    string      `json:"type"`    // 消息类型
    Content interface{} `json:"content"` // 消息内容，可以是任意类型
}

// PublishJSON 发布JSON格式的消息
// 参数:
//   - ch: AMQP通道
//   - exchange: 交换机名称
//   - routingKey: 路由键
//   - data: 要发送的数据，会被序列化为JSON
// 返回: 错误信息
func PublishJSON(ch *amqp.Channel, exchange, routingKey string, data interface{}) error {
    // 将数据序列化为JSON字节数组
    body, err := json.Marshal(data)
    if err != nil {
        return err
    }
    return ch.Publish(
        exchange,    // 交换机名称
        routingKey,  // 路由键
        false,       // mandatory
        false,       // immediate
        amqp.Publishing{
            ContentType:  "application/json",   // 内容类型为JSON
            DeliveryMode: amqp.Persistent,      // 消息持久化
            Body:         body,                 // 消息体
        },
    )
}

// ConsumeJSON 从消息中反序列化JSON数据
// 参数:
//   - d: AMQP消息投递对象
//   - out: 反序列化的目标对象指针
// 返回: 错误信息
func ConsumeJSON(d amqp.Delivery, out interface{}) error {
    return json.Unmarshal(d.Body, out)
}
```



使用示例：



```go
package main

import (
    "encoding/json"  // 引入JSON包
    "log"
    amqp "github.com/rabbitmq/amqp091-go"
)

// OrderMessage 订单消息结构体
type OrderMessage struct {
    OrderID   string  `json:"order_id"`   // 订单ID
    UserID    string  `json:"user_id"`    // 用户ID
    Amount    float64 `json:"amount"`     // 订单金额
    ProductID string  `json:"product_id"` // 商品ID
}

func main() {
    // 建立连接
    conn, _ := amqp.Dial("amqp://admin:admin123@127.0.0.1:5672/")
    defer conn.Close()
    
    // 创建通道
    ch, _ := conn.Channel()
    defer ch.Close()
    
    // 声明订单队列
    ch.QueueDeclare("order_queue", true, false, false, false, nil)
    
    // 创建订单消息对象
    order := OrderMessage{
        OrderID:   "ORD001",
        UserID:    "USER001",
        Amount:    99.99,
        ProductID: "PROD001",
    }
    
    // 将订单对象序列化为JSON
    body, _ := json.Marshal(order)
    
    // 发送消息到队列
    ch.Publish("", "order_queue", false, false, amqp.Publishing{
        ContentType:  "application/json",      // 内容类型为JSON
        DeliveryMode: amqp.Persistent,         // 消息持久化
        Body:         body,                    // JSON消息体
    })
    log.Println("发送订单消息成功")
}
```

#### 2. Protobuf 消息转换器

```go
package rabbitmq

import (
    "google.golang.org/protobuf/proto"  // 引入protobuf包
    amqp "github.com/rabbitmq/amqp091-go"
)

// PublishProtobuf 发布Protobuf格式的消息
// 参数:
//   - ch: AMQP通道
//   - exchange: 交换机名称
//   - routingKey: 路由键
//   - msg: protobuf消息对象
// 返回: 错误信息
func PublishProtobuf(ch *amqp.Channel, exchange, routingKey string, msg proto.Message) error {
    // 将protobuf消息序列化为字节数组
    body, err := proto.Marshal(msg)
    if err != nil {
        return err
    }
    return ch.Publish(
        exchange,    // 交换机名称
        routingKey,  // 路由键
        false,       // mandatory
        false,       // immediate
        amqp.Publishing{
            ContentType:  "application/x-protobuf", // 内容类型为protobuf
            DeliveryMode: amqp.Persistent,          // 消息持久化
            Body:         body,                     // protobuf消息体
        },
    )
}

// ConsumeProtobuf 从消息中反序列化Protobuf数据
// 参数:
//   - d: AMQP消息投递对象
//   - out: 反序列化的目标protobuf对象指针
// 返回: 错误信息
func ConsumeProtobuf(d amqp.Delivery, out proto.Message) error {
    return proto.Unmarshal(d.Body, out)
}
```

#### 3. 通用消息封装

```go
package rabbitmq

import (
    "encoding/json"
    "time"
    amqp "github.com/rabbitmq/amqp091-go"
)

// MessageWrapper 消息包装器，包含消息元数据
type MessageWrapper struct {
    ID        string      `json:"id"`        // 消息唯一标识
    Timestamp int64       `json:"timestamp"` // 消息时间戳
    Type      string      `json:"type"`      // 消息类型
    Data      interface{} `json:"data"`      // 消息数据
}

// NewMessageWrapper 创建一个新的消息包装器
// 参数:
//   - msgType: 消息类型
//   - data: 消息数据
// 返回: 消息包装器指针
func NewMessageWrapper(msgType string, data interface{}) *MessageWrapper {
    return &MessageWrapper{
        ID:        generateID(),          // 生成唯一ID
        Timestamp: time.Now().Unix(),     // 当前时间戳
        Type:      msgType,               // 消息类型
        Data:      data,                  // 消息数据
    }
}

// PublishMessage 发布封装后的消息
// 参数:
//   - ch: AMQP通道
//   - exchange: 交换机名称
//   - routingKey: 路由键
//   - msgType: 消息类型
//   - data: 消息数据
// 返回: 错误信息
func PublishMessage(ch *amqp.Channel, exchange, routingKey, msgType string, data interface{}) error {
    // 创建消息包装器
    wrapper := NewMessageWrapper(msgType, data)
    
    // 序列化为JSON
    body, err := json.Marshal(wrapper)
    if err != nil {
        return err
    }
    
    return ch.Publish(
        exchange,    // 交换机名称
        routingKey,  // 路由键
        false,       // mandatory
        false,       // immediate
        amqp.Publishing{
            ContentType:   "application/json", // 内容类型
            DeliveryMode:  amqp.Persistent,    // 消息持久化
            CorrelationId: wrapper.ID,         // 关联ID，用于消息追踪
            Timestamp:     time.Now(),         // 时间戳
            Type:          msgType,            // 消息类型
            Body:          body,               // 消息体
        },
    )
}
```

#### 4. 消息属性设置

```go
// PublishWithProperties 发布带自定义属性的消息
// 参数:
//   - ch: AMQP通道
//   - exchange: 交换机名称
//   - routingKey: 路由键
//   - body: 消息体
//   - props: 消息属性
// 返回: 错误信息
func PublishWithProperties(ch *amqp.Channel, exchange, routingKey string, body []byte, props amqp.Publishing) error {
    return ch.Publish(
        exchange,    // 交换机名称
        routingKey,  // 路由键
        false,       // mandatory
        false,       // immediate
        props,       // 消息属性
    )
}

// 消息属性示例
props := amqp.Publishing{
    ContentType:     "application/json",   // 内容类型
    ContentEncoding: "utf-8",              // 内容编码
    DeliveryMode:    amqp.Persistent,      // 消息持久化（2=持久化，1=非持久化）
    Priority:        5,                    // 消息优先级（0-9）
    CorrelationId:   "corr-123",           // 关联ID，用于请求-响应模式
    ReplyTo:         "reply_queue",        // 回复队列名称
    Expiration:      "60000",              // 消息过期时间（毫秒）
    MessageId:       "msg-123",            // 消息ID
    Timestamp:     time.Now(),
    Type:          "order.created",
    UserId:        "admin",
    AppId:         "order-service",
    Headers: amqp.Table{
        "source": "web",
        "version": "1.0",
    },
    Body: body,
}
```

# 03_go 客户端-amqp091-go

## 3.1 基础使用

### 安装依赖

```bash
go get github.com/rabbitmq/amqp091-go  # 安装RabbitMQ Go客户端库
```

### 连接字符串格式

```plain
amqp://用户名:密码@主机:端口/虚拟主机
```

示例：`amqp://admin:admin123@127.0.0.1:5672/`

### 核心结构体封装

```go
package rabbitmq

import (
    "fmt"
    "log"
    amqp "github.com/rabbitmq/amqp091-go"
)

// RabbitMQ RabbitMQ客户端封装结构体
type RabbitMQ struct {
    conn      *amqp.Connection  // TCP连接
    channel   *amqp.Channel     // AMQP通道
    QueueName string            // 队列名称
    Exchange  string            // 交换机名称
    Key       string            // 路由键
    Mqurl     string            // 连接URL
}

// NewRabbitMQ 创建RabbitMQ实例
// 参数:
//   - queueName: 队列名称
//   - exchange: 交换机名称
//   - key: 路由键
//   - mqurl: 连接URL
// 返回: RabbitMQ实例指针
func NewRabbitMQ(queueName, exchange, key, mqurl string) *RabbitMQ {
    return &RabbitMQ{
        QueueName: queueName,
        Exchange:  exchange,
        Key:       key,
        Mqurl:     mqurl,
    }
}

// Destory 关闭连接和通道
func (r *RabbitMQ) Destory() {
    r.channel.Close()  // 先关闭通道
    r.conn.Close()     // 再关闭连接
}

// failOnErr 错误处理，遇到错误直接退出程序
// 参数:
//   - err: 错误对象
//   - message: 错误提示信息
func (r *RabbitMQ) failOnErr(err error, message string) {
    if err != nil {
        log.Fatalf("%s:%s", message, err)
    }
}
```

## 3.2 Simple 模式（简单模式）

### 模式说明

- 一个生产者，一个消费者
- 消息直接发送到队列
- 应用场景：聊天、简单任务处理

### 代码实现

```go
// NewRabbitMQSimple 创建Simple模式的RabbitMQ实例
// 参数:
//   - queueName: 队列名称
//   - mqurl: 连接URL
// 返回: RabbitMQ实例指针
func NewRabbitMQSimple(queueName, mqurl string) *RabbitMQ {
    // 创建基础实例
    rabbitmq := NewRabbitMQ(queueName, "", "", mqurl)
    var err error
    
    // 建立TCP连接
    rabbitmq.conn, err = amqp.Dial(rabbitmq.Mqurl)
    rabbitmq.failOnErr(err, "连接RabbitMQ失败")
    
    // 创建AMQP通道
    rabbitmq.channel, err = rabbitmq.conn.Channel()
    rabbitmq.failOnErr(err, "获取Channel失败")
    
    return rabbitmq
}

// PublishSimple 发布消息（Simple模式）
// 参数:
//   - message: 消息内容
func (r *RabbitMQ) PublishSimple(message string) {
    // 声明队列，如果不存在则创建
    _, err := r.channel.QueueDeclare(
        r.QueueName,  // 队列名称
        false,        // durable: 是否持久化
        false,        // autoDelete: 是否自动删除
        false,        // exclusive: 是否排他
        false,        // noWait: 是否等待服务器响应
        nil,          // args: 额外参数
    )
    if err != nil {
        fmt.Println(err)
    }
    
    // 发布消息到队列
    r.channel.Publish(
        r.Exchange,   // 交换机名称，空字符串表示使用默认交换机
        r.QueueName,  // 路由键，这里使用队列名称
        false,        // mandatory
        false,        // immediate
        amqp.Publishing{
            ContentType: "text/plain",     // 消息内容类型
            Body:        []byte(message),  // 消息体
        })
}

// ConsumeSimple 消费消息（Simple模式）
func (r *RabbitMQ) ConsumeSimple() {
    // 声明队列
    q, err := r.channel.QueueDeclare(
        r.QueueName,
        false,
        false,
        false,
        false,
        nil,
    )
    if err != nil {
        fmt.Println(err)
    }
    
    // 消费消息
    msgs, err := r.channel.Consume(
        q.Name,  // 队列名称
        "",      // 消费者标签，空字符串表示自动生成
        true,    // autoAck: 是否自动确认
        false,   // exclusive: 是否排他
        false,   // noLocal: 是否不接收自己发布的消息
        false,   // noWait: 是否等待服务器响应
        nil,     // args: 额外参数
    )
    if err != nil {
        fmt.Println(err)
    }
    
    // 创建一个通道用于阻塞主goroutine
    forever := make(chan bool)
    
    // 启动goroutine消费消息
    go func() {
        for d := range msgs {
            log.Printf("收到消息: %s", d.Body)
        }
    }()
    
    // 阻塞主goroutine，直到收到信号
    <-forever
}
```

### 生产者示例

```go
package main

import "your-project/rabbitmq"

func main() {
    // 创建Simple模式的RabbitMQ实例
    mq := rabbitmq.NewRabbitMQSimple("simple_queue", "amqp://admin:admin123@127.0.0.1:5672/")
    defer mq.Destory()  // 确保退出时关闭连接
    
    // 发送消息
    mq.PublishSimple("Hello RabbitMQ!")
    fmt.Println("发送成功")
}
```

### 消费者示例

```go
package main

import "your-project/rabbitmq"

func main() {
    // 创建Simple模式的RabbitMQ实例
    mq := rabbitmq.NewRabbitMQSimple("simple_queue", "amqp://admin:admin123@127.0.0.1:5672/")
    defer mq.Destory()  // 确保退出时关闭连接
    
    // 开始消费消息（会阻塞）
    mq.ConsumeSimple()
}
```

## 3.3 Work 模式（工作模式）

### 模式说明

- 一个生产者，多个消费者
- 消息只能被一个消费者获取
- 消费者争抢消息
- 应用场景：红包、任务分配

### 代码实现

Work 模式与 Simple 模式代码相同，只需启动多个消费者即可。

### 生产者示例

```go
package main

import (
    "fmt"
    "strconv"
    "time"
    "your-project/rabbitmq"
)

func main() {
    // 创建Work模式的RabbitMQ实例
    mq := rabbitmq.NewRabbitMQSimple("work_queue", "amqp://admin:admin123@127.0.0.1:5672/")
    defer mq.Destory()
    
    // 循环发送100条消息
    for i := 0; i < 100; i++ {
        mq.PublishSimple("消息" + strconv.Itoa(i))
        time.Sleep(500 * time.Millisecond)  // 每条消息间隔500毫秒
    }
}
```

### 消费者示例（启动多个）

```go
package main

import "your-project/rabbitmq"

func main() {
    // 创建Work模式的RabbitMQ实例
    mq := rabbitmq.NewRabbitMQSimple("work_queue", "amqp://admin:admin123@127.0.0.1:5672/")
    defer mq.Destory()
    
    // 开始消费消息（启动多个消费者实例，消息会被争抢）
    mq.ConsumeSimple()
}
```

## 3.4 Publish 模式（订阅模式）

### 模式说明

- 使用 Fanout 交换机
- 消息广播到所有绑定队列
- 一个消息被多个消费者获取
- 应用场景：邮件群发、群聊天、广播

### 代码实现

```go
// NewRabbitMQPubSub 创建Publish/Subscribe模式的RabbitMQ实例
// 参数:
//   - exchangeName: 交换机名称
//   - mqurl: 连接URL
// 返回: RabbitMQ实例指针
func NewRabbitMQPubSub(exchangeName, mqurl string) *RabbitMQ {
    // 创建基础实例，队列为空（使用临时队列）
    rabbitmq := NewRabbitMQ("", exchangeName, "", mqurl)
    var err error
    
    // 建立TCP连接
    rabbitmq.conn, err = amqp.Dial(rabbitmq.Mqurl)
    rabbitmq.failOnErr(err, "连接RabbitMQ失败")
    
    // 创建AMQP通道
    rabbitmq.channel, err = rabbitmq.conn.Channel()
    rabbitmq.failOnErr(err, "获取Channel失败")
    
    return rabbitmq
}

// PublishPub 发布消息（Fanout模式）
// 参数:
//   - message: 消息内容
func (r *RabbitMQ) PublishPub(message string) {
    // 声明Fanout类型的交换机
    err := r.channel.ExchangeDeclare(
        r.Exchange,  // 交换机名称
        "fanout",    // 交换机类型：扇出（广播）
        true,        // durable: 是否持久化
        false,       // autoDelete: 是否自动删除
        false,       // internal: 是否为内部交换机
        false,       // noWait: 是否等待服务器响应
        nil,         // args: 额外参数
    )
    r.failOnErr(err, "创建交换机失败")
    
    // 发布消息到交换机
    r.channel.Publish(
        r.Exchange,  // 交换机名称
        "",          // 路由键为空，Fanout交换机忽略路由键
        false,       // mandatory
        false,       // immediate
        amqp.Publishing{
            ContentType: "text/plain",     // 消息内容类型
            Body:        []byte(message),  // 消息体
        })
}

// RecieveSub 接收消息（订阅模式）
func (r *RabbitMQ) RecieveSub() {
    // 声明Fanout交换机
    err := r.channel.ExchangeDeclare(
        r.Exchange,
        "fanout",
        true,
        false,
        false,
        false,
        nil,
    )
    r.failOnErr(err, "创建交换机失败")
    
    // 声明临时队列（名称为空，RabbitMQ自动生成）
    q, err := r.channel.QueueDeclare(
        "",      // 队列名称为空，自动生成
        false,   // durable: 是否持久化
        false,   // autoDelete: 是否自动删除
        true,    // exclusive: 是否排他（连接断开时自动删除）
        false,   // noWait: 是否等待服务器响应
        nil,     // args: 额外参数
    )
    r.failOnErr(err, "创建队列失败")
    
    // 将队列绑定到交换机
    r.channel.QueueBind(
        q.Name,      // 队列名称
        "",          // 路由键为空
        r.Exchange,  // 交换机名称
        false,       // noWait
        nil,         // args
    )
    
    // 消费消息
    msgs, err := r.channel.Consume(
        q.Name,  // 队列名称
        "",      // 消费者标签
        true,    // autoAck: 自动确认
        false,   // exclusive
        false,   // noLocal
        false,   // noWait
        nil,     // args
    )
    
    // 阻塞等待消息
    forever := make(chan bool)
    go func() {
        for d := range msgs {
            log.Printf("收到消息: %s", d.Body)
        }
    }()
    <-forever
}
```

### 生产者示例

```go
package main

import (
    "fmt"
    "strconv"
    "your-project/rabbitmq"
)

func main() {
    // 创建Pub/Sub模式的RabbitMQ实例
    mq := rabbitmq.NewRabbitMQPubSub("pubsub_exchange", "amqp://admin:admin123@127.0.0.1:5672/")
    defer mq.Destory()
    
    // 发送10条广播消息
    for i := 0; i < 10; i++ {
        mq.PublishPub("广播消息" + strconv.Itoa(i))
        fmt.Println("发送消息", i)
    }
}
```

### 消费者示例（启动多个）

```go
package main

import "your-project/rabbitmq"

func main() {
    // 创建Pub/Sub模式的RabbitMQ实例
    mq := rabbitmq.NewRabbitMQPubSub("pubsub_exchange", "amqp://admin:admin123@127.0.0.1:5672/")
    defer mq.Destory()
    
    // 开始订阅消息（启动多个消费者实例，每个消费者都能收到所有消息）
    mq.RecieveSub()
}
```

## 3.5 Routing 模式（路由模式）

### 模式说明

- 使用 Direct 交换机
- 根据路由键精确匹配
- 消息发送到指定队列
- 应用场景：错误通知、日志分级

### 代码实现

```go
// NewRabbitMQRouting 创建Routing模式的RabbitMQ实例
// 参数:
//   - exchangeName: 交换机名称
//   - routingKey: 路由键
//   - mqurl: 连接URL
// 返回: RabbitMQ实例指针
func NewRabbitMQRouting(exchangeName, routingKey, mqurl string) *RabbitMQ {
    // 创建基础实例，包含路由键
    rabbitmq := NewRabbitMQ("", exchangeName, routingKey, mqurl)
    var err error
    
    // 建立TCP连接
    rabbitmq.conn, err = amqp.Dial(rabbitmq.Mqurl)
    rabbitmq.failOnErr(err, "连接RabbitMQ失败")
    
    // 创建AMQP通道
    rabbitmq.channel, err = rabbitmq.conn.Channel()
    rabbitmq.failOnErr(err, "获取Channel失败")
    
    return rabbitmq
}

// PublishRouting 发布消息（Routing模式）
// 参数:
//   - message: 消息内容
func (r *RabbitMQ) PublishRouting(message string) {
    // 声明Direct类型的交换机
    err := r.channel.ExchangeDeclare(
        r.Exchange,  // 交换机名称
        "direct",    // 交换机类型：直连（精确匹配路由键）
        true,        // durable: 是否持久化
        false,       // autoDelete: 是否自动删除
        false,       // internal: 是否为内部交换机
        false,       // noWait: 是否等待服务器响应
        nil,         // args: 额外参数
    )
    r.failOnErr(err, "创建交换机失败")
    
    // 发布消息，使用路由键
    r.channel.Publish(
        r.Exchange,  // 交换机名称
        r.Key,       // 路由键，消息将发送到绑定此路由键的队列
        false,       // mandatory
        false,       // immediate
        amqp.Publishing{
            ContentType: "text/plain",     // 消息内容类型
            Body:        []byte(message),  // 消息体
        })
}

// RecieveRouting 接收消息（Routing模式）
func (r *RabbitMQ) RecieveRouting() {
    // 声明Direct交换机
    err := r.channel.ExchangeDeclare(
        r.Exchange,
        "direct",
        true,
        false,
        false,
        false,
        nil,
    )
    r.failOnErr(err, "创建交换机失败")
    
    // 声明临时队列
    q, err := r.channel.QueueDeclare(
        "",      // 队列名称为空，自动生成
        false,   // durable
        false,   // autoDelete
        true,    // exclusive: 排他队列
        false,   // noWait
        nil,     // args
    )
    r.failOnErr(err, "创建队列失败")
    
    // 将队列绑定到交换机，使用路由键
    r.channel.QueueBind(
        q.Name,      // 队列名称
        r.Key,       // 路由键，精确匹配
        r.Exchange,  // 交换机名称
        false,       // noWait
        nil,         // args
    )
    
    // 消费消息
    msgs, err := r.channel.Consume(
        q.Name,  // 队列名称
        "",      // 消费者标签
        true,    // autoAck
        false,   // exclusive
        false,   // noLocal
        false,   // noWait
        nil,     // args
    )
    
    // 阻塞等待消息
    forever := make(chan bool)
    go func() {
        for d := range msgs {
            log.Printf("收到消息: %s", d.Body)
        }
    }()
    <-forever
}
```

### 生产者示例

```go
package main

import (
    "fmt"
    "strconv"
    "your-project/rabbitmq"
)

func main() {
    // 创建两个Routing模式的实例，分别使用不同的路由键
    mq1 := rabbitmq.NewRabbitMQRouting("routing_exchange", "error", "amqp://admin:admin123@127.0.0.1:5672/")
    mq2 := rabbitmq.NewRabbitMQRouting("routing_exchange", "info", "amqp://admin:admin123@127.0.0.1:5672/")
    defer mq1.Destory()
    defer mq2.Destory()
    
    // 发送不同路由键的消息
    for i := 0; i < 10; i++ {
        mq1.PublishRouting("错误消息" + strconv.Itoa(i))  // 路由键为"error"
        mq2.PublishRouting("信息消息" + strconv.Itoa(i))  // 路由键为"info"
    }
}
```

### 消费者示例

```go
package main

import "your-project/rabbitmq"

func main() {
    // 创建Routing模式的实例，订阅"error"路由键的消息
    mq := rabbitmq.NewRabbitMQRouting("routing_exchange", "error", "amqp://admin:admin123@127.0.0.1:5672/")
    defer mq.Destory()
    
    // 开始消费消息（只接收路由键为"error"的消息）
    mq.RecieveRouting()
}
```

## 3.6 Topic 模式（话题模式）

### 模式说明

- 使用 Topic 交换机
- 支持通配符匹配：`*`匹配一个单词，`#`匹配零个或多个单词
- 应用场景：复杂路由规则

### 通配符规则

| 通配符 | 说明        | 示例                                                  |
| --- | --------- | --------------------------------------------------- |
| `*` | 匹配一个单词    | `order.*`匹配`order.create`但不匹配`order.create.success` |
| `#` | 匹配零个或多个单词 | `order.#`匹配`order.create.success`                   |

### 代码实现

```go
// NewRabbitMQTopic 创建Topic模式的RabbitMQ实例
// 参数:
//   - exchangeName: 交换机名称
//   - routingKey: 路由键（支持通配符）
//   - mqurl: 连接URL
// 返回: RabbitMQ实例指针
func NewRabbitMQTopic(exchangeName, routingKey, mqurl string) *RabbitMQ {
    // 创建基础实例
    rabbitmq := NewRabbitMQ("", exchangeName, routingKey, mqurl)
    var err error
    
    // 建立TCP连接
    rabbitmq.conn, err = amqp.Dial(rabbitmq.Mqurl)
    rabbitmq.failOnErr(err, "连接RabbitMQ失败")
    
    // 创建AMQP通道
    rabbitmq.channel, err = rabbitmq.conn.Channel()
    rabbitmq.failOnErr(err, "获取Channel失败")
    
    return rabbitmq
}

// PublishTopic 发布消息（Topic模式）
// 参数:
//   - message: 消息内容
func (r *RabbitMQ) PublishTopic(message string) {
    // 声明Topic类型的交换机
    err := r.channel.ExchangeDeclare(
        r.Exchange,  // 交换机名称
        "topic",     // 交换机类型：主题（支持通配符匹配）
        true,        // durable
        false,       // autoDelete
        false,       // internal
        false,       // noWait
        nil,         // args
    )
    r.failOnErr(err, "创建交换机失败")
    
    // 发布消息
    r.channel.Publish(
        r.Exchange,  // 交换机名称
        r.Key,       // 路由键，如"order.create.success"
        false,       // mandatory
        false,       // immediate
        amqp.Publishing{
            ContentType: "text/plain",     // 消息内容类型
            Body:        []byte(message),  // 消息体
        })
}

// RecieveTopic 接收消息（Topic模式）
func (r *RabbitMQ) RecieveTopic() {
    // 声明Topic交换机
    err := r.channel.ExchangeDeclare(
        r.Exchange,
        "topic",
        true,
        false,
        false,
        false,
        nil,
    )
    r.failOnErr(err, "创建交换机失败")
    
    // 声明临时队列
    q, err := r.channel.QueueDeclare(
        "",      // 队列名称为空，自动生成
        false,   // durable
        false,   // autoDelete
        true,    // exclusive
        false,   // noWait
        nil,     // args
    )
    r.failOnErr(err, "创建队列失败")
    
    // 将队列绑定到交换机，使用通配符路由键
    r.channel.QueueBind(
        q.Name,      // 队列名称
        r.Key,       // 路由键，支持通配符，如"order.*"或"order.#"
        r.Exchange,  // 交换机名称
        false,       // noWait
        nil,         // args
    )
    
    // 消费消息
    msgs, err := r.channel.Consume(
        q.Name,  // 队列名称
        "",      // 消费者标签
        true,    // autoAck
        false,   // exclusive
        false,   // noLocal
        false,   // noWait
        nil,     // args
    )
    
    // 阻塞等待消息
    forever := make(chan bool)
    go func() {
        for d := range msgs {
            log.Printf("收到消息: %s", d.Body)
        }
    }()
    <-forever
}
```

### 生产者示例

```go
package main

import (
    "fmt"
    "strconv"
    "your-project/rabbitmq"
)

func main() {
    // 创建两个Topic模式的实例，使用不同的路由键
    mq1 := rabbitmq.NewRabbitMQTopic("topic_exchange", "order.create", "amqp://admin:admin123@127.0.0.1:5672/")
    mq2 := rabbitmq.NewRabbitMQTopic("topic_exchange", "order.delete.success", "amqp://admin:admin123@127.0.0.1:5672/")
    defer mq1.Destory()
    defer mq2.Destory()
    
    // 发送不同路由键的消息
    for i := 0; i < 10; i++ {
        mq1.PublishTopic("订单创建消息" + strconv.Itoa(i))           // 路由键: order.create
        mq2.PublishTopic("订单删除成功消息" + strconv.Itoa(i))      // 路由键: order.delete.success
    }
}
```

### 消费者示例

```go
package main

import "your-project/rabbitmq"

func main() {
    mq := rabbitmq.NewRabbitMQTopic("topic_exchange", "order.#", "amqp://admin:admin123@127.0.0.1:5672/")
    defer mq.Destory()
    
    // 开始消费消息（使用通配符"order.#"匹配所有order开头的消息）
    mq.RecieveTopic()
}
```

## 3.7 六大模式对比

| 模式      | 交换机类型  | 特点          | 应用场景      |
| ------- | ------ | ----------- | --------- |
| Simple  | 无      | 一对一，直接队列    | 简单任务、聊天   |
| Work    | 无      | 一对多，竞争消费    | 任务分配、红包   |
| Publish | Fanout | 广播，所有消费者都收到 | 群发、广播     |
| Routing | Direct | 精确路由匹配      | 日志分级、错误通知 |
| Topic   | Topic  | 通配符匹配       | 复杂路由规则    |
| RPC     | 无      | 请求-响应模式     | 远程调用      |

## 3.8 最佳实践

### 1. 消息持久化

```go
// 声明持久化队列
_, err := r.channel.QueueDeclare(
    r.QueueName,  // 队列名称
    true,         // durable: 持久化，重启后队列仍然存在
    false,        // autoDelete
    false,        // exclusive
    false,        // noWait
    nil,          // args
)

// 发送持久化消息
r.channel.Publish(
    r.Exchange,   // 交换机名称
    r.QueueName,  // 路由键
    false,        // mandatory
    false,        // immediate
    amqp.Publishing{
        DeliveryMode: amqp.Persistent,  // 消息持久化
        ContentType:  "text/plain",     // 内容类型
        Body:         []byte(message),  // 消息体
    })
```

### 2. 消息确认机制

```go
// 消费消息，关闭自动确认
msgs, err := r.channel.Consume(
    q.Name,  // 队列名称
    "",      // 消费者标签
    false,   // autoAck: false，手动确认
    false,   // exclusive
    false,   // noLocal
    false,   // noWait
    nil,     // args
)

// 手动确认消息
go func() {
    for d := range msgs {
        log.Printf("收到消息: %s", d.Body)
        
        // 处理消息...
        
        d.Ack(false)  // 手动确认消息，false表示只确认当前消息
    }
}()
```

### 3. 连接池管理

建议使用连接池管理 Connection 和 Channel，避免频繁创建和销毁。

### 4. 错误处理

所有 RabbitMQ 操作都应该进行错误处理，确保系统稳定性。

### 5. 优雅关闭

使用 context 和信号处理实现优雅关闭，确保消息不丢失。

# 04_高级特性

## 4.1 消息可靠性

消息可靠性是 RabbitMQ 在实际生产环境中的核心关注点。整个消息传递链路涉及三个角色：发送者、MQ 本身、消费者。任何一个环节出问题都可能导致消息丢失或重复消费。


### 4.1.1 生产者重连

网络波动是生产环境中不可避免的问题。当网络中断时，RabbitMQ 客户端与服务器的连接会断开，如果不实现重连机制，消息将无法发送。



实现思路:使用循环重试 + 指数退避策略，避免频繁重试加重服务器负担。

```go
// 关键代码片段：带重试的连接
for i := 0; i < config.MaxRetries; i++ {
    conn, err = amqp.Dial(config.URL)
    if err == nil {
        return conn, nil
    }
    // 指数退避：重试间隔随失败次数增加
    time.Sleep(config.RetryDelay * time.Duration(i+1))
}
```

### 4.1.2 生产者确认机制

RabbitMQ 提供两种确认机制来确保消息可靠到达：

| 机制                    | 作用        | 配置方式                |
| --------------------- | --------- | ------------------- |
|   Publisher Confirm   | 确认消息已到达 MQ | `ch.Confirm(false)` |
|   Publisher Return    | 处理无法路由的消息 | `mandatory=true`    |



Confirm 机制流程:

1. 开启 Confirm 模式：`ch.Confirm(false)`
2. 发布消息时创建确认通道：`ch.NotifyPublish(make(chan amqp.Confirmation, 1))`
3. 等待 Broker 返回确认结果

```go
// 关键代码片段：Confirm模式
ch.Confirm(false)  // 开启Confirm模式
confirms := ch.NotifyPublish(make(chan amqp.Confirmation, 1))

// 发布消息时设置mandatory=true，使无法路由的消息返回
ch.PublishWithContext(ctx, exchange, routingKey, true, false, publishing)

// 等待确认
select {
case confirm := <-confirms:
    if !confirm.Ack {
        return ErrMessageNack  // 消息被拒绝
    }
case <-ctx.Done():
    return ctx.Err()  // 超时
}
```



Return 机制:当消息无法路由到任何队列时（没有匹配的队列），Broker 会调用 Return 回调，开发者可以记录日志或进行补偿处理。

### 4.1.3 回调配置详解



Confirm 回调配置:

Confirm 确认用于确保消息成功投递到 Broker。有两种配置模式：

| 配置方式                | 说明       | 适用场景        |
| ------------------- | -------- | ----------- |
| `ch.Confirm(false)` | 同步等待确认   | 可靠性要求高，允许阻塞 |
| `ch.Confirm(true)`  | 异步确认，不等待 | 高吞吐量场景      |

```go
// 同步Confirm：等待每条消息的确认结果
ch.Confirm(false)
confirms := ch.NotifyPublish(make(chan amqp.Confirmation, 1))

// 异步Confirm：不等待确认，通过回调处理
ch.Confirm(true)
ch.NotifyPublish(make(chan amqp.Confirmation, 1))
```



Return 回调配置:

Return 回调用于处理无法路由的消息（没有匹配的队列）。需要设置`mandatory=true`才会触发。

```go
// 创建Return通道，缓冲大小建议设置大一些，避免丢失
returns := ch.NotifyReturn(make(chan amqp.Return, 1))

// 启动goroutine监听Return事件
go func() {
    for ret := range returns {
        // ret.ReplyCode: 错误码（如312表示没有路由）
        // ret.RoutingKey: 路由键
        // ret.ReplyText: 错误描述
        log.Printf("消息路由失败: %s, 原因: %s", ret.RoutingKey, ret.ReplyText)
        // 可选：记录日志、发送到死信队列、通知监控系统
    }
}()

// 发布消息时必须设置mandatory=true
ch.Publish(exchange, routingKey, true, false, publishing)
```



Confirm + Return 联合配置:

生产环境中通常同时启用两种确认机制，确保消息可靠传递：

```go
// 完整配置示例
// 1. 开启Confirm模式
ch.Confirm(false)

// 2. 创建确认和返回通道
confirms := ch.NotifyPublish(make(chan amqp.Confirmation, 1))
returns := ch.NotifyReturn(make(chan amqp.Return, 1))

// 3. 启动监听goroutine
go func() {
    for {
        select {
        case confirm := <-confirms:
            if !confirm.Ack {
                // 消息未被确认，可能需要重试
                log.Printf("消息未确认: %d", confirm.DeliveryTag)
            }
        case ret := <-returns:
            // 消息无法路由，需要处理
            log.Printf("消息无法路由: %s, %s", ret.RoutingKey, ret.ReplyText)
        }
    }
}()

// 4. 发布消息
ch.PublishWithContext(ctx, exchange, routingKey, true, false, amqp.Publishing{
    DeliveryMode: amqp.Persistent,
    Body: body,
})
```



错误码说明：

| ReplyCode | 说明                   | 可能原因      |
| --------- | -------------------- | --------- |
| 312       | NO\_ROUTE            | 没有匹配的队列   |
| 313       | NO\_CONSUMERS        | 队列无消费者    |
| 406       | PRECONDITION\_FAILED | 队列声明参数不匹配 |

### 4.1.4 发送者可靠性总结

| 保障措施      | 说明                              |
| --------- | ------------------------------- |
| 重连机制      | 网络波动时自动重连                       |
| Confirm 确认 | 确保消息到达 MQ                        |
| Return 回调  | 处理路由失败的消息                       |
| 持久化消息     | `DeliveryMode: amqp.Persistent` |

## 4.2 MQ 的可靠性

MQ 本身的可靠性主要通过数据持久化来保障。

### 4.2.1 数据持久化

RabbitMQ 持久化涉及三个层面，缺一不可：

| 持久化对象   | 配置                         | 说明                |
| ------- | -------------------------- | ----------------- |
|   交换机   | `durable: true`            | Broker 重启后交换机定义仍存在 |
|   队列    | `durable: true`            | Broker 重启后队列定义仍存在  |
|   消息    | `DeliveryMode: Persistent` | 消息体存储到磁盘          |



注意事项：

- 交换机和队列的持久化是声明时的基本配置
- 消息持久化需要在发布时单独设置
- 即使设置了持久化，在 Broker 高负载时仍可能有少量消息未及时写入磁盘

```go
// 关键代码片段：声明持久化队列
ch.QueueDeclare(name, true, false, false, false, nil)  // durable=true

// 关键代码片段：发布持久化消息
ch.Publish(exchange, routingKey, false, false, amqp.Publishing{
    DeliveryMode: amqp.Persistent,  // 消息持久化
    Body: body,
})
```

### 4.2.2 惰性队列（Lazy Queue）



为什么需要惰性队列？



当队列积压大量消息时，这些消息都会缓存在内存中，导致 RabbitMQ 内存占用过高。惰性队列将消息直接存储到磁盘，内存只保留消息的索引元数据。



惰性队列特点：

1. 消息存储在磁盘，内存占用低
2. 消费消息时从磁盘读取，延迟增加
3. 适合秒杀、订单处理等瞬时流量高峰场景

```go
// 关键代码片段：声明惰性队列
args := amqp.Table{"x-queue-mode": "lazy"}
ch.QueueDeclare(name, true, false, false, false, args)
```



与普通队列对比：

| 特性   | 普通队列      | 惰性队列      |
| ---- | --------- | --------- |
| 内存占用 | 高（消息驻留内存） | 低（仅存索引）   |
| 读取性能 | 快（内存读取）   | 慢（磁盘读取）   |
| 适用场景 | 实时消费      | 消息积压、离线处理 |

## 4.3 消费者的可靠性

### 4.3.1 消费者确认机制

消费者确认（ACK）是消息可靠传递的最后一环。有两种确认模式：

| 模式       | 配置               | 说明              |
| -------- | ---------------- | --------------- |
|   自动确认   | `autoAck: true`  | 消息投递给消费者后立即删除   |
|   手动确认   | `autoAck: false` | 消费者处理完成后显式调用 Ack |



为什么需要手动确认？



自动确认模式下，如果消费者在处理消息时崩溃，消息就会丢失。手动确认确保消息被正确处理后才从队列中删除。

```go
// 关键代码片段：手动确认消费
msgs, _ := ch.Consume(queue, "", false, false, false, false, nil)  // autoAck=false

for msg := range msgs {
    if err := handler(msg.Body); err != nil {
        msg.Nack(false, true)  // 处理失败，重新入队
    } else {
        msg.Ack(false)  // 处理成功，确认消息
    }
}
```



Ack/Nack 操作说明：

| 操作 | 方法                         | 参数说明                            |
| -- | -------------------------- | ------------------------------- |
| 确认 | `msg.Ack(false)`           | false 表示只确认当前消息                  |
| 拒绝 | `msg.Nack(false, requeue)` | requeue=true 则重新入队，false 则丢弃或发送死信 |
| 拒绝 | `msg.Reject(false)`        | 相当于 Nack(false, false)           |

### 4.3.2 消费失败处理

在讨论消费失败处理之前，我们需要先理解服务的两种类型：

***



什么是无状态服务？



无状态服务是指服务不保存任何会话信息，每次请求都是独立的。服务处理完请求后，不依赖之前或之后的其他请求。



特点：

- 服务实例之间可以随意替换
- 易于水平扩展
- 请求失败时只需重试，无需担心状态问题



典型例子：RESTful API 服务、消息处理服务（处理完即完成）

***



什么是有状态服务？



有状态服务是指服务会保存会话信息，处理请求时可能依赖之前请求的结果或服务内部维护的状态。



特点：

- 服务实例不能随意替换
- 扩展相对复杂
- 请求失败后的处理需要考虑状态恢复



典型例子：

- 数据库连接服务
- 分布式事务中的协调者
- 微信消息序列（需要保证顺序）

***



消费失败的处理策略：

当消费者处理消息失败时，通常有两种处理方式：



（1）自动处理 - 重新入队



消息处理失败后，将消息重新放回队列，等待下次消费。

```go
// Nack并重新入队
msg.Nack(false, true)  // requeue=true
```



优点：简单，消息不会丢失


缺点：如果消息本身有问题（如格式错误），会无限循环

适用场景：临时性故障（如网络抖动、服务暂时不可用）

***



（2）手动处理 - 记录死信或人工干预



消息处理失败后，不重新入队，而是记录到死信队列或日志系统，由人工或专门的补偿服务处理。

```go
// Nack但不重新入队（消息将进入死信队列）
msg.Nack(false, false)

// 或者直接Reject
msg.Reject(false)
```



优点：不会因为消息问题导致消费循环


缺点：需要配套的死信队列和补偿机制

适用场景：消息格式错误、业务处理确定失败（如库存不足）

***



（3）重试机制



结合重新入队和计数限制，实现有限次数的重试：

```go
// 关键代码片段：带重试的消费
for msg := range msgs {
    var lastErr error
    for i := 0; i < maxRetries; i++ {
        if err := handler(msg.Body); err == nil {
            msg.Ack(false)
            break
        }
        lastErr = err
    }
    if lastErr != nil {
        msg.Nack(false, false)  // 重试次数用尽，丢弃或进入死信
    }
}
```

***



（3）总结



| 处理策略     | 配置                          | 适用场景          |
| -------- | --------------------------- | ------------- |
|   无限重试   | `Nack(false, true)`         | 临时性故障、瞬时问题    |
|   有限重试   | 循环+Nack                     | 可恢复的暂时性错误     |
|   直接拒绝   | `Nack/Reject(false, false)` | 确定性的失败、消息格式错误 |
|   死信队列   | 配置 DLX                       | 需要后续处理的消息     |

### 4.3.3 业务幂等性



为什么需要幂等性？



即使在生产者和消费者层面都做了可靠性保障，仍然可能出现问题：

| 问题       | 原因                   |
| -------- | -------------------- |
|   消息重复   | 消费者处理成功但确认失败，MQ 会重新投递 |
|   网络抖动   | 确认消息丢失，MQ 认为消息未处理     |
|   系统故障   | 消费者重启，可能重复处理消息       |

幂等性确保多次执行同一操作的结果与执行一次相同，是消息消费的最终保障。

***



（1）唯一消息 ID



为每条消息分配唯一 ID，消费时通过 Redis 等存储记录已处理的消息 ID。

```go
// 关键代码片段：基于Redis的幂等实现
messageID := msg.MessageId  // 或使用msg.Body的哈希
key := "msg:processed:" + messageID

// SetNX：如果key不存在则设置成功（首次处理）
ok, _ := rdb.SetNX(ctx, key, "1", 24*time.Hour).Result()
if !ok {
    msg.Ack(false)  // 已处理过，跳过
    continue
}

// 处理消息
if err := handler(msg.Body); err != nil {
    rdb.Del(ctx, key)        // 失败，删除key
    msg.Nack(false, true)    // 重新入队
} else {
    msg.Ack(false)           // 成功
}
```

***



（2）业务状态判断



不依赖消息 ID，而是通过业务状态来判断是否需要处理。



适用场景：

- 更新订单状态：只有"未支付"才能更新为"已支付"
- 扣减库存：检查库存是否充足

```go
// 关键代码片段：业务状态判断
order := db.GetOrder(orderID)
if order.Status == "PAID" {
    msg.Ack(false)  // 已是支付状态，无需重复处理
    continue
}

// 执行支付逻辑
db.UpdateOrderStatus(orderID, "PAID")
msg.Ack(false)
```

***



（3）总结



| 方案         | 实现方式            | 适用场景      |
| ---------- | --------------- | --------- |
|   唯一消息 ID   | Redis 存储已处理 ID    | 通用场景，推荐使用 |
|   业务状态判断   | 数据库状态字段         | 有明确状态机的业务 |
|   去重表      | 数据库唯一索引         | 需要持久化的场景  |
|   分布式锁     | Redis/ZooKeeper | 并发处理场景    |



最佳实践：

1. 生产者发送消息时设置`MessageId`
2. 消费者使用 Redis SetNX 实现快速幂等检查
3. 结合业务状态判断，双重保障

## 4.4 延迟消息

延迟消息是指消息发送后，不会立即被消费，而是等待指定时间后才投递给消费者。常用于：

- 订单超时取消
- 定时任务调度
- 失败重试延迟
- 批量处理合并

### 4.4.1 死信交换机（DLX）



什么是死信？



当消息满足以下条件之一时，会成为"死信"（Dead Letter）：

| 条件    | 说明                                    |
| ----- | ------------------------------------- |
| 消息被拒绝 | 消费者调用`Nack`或`Reject`，且`requeue=false` |
| 消息过期  | 超过 TTL（Time To Live）存活时间               |
| 队列满   | 队列达到最大长度，新消息被丢弃                       |



死信交换机的作用



死信交换机（Dead Letter Exchange，DLX）是专门处理死信的交换机。配置了 DLX 的队列，当消息成为死信后，会被路由到 DLX，再由 DLX 分发到死信队列进行处理。



工作流程：

```plain
普通队列 → [消息成为死信] → 死信交换机 → 死信队列
```



应用场景：

1.   延迟队列  ：通过 TTL+DLX 实现延迟消息
2.   消息确认  ：消费失败的消息进入死信队列而不是丢失
3.   逾期订单  ：订单超时未支付，进入死信队列处理

```go
// 关键代码片段：设置死信队列
// 1. 声明死信交换机
ch.ExchangeDeclare("dlx.exchange", "direct", true, false, false, false, nil)

// 2. 声明死信队列并绑定
ch.QueueDeclare("dlx.queue", true, false, false, false, nil)
ch.QueueBind("dlx.queue", "dlx.key", "dlx.exchange", false, nil)

// 3. 声明业务队列，配置死信交换机
args := amqp.Table{
    "x-dead-letter-exchange":    "dlx.exchange",  // 死信交换机
    "x-dead-letter-routing-key": "dlx.key",       // 死信路由键
}
ch.QueueDeclare("business.queue", true, false, false, false, args)
```

### 4.4.2 延迟消息插件

RabbitMQ 提供`rabbitmq_delayed_message_exchange`插件实现延迟消息，无需自行组合 TTL+DLX。



安装插件：

```bash
docker exec -it rabbitmq rabbitmq-plugins enable rabbitmq_delayed_message_exchange
```



声明延迟交换机：

```go
// 关键代码片段：声明延迟交换机
args := amqp.Table{"x-delayed-type": "direct"}
ch.ExchangeDeclare(
    "delayed.exchange",
    "x-delayed-message",  // 插件提供的特殊类型
    true,
    false, false, false,
    args,
)
```



发送延迟消息：

```go
// 关键代码片段：发送延迟消息（延迟30秒）
ch.Publish("delayed.exchange", "delay.key", false, false, amqp.Publishing{
    Headers: amqp.Table{
        "x-delay": int32(30000),  // 延迟30秒（毫秒）
    },
    Body: []byte("延迟消息"),
})
```



TTL+DLX 方案（无插件）：

如果不使用插件，可以通过 TTL+死信交换机组合实现延迟效果：

```go
// 关键代码片段：基于TTL+DLX的延迟队列
// 等待队列：消息在这里等待TTL过期
waitArgs := amqp.Table{
    "x-dead-letter-exchange":    "target.exchange",  // 死信交换机
    "x-dead-letter-routing-key": "target.key",
    "x-message-ttl":             int32(30000),       // 30秒TTL
}
ch.QueueDeclare("delay.wait.queue", true, false, false, false, waitArgs)
```

| 方案          | 精度  | 复杂度 | 消息积压影响     |
| ----------- | --- | --- | ---------- |
|   延迟插件      | 毫秒级 | 简单  | 无          |
|   TTL+DLX   | 秒级  | 中等  | 消息积压影响延迟时间 |

### 4.4.3 取消超时订单

以订单超时取消为例，完整流程：



流程图：

```plain
1. 创建订单（状态：待支付）
         ↓
2. 发送延迟消息（延迟30分钟）
         ↓
3. 用户支付 → 更新订单状态为"已支付"
         ↓
4. 延迟消息到达 → 检查订单状态
    ├── 状态=已支付 → 确认消息（不做处理）
    └── 状态=待支付 → 取消订单
```



Go 实现关键片段：

```go
// 订单服务
type OrderService struct {
    ch *amqp.Channel
}

func (s *OrderService) CreateOrder(orderID string) error {
    // 1. 创建订单...
    
    // 2. 发送延迟消息（30分钟后检查）
    args := amqp.Table{"x-delay": int32(30*60*1000)}  // 30分钟
    ch.Publish("delay.exchange", "order.check", false, false, amqp.Publishing{
        Headers: args,
        Body: []byte(orderID),
    })
    return nil
}

func (s *OrderService) HandleDelayCheck(orderID string) {
    order := s.GetOrder(orderID)
    if order.Status == "PAID" {
        return  // 已支付，无需处理
    }
    // 未支付，取消订单
    s.CancelOrder(orderID)
}
```

# 05_RabbitMQ 集群

## 5.1 集群核心概念与工作原理

### 数据同步：元数据与消息数据

RabbitMQ 集群中需要同步的数据分为两类：

| 数据类型     | 说明          | 同步方式     |
| -------- | ----------- | -------- |
|   元数据    | 交换机、队列、绑定关系 | 所有节点实时同步 |
|   消息数据   | 队列中的消息内容    | 根据集群模式决定 |



元数据包括：

- 交换机名称和属性
- 队列名称和属性
- 绑定关系（Binding）



消息数据：

- 队列中的实际消息
- 消费者的消费位置（ACK 状态）

### 节点类型：磁盘节点与内存节点

| 节点类型     | 特点            | 适用场景         |
| -------- | ------------- | ------------ |
|   磁盘节点   | 将元数据和消息持久化到磁盘 | 数据安全要求高的场景   |
|   内存节点   | 数据仅存储在内存，性能更高 | 对性能要求高、可容错场景 |



建议：集群中至少保留一个磁盘节点，以便元数据持久化。

## 5.2 集群模式详解

### 1. 普通集群模式



原理：

- 队列只存在于一个节点上（声明队列的节点）
- 其他节点只存储队列的元数据
- 访问队列时，需要路由到队列所在节点

```plain
        ┌─────────────┐
        │  客户端连接   │
        └──────┬──────┘
               │
        ┌──────▼──────┐
        │   节点1      │ ←── 元数据
        └──────┬──────┘
               │
        ┌──────▼──────┐
        │   节点2      │ ←── 元数据
        └──────┬──────┘
               │
        ┌──────▼──────┐
        │   节点3      │ ←── 队列（消息数据）
        └─────────────┘
```



特点：

- 优点：配置简单，适合水平扩展消费者
- 缺点：无高可用，队列所在节点宕机则队列不可用



适用场景：对可用性要求不高的场景，只做负载均衡。

### 2. 镜像集群模式



原理：将队列镜像到多个节点，每个节点都有完整的队列数据。

```plain
        ┌─────────────────────────────────────┐
        │           镜像队列                    │
        │  ┌─────────┐ ┌─────────┐ ┌─────────┐  │
        │  │ master  │ │ slave1  │ │ slave2  │  │
        │  │  写/读   │ │   同步   │ │   同步   │  │
        │  └─────────┘ └─────────┘ └─────────┘  │
        └─────────────────────────────────────┘
```



配置命令：

```bash
# 设置镜像策略：所有队列都镜像到所有节点
rabbitmqctl set_policy ha-all "^" '{"ha-mode":"all","ha-sync-mode":"automatic"}'
```



参数说明：

| 参数                        | 说明            |
| ------------------------- | ------------- |
| `ha-all`                  | 策略名称          |
| `^`                       | 匹配所有队列（正则表达式） |
| `ha-mode: all`            | 镜像到所有节点       |
| `ha-sync-mode: automatic` | 自动同步          |



特点：

- 优点：高可用，任意节点宕机不影响队列使用
- 缺点：同步有延迟，占用网络带宽



适用场景：对可用性要求高的生产环境。

### 3. 仲裁队列



概念：RabbitMQ 3.8+引入的全新队列类型，基于 Raft 协议实现分布式共识。



与镜像队列对比：

| 特性    | 镜像队列   | 仲裁队列     |
| ----- | ------ | -------- |
| 协议    | 主从复制   | Raft 共识协议 |
| 数据一致性 | 弱一致    | 强一致      |
| 故障恢复  | 慢（选主）  | 快        |
| 配置    | 复杂（策略） | 简单       |
| 适用版本  | 3.x    | 3.8+     |



声明仲裁队列：

```go
// 关键代码片段：声明仲裁队列
args := amqp.Table{"x-queue-type": "quorum"}
ch.QueueDeclare(name, true, false, false, false, args)
```



特点：

- 自动选举，无需手动配置主从
- 数据强一致性，Raft 协议保证
- 适合对数据安全要求极高的场景（如金融交易）



适用场景：金融支付、订单处理等核心业务。

## 📊 集群模式选择建议

| 场景   | 推荐模式 | 原因       |
| ---- | ---- | -------- |
| 开发测试 | 普通集群 | 配置简单     |
| 普通生产 | 镜像队列 | 高可用，配置灵活 |
| 核心业务 | 仲裁队列 | 强一致性     |

## 集群注意事项

1.   节点数量  ：建议 3 节点以上，奇数更佳（Raft 协议要求）
2.   网络要求  ：节点间网络必须稳定，低延迟
3.   数据卷  ：生产环境务必使用数据卷持久化
4.   负载均衡  ：集群前建议部署 LB（如 HAProxy）
