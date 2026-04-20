---
title: GORM使用
link: gorm
catalog: true
date: 2025-12-11 12:00:00
description: Go 语言 GORM 从入门到进阶的实战指南，涵盖连接配置、模型定义、CRUD、关联、事务与性能优化。
tags:
  - Go
  - 数据库
  - 后端

categories:
  - [笔记, 后端]
---

# GORM 使用指南

## 1. GORM 简介

### 1.1 什么是 GORM

GORM 是 Go 语言中最流行的对象关系映射（ORM）库，它提供了友好的 API，让开发者可以更加方便地操作数据库，而不需要编写复杂的 SQL 语句。

### 1.2 GORM 的优势

- 全功能 ORM

- 关联关系处理

- 钩子函数支持

- 预加载功能

- 事务支持

- 多数据库支持

- 自动迁移

- 灵活的查询构建器

### 1.3 对比原生 SQL

与直接使用原生 SQL 相比，GORM 具有以下优势：

- 代码更加简洁清晰

- 避免 SQL 注入风险

- 减少重复代码

- 自动处理类型转换

- 更好的可维护性

## 2\. 安装与配置

### 2.1 安装 GORM

```go
go get -u gorm.io/gorm
go get -u gorm.io/driver/mysql // MySQL驱动
// 或其他数据库驱动
// go get -u gorm.io/driver/postgres // PostgreSQL
// go get -u gorm.io/driver/sqlite // SQLite
// go get -u gorm.io/driver/sqlserver // SQL Server
```

### 2\.2 项目配置

```go
package main

import (
    "gorm.io/gorm"
    "gorm.io/driver/mysql"
)

func main() {
    // 后续将在这里添加数据库连接代码
}
```

## 3\. 数据库连接

### 3.1 MySQL 连接

```go
dsn := "user:password@tcp(127.0.0.1:3306)/dbname?charset=utf8mb4&parseTime=True&loc=Local"
db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
if err != nil {
    panic("failed to connect database")
}
```

### 3\.2 其他数据库连接

#### PostgreSQL

```go
dsn := "host=localhost user=gorm password=gorm dbname=gorm port=9920 sslmode=disable TimeZone=Asia/Shanghai"
db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
```

#### SQLite

```go
db, err := gorm.Open(sqlite.Open("gorm.db"), &gorm.Config{})
```

### 3\.3 连接池配置

```go
sqlDB, err := db.DB()
// SetMaxIdleConns 设置空闲连接池中连接的最大数量
sqlDB.SetMaxIdleConns(10)
// SetMaxOpenConns 设置打开数据库连接的最大数量
sqlDB.SetMaxOpenConns(100)
// SetConnMaxLifetime 设置了连接可复用的最大时间
sqlDB.SetConnMaxLifetime(time.Hour)
```

## 4\. 模型定义

### 4\.1 基本模型结构

```go
type User struct {
    ID           uint           `gorm:"primaryKey"`              // 主键
    Name         string         `gorm:"size:255;not null"`       // 非空字符串字段
    Email        *string        `gorm:"uniqueIndex"`             // 唯一索引，指针类型表示可为空
    Age          int
    MemberNumber sql.NullString                                  // 使用sql.NullString处理可空字符串
    ActivatedAt  sql.NullTime                                    // 可空时间字段
    CreatedAt    time.Time                                       // 创建时间，自动填充
    UpdatedAt    time.Time                                       // 更新时间，自动填充
    DeletedAt    gorm.DeletedAt `gorm:"index"`                   // 软删除时间，索引
}
```

GORM 支持多种方式定义可空字段：

- 使用指针类型（如 \*string）

- 使用 database/sql 包中的 sql\.NullXXX 类型

- 使用自定义类型并实现 Scanner 和 Valuer 接口

### 4\.2 模型标签（Tag）详解

```go
type Product struct {
    ID          uint      `gorm:"primaryKey;autoIncrement"`
    Code        string    `gorm:"type:varchar(100);uniqueIndex;not null"`
    Price       uint      `gorm:"default:0"`
    ReleaseDate time.Time `gorm:"autoCreateTime"`                  // 创建时自动设置当前时间
    ModifiedAt  int64     `gorm:"autoUpdateTime:milli"`            // 更新时自动设置毫秒时间戳
    Data        []byte    `gorm:"serializer:json"`                 // 使用JSON序列化此字段
    CreatedAt   time.Time
}
```

常用标签说明：

- primaryKey：将字段设置为主键

- autoIncrement：自增

- type：设置字段的数据库类型

- size：设置字段的大小

- default：设置字段的默认值

- not null：设置字段不能为空

- uniqueIndex：设置字段为唯一索引

- index：设置字段为索引

- embedded：嵌套字段

- embeddedPrefix：嵌入字段的前缀

- serializer：指定序列化方式，如 json/gob/unixtime

- autoCreateTime：创建时自动填充时间

- autoUpdateTime：更新时自动填充时间

- column：指定数据库列名

- \&lt;\-：设置字段写入权限，如\&lt;\-:create只创建，\&lt;\-:update只更新，\&lt;\-:false无写入权限

- \-\&gt;：设置字段读取权限，如\-\&gt;:false无读取权限

- \-：忽略该字段，如\-表示无读写权限，\-:migration表示无迁移权限

### 4.3 约定与 gorm.Model

GORM 遵循一系列约定来简化开发：

- 主键：默认使用名为 ID 的字段作为主键

- 表名：结构体名称的蛇形复数形式（如 User 对应表名 users）

- 列名：字段名称的蛇形形式（如 CreatedAt 对应列名 created_at）

- 时间戳：自动追踪 CreatedAt 和 UpdatedAt 字段

GORM 提供了一个预定义结构体 gorm.Model，可以嵌入到模型中：

```go
// gorm.Model 定义
type Model struct {
  ID        uint           `gorm:"primaryKey"`
  CreatedAt time.Time
  UpdatedAt time.Time
  DeletedAt gorm.DeletedAt `gorm:"index"`
}

// 在自定义模型中嵌入
type User struct {
  gorm.Model
  Name string
  Age  int
}
```

### 4\.4 表名称定制

```go
// 通过结构体方法重写表名
func (User) TableName() string {
    return "my_users"
}

// 临时指定表名
db.Table("employees").Create(&user)

// 全局表名设置
db.Config.NamingStrategy = schema.NamingStrategy{
    TablePrefix: "t_",   // 表名前缀，`User` 的表名变为 `t_users`
    SingularTable: true, // 使用单数表名，`User` 的表名变为 `t_user`
}
```

### 4\.5 嵌入结构体

GORM 支持嵌入结构体，可以在一个结构体中嵌入另一个结构体的字段：

```go
type Author struct {
    Name  string
    Email string
}

// 匿名嵌入 - 字段将直接包含在Blog结构体中
type Blog struct {
    ID      int
    Author        // 匿名嵌入
    Upvotes int32
}

// 命名嵌入 - 需要使用embedded标签
type Blog struct {
    ID      int
    Author  Author `gorm:"embedded"`      // 嵌入所有字段
    Upvotes int32
}

// 使用前缀
type Blog struct {
    ID      int
    Author  Author `gorm:"embedded;embeddedPrefix:author_"` // 前缀为author_
    Upvotes int32
}
// 等同于
type Blog struct {
    ID          int
    AuthorName  string
    AuthorEmail string
    Upvotes     int32
}
```

### 4\.6 字段级权限控制

GORM 提供了字段级别的权限控制，可以限制字段的读写权限：

```go
type User struct {
    Name string `gorm:"<-:create"`         // 允许读和创建，不允许更新
    Email string `gorm:"<-:update"`        // 允许读和更新，不允许创建
    Address string `gorm:"<-"`             // 允许读和写（创建和更新）
    Secret string `gorm:"<-:false"`        // 允许读，禁止写
    Password string `gorm:"->:false;<-"`   // 允许写，禁止读（对敏感信息有用）
    Role string `gorm:"-"`                 // 通过struct操作忽略此字段
    Notes string `gorm:"-:all"`            // 忽略读写和迁移
}
```

### 4\.7 模型自动迁移

```go
// 自动迁移
db.AutoMigrate(&User{}, &Product{})
```

自动迁移是 GORM 提供的一项功能，它可以自动将 Go 结构体映射为数据库表结构。具体来说，自动迁移会：

- 当表不存在时，创建表

- 当表结构与模型定义不匹配时，更新表结构（添加新字段、修改字段类型等）

- 添加缺少的索引和外键约束

这一功能主要解决了开发过程中表结构与代码模型保持同步的问题，特别适合于开发环境或个人项目，可以减少手动维护数据库结构的工作量。

#### 自动迁移的局限性

需要注意的是，在现代互联网企业级开发环境中，自动迁移功能通常不会在生产环境使用，原因如下：

数据库变更风险控制：在企业环境中，数据库结构变更是高风险操作，通常需要：

- 正式的变更申请和审批流程

- 由专业 DBA 评估影响并执行操作

- 在低峰期执行，并有完整的回滚方案

权限控制：服务应用的数据库账号通常只有基本的 CRUD 权限，而没有修改表结构(DDL)的权限，这是出于安全考虑。

数据安全：自动迁移在某些情况下可能导致数据丢失（例如，当字段类型变更导致数据截断时）。

### 4\.8 根据数据库反向生成模型

在实际开发中，我们经常会遇到已有数据库表需要生成 Go 模型的情况。GORM 官方提供了 gen 工具来支持这一功能。

#### 安装 gen 工具

```bash
go get -u gorm.io/gen
```

#### 使用 gen 工具从数据库生成模型

以下代码建议放到 cmd 目录下，执行 go run main.go 即可。

```go
package main

import (
	"fmt"
	"gorm.io/driver/mysql"
	"gorm.io/gen"
	"gorm.io/gorm"
)

func main() {
	// 连接数据库
	dsn := "user:password@tcp(127.0.0.1:3306)/dbname?charset=utf8mb4&parseTime=True&loc=Local"
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		panic(fmt.Errorf("连接数据库失败: %w", err))
	}

	// 初始化生成器
	g := gen.NewGenerator(gen.Config{
		// 相对路径，会自动创建目录
		OutPath: "./dao/query",
		// 模式: QueryMode 只生成查询代码(不需要指定表)
		//      ModelMode 只生成模型代码(需要指定表)
		//      DefaultMode 同时生成模型和查询代码(需要指定表)
		Mode: gen.WithDefaultQuery | gen.WithoutContext,
		// 表字段可为null时，对应字段使用指针类型
		FieldNullable: true,
		// 表字段默认值，对应字段使用指针类型
		FieldWithDefaultValue: true,
		// 表字段有注释，对应字段增加注释
		FieldWithIndexComment: true,
	})

	// 设置数据库连接
	g.UseDB(db)

	// 从数据库表生成所有模型
	// g.GenerateAllTable()

	// 或者只生成指定表的模型
	// 第一个参数是表名，第二个参数是模型名称
	g.GenerateModel("users", gen.FieldNew("id").FieldType(gen.FieldTypeUint)) 
	g.GenerateModel("products")
	g.GenerateModel("orders")

	// 生成代码
	g.Execute()
}
```

执行以上代码后，会在指定的 OutPath 目录生成对应的模型和查询代码。

#### 生成文件示例

对于 users 表，会生成如下文件：

model\_user\.go \- 包含模型定义

```go
// Code generated by gorm.io/gen. DO NOT EDIT.
// Code generated by gorm.io/gen. DO NOT EDIT.
// Code generated by gorm.io/gen. DO NOT EDIT.

package query

import (
	"time"
)

const TableNameUser = "users"

// User mapped from table <users>
type User struct {
	ID        uint       `gorm:"column:id;primaryKey;autoIncrement:true" json:"id"`
	Name      string     `gorm:"column:name;not null" json:"name"`
	Email     string     `gorm:"column:email;not null;uniqueIndex:idx_email" json:"email"`
	Age       *int32     `gorm:"column:age" json:"age"`
	CreatedAt time.Time  `gorm:"column:created_at;not null" json:"created_at"`
	UpdatedAt time.Time  `gorm:"column:updated_at;not null" json:"updated_at"`
	DeletedAt *time.Time `gorm:"column:deleted_at" json:"deleted_at"`
}

// TableName User's table name
func (*User) TableName() string {
	return TableNameUser
}
```

query\.go \- 包含查询代码

#### 自定义生成选项

gen 工具提供了丰富的自定义选项:

```go
// 自定义字段类型
g.GenerateModel("users", 
    // 使用自定义类型
    gen.FieldNew("id").FieldType(gen.FieldTypeUint),
    // 指定 Go 结构体字段名
    gen.FieldNew("created_at").FieldName("CreatedTime"),
    // 添加字段标签
    gen.FieldNew("updated_at").FieldTag(map[string]string{"json": "update_time"}),
)

// 忽略一些字段
g.GenerateModel("users", gen.FieldIgnore("deleted_at"))

// 表前缀处理
g.WithOpts(gen.WithTablePrefix("t_"))
```

#### 反向生成的优势与注意事项

优势:

- 快速开发 \- 无需手动编写结构体模型

- 精确匹配 \- 自动适配数据库字段类型和约束

- 保持同步 \- 可定期运行以与数据库结构保持同步

注意事项:

- 生成的代码为静态代码，数据库结构变更后需要重新生成

- 建议保存生成配置代码，以便后期调整和重新生成

- 对于复杂的关联关系可能需要手动调整

- 生成的模型通常需要后续增加业务相关代码

在实际项目开发中，通常会结合使用手动定义模型和反向生成模型两种方式，以获得最大的灵活性和效率。

## 5. 基本 CRUD 操作

### 5\.1 创建记录

```go
// 创建单条记录
user := User{Name: "张三", Age: 18, Email: "zhangsan@example.com"}
result := db.Create(&user)

// 创建多条记录
users := []User{
    {Name: "李四", Age: 20, Email: "lisi@example.com"},
    {Name: "王五", Age: 22, Email: "wangwu@example.com"},
}
result = db.Create(&users)
```

### 5\.2 查询记录

#### 查询单条记录

```go
// 根据主键查询
var user User
db.First(&user, 1) // 查询ID为1的用户
db.First(&user, "id = ?", 1) // 条件查询

// 查询第一条记录
db.First(&user) // 根据主键升序查询第一条记录

// 查询最后一条记录
db.Last(&user) // 根据主键降序查询最后一条记录

// 查询任意一条记录
db.Take(&user)
```

#### 查询多条记录

```go
var users []User
// 查询所有记录
db.Find(&users)

// 条件查询
db.Where("age > ?", 18).Find(&users)
db.Where("name LIKE ?", "%张%").Find(&users)
```

#### 指定查询字段

在查询数据时，如果只需要获取表中的部分字段，可以使用 Select 方法或者定义一个只包含所需字段的结构体。这样可以提高查询效率，减少不必要的数据传输（例如超长字段）。并且有的时候更安全，例如数据库中的密码或者手机号等敏感字段，可能不小心的暴露到了前端，这样就会导致安全问题。

##### 使用 Select 方法指定字段

```go
// 只查询name和age字段
var users []User
db.Select("name", "age").Find(&users)

// 也可以使用结构体字段名（推荐，更安全）
db.Select([]string{"Name", "Age"}).Find(&users)

// 如果查询结果想绑定到自定义结构体，可以这样做
type UserSummary struct {
    Name string
    Age  int
}
var summaries []UserSummary
db.Model(&User{}).Select("name", "age").Find(&summaries)
```

##### 使用特定结构体指定字段

定义一个只包含需要查询字段的结构体，GORM 在查询时会自动映射这些字段。

```go
type UserInfo struct {
    Name  string
    Email string
}

var userInfos []UserInfo
// GORM会根据UserInfo结构体的字段名去查询对应的列
// 例如，这里会执行 SELECT name, email FROM users;
db.Model(&User{}).Find(&userInfos)

// 配合条件查询
db.Model(&User{}).Where("age > ?", 18).Find(&userInfos)
```

这两种方式都可以有效地只选择需要的数据库列，根据实际情况和个人偏好选择即可。使用 Select 方法更为灵活，可以动态指定字段；而使用特定结构体则在代码可读性和类型安全方面有优势。

### 5\.3 更新记录

```go
// 更新单个字段
db.Model(&user).Update("name", "赵六")

// 更新多个字段
db.Model(&user).Updates(User{Name: "赵六", Age: 30})
// 或者使用map
db.Model(&user).Updates(map[string]interface{}{"name": "赵六", "age": 30})

// 更新选定字段
db.Model(&user).Select("name", "age").Updates(map[string]interface{}{
    "name": "赵六", "age": 30, "email": "zhaoliu@example.com",
}) // 只会更新name和age字段
```

### 5\.4 删除记录

```go
// 删除单条记录
db.Delete(&user)
db.Delete(&user, 1) // 删除ID为1的记录

// 批量删除
db.Delete(&User{}, []int{1, 2, 3})

// 条件删除
db.Where("age > ?", 30).Delete(&User{})
```

### 5\.5 查询条件

```go
// 等于条件
db.Where("name = ?", "张三").Find(&users)

// 不等于条件
db.Where("name <> ?", "张三").Find(&users)

// IN条件
db.Where("name IN ?", []string{"张三", "李四"}).Find(&users)

// LIKE条件
db.Where("name LIKE ?", "%张%").Find(&users)

// AND条件
db.Where("name = ? AND age >= ?", "张三", 20).Find(&users)

// 时间条件
db.Where("created_at > ?", time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC)).Find(&users)

// 结构体条件
db.Where(&User{Name: "张三", Age: 20}).Find(&users)
// 相当于 WHERE name = '张三' AND age = 20

// Map条件
db.Where(map[string]interface{}{"name": "张三", "age": 20}).Find(&users)

// 原生SQL
db.Raw("SELECT id, name, age FROM users WHERE name = ?", "张三").Scan(&users)
```

### 5\.6 排序与分页

```go
// 排序
db.Order("age desc, name").Find(&users)

// 分页
db.Limit(10).Offset(0).Find(&users) // 第一页，每页10条
db.Limit(10).Offset(10).Find(&users) // 第二页，每页10条
```

## 6\. 关联关系

### 6\.1 一对一关系

```go
// 用户有一张信用卡
type User struct {
    gorm.Model
    Name       string
    CreditCard CreditCard // 一对一关系（拥有一个）
}

type CreditCard struct {
    gorm.Model
    Number string
    UserID uint // 外键
}

// 查询用户并预加载信用卡信息
var user User
db.Preload("CreditCard").First(&user)
```

### 6\.2 一对多关系

```go
// 用户有多个订单
type User struct {
    gorm.Model
    Name    string
    Orders  []Order // 一对多关系（拥有多个）
}

type Order struct {
    gorm.Model
    Amount float64
    UserID uint // 外键
}

// 查询用户并预加载订单信息
var user User
db.Preload("Orders").First(&user)
```

### 6\.3 多对多关系

```go
// 用户可以有多个角色，一个角色可以属于多个用户
type User struct {
    gorm.Model
    Name   string
    Roles  []Role `gorm:"many2many:user_roles;"`
}

type Role struct {
    gorm.Model
    Name  string
    Users []User `gorm:"many2many:user_roles;"`
}

// 查询用户并预加载角色信息
var user User
db.Preload("Roles").First(&user)
```

### 6\.4 关联操作

```go
// 添加关联
db.Model(&user).Association("Roles").Append(&role1, &role2)

// 替换关联
db.Model(&user).Association("Roles").Replace(&newRole1, &newRole2)

// 删除关联
db.Model(&user).Association("Roles").Delete(&role1, &role2)

// 清空关联
db.Model(&user).Association("Roles").Clear()

// 关联计数
count := db.Model(&user).Association("Roles").Count()
```

## 7\. 事务与钩子

### 7\.1 事务处理

```go
// 方式一：手动事务
tx := db.Begin()
// 执行一些数据库操作
if err := tx.Create(&user).Error; err != nil {
    tx.Rollback() // 发生错误时回滚
    return err
}
if err := tx.Create(&order).Error; err != nil {
    tx.Rollback() // 发生错误时回滚
    return err
}
// 提交事务
return tx.Commit().Error

// 方式二：事务闭包
err := db.Transaction(func(tx *gorm.DB) error {
    if err := tx.Create(&user).Error; err != nil {
        return err // 返回任何错误都会自动回滚
    }
    if err := tx.Create(&order).Error; err != nil {
        return err
    }
    // 返回nil提交事务
    return nil
})
```

### 7\.2 钩子函数

```go
// 示例：BeforeCreate钩子
func (u *User) BeforeCreate(tx *gorm.DB) error {
    // 创建前执行的逻辑，如密码加密
    u.Password = encrypt(u.Password)
    return nil
}

// 其他常用钩子
// BeforeUpdate, AfterCreate, AfterUpdate, BeforeDelete, AfterDelete 等
```

### 7\.3 Soft Delete（软删除）

```go
// 模型定义包含软删除字段
type User struct {
    gorm.Model // 已包含 DeletedAt 字段
    Name string
}

// 或者手动定义
type User struct {
    ID        uint
    Name      string
    DeletedAt gorm.DeletedAt `gorm:"index"`
}

// 软删除
db.Delete(&user)

// 查询时会自动排除软删除的记录
db.Find(&users) // 不包含被软删除的记录

// 强制查询包含已删除的记录
db.Unscoped().Find(&users) // 包含被软删除的记录

// 永久删除
db.Unscoped().Delete(&user)
```

## 8\. 高级功能与最佳实践

### 8.1 原生 SQL

```go
// 原生SQL查询
var users []User
db.Raw("SELECT * FROM users WHERE age > ?", 20).Scan(&users)

// 原生SQL执行
db.Exec("UPDATE users SET name = ? WHERE id = ?", "张三", 1)

// 命名参数
db.Raw("SELECT * FROM users WHERE name = @name", sql.Named("name", "张三")).Scan(&users)
```

### 8\.2 数据库迁移

注意： 实际开发中，这样是不规范的。

```go
// 自动迁移
db.AutoMigrate(&User{}, &Product{}, &Order{})

// 创建表
db.Migrator().CreateTable(&User{})

// 检查表是否存在
db.Migrator().HasTable(&User{})

// 删除表
db.Migrator().DropTable(&User{})

// 修改列
db.Migrator().AlterColumn(&User{}, "Name")

// 删除列
db.Migrator().DropColumn(&User{}, "Name")

// 添加索引
db.Migrator().CreateIndex(&User{}, "Name")

// 删除索引
db.Migrator().DropIndex(&User{}, "Name")
```

### 8\.3 批量操作

```go
// 批量插入
var users = []User{
    {Name: "用户1"},
    {Name: "用户2"},
    {Name: "用户3"},
}
db.CreateInBatches(users, 100) // 每批100条

// 批量更新
db.Model(&User{}).Where("role = ?", "admin").Updates(User{Name: "管理员"})
```

### 8\.4 性能优化

```go
// 智能选择字段
db.Select("name", "age").Find(&users)

// 禁用默认事务
db.Session(&gorm.Session{SkipDefaultTransaction: true}).Find(&users)

// 预加载关联数据
db.Preload("Orders").Preload("CreditCard").Find(&users)

// 预加载关联数据时指定条件
db.Preload("Orders", "state = ?", "paid").Find(&users)

// 连接查询
db.Joins("JOIN credit_cards ON credit_cards.user_id = users.id").Find(&users)
```

### 8.5 Logger 配置

```go
// 设置日志配置
db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
    Logger: logger.Default.LogMode(logger.Info), // 设置日志级别
})

// 自定义日志
newLogger := logger.New(
    log.New(os.Stdout, "\r\n", log.LstdFlags), // io writer
    logger.Config{
        SlowThreshold:             time.Second, // 慢SQL阈值
        LogLevel:                  logger.Info, // 日志级别
        IgnoreRecordNotFoundError: true,       // 忽略ErrRecordNotFound错误
        Colorful:                  true,       // 彩色打印
    },
)
db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
    Logger: newLogger,
})
```

### 8\.6 常见问题与解决方案

#### 1\. N\ +1查询问题

```go
// 错误示例 - 会导致N+1查询问题
var users []User
db.Find(&users) // 查询所有用户
for _, user := range users {
    var orders []Order
    db.Where("user_id = ?", user.ID).Find(&orders) // 每个用户查询一次订单
}

// 正确示例 - 使用预加载解决N+1问题
var users []User
db.Preload("Orders").Find(&users) // 一次性加载所有用户及其订单
```

#### 2\. 构建复杂查询

```go
// 使用作用域（Scopes）构建可复用的查询条件
func AmountGreaterThan1000(db *gorm.DB) *gorm.DB {
    return db.Where("amount > ?", 1000)
}

func PaidOrders(db *gorm.DB) *gorm.DB {
    return db.Where("state = ?", "paid")
}

// 使用
var orders []Order
db.Scopes(AmountGreaterThan1000, PaidOrders).Find(&orders)
```

#### 3\. 处理大数据量

```go
// 使用游标方式处理大量数据
rows, err := db.Model(&User{}).Rows()
defer rows.Close()

for rows.Next() {
    var user User
    db.ScanRows(rows, &user)
    // 处理用户数据
}
```

### 8\.7 实际项目示例

```go
package main

import (
    "fmt"
    "gorm.io/driver/mysql"
    "gorm.io/gorm"
    "gorm.io/gorm/logger"
    "log"
    "os"
    "time"
)

// 定义模型
type User struct {
    gorm.Model
    Name      string    `gorm:"size:100;not null"`
    Email     string    `gorm:"size:100;uniqueIndex"`
    Age       int       `gorm:"default:18"`
    Birthday  time.Time
    CompanyID uint
    Company   Company
    Addresses []Address
}

type Company struct {
    ID   uint   `gorm:"primaryKey"`
    Name string `gorm:"size:100;not null"`
}

type Address struct {
    gorm.Model
    UserID  uint
    Address string `gorm:"size:200;not null"`
}

// 数据库连接函数
func connectDB() *gorm.DB {
    // 配置MySQL连接参数
    dsn := "user:password@tcp(127.0.0.1:3306)/dbname?charset=utf8mb4&parseTime=True&loc=Local"
    
    // 自定义日志
    newLogger := logger.New(
        log.New(os.Stdout, "\r\n", log.LstdFlags),
        logger.Config{
            SlowThreshold:             time.Second,
            LogLevel:                  logger.Info,
            IgnoreRecordNotFoundError: true,
            Colorful:                  true,
        },
    )
    
    // 连接数据库
    db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
        Logger: newLogger,
    })
    if err != nil {
        panic("failed to connect database")
    }
    
    // 配置连接池
    sqlDB, err := db.DB()
    if err != nil {
        panic("failed to get database connection")
    }
    
    sqlDB.SetMaxIdleConns(10)
    sqlDB.SetMaxOpenConns(100)
    sqlDB.SetConnMaxLifetime(time.Hour)
    
    return db
}

func main() {
    db := connectDB()
    
    // 自动迁移
    db.AutoMigrate(&User{}, &Company{}, &Address{})
    
    // 创建公司
    company := Company{Name: "测试公司"}
    db.Create(&company)
    
    // 创建用户
    user := User{
        Name:      "张三",
        Email:     "zhangsan@example.com",
        Age:       25,
        Birthday:  time.Date(1998, 1, 1, 0, 0, 0, 0, time.Local),
        CompanyID: company.ID,
        Addresses: []Address{
            {Address: "北京市海淀区"},
            {Address: "上海市浦东新区"},
        },
    }
    
    // 事务处理
    err := db.Transaction(func(tx *gorm.DB) error {
        if err := tx.Create(&user).Error; err != nil {
            return err
        }
        
        // 模拟其他操作
        fmt.Println("用户创建成功，ID:", user.ID)
        
        return nil
    })
    
    if err != nil {
        fmt.Println("事务执行失败:", err)
        return
    }
    
    // 查询用户并预加载关联数据
    var result User
    db.Preload("Company").Preload("Addresses").First(&result, user.ID)
    
    fmt.Printf("用户: %s, 公司: %s, 地址数量: %d\n", 
        result.Name, result.Company.Name, len(result.Addresses))
    
    // 更新用户
    db.Model(&result).Updates(User{Name: "李四", Age: 30})
    
    // 关联查询示例
    var users []User
    db.Joins("Company").Where("companies.name LIKE ?", "%测试%").Find(&users)
    
    fmt.Printf("关联查询到 %d 个用户\n", len(users))
}
```

## 9\. 总结

GORM 作为 Go 语言中最流行的 ORM 库，提供了丰富的功能和优雅的 API，可以极大地提高数据库开发效率。本教程从基础到高级全面介绍了 GORM 的使用方法，包括：

- 基本连接配置

- 模型定义与字段标签

- CRUD 操作

- 关联关系处理

- 事务与钩子

- 高级查询与优化

通过学习本教程，您应该能够在实际项目中熟练应用 GORM，构建出高效、稳定的数据库访问层。


## 10. 进一步学习资源
- [GORM 官方文档](https://gorm.io/docs/)
- [GORM GitHub 仓库](https://github.com/go-gorm/gorm)
- [GORM 官方示例代码](https://github.com/go-gorm/gorm/tree/master/examples)
- [GORM 入门指南](https://liwenzhou.com/posts/go/gorm)