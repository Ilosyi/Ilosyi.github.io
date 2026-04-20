---
title: Docker基础
link: docker-study
catalog: true
date: 2025-12-20 21:30:00
description: 一篇系统化的 Docker 学习笔记，覆盖容器与镜像核心概念、数据与网络、Dockerfile 实战、生产优化与私有仓库建设，适合从入门到落地部署的完整路径学习。
tags:
  - Docker
  - 容器
  - 后端

categories:
  - [笔记, 后端]
---

# Docker 基础

## 第一单元：Docker 初识

### 本单元目标
理解 Docker 概念，能成功运行第一个容器。

### 什么是 Docker？
Docker 就像一个标准化的“货运集装箱”，将应用程序及其运行环境打包在一起，让应用可以在任何地方一致地运行。

### 为什么需要 Docker？
传统部署方式中，不同环境（开发、测试、生产）的配置差异经常导致“在我服务器上是好的”这类问题。Docker 通过容器化技术解决了这些问题：

- 环境一致性：应用在任何环境运行结果一致
- 快速部署：从开发到上线，一键完成
- 资源隔离：应用之间互不影响
- 版本控制：像管理代码一样管理运行环境

### Docker 的安装
请根据你的操作系统自行安装 Docker：

- Windows 系统参考：https://www.runoob.com/docker/windows-docker-install.html
- Mac 系统：下载 Docker Desktop for Mac
- Linux 系统：使用包管理器安装（如 `apt-get install docker.io`）

验证安装：

```shell
# 检查Docker版本
docker --version

# 查看Docker信息
docker info
```

### 配置镜像加速
安装完成后，建议配置国内镜像源以提升下载速度。配置完成后记得重启 Docker 服务。

### 实战：运行第一个容器
让我们一键启动一个 nginx 服务器，体验 Docker 的魅力。

什么是 nginx？

nginx 是一个高性能的 HTTP 和反向代理服务器，在互联网公司中广泛使用。

启动 nginx 容器：

```shell
docker run -d --name nginx001 -p 80:80 nginx:latest
```

命令解释：

- `docker run`：运行一个容器
- `-d`：后台运行
- `--name nginx001`：给容器命名为 nginx001
- `-p 80:80`：端口映射（宿主机端口:容器端口）
- `nginx:latest`：使用 nginx 的最新版本镜像

验证运行：

```shell
# 查看运行中的容器
docker ps

# 在浏览器访问
# http://localhost 或 http://localhost:80
```

你应该能看到 nginx 的欢迎页面。

提示：如果 80 端口被占用，可以使用其他端口，如 `-p 8080:80`，然后访问 `http://localhost:8080`。

### 这个命令背后发生了什么？
以 `docker run -d --name nginx001 -p 80:80 nginx:latest` 为例，Docker 在背后做了以下步骤。

#### 执行流程图解

```text
用户执行命令
    ↓
1. 检查本地镜像
    ↓
2. 拉取镜像（如果本地没有）
    ↓
3. 创建容器
    ↓
4. 配置网络和端口映射
    ↓
5. 启动容器
    ↓
6. 返回容器ID
```

#### 思考问题

- 问题 1：为什么第二次运行 `docker run` 会更快？
- 问题 2：如果再次执行 `docker run -d --name nginx002 -p 8080:80 nginx:latest`，会发生什么？
- 问题 3：容器停止后，容器内的数据会丢失吗？

### Docker 三大核心概念

#### 镜像（Image）
镜像就像一个“模具”或“模板”，包含了运行应用所需的所有文件和配置。

特点：

- 只读的：镜像一旦创建，内容不会改变
- 可复用：一个镜像可以创建多个容器
- 分层存储：镜像由多个层组成，可以共享和复用

#### 容器（Container）
容器是用镜像创建出来的运行实例。如果把镜像比作“类”，那么容器就是“对象”。

特点：

- 一个镜像可以启动多个容器
- 每个容器都是独立的，互不干扰
- 容器可以随时启动、停止、删除

#### 仓库（Repository）
仓库就像 Docker 的“应用商店”，用于存储和分发镜像。Docker Hub 是最常用的公共仓库。

作用：

- 共享镜像：开发者可以上传和下载镜像
- 版本管理：支持镜像的版本标签
- 团队协作：团队成员共享相同的镜像

### 基本容器操作

```shell
# 查看运行中的容器
docker ps

# 查看所有容器（包括已停止的）
docker ps -a

# 停止容器
docker stop nginx001

# 启动已停止的容器
docker start nginx001

# 重启容器
docker restart nginx001

# 查看容器日志
docker logs nginx001

# 删除容器（必须先停止）
docker rm nginx001

# 强制删除运行中的容器
docker rm -f nginx001
```

### 第一单元小练习

- 在本地启动一个 nginx 容器，并在浏览器中访问它
- 使用 `docker ps` 查看容器状态
- 使用 `docker logs` 查看容器日志
- 停止并删除容器
- 重新启动一个 nginx 容器，使用不同的端口映射（如 `8080:80`）

思考题：

- 容器和虚拟机有什么区别？
- 为什么 Docker 能实现“一次构建，到处运行”？

## 第二单元：镜像与容器核心

### 本单元目标
熟悉核心命令与容器生命周期管理。

### 镜像管理命令

#### 查看和搜索镜像

```shell
# 查看本地镜像列表
docker images

# 搜索Docker Hub上的镜像
docker search nginx

# 搜索并限制结果数量
docker search --limit 5 mysql
```

#### 拉取和删除镜像

```shell
# 从仓库拉取镜像
docker pull nginx

# 拉取指定版本的镜像
docker pull nginx:1.24.0

# 查看镜像详细信息
docker inspect nginx:1.24.0

# 删除镜像
docker rmi nginx

# 强制删除镜像（即使有容器在使用）
docker rmi -f nginx
```

#### 镜像版本（Tags）管理
Docker 镜像通过标签（Tag）来管理版本。

```shell
# 拉取指定版本
docker pull nginx:1.24.0      # 具体版本号
docker pull nginx:1.24        # 主版本号
docker pull nginx:stable      # 稳定版
docker pull nginx:alpine      # Alpine Linux轻量级版本
docker pull nginx:latest      # 最新版本
```

#### 镜像标签操作

```shell
# 给镜像打标签（用于版本管理）
docker tag nginx:latest my-nginx:v1

# 查看镜像
docker images | grep my-nginx
```

#### 进入容器调试

```shell
# 进入容器内部（交互式）
docker exec -it container_id /bin/bash

# 如果容器内没有bash，使用sh
docker exec -it container_id /bin/sh

# 在容器中执行单个命令
docker exec container_id ls -la

# 以root用户进入容器
docker exec -it -u root container_id /bin/bash
```

#### 容器日志和资源监控

```shell
# 查看容器日志
docker logs container_id

# 实时查看日志（类似tail -f）
docker logs -f container_id

# 查看最近100行日志
docker logs --tail 100 container_id

# 查看容器资源使用情况
docker stats container_id

# 查看所有容器的资源使用
docker stats
```

#### 删除容器

```shell
# 删除已停止的容器
docker rm container_id

# 强制删除运行中的容器
docker rm -f container_id

# 删除所有已停止的容器
docker container prune

# 删除所有容器（危险操作）
docker rm -f $(docker ps -aq)
```

### 实践：容器重启策略
容器重启策略决定了容器在退出后是否自动重启：

```shell
# 总是重启（推荐用于生产环境）
docker run -d --restart=always --name web nginx

# 仅在非正常退出时重启
docker run -d --restart=on-failure --name web nginx

# 除非手动停止，否则总是重启
docker run -d --restart=unless-stopped --name web nginx
```

重启策略对比：

| 策略 | 说明 | 使用场景 |
| --- | --- | --- |
| no | 不自动重启（默认） | 开发测试环境 |
| always | 总是重启 | 生产环境关键服务 |
| on-failure | 仅非正常退出时重启 | 一般生产服务 |
| unless-stopped | 除非手动停止 | 推荐用于生产环境 |

### 第二单元小练习

拉取并运行一个 MySQL 容器：

```shell
docker run -d --name mysql-test -e MYSQL_ROOT_PASSWORD=123456 mysql:8.0
```

查看 MySQL 容器的日志，观察初始化过程。

进入 MySQL 容器，连接数据库：

```shell
docker exec -it mysql-test mysql -u root -p
```

停止容器，再重新启动，验证数据是否还在。

查看容器的资源使用情况（CPU、内存等）。

思考题：

- 容器停止后，容器内的数据会丢失吗？
- 容器删除后，数据会怎样？
- 如何保证容器数据的持久化？（下一单元将学习）

## 第三单元：数据与网络

### 本单元目标
理解容器间通信与数据持久化。

### 数据持久化问题

#### 为什么需要数据持久化？
Docker 容器被视为无状态的。虽然容器停止后数据仍然存在，但如果容器被删除，容器内的数据就会永久丢失。

验证实验：

```shell
# 1. 启动nginx容器
docker run -d --name nginx001 -p 80:80 nginx

# 2. 修改欢迎页面
docker exec -it nginx001 bash
echo "Hello Docker!" > /usr/share/nginx/html/index.html
exit

# 3. 访问 http://localhost，看到"Hello Docker!"

# 4. 删除并重新创建容器
docker rm -f nginx001
docker run -d --name nginx001 -p 80:80 nginx

# 5. 再次访问，发现修改的内容丢失了！
```

### 数据持久化解决方案
Docker 提供了两种数据持久化方式。

#### 方式一：数据卷（Volume）
数据卷是 Docker 管理的存储区域，独立于容器生命周期。

特点：

- 由 Docker 管理，存储在 Docker 的数据目录中
- 可以跨容器共享
- 适合生产环境

使用方法：

```shell
# 创建命名数据卷
docker volume create mydata

# 查看数据卷列表
docker volume ls

# 查看数据卷详细信息
docker volume inspect mydata

# 使用数据卷运行容器
docker run -d -v mydata:/app/data --name app1 nginx

# 另一个容器也可以使用同一个数据卷
docker run -d -v mydata:/app/data --name app2 nginx

# 删除数据卷
docker volume rm mydata

# 删除所有未使用的数据卷
docker volume prune
```

#### 方式二：目录挂载（Bind Mount）
直接将宿主机的目录挂载到容器中。

特点：

- 直接访问宿主机目录，性能最好
- 便于开发和调试
- 需要手动管理目录权限

使用方法：

```shell
# 创建宿主机目录
mkdir -p /Users/mac/Desktop/nginx/html

# 创建一个HTML文件
echo "<h1>Hello from Host!</h1>" > /Users/mac/Desktop/nginx/html/index.html

# 使用目录挂载运行容器
docker run -d \
  -v /Users/mac/Desktop/nginx/html:/usr/share/nginx/html \
  -p 80:80 \
  --name nginx003 \
  nginx

# 访问 http://localhost，能看到你创建的HTML内容
# 修改宿主机的HTML文件，刷新页面即可看到变化
```

#### 两种方式对比

| 特性 | 数据卷（Volume） | 目录挂载（Bind Mount） |
| --- | --- | --- |
| 管理方式 | Docker 自动管理 | 手动管理 |
| 存储位置 | Docker 数据目录 | 宿主机指定目录 |
| 跨平台性 | 好 | 一般（路径依赖操作系统） |
| 适用场景 | 生产环境 | 开发环境 |
| 性能 | 较好 | 最好（直接访问） |

### 实践：MySQL 数据持久化
创建一个带数据持久化的 MySQL 容器。

```shell
# 创建本地目录
mkdir -p /Users/wuhaitao/work/mysqldata_docker

# 运行MySQL容器，挂载数据目录
docker run -d \
  --name mysql \
  -e MYSQL_ROOT_PASSWORD=123456 \
  -e MYSQL_DATABASE=testdb \
  -v /Users/wuhaitao/work/mysqldata_docker:/var/lib/mysql \
  -p 3306:3306 \
  mysql:8.0
```

参数说明：

- `-v /Users/wuhaitao/work/mysqldata_docker:/var/lib/mysql`：将本地目录挂载到 MySQL 数据目录
- `-p 3306:3306`：端口映射
- `-e MYSQL_ROOT_PASSWORD=123456`：设置 root 密码
- `-e MYSQL_DATABASE=testdb`：创建初始数据库

验证持久化：

```shell
# 1. 连接MySQL并创建数据
docker exec -it mysql mysql -u root -p123456
# 执行SQL: CREATE TABLE test (id INT, name VARCHAR(50));

# 2. 删除容器
docker rm -f mysql

# 3. 重新创建容器（使用相同的挂载目录）
docker run -d --name mysql \
  -e MYSQL_ROOT_PASSWORD=123456 \
  -v /Users/wuhaitao/work/mysqldata_docker:/var/lib/mysql \
  -p 3306:3306 \
  mysql:8.0

# 4. 检查数据是否还在
docker exec -it mysql mysql -u root -p123456
# 执行SQL: SHOW TABLES; -- 应该能看到之前创建的表
```

### Docker 网络基础

#### 网络驱动类型

```shell
# 查看网络列表
docker network ls
```

Docker 默认提供的网络驱动：

| 网络类型 | 说明 | 使用场景 |
| --- | --- | --- |
| bridge | 桥接网络（默认） | 同宿主机上的容器通信 |
| host | 容器使用宿主机网络 | 需要高性能网络的场景 |
| none | 无网络 | 需要完全隔离的容器 |
| overlay | 跨主机通信 | Docker Swarm 集群 |

#### 创建和管理网络

```shell
# 创建自定义网络
docker network create mynetwork

# 查看网络详细信息
docker network inspect mynetwork

# 删除网络
docker network rm mynetwork

# 清理未使用的网络
docker network prune
```

### 动手实验：理解 Bridge 网络

#### 实验目标
理解容器如何通过 bridge 网络进行通信。

#### 实验步骤
步骤 1：创建自定义网络

```shell
# 创建test-network
docker network create test-network

# 查看网络详情
docker network inspect test-network
```

步骤 2：启动两个容器并连接到同一网络

```shell
# 启动container1
docker run -d --name container1 --network test-network alpine sleep 3600

# 启动container2
docker run -d --name container2 --network test-network alpine sleep 3600

# 查看容器状态
docker ps
```

步骤 3：测试容器间通信

```shell
# 从container1 ping container2（使用容器名）
docker exec -it container1 ping -c 3 container2

# 从container2 ping container1
docker exec -it container2 ping -c 3 container1
```

你会看到 ping 成功输出：

```text
PING container2 (172.18.0.3): 56 data bytes
64 bytes from 172.18.0.3: seq=0 ttl=64 time=0.123 ms
64 bytes from 172.18.0.3: seq=1 ttl=64 time=0.098 ms
64 bytes from 172.18.0.3: seq=2 ttl=64 time=0.105 ms
```

步骤 4：验证网络隔离

```shell
# 启动一个使用默认网络的容器
docker run -d --name container3 alpine sleep 3600

# 尝试从container1 ping container3（会失败）
docker exec -it container1 ping container3
# 输出：ping: bad address 'container3'
```

步骤 5：将容器添加到网络

```shell
# 将container3连接到test-network
docker network connect test-network container3

# 现在可以ping通了
docker exec -it container1 ping -c 3 container3
```

步骤 6：清理实验环境

```shell
# 停止并删除容器
docker stop container1 container2 container3
docker rm container1 container2 container3

# 删除网络
docker network rm test-network
```

#### 实验要点总结

- 容器名作为主机名：在同一网络中，容器可以通过容器名互相访问
- 自动 DNS 解析：Docker 自动为同一网络的容器提供 DNS 解析
- 网络隔离：不同网络中的容器无法直接通信
- 动态连接：容器可以动态加入或离开网络

### 案例：Go 服务连接 MySQL

#### 方式一：端口映射（开发环境）

```shell
# 启动MySQL并映射端口
docker run -d --name mysql \
  -e MYSQL_ROOT_PASSWORD=123456 \
  -e MYSQL_DATABASE=testdb \
  -p 3306:3306 \
  mysql:8.0
```

Go 代码中连接：

```go
// 使用localhost连接
dsn := "root:123456@tcp(localhost:3306)/testdb"
```

缺点：

- 端口暴露到宿主机，安全性较低
- 可能出现端口冲突

#### 方式二：Docker 网络（生产环境推荐）

```shell
# 1. 创建自定义网络
docker network create app-network

# 2. 启动MySQL（不映射端口）
docker run -d --name mysql \
  --network app-network \
  -e MYSQL_ROOT_PASSWORD=123456 \
  -e MYSQL_DATABASE=testdb \
  mysql:8.0

# 3. 启动Go应用（稍后我们会构建）
docker run -d --name go-app \
  --network app-network \
  -p 8080:8080 \
  go-web-app:v1
```

Go 代码中连接：

```go
// 使用容器名连接
dsn := "root:123456@tcp(mysql:3306)/testdb"
```

优势：

- MySQL 端口不暴露，更安全
- 容器间通信效率更高
- 使用容器名，无需记忆 IP

### 第三单元小练习

- 创建一个 nginx 容器，使用目录挂载，修改主页内容
- 创建两个 nginx 容器，使用同一个数据卷，验证数据共享
- 创建自定义网络，启动两个 alpine 容器，测试相互 ping
- 创建一个 MySQL 容器，使用数据卷持久化，验证删除容器后数据不丢失
- 尝试将 Redis 和一个应用容器连接到同一网络

思考题：

- 数据卷和目录挂载应该如何选择？
- 为什么推荐使用自定义网络而不是默认网络？
- 如何实现容器的网络隔离和通信？

## 第四单元：构建与实战

### 本单元目标
能独立构建与部署 Go Web 服务。

### 为什么需要 Dockerfile？
想象一个场景：你在开发环境成功运行了一个应用，现在需要部署到测试环境和生产环境。

传统方式痛点：

- 手动部署：打包代码、上传、解压、安装依赖、启动应用
- 依赖问题：每台服务器都要重复安装依赖
- 版本不一致：不同服务器的依赖版本可能不同
- 环境差异：操作系统、配置不同导致部署失败

Docker 解决方案：把代码和运行环境一起打包到镜像中，运行镜像即可启动应用。

### 什么是 Dockerfile？
Dockerfile 就像一个“菜谱”，告诉 Docker 如何制作镜像。

Dockerfile 的优势：

- 环境一致性：在任何支持 Docker 的系统上都能运行
- 版本控制：可以像代码一样进行版本管理
- 自动化构建：通过 `docker build` 自动构建
- 可重复性：每次构建都能得到相同的结果

### Dockerfile 核心指令
Dockerfile 指令分为两个执行阶段：

- Build 阶段：执行 `docker build` 时运行，用于构建镜像
- Run 阶段：执行 `docker run` 时运行，用于启动容器

| 指令 | 阶段 | 作用 | 示例 |
| --- | --- | --- | --- |
| FROM | Build | 指定基础镜像（必须是第一条） | `FROM nginx:latest` |
| WORKDIR | Build | 设置工作目录 | `WORKDIR /app` |
| COPY | Build | 复制文件到镜像（推荐） | `COPY src/ /app` |
| ADD | Build | 复制文件（支持 URL 和解压） | `ADD app.tar.gz /app` |
| RUN | Build | 执行命令（安装依赖等） | `RUN go mod download` |
| ENV | Build | 设置环境变量 | `ENV PORT=8080` |
| ARG | Build | 构建参数（仅构建时可用） | `ARG VERSION=1.0` |
| EXPOSE | Build | 声明端口（文档说明） | `EXPOSE 8080` |
| VOLUME | Build | 创建数据卷挂载点 | `VOLUME ["/data"]` |
| CMD | Run | 容器启动默认命令（可覆盖） | `CMD ["./main"]` |
| ENTRYPOINT | Run | 容器入口点（不可覆盖） | `ENTRYPOINT ["/app/main"]` |

提示：`CMD` 可以被 `docker run` 后的命令覆盖，而 `ENTRYPOINT` 不会。

### Dockerfile 基本示例
以 nginx 为例：

```dockerfile
# 使用官方nginx镜像作为基础镜像
FROM nginx:latest

# 设置工作目录
WORKDIR /app

# 复制HTML文件到nginx目录
COPY html /usr/share/nginx/html

# 声明端口
EXPOSE 80

# 启动nginx
CMD ["nginx", "-g", "daemon off;"]
```

构建和运行：

```shell
# 构建镜像
docker build -t myapp:1.0 .

# 运行镜像
docker run -d -p 8080:80 myapp:1.0
```

### 案例实战：部署 Go Web 应用
让我们创建一个完整的 Go Web 应用并容器化。

#### 准备工作

```shell
# 创建项目目录
mkdir -p go-web-docker/src
cd go-web-docker
```

#### 创建 Go Web 应用
在 `src` 目录创建 `main.go`：

```go
package main

import (
    "github.com/gin-gonic/gin"
    "net/http"
)

func main() {
    r := gin.Default()

    // 首页接口
    r.GET("/", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{
            "message": "欢迎使用 Go Docker 应用!",
        })
    })

    // 健康检查接口
    r.GET("/health", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{
            "status": "healthy",
        })
    })

    // 启动服务器
    r.Run(":8080")
}
```

#### 初始化 Go 模块

```shell
cd src
go mod init go-web-docker
go get github.com/gin-gonic/gin
cd ..
```

#### 编写 Dockerfile
在项目根目录创建 `Dockerfile`（推荐使用多阶段构建）。

为什么分两个阶段？

- 第一阶段：编译 Go 代码（包含完整 Go 工具链）
- 第二阶段：只包含运行时必要文件（最终镜像更小）

#### 构建镜像

```shell
# 在项目根目录执行
docker build -t go-web-app:v1 .
```

构建过程：

1. Docker 读取 Dockerfile
2. 下载基础镜像（如 `golang:1.21-alpine`）
3. 设置环境变量
4. 下载 Go 依赖
5. 编译 Go 代码
6. 创建最小运行镜像
7. 复制编译好的二进制文件

#### 运行容器

```shell
docker run -d -p 8080:8080 --name go-web-container go-web-app:v1
```

#### 测试应用

```shell
# 使用curl测试
curl http://localhost:8080
# 输出：{"message":"欢迎使用 Go Docker 应用!"}

# 测试健康检查
curl http://localhost:8080/health
# 输出：{"status":"healthy"}
```

或在浏览器访问：`http://localhost:8080`。

### Dockerfile 优化技巧

#### 技巧 1：利用构建缓存
Docker 会缓存每一层，如果文件没变化就使用缓存。

```dockerfile
# 错误：代码变化时，依赖也会重新下载
COPY . .
RUN go mod download

# 正确：先复制依赖文件，再下载依赖
COPY go.mod go.sum ./
RUN go mod download  # 只有依赖变化时才重新执行
COPY . .
```

原则：将变化频率低的操作放在前面。

#### 技巧 2：使用.dockerignore
创建 `.dockerignore` 文件，排除不必要文件：

```dockerignore
# Git相关
.git
.gitignore

# 依赖目录
vendor
node_modules

# 测试文件
*_test.go
test/

# 文档
README.md
docs/

# IDE配置
.idea
.vscode

# 环境变量
.env
```

#### 技巧 3：多阶段构建减小镜像体积

```dockerfile
# 构建阶段：包含完整工具链
FROM golang:1.21 AS builder
# ... 编译代码 ...

# 运行阶段：只包含必要文件
FROM alpine:latest
COPY --from=builder /app/main .
```

效果对比：

- 单阶段镜像：约 800MB（包含 Go 工具链）
- 多阶段镜像：约 20MB（只包含二进制文件）

### 连接 MySQL 数据库
让我们扩展应用，添加数据库连接。

#### 更新 Go 代码
修改 `src/main.go`，增加数据库初始化逻辑（文中为占位说明）。

更新依赖：

```shell
cd src
go get gorm.io/gorm
go get gorm.io/driver/mysql
cd ..
```

#### 使用 Docker 网络部署

```shell
# 1. 创建网络
docker network create app-network

# 2. 启动MySQL
docker run -d --name mysql \
  --network app-network \
  -e MYSQL_ROOT_PASSWORD=123456 \
  -e MYSQL_DATABASE=testdb \
  mysql:8.0

# 3. 重新构建Go应用
docker build -t go-web-app:v2 .

# 4. 启动Go应用
docker run -d --name go-app \
  --network app-network \
  -e DB_HOST=mysql \
  -e DB_PASSWORD=123456 \
  -p 8080:8080 \
  go-web-app:v2

# 5. 测试
curl http://localhost:8080
```

### 第四单元小练习

基础练习：

- 修改 Go 应用，添加 `/api/time` 接口，返回当前时间
- 重新构建镜像并运行，测试新接口
- 尝试使用环境变量配置应用监听端口

进阶练习：

- 创建一个 Go 应用，连接 Redis 并实现简单缓存功能
- 使用 Docker 网络将应用、MySQL、Redis 连接起来
- 添加健康检查接口，检查数据库和 Redis 连接状态

思考题：

- 为什么要使用多阶段构建？
- `.dockerignore` 文件作用是什么？
- 如何优化 Dockerfile 构建速度？

## 第五单元：优化与生产

### 本单元目标
掌握生产环境部署与常见问题解决。

### 常见踩坑与解决方案

#### 踩坑 1：镜像体积过大
问题：构建镜像几 GB，拉取与部署很慢。

原因：

- 包含不必要文件（源代码、构建工具、缓存）
- 使用较大的基础镜像（如 `ubuntu:latest`）
- 没有清理临时文件

解决方案：

```dockerfile
# 不推荐：使用ubuntu (约70MB)
FROM ubuntu:latest

# 推荐：使用alpine (约5MB)
FROM alpine:latest

# 使用多阶段构建
FROM golang:1.21 AS builder
RUN go build -o main .

FROM alpine:latest
COPY --from=builder /app/main .
```

#### 踩坑 2：忘记使用.dockerignore
问题：敏感文件（`.env`、`.git`）被打包进镜像。

解决方案：创建 `.dockerignore`。

```dockerignore
# Git相关
.git
.gitignore

# 依赖
node_modules
vendor

# 敏感信息
.env
*.key
*.pem

# IDE配置
.idea
.vscode

# 测试和文档
*_test.go
README.md
docs/
```

#### 踩坑 3：容器意外退出不重启
问题：容器异常退出后不会自动重启。

解决方案：使用重启策略。

```shell
# 总是重启（推荐生产环境）
docker run -d --restart=always myapp

# 仅非正常退出时重启
docker run -d --restart=on-failure myapp

# 除非手动停止
docker run -d --restart=unless-stopped myapp
```

| 策略 | 说明 | 使用场景 |
| --- | --- | --- |
| no | 不重启（默认） | 开发测试 |
| always | 总是重启 | 生产关键服务 |
| on-failure | 非正常退出时重启 | 一般服务 |
| unless-stopped | 除非手动停止 | 推荐生产环境 |

#### 踩坑 4：构建速度慢
问题：每次构建都重新下载依赖。

原因：Dockerfile 指令顺序不合理。

解决方案：

```dockerfile
# 错误：代码变化时依赖重新下载
COPY . .
RUN go mod download

# 正确：只有依赖变化才重新下载
COPY go.mod go.sum ./
RUN go mod download  # 利用缓存
COPY . .
RUN go build -o main .
```

#### 踩坑 5：使用 latest 标签导致版本不一致
问题：不同时间构建镜像版本不同。

解决方案：

```dockerfile
# 不推荐
FROM nginx:latest
FROM golang:latest

# 推荐：使用具体版本
FROM nginx:1.24.0
FROM golang:1.21-alpine
```

建议：

- 开发环境：可以使用 `latest`
- 生产环境：必须使用具体版本号

### 生产环境最佳实践

#### 1. 使用环境变量
不要在代码中硬编码配置：

```shell
docker run -d \
  -e DB_HOST=prod-db.example.com \
  -e DB_PASSWORD=secure_password \
  -e REDIS_HOST=prod-redis.example.com \
  --restart=always \
  myapp:v1
```

在 Go 代码中读取环境变量：

```go
import "os"

dbHost := os.Getenv("DB_HOST")
dbPassword := os.Getenv("DB_PASSWORD")
```

#### 2. 健康检查
添加健康检查接口：

```go
r.GET("/health", func(c *gin.Context) {
    // 检查数据库连接
    sqlDB, _ := db.DB()
    if err := sqlDB.Ping(); err != nil {
        c.JSON(500, gin.H{"status": "unhealthy", "error": err.Error()})
        return
    }

    c.JSON(200, gin.H{"status": "healthy"})
})
```

在 Dockerfile 中配置：

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -q --spider http://localhost:8080/health || exit 1
```

#### 3. 资源限制
限制容器资源使用，防止单个容器占用过多资源：

```shell
docker run -d \
  --memory="512m" \
  --cpus="1.0" \
  --name myapp \
  myapp:v1
```

为什么限制资源：

- 防止容器占用所有系统资源
- 保证其他容器正常运行
- 便于资源规划和管理

#### 4. 日志管理
使用结构化日志，便于日志分析：

```go
import "github.com/sirupsen/logrus"

log := logrus.New()
log.SetFormatter(&logrus.JSONFormatter{})

log.WithFields(logrus.Fields{
    "user_id": 123,
    "action": "login",
}).Info("用户登录")
```

查看容器日志：

```shell
# 查看实时日志
docker logs -f myapp

# 查看最近100行
docker logs --tail 100 myapp

# 查看指定时间范围的日志
docker logs --since "2024-01-01" myapp
```

#### 5. 安全性建议

```dockerfile
# 1. 使用非root用户运行
RUN adduser -D appuser
USER appuser

# 2. 只复制必要文件
COPY --from=builder /app/main .

# 3. 不在镜像中存储敏感信息
# 使用环境变量传递
```

敏感信息管理：

```shell
# 不要在Dockerfile中写密码
ENV DB_PASSWORD=123456

# 通过环境变量传递
docker run -e DB_PASSWORD=secure_password myapp
```

### 镜像仓库

#### 什么是 Docker Hub？
Docker Hub（https://hub.docker.com/）是 Docker 官方提供的公共镜像仓库，就像代码界的 GitHub。

Docker Hub 的作用：

- 镜像存储：存储和分发 Docker 镜像
- 官方镜像：提供 Nginx、MySQL、Redis 等官方维护的高质量镜像
- 社区镜像：全球开发者共享镜像资源
- 版本管理：通过标签（Tag）管理镜像版本
- 镜像搜索：快速查找所需镜像

如何使用 Docker Hub：

1. 在网站搜索镜像（如 nginx、mysql）
2. 查看镜像文档和使用说明
3. 通过 `docker pull` 拉取镜像

```shell
# 搜索镜像
docker search nginx

# 从Docker Hub拉取镜像
docker pull nginx:1.24.0

# 查看镜像信息
docker images
```

#### 推送镜像到 Docker Hub

```shell
# 1. 注册Docker Hub账号（https://hub.docker.com/）

# 2. 登录Docker Hub
docker login
# 输入用户名和密码

# 3. 给镜像打标签（格式：用户名/镜像名:版本）
docker tag go-web-app:v1 yourusername/go-web-app:v1

# 4. 推送镜像到Docker Hub
docker push yourusername/go-web-app:v1

# 5. 其他人可以拉取你的镜像
docker pull yourusername/go-web-app:v1
```

Docker Hub 限制：

- 免费账户有镜像拉取次数限制（匿名用户 100 次/6 小时，认证用户 200 次/6 小时）
- 公开仓库任何人都可以拉取
- 私有仓库有数量限制（免费账户 1 个）

#### Docker Hub 的访问问题
大陆网络环境下，直接访问 Docker Hub 可能遇到：

- 下载速度慢或超时
- 无法连接 Docker Hub
- 镜像拉取失败或中断

解决方案：

方案 1：配置镜像加速器（推荐）

- 阿里云容器镜像服务
- 腾讯云容器镜像服务
- 网易云镜像中心
- 中科大镜像站

方案 2：使用代理（开发环境）

```json
{
  "proxies": {
    "default": {
      "httpProxy": "http://proxy.example.com:8080",
      "httpsProxy": "http://proxy.example.com:8080"
    }
  }
}
```

重启 Docker 服务使配置生效。

方案 3：使用国内镜像仓库。

思考：即使配置加速器，仍依赖外部服务，企业能否接受这种依赖？

#### 为什么企业需要自建镜像仓库？

1. 安全性：企业镜像包含业务代码，不宜公开
2. 访问速度：内网或同地域部署速度更高
3. 无使用限制：避免 Docker Hub 拉取次数限制
4. 权限精细化控制：按团队角色授权
5. 合规要求：满足金融、医疗、政务等行业监管

速度与稳定性对比：

| 场景 | 速度 | 稳定性 |
| --- | --- | --- |
| Docker Hub（国外） | 100KB/s - 1MB/s | 常超时、不稳定 |
| 镜像加速器（国内） | 5MB/s - 20MB/s | 较稳定 |
| 私有仓库（内网） | 50MB/s - 100MB/s | 非常稳定 |

权限示例：

| 团队 | 权限 | 用途 |
| --- | --- | --- |
| 开发团队 | 只读（拉取） | 本地开发测试 |
| 测试团队 | 只读（特定镜像） | 测试环境部署 |
| 运维团队 | 读写（推送+拉取） | 生产环境管理 |
| 安全团队 | 审计 | 镜像安全扫描 |

#### 企业私有仓库方案

| 方案 | 类型 | 成本 | 特点 | 适用场景 |
| --- | --- | --- | --- | --- |
| Docker Registry | 开源自建 | 免费 | 轻量级，功能基础 | 小团队快速搭建 |
| Harbor | 开源自建 | 免费 | 功能完善：镜像扫描、权限管理、镜像复制 | 中大型企业 |
| 阿里云 ACR | 云服务 | 按量计费 | 国内访问快，免运维，与阿里云生态集成 | 使用阿里云的企业 |
| 腾讯云 TCR | 云服务 | 按量计费 | 国内访问快，与腾讯云生态集成 | 使用腾讯云的企业 |
| AWS ECR | 云服务 | 按量计费 | 与 AWS 生态深度集成 | 海外业务/使用 AWS |

如何选择：

| 团队规模 | 推荐方案 | 理由 |
| --- | --- | --- |
| 小团队（<10 人） | Docker Registry | 轻量够用，5 分钟搭建 |
| 中型团队（10-50 人） | Harbor | 功能完善，支持团队协作 |
| 大型企业（>50 人） | Harbor + 云服务 | 混合方案，灵活可靠 |
| 云原生团队 | 阿里云 ACR / 腾讯云 TCR | 免运维，与云平台集成 |
| 初学者 | Docker Registry | 学习成本低，快速上手 |

#### 实践：快速搭建私有仓库
步骤 1：启动 Registry 容器

```shell
# 创建数据存储目录
mkdir -p /data/registry

# 启动Registry容器
docker run -d \
  -p 5000:5000 \
  --name registry \
  --restart=always \
  -v /data/registry:/var/lib/registry \
  registry:2
```

步骤 2：验证仓库运行

```shell
# 检查容器状态
docker ps | grep registry

# 访问API，查看镜像列表（目前为空）
curl http://localhost:5000/v2/_catalog
# 输出：{"repositories":[]}
```

步骤 3：推送镜像到私有仓库

```shell
# 假设已有镜像 go-web-app:v1

# 1. 打标签（指向私有仓库）
docker tag go-web-app:v1 localhost:5000/go-web-app:v1

# 2. 推送
docker push localhost:5000/go-web-app:v1

# 3. 查看仓库镜像
curl http://localhost:5000/v2/_catalog
# 输出：{"repositories":["go-web-app"]}

# 4. 查看镜像标签
curl http://localhost:5000/v2/go-web-app/tags/list
# 输出：{"name":"go-web-app","tags":["v1"]}
```

步骤 4：从私有仓库拉取镜像

```shell
# 删除本地镜像（模拟其他机器）
docker rmi localhost:5000/go-web-app:v1

# 重新拉取
docker pull localhost:5000/go-web-app:v1

# 验证
docker images | grep go-web-app
```

步骤 5：其他机器访问私有仓库

```shell
# 在另一台机器上
docker pull 192.168.1.100:5000/go-web-app:v1
```

如遇 HTTP 错误，Docker 配置里添加不安全仓库：

```json
{
  "insecure-registries": ["192.168.1.100:5000"]
}
```

### 多容器应用部署

#### 手动管理多容器

```shell
# 1. 创建网络
docker network create app-network

# 2. 启动MySQL
docker run -d --name mysql \
  --network app-network \
  -e MYSQL_ROOT_PASSWORD=123456 \
  -e MYSQL_DATABASE=testdb \
  mysql:8.0

# 3. 启动Redis
docker run -d --name redis \
  --network app-network \
  redis:alpine

# 4. 启动应用
docker run -d --name app \
  --network app-network \
  -e DB_HOST=mysql \
  -e REDIS_HOST=redis \
  -p 8080:8080 \
  myapp:v1
```

问题：

- 命令繁琐，容易出错
- 难以管理启动顺序
- 不便于版本控制

提示：在 Docker 进阶课程中，可使用 Docker Compose 简化多容器管理。

### 容器监控基础

#### 查看容器资源使用

```shell
# 查看所有容器资源使用
docker stats

# 查看指定容器
docker stats myapp

# 只显示一次（不实时更新）
docker stats --no-stream
```

输出示例：

```text
CONTAINER ID   NAME    CPU %   MEM USAGE / LIMIT   MEM %   NET I/O       BLOCK I/O
abc123         myapp   0.50%   50MiB / 512MiB      9.77%   1.2MB / 800KB 0B / 0B
```

#### 容器进程管理

```shell
# 查看容器内运行的进程
docker top myapp

# 查看容器详细信息
docker inspect myapp
```

### Docker 与开发流程

#### 本地开发

```shell
# 1. 修改代码
# 2. 重新构建镜像
docker build -t myapp:dev .

# 3. 停止旧容器
docker stop myapp

# 4. 启动新容器
docker run -d --name myapp -p 8080:8080 myapp:dev
```

#### 版本管理
使用明确版本标签：

```shell
# 开发版本
docker build -t myapp:dev .

# 测试版本
docker build -t myapp:1.0.0-beta .

# 生产版本
docker build -t myapp:1.0.0 .
```

### 第五单元综合练习

基础练习：

- 创建一个 `.dockerignore`，优化镜像构建
- 为应用添加健康检查接口
- 使用环境变量配置数据库连接
- 为容器设置资源限制（内存和 CPU）

进阶练习：

- 优化 Dockerfile，对比优化前后镜像大小
- 将镜像推送到 Docker Hub
- 手动部署应用 + MySQL + Redis 的完整系统
- 添加结构化日志，并查看日志输出

思考题：

- 为什么生产环境要限制容器资源？
- 如何保证敏感信息（如数据库密码）的安全？
- 多容器手动管理有什么不便？（为 Docker Compose 铺垫）

## 思考题汇总

- 容器和虚拟机的本质区别是什么？
- 为什么 Docker 能实现“一次构建，到处运行”？
- 数据卷和目录挂载应该如何选择？
- 为什么推荐使用自定义网络而不是默认网络？
- 多阶段构建的优势是什么？
- 为什么生产环境不建议使用 `latest` 标签？
- 如何优化 Docker 镜像大小？
- 如何优化 Dockerfile 构建速度？
- 为什么要限制容器资源使用？
- 手动管理多容器应用有哪些不便之处？
