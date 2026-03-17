# Retell AI 多语言通话支持方案

## 概述

Retell AI 网络通话支持多语言，主要有以下几种实现方式：

## 方案一：静态语言配置（推荐）

### 原理
每个 Agent 绑定一个 `voice_id`，该语音有固定的语言。通过为不同语言创建不同的 Agent 来实现多语言支持。

### 实现步骤

#### 1. 查看可用语音及语言
```typescript
// Voice 结构
interface Voice {
  voice_id: string;
  voice_name: string;
  language?: string;      // 语言代码，如 "en-US", "zh-CN", "ja-JP"
  gender?: 'male' | 'female';
  accent?: string;
  provider?: string;
}

// 获取语音列表
const voices = await retellClient.listVoices();
// 过滤中文语音
const chineseVoices = voices.data.filter(v => v.language?.startsWith('zh'));
// 过滤英文语音
const englishVoices = voices.data.filter(v => v.language?.startsWith('en'));
```

#### 2. 创建不同语言的 Agent
```typescript
// 创建中文 Agent
const chineseAgent = await retellClient.createAgent({
  agent_name: "中文助手",
  voice_id: "11labs-中文女声", // 使用中文语音
  response_engine: {
    type: "retell-llm",
    llm_id: "your-llm-id",
    // 系统提示词设置为中文
    system_prompt: "你是一个友好的中文AI助手，请用中文回答用户问题。"
  }
});

// 创建英文 Agent
const englishAgent = await retellClient.createAgent({
  agent_name: "English Assistant",
  voice_id: "11labs-English-Female", // 使用英文语音
  response_engine: {
    type: "retell-llm",
    llm_id: "your-llm-id",
    system_prompt: "You are a friendly English AI assistant."
  }
});
```

#### 3. 通话时选择对应语言的 Agent
```typescript
// 创建 Web Call 时指定对应语言的 Agent
const webCall = await retellClient.createWebCall({
  agent_id: language === 'zh' ? chineseAgent.agent_id : englishAgent.agent_id,
  metadata: { user_language: language }
});
```

## 方案二：动态变量切换（高级）

### 原理
使用 `retell_llm_dynamic_variables` 在通话时传递动态参数，让 LLM 根据参数调整语言。

### 实现
```typescript
// 创建支持多语言的 Agent
const multilingualAgent = await retellClient.createAgent({
  agent_name: "多语言助手",
  voice_id: "multilingual-voice", // 选择支持多语言的语音
  response_engine: {
    type: "retell-llm",
    llm_id: "your-llm-id",
    system_prompt: `你是一个多语言AI助手。
当前用户语言: {{user_language}}
请用{{user_language}}回答用户问题。`
  }
});

// 创建通话时传递语言参数
const webCall = await retellClient.createWebCall({
  agent_id: multilingualAgent.agent_id,
  retell_llm_dynamic_variables: {
    user_language: "中文"
  }
});
```

## 方案三：Bring Your Own LLM（完全自定义）

### 原理
使用 WebSocket 连接自己的 LLM 服务，实现完全自定义的语言识别和处理逻辑。

### 架构
```
用户语音 → Retell AI → WebSocket → 你的 LLM 服务 → Retell AI → 语音输出
                ↓
           语言检测
                ↓
           选择对应语言模型
```

### 实现
```typescript
// 创建使用自定义 LLM 的 Agent
const customAgent = await retellClient.createAgent({
  agent_name: "自定义多语言助手",
  voice_id: "your-voice-id",
  response_engine: {
    type: "bring-your-own-llm",
    llm_websocket_url: "wss://your-server.com/llm-websocket"
  }
});
```

### WebSocket 服务端示例（Node.js）
```typescript
import { WebSocketServer, WebSocket } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws: WebSocket) => {
  ws.on('message', (data: string) => {
    const message = JSON.parse(data.toString());
    
    if (message.type === 'transcript') {
      // 检测语言
      const detectedLanguage = detectLanguage(message.text);
      
      // 根据语言选择模型和提示词
      const response = await generateResponse(
        message.text, 
        detectedLanguage
      );
      
      // 发送响应
      ws.send(JSON.stringify({
        type: 'response',
        content: response,
        language: detectedLanguage
      }));
    }
  });
});

function detectLanguage(text: string): string {
  // 简单的语言检测逻辑
  if (/[\u4e00-\u9fa5]/.test(text)) return 'zh';
  if (/[\u3040-\u30ff]/.test(text)) return 'ja';
  if (/[\uac00-\ud7af]/.test(text)) return 'ko';
  return 'en';
}
```

## 常用多语言语音 ID

### 中文语音
| Voice ID | 语言 | 性别 | 描述 |
|----------|------|------|------|
| `11labs-Zhinyu` | zh-CN | female | 中文女声 |
| `11labs-Yunxi` | zh-CN | male | 中文男声 |
| `cartesia-Chinese-Female` | zh-CN | female | 中文女声 |

### 英文语音
| Voice ID | 语言 | 性别 | 描述 |
|----------|------|------|------|
| `11labs-Rachel` | en-US | female | 英文女声 |
| `11labs-Adam` | en-US | male | 英文男声 |
| `cartesia-Cleo` | en-US | female | 英文女声 |

### 日语语音
| Voice ID | 语言 | 性别 | 描述 |
|----------|------|------|------|
| `11labs-Japanese-Female` | ja-JP | female | 日语女声 |

## 实际项目集成建议

### 1. 数据库设计
```sql
-- 为用户添加语言偏好
ALTER TABLE users ADD COLUMN preferred_language VARCHAR(10) DEFAULT 'zh';

-- 为 Agent 添加语言标签
CREATE TABLE agent_languages (
  agent_id VARCHAR(255) PRIMARY KEY,
  language_code VARCHAR(10) NOT NULL,
  voice_id VARCHAR(255) NOT NULL
);
```

### 2. 前端集成
```typescript
// 获取用户语言偏好
const userLanguage = await getUserLanguage();

// 获取对应语言的 Agent
const agent = await getAgentByLanguage(userLanguage);

// 创建通话
const webCall = await createWebCall(agent.agent_id);
```

### 3. 自动语言检测流程
```typescript
// 在 Web Call 页面
const handleStartCall = async () => {
  // 1. 获取用户设置的偏好语言
  const preferredLanguage = localStorage.getItem('preferredLanguage') || 'zh';
  
  // 2. 获取对应语言的 Agent
  const agents = await fetch('/api/agents').then(r => r.json());
  const agent = agents.data.find(a => a.language === preferredLanguage);
  
  // 3. 创建 Web Call
  const webCall = await fetch('/api/calls', {
    method: 'POST',
    body: JSON.stringify({
      agent_id: agent.agent_id,
      call_type: 'web_call',
      metadata: { language: preferredLanguage }
    })
  }).then(r => r.json());
  
  // 4. 跳转到通话页面
  router.push(`/calls/web/${webCall.call_id}?token=${webCall.access_token}`);
};
```

## 总结

| 方案 | 复杂度 | 灵活性 | 适用场景 |
|------|--------|--------|----------|
| 静态配置 | 低 | 中 | 固定语言场景 |
| 动态变量 | 中 | 高 | 多语言切换 |
| 自定义 LLM | 高 | 最高 | 复杂语言处理 |

**推荐使用方案一**：为每种语言创建独立的 Agent，简单可靠，延迟最低。
