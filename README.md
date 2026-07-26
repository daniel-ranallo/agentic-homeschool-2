# Agentic Course Design Workbench

An AI-powered system that guides educators through Backward Design curriculum methodology using LangGraph.js for orchestration and Next.js for the frontend.

## Features

- **Backward Design Workflow**: Course Title → CLOs → Assessments → Modules → Lesson Plans
- **Human-in-the-Loop (HITL)**: Iterative chat interface for refining content at each stage
- **LangGraph Orchestration**: Durable workflow with checkpointing and resumption
- **Scope Awareness**: Explicit tracking of what's in/out of scope for each branch
- **Docker Deployment**: Complete containerized setup for production

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Node.js, LangGraph.js, LangChain
- **Database**: PostgreSQL with Prisma ORM
- **Orchestration**: LangGraph.js with PostgresSaver checkpointing
- **LLM**: DGX Spark endpoint (auto-detects available models)

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd agentic-homeschool-2
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start Docker services**
   ```bash
   docker-compose up -d postgres
   ```

4. **Install dependencies**
   ```bash
   npm install
   ```

5. **Run database migrations**
   ```bash
   npm run db:push
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open the application**
   Navigate to http://localhost:3000

### Production Deployment

1. **Copy docker-compose.yml to production server**

2. **Set environment variables** in `.env`:
   ```env
   DB_USER=postgres
   DB_PASSWORD=your-secure-password
   DB_NAME=course_design
   LLM_ENDPOINT=http://spark.ranallohome.com:8001
   AUTH_SECRET=your-production-secret
   ```

3. **Start the services**
   ```bash
   docker-compose up -d
   ```

4. **Verify deployment**
   ```bash
   docker-compose logs -f
   ```

## Project Structure

```
agentic-homeschool-2/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── [...nextauth]/route.ts
│   │   │   ├── courses/
│   │   │   │   └── [courseId]/nodes/route.ts
│   │   │   ├── graph/route.ts
│   │   │   ├── health/route.ts
│   │   │   └── nodes/[nodeId]/route.ts
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── breadcrumb.tsx
│   │   ├── chat-panel.tsx
│   │   ├── document-preview.tsx
│   │   └── scope-widget.tsx
│   └── lib/
│       ├── db.ts
│       ├── llm-adapter.ts
│       └── langgraph/
│           ├── graph.ts
│           ├── nodes.ts
│           └── state.ts
├── prisma/
│   └── schema.prisma
├── docker-compose.yml
├── Dockerfile
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── CLAUDE.md
├── CONTEXT.md
└── TODO.md
```

## Workflow Overview

### Phase 1: Course Title & Primary Goal (CLO) Iteration
- User enters course title and optional grade/skill level
- LLM proposes 3-5 high-level Course Learning Outcomes (CLOs)
- User reviews and provides feedback in chat
- Loop continues until user approves

### Phase 2: Summative Assessment & Capstone Generation
- LLM proposes 2-4 major summative assessments
- Each assessment evaluates the locked CLOs
- User reviews and approves

### Phase 3: Module Generation (Parallel)
- Fan-out to generate modules for each assessment
- Each branch receives sibling context (what's out of scope)
- User reviews modules per assessment

### Phase 4: Daily Lesson Plan Generation (Parallel)
- Fan-out to generate daily lessons for each module
- Each lesson is a 50-minute active learning plan
- User reviews lessons per module

### Phase 5: Global Synthesis
- Collects full course tree state
- Evaluates redundancies, missing concepts, alignment
- Displays course blueprint dashboard

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/courses` | GET | List all courses |
| `/api/courses` | POST | Create new course |
| `/api/courses/[courseId]/nodes` | GET | Get nodes for a course |
| `/api/nodes/[nodeId]` | GET | Get a specific node |
| `/api/nodes/[nodeId]` | POST | Update/lock a node |
| `/api/graph` | POST | Start/resume workflow |
| `/api/health` | GET | Health check |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | `postgres` |
| `DB_NAME` | Database name | `course_design` |
| `LLM_ENDPOINT` | LLM API endpoint | `http://spark.ranallohome.com:8001` |
| `LLM_PROVIDER` | LLM provider | `openai` |
| `AUTH_SECRET` | Auth secret key | `dev-secret-change-in-production` |
| `NODE_ENV` | Environment | `development` |

## Development Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:migrate` | Run database migrations |
| `npm run db:studio` | Open Prisma Studio |

## License

MIT
