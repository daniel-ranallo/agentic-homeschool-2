# TASK SPECIFICATION: Build an Agentic Course Design Workbench (LangGraph.js + Next.js)

You are an expert full-stack developer and AI systems architect. Your task is to build a complete, production-ready system called the **Agentic Course Design Workbench**. 

This system automates and guides educators through a top-down **Backward Design** curriculum methodology (Course Title -> Primary Goal/CLOs -> Summative Assessments -> Modules -> Daily Lesson Plans). Every stage features a **Human-in-the-Loop (HITL)** iterative chat interface to refine content, locking steps in before triggering parallel child sub-graphs.

---

## 1. System Architecture & Tech Stack

Build the system using the following stack:
1. **Frontend UI**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide Icons, Shadcn UI components.
2. **Backend & Graph Orchestration**: LangGraph.js (`@langchain/langgraph`) using a dynamic LLM provider adapter that auto-detects available models from the DGX Spark endpoint.
3. **State Persistence & Checkpoint Engine**: `@langchain/langgraph-checkpoint-postgres` (`PostgresSaver`) for durable state graph checkpoints, enabling multi-turn human interrupts and thread resumption.
4. **Domain Database**: PostgreSQL (via Prisma ORM) to manage user accounts, course tree metadata, and message logs.
5. **Containerization**: `docker-compose.yml` to spin up Next.js (App + LangGraph Runtime) and PostgreSQL.

### LLM Provider Configuration
- **Primary Endpoint**: `http://spark.ranallohome.com:8001` (DGX Spark on local network)
- **Dual API Support**: Both OpenAI and Anthropic-compatible APIs available
- **Auto-detection**: System detects available model at startup and switches gracefully when a model is unavailable
- **Simple Authentication**: Basic auth system for user accounts (no external identity provider needed)

### MVP Scope
- Build a minimal viable product that demonstrates the core Backward Design flow
- Non-MVP features documented in TODO.md for future implementation
- All code must run in Docker with complete docker-compose for production deployment
- Server-Sent Events (SSE) for streaming responses

---

## 2. Core Domain Model: Hierarchical Backward Design

The workflow follows a 5-level recursive tree structure:
[Level 0: Course Title]
│
[Level 1: Course Learning Outcomes (CLOs) / Primary Goal]
│
[Level 2: Summative Assessments / Capstones] (Array)
│───► [Assessment 1] ───► [Level 3: Modules] ───► [Level 4: Daily Lessons]
│───► [Assessment 2] ───► [Level 3: Modules] ───► [Level 4: Daily Lessons]
└───► [Assessment N] ───► ...
│
[Level 5: Global Alignment & Synthesis]
---

## 3. Detailed Phase Specifications & Flow

### Phase 1: Course Title & Primary Goal (CLO) Iteration
* **Input**: User enters a Course Title (and optional grade/skill level).
* **Process**: Triggers LangGraph node `generate_course_goal`.
* **HITL Loop**: LLM proposes 3–5 high-level Course Learning Outcomes (CLOs) using Bloom's Taxonomy. The graph invokes `interrupt()` to pause execution and await user review. The user provides feedback in the chat UI ("Focus more on hands-on building"). Resuming via `Command({ resume: feedback })` feeds feedback back into the node until the user sends an approval signal.
* **Lock**: On approval, state updates to `LOCKED` and advances to Phase 2.

### Phase 2: Summative Assessment & Capstone Generation
* **Input**: Locked CLOs.
* **Process**: LangGraph node `generate_assessments`.
* **HITL Loop**: LLM proposes 2–4 major summative assessments/capstones evaluating the locked CLOs. Pauses execution via `interrupt()` for human refinement.
* **Lock**: User approves and locks assessments.

### Phase 3: Fan-Out to Modules (Sibling-Aware Parallelization)
* **Trigger**: On locking Phase 2, the graph uses LangGraph's `Send` API to map each locked assessment into parallel module generation nodes.
* **CRITICAL REQUIREMENT - Sibling Context**: Each branch MUST receive a state payload containing:
  1. `parent_course_goal`: Global course goals.
  2. `current_assessment`: The specific assessment this module set belongs to.
  3. `sibling_assessments`: A summary array of ALL OTHER assessments in the course, explicitly labeled: *"OUT OF SCOPE FOR THIS BRANCH — these goals/topics are handled by other assessments."*
* **HITL Loop**: User iterates on the module breakdown *per assessment* in a tabbed UI, handled via sub-graph interrupts.
* **Lock**: User approves each assessment's module list.

### Phase 4: Fan-Out to Daily Lesson Plans
* **Trigger**: On locking a Module set, fan-out via `Send` to daily lesson generation nodes for each module.
* **Sibling Context**: Passes parent goal, parent assessment, current module, and `sibling_modules` (*"Out of scope for this module"*).
* **HITL Loop**: Generates structured 50-minute/daily active learning plans (Hook, Direct Instruction, Application, Wrap-up). User refines and locks daily plans.

### Phase 5: Global Synthesis, Alignment & De-duplication
* **Trigger**: Once ALL leaf nodes (Daily Lessons) reach `LOCKED` state.
* **Process**: Triggers `global_synthesis` aggregation node.
* **Logic**: LangGraph collects the full course tree state and evaluates:
  - Redundancies across different branches.
  - Missing prerequisite concepts.
  - Alignment between Daily Lessons and original CLOs.
* **UI**: Displays a final side-by-side Course Blueprint dashboard with a downloadable JSON/Markdown export.

---

## 4. Database Schema (Prisma)

Design a schema in `prisma/schema.prisma` containing:

```prisma
enum NodeStatus {
  DRAFTING
  IN_REVIEW
  LOCKED
}

enum NodeType {
  COURSE
  GOAL
  ASSESSMENT
  MODULE
  LESSON
}

model CourseNode {
  id             String       @id @default(uuid())
  threadId       String       // Foreign lookup key to LangGraph checkpoint thread_id
  parentId       String?
  parent         CourseNode?  @relation("TreeHierarchy", fields: [parentId], references: [id])
  children       CourseNode[] @relation("TreeHierarchy")
  type           NodeType
  title          String
  content        Json         // Stores structured content generated by LLM
  status         NodeStatus   @default(DRAFTING)
  scopeContext   Json?        // Sibling context summary
  conversations  Message[]
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
}

model Message {
  id           String     @id @default(uuid())
  nodeId       String
  node         CourseNode @relation(fields: [nodeId], references: [id])
  role         String     // "user" | "assistant" | "system"
  content      String
  createdAt    DateTime   @default(now())
}
5. LangGraph.js State Graph Architecture
Implement the core graph modules in /src/lib/langgraph/:

A. State Schema (state.ts)
TypeScript
import { Annotation, BaseMessage, messagesStateReducer } from "@langchain/langgraph";

export const CourseDesignAnnotation = Annotation.Root({
  courseTitle: Annotation<string>,
  clos: Annotation<string[]>,
  assessments: Annotation<any[]>,
  modules: Annotation<any[]>,
  dailyLessons: Annotation<any[]>,
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  currentThreadId: Annotation<string>,
  activeNodeId: Annotation<string>,
  status: Annotation<"DRAFTING" | "INTERRUPTED" | "LOCKED">,
});
B. Node Definitions & Human-in-the-Loop (nodes.ts)
Use interrupt() to request human review and Command to handle thread updates:

TypeScript
import { interrupt, Command } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";

export async function goalIterationNode(state: typeof CourseDesignAnnotation.State) {
  // 1. Generate or refine course goals using ChatModel
  const proposal = await generateGoals(state.courseTitle, state.messages);
  
  // 2. Pause graph execution and wait for human input via UI
  const humanFeedback: any = interrupt({
    type: "REVIEW_GOALS",
    proposal,
    message: "Please review the proposed Course Learning Outcomes."
  });

  // 3. Evaluate human feedback on resumption via Command({ resume: ... })
  if (humanFeedback.approved) {
    return { 
      clos: proposal.clos, 
      status: "LOCKED" 
    };
  }

  // If rejected, loop back with human feedback appended to messages
  return new Command({
    goto: "goalIterationNode",
    update: {
      messages: [new HumanMessage(humanFeedback.feedback)],
    }
  });
}
C. Checkpointer Integration (graph.ts)
TypeScript
import { StateGraph } from "@langchain/langgraph";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const checkpointer = new PostgresSaver(pool);

// Must call setup() on initialization to create LangGraph checkpoint tables
await checkpointer.setup();

export const courseWorkflow = new StateGraph(CourseDesignAnnotation)
  .addNode("generate_goals", goalIterationNode)
  .addNode("generate_assessments", assessmentIterationNode)
  // ... Add fan-out map conditional edges via Send() ...
  .compile({ checkpointer });
D. Next.js API Endpoint for Execution & Resumption (/api/graph/route.ts)
TypeScript
import { courseWorkflow } from "@/lib/langgraph/graph";
import { Command } from "@langchain/langgraph";

export async function POST(req: Request) {
  const { threadId, userFeedback, isResume } = await req.json();
  const config = { configurable: { thread_id: threadId } };

  if (isResume) {
    // Resume an interrupted graph execution using Command
    const stream = await courseWorkflow.stream(
      new Command({ resume: userFeedback }),
      config
    );
    return new Response(stream);
  } else {
    // Initial graph invocation
    const stream = await courseWorkflow.stream({ courseTitle: userFeedback }, config);
    return new Response(stream);
  }
}
6. Frontend UI Requirements
Build a modern, intuitive dashboard:

Tree Navigation / Breadcrumb Header: Always displays current location in the curriculum hierarchy (e.g., Physics 101 > Assessment 2: Robotics Build > Module 3 > Lesson 2).

Split-Screen Workspace:

Left Panel: Interactive Chat Interface for giving feedback, requesting tweaks, or asking questions to the LLM.

Right Panel: Live visual renderer of the generated document/structure (structured markdown, tables, step-by-step cards) with a prominent "Approve & Lock Step" action button that sends { approved: true } to the graph resume route.

Scope Awareness Widget: A sidebar box showing "Active Focus" vs. "Explicitly Out of Scope (Handled by Siblings)" so the human reviewer can verify boundary discipline.

7. Deliverables Required
Prisma Database Layer: Complete schema and seeds.

LangGraph.js Graph Modules:

state.ts: Typed Annotation state schema.

nodes.ts: Node logic containing interrupt() and Command handling.

graph.ts: StateGraph assembly with PostgresSaver checkpointer setup.

Next.js Frontend & API Routes: Full chat + document review UI, server routes for graph streaming (stream()) and resumption (Command({ resume })).

Docker Compose Setup: Spun up with docker-compose up running Next.js and PostgreSQL (with automatic database migrations for both Prisma and PostgresSaver).

System Prompts: Embedded LLM prompt templates enforcing Backward Design, Bloom's Taxonomy, and strict sibling scope isolation.
