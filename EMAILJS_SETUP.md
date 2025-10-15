# EmailJS 配置指南

## 第一步：注册EmailJS账号
1. 访问：https://www.emailjs.com/
2. 点击"Sign Up"注册免费账号
3. 验证邮箱地址

## 第二步：添加邮件服务
1. 登录EmailJS控制台
2. 点击"Email Services"
3. 点击"Add New Service"
4. 选择您的邮箱服务商（Gmail、Outlook等）
5. 按照提示连接您的邮箱

## 第三步：创建邮件模板
1. 点击"Email Templates"
2. 点击"Create New Template"
3. 使用以下模板内容：

**模板内容：**
```
Subject: {{subject}}

From: {{from_name}}
Reply To: {{reply_to}}

Message:
{{message}}

---
This email was sent from Youth Mental Health Support website.
```

**模板变量：**
- {{subject}} - 邮件主题
- {{from_name}} - 发送者名称
- {{reply_to}} - 回复邮箱
- {{message}} - 邮件内容

## 第四步：获取配置信息
完成配置后，您需要提供以下信息：

1. **Service ID** - 在"Email Services"页面找到
2. **Template ID** - 在"Email Templates"页面找到
3. **Public Key** - 在"Account"页面找到

## 第五步：更新代码配置
将获取到的配置信息替换到 `src/services/emailService.js` 中：

```javascript
const EMAILJS_SERVICE_ID = 'your_service_id_here'
const EMAILJS_TEMPLATE_ID = 'your_template_id_here'
const EMAILJS_PUBLIC_KEY = 'your_public_key_here'
```

## 免费额度
- 每月200封免费邮件
- 适合开发和测试使用
- 超出后需要付费升级

## 优势
- ✅ 无CORS问题
- ✅ 前端直接发送
- ✅ 无需后端服务器
- ✅ 简单易配置
