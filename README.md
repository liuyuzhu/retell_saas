# Retell AI Management Console

A comprehensive management dashboard for Retell AI voice platform, providing full API integration and a modern admin interface.

## Features

### 📞 Phone Numbers Management
- List all phone numbers
- Create new phone numbers
- Update phone number settings
- Delete phone numbers
- Configure inbound/outbound call recording

### 🤖 AI Agents Management
- Create and configure AI voice agents
- Customize agent behavior (voice, LLM model, temperature)
- Set up response engines (Retell LLM, BYO LLM, LLM Webhook)
- Configure emotional authenticity and interrupt sensitivity
- Enable backchannel and voicemail detection

### 📞 Calls Management
- Initiate phone calls
- Create web calls for browser integration
- View call history and status
- Access call recordings
- Monitor call analytics

### 🎙️ Voices Library
- Browse available voices
- Filter by language, gender, accent
- Listen to voice samples
- View voice specifications

### 💬 Conversations History
- View conversation transcripts
- Access call analysis and summaries
- Monitor sentiment analysis
- Review conversation metadata

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **Icons**: Lucide React

## Getting Started

### Prerequisites

1. A Retell AI account - [Sign up here](https://www.retellai.com/)
2. An API key from the Retell AI dashboard

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Create a `.env.local` file with your API key:
   ```
   RETELL_API_KEY=your_api_key_here
   ```

4. Start the development server:
   ```bash
   pnpm dev
   ```

5. Open [http://localhost:5000](http://localhost:5000) in your browser

## API Endpoints

### Phone Numbers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/phone-numbers` | List all phone numbers |
| POST | `/api/phone-numbers` | Create a new phone number |
| GET | `/api/phone-numbers/[number]` | Get phone number details |
| PATCH | `/api/phone-numbers/[number]` | Update phone number |
| DELETE | `/api/phone-numbers/[number]` | Delete phone number |

### Agents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents` | List all agents |
| POST | `/api/agents` | Create a new agent |
| GET | `/api/agents/[id]` | Get agent details |
| PATCH | `/api/agents/[id]` | Update agent |
| DELETE | `/api/agents/[id]` | Delete agent |

### Calls
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/calls` | List all calls |
| POST | `/api/calls` | Create a phone/web call |
| GET | `/api/calls/[id]` | Get call details |
| DELETE | `/api/calls/[id]` | Delete call |

### Voices
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/voices` | List all voices |
| GET | `/api/voices/[id]` | Get voice details |

### Conversations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/conversations` | List all conversations |
| GET | `/api/conversations/[id]` | Get conversation details |
| DELETE | `/api/conversations/[id]` | Delete conversation |

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── phone-numbers/
│   │   ├── agents/
│   │   ├── calls/
│   │   ├── voices/
│   │   └── conversations/
│   ├── phone-numbers/     # Phone numbers management page
│   ├── agents/            # Agents management page
│   ├── calls/             # Calls management page
│   ├── voices/            # Voices browser page
│   ├── conversations/     # Conversations history page
│   └── settings/          # Settings page
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── app-sidebar.tsx   # Sidebar navigation
│   └── dashboard-layout.tsx
└── lib/                   # Utilities and API client
    ├── retell-client.ts  # Retell AI API client
    ├── retell-types.ts   # TypeScript type definitions
    └── utils.ts          # Utility functions
```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `RETELL_API_KEY` | Your Retell AI API key | Yes |

### API Version

The client supports different API versions. You can modify the `apiVersion` parameter in the `RetellClient` constructor:
- `'default'` - Standard Retell AI endpoints
- `'v1'` - Version 1 API
- `'v2'` - Version 2 API (if available)

## Documentation

- [Retell AI Official Documentation](https://docs.retellai.com/)
- [Retell AI Website](https://www.retellai.com/)

## License

MIT
