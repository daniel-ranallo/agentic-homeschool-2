/**
 * LangGraph Node Implementations
 * Each node handles a phase of the backward design process with HITL interrupts
 */

import { interrupt, Command } from "@langchain/langgraph";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { CourseDesignAnnotation, CLO, Assessment, Module, LessonPlan, NodeStatus } from "./state";
import { createChatModelConfigured } from "../llm-adapter";

/**
 * Generate system prompt for course design
 */
function getSystemPrompt(phase: string): string {
  const basePrompt = `You are an expert curriculum designer specializing in Backward Design methodology.

Backward Design follows this flow:
1. Course Title & Learning Outcomes (CLOs) - Define what students should know/do
2. Summative Assessments - Create capstones that evaluate the CLOs
3. Modules - Break down assessments into learning units
4. Daily Lesson Plans - Create 50-minute active learning sessions

Key principles:
- Use Bloom's Taxonomy for CLOs (Remember, Understand, Apply, Analyze, Evaluate, Create)
- Ensure assessments directly measure CLOs
- Maintain scope discipline - each branch focuses only on its assigned topics
- Avoid redundancy across branches
- Ensure prerequisite concepts are taught before advanced topics`;

  const phasePrompts: Record<string, string> = {
    goals: `Generate 3-5 high-level Course Learning Outcomes (CLOs) using Bloom's Taxonomy.
Each CLO should be:
- Measurable and specific
- Use action verbs from Bloom's Taxonomy
- Aligned with the course title and level
Format each CLO with: id, text, bloomLevel (the taxonomy level), and a brief rationale.`,

    assessments: `Generate 2-4 major summative assessments/capstones that evaluate the locked CLOs.
Each assessment should:
- Directly measure one or more CLOs
- Be appropriate for the course level
- Include variety in assessment types (projects, exams, presentations, etc.)
Format each assessment with: id, title, description, type, and closEvaluated (array of CLO IDs).`,

    modules: `Generate a module breakdown for the specified assessment.
IMPORTANT: This assessment focuses on specific goals. Other assessments (listed in sibling context) handle different goals - DO NOT duplicate content.
Each module should:
- Cover a coherent topic area within the assessment scope
- Include clear learning objectives
- Build logically from foundational to advanced concepts
Format each module with: id, title, description, topics (array), and assessmentId.`,

    lessons: `Generate daily 50-minute lesson plans for the specified module.
IMPORTANT: Stay within this module's scope. Other modules handle different topics.
Each lesson should include:
- Clear learning objectives for the day
- Hook/engagement activity (5-10 min)
- Direct instruction (15-20 min)
- Application activity (15-20 min)
- Wrap-up/assessment (5 min)
Format each lesson with: id, title, duration, objectives, hook, directInstruction, application, wrapUp, and moduleId.`,

    synthesis: `Review the complete course design for:
- Redundancies across branches
- Missing prerequisite concepts
- Alignment between lessons and original CLOs
- Logical flow and progression
Provide specific recommendations for improvements.`,
  };

  return `${basePrompt}\n\n${phasePrompts[phase] || ""}`;
}

/**
 * Generate or refine course goals based on feedback
 */
export async function generateGoalsNode(state: typeof CourseDesignAnnotation.State) {
  console.log("Generating course goals...");

  const model = await createChatModelConfigured({ temperature: 0.7 });

  const prompt = `Course Title: ${state.courseTitle}
${state.gradeLevel ? `Grade/Skill Level: ${state.gradeLevel}` : ""}
${state.skills ? `Skills Focus: ${state.skills}` : ""}

Previous feedback (if any): ${state.messages.filter(m => m instanceof HumanMessage).map(m => m.content).join("\n")}

Please ${state.clos.length > 0 ? "refine" : "generate"} 3-5 Course Learning Outcomes (CLOs).`;

  const response = await model.invoke([
    { role: "system", content: getSystemPrompt("goals") },
    { role: "user", content: prompt },
  ]);

  // Parse the response into CLOs
  const generatedClos: CLO[] = parseCLOs(response.content as string);

  // Interrupt and wait for human feedback
  const humanFeedback: any = interrupt({
    type: "REVIEW_GOALS",
    proposal: generatedClos,
    message: "Please review the proposed Course Learning Outcomes.",
  });

  // Handle the feedback
  if (humanFeedback.approved) {
    return {
      clos: generatedClos.map(c => ({ ...c, approved: true })),
      status: "LOCKED" as NodeStatus,
      currentPhase: "assessments" as const,
      messages: [new AIMessage(response.content as string)],
    };
  }

  // Loop back with feedback
  return new Command({
    goto: "generateGoalsNode",
    update: {
      messages: [new HumanMessage(humanFeedback.feedback || "No feedback provided, please try again.")],
    },
  });
}

/**
 * Generate summative assessments based on locked CLOs
 */
export async function generateAssessmentsNode(state: typeof CourseDesignAnnotation.State) {
  console.log("Generating assessments...");

  const model = await createChatModelConfigured({ temperature: 0.7 });

  const closText = state.clos.map(c => `- ${c.id}: ${c.text}`).join("\n");

  const prompt = `Course Title: ${state.courseTitle}
Locked CLOs:
${closText}

Please generate 2-4 major summative assessments that evaluate these CLOs.`;

  const response = await model.invoke([
    { role: "system", content: getSystemPrompt("assessments") },
    { role: "user", content: prompt },
  ]);

  const assessments: Assessment[] = parseAssessments(response.content as string, state.clos);

  const humanFeedback: any = interrupt({
    type: "REVIEW_ASSESSMENTS",
    proposal: assessments,
    message: "Please review the proposed assessments.",
  });

  if (humanFeedback.approved) {
    return {
      assessments: assessments.map(a => ({ ...a, approved: true })),
      status: "LOCKED" as NodeStatus,
      currentPhase: "modules" as const,
      messages: [new AIMessage(response.content as string)],
    };
  }

  return new Command({
    goto: "generateAssessmentsNode",
    update: {
      messages: [new HumanMessage(humanFeedback.feedback || "No feedback provided, please try again.")],
    },
  });
}

/**
 * Generate modules for a specific assessment (called in parallel)
 */
export async function generateModulesNode(state: typeof CourseDesignAnnotation.State, config: { assessmentId: string }) {
  console.log(`Generating modules for assessment: ${config.assessmentId}`);

  const model = await createChatModelConfigured({ temperature: 0.7 });

  const assessment = state.assessments.find(a => a.id === config.assessmentId);
  if (!assessment) {
    throw new Error(`Assessment not found: ${config.assessmentId}`);
  }

  // Build sibling context
  const siblingAssessments = state.assessments
    .filter(a => a.id !== config.assessmentId)
    .map(a => ({ id: a.id, title: a.title, description: a.description }));

  const prompt = `Assessment: ${assessment.title}
Description: ${assessment.description}
CLOs Evaluated: ${assessment.closEvaluated.join(", ")}

OUT OF SCOPE (Handled by other assessments):
${siblingAssessments.map(a => `- ${a.title}: ${a.description}`).join("\n")}

Please generate a module breakdown for this assessment only.`;

  const response = await model.invoke([
    { role: "system", content: getSystemPrompt("modules") },
    { role: "user", content: prompt },
  ]);

  const modules: Module[] = parseModules(response.content as string, config.assessmentId);

  const humanFeedback: any = interrupt({
    type: "REVIEW_MODULES",
    proposal: modules,
    message: `Please review the modules for "${assessment.title}".`,
    assessmentId: config.assessmentId,
  });

  if (humanFeedback.approved) {
    return {
      modules: [...state.modules, ...modules.map(m => ({ ...m, approved: true }))],
      [config.assessmentId]: "LOCKED", // Track which assessment's modules are locked
    };
  }

  return new Command({
    goto: "generateModulesNode",
    update: {
      messages: [new HumanMessage(humanFeedback.feedback || "No feedback provided, please try again.")],
    },
  });
}

/**
 * Generate daily lesson plans for a specific module (called in parallel)
 */
export async function generateLessonsNode(state: typeof CourseDesignAnnotation.State, config: { moduleId: string }) {
  console.log(`Generating lessons for module: ${config.moduleId}`);

  const model = await createChatModelConfigured({ temperature: 0.7 });

  const module = state.modules.find(m => m.id === config.moduleId);
  if (!module) {
    throw new Error(`Module not found: ${config.moduleId}`);
  }

  // Build sibling context
  const siblingModules = state.modules
    .filter(m => m.id !== config.moduleId)
    .map(m => ({ id: m.id, title: m.title }));

  const prompt = `Module: ${module.title}
Description: ${module.description}
Topics: ${module.topics.join(", ")}

OUT OF SCOPE (Handled by other modules):
${siblingModules.map(m => `- ${m.title}`).join("\n")}

Please generate daily 50-minute lesson plans for this module only.`;

  const response = await model.invoke([
    { role: "system", content: getSystemPrompt("lessons") },
    { role: "user", content: prompt },
  ]);

  const lessons: LessonPlan[] = parseLessons(response.content as string, config.moduleId);

  const humanFeedback: any = interrupt({
    type: "REVIEW_LESSONS",
    proposal: lessons,
    message: `Please review the lesson plans for "${module.title}".`,
    moduleId: config.moduleId,
  });

  if (humanFeedback.approved) {
    return {
      dailyLessons: [...state.dailyLessons, ...lessons.map(l => ({ ...l, approved: true }))],
      [config.moduleId]: "LOCKED",
    };
  }

  return new Command({
    goto: "generateLessonsNode",
    update: {
      messages: [new HumanMessage(humanFeedback.feedback || "No feedback provided, please try again.")],
    },
  });
}

/**
 * Global synthesis node - runs after all lessons are locked
 */
export async function synthesisNode(state: typeof CourseDesignAnnotation.State) {
  console.log("Running global synthesis...");

  const model = await createChatModelConfigured({ temperature: 0.6 });

  const closText = state.clos.map(c => `- ${c.text}`).join("\n");
  const assessmentsText = state.assessments.map(a => `- ${a.title}: ${a.description}`).join("\n");
  const modulesText = state.modules.map(m => `- ${m.title}: ${m.topics.join(", ")}`).join("\n");
  const lessonsText = state.dailyLessons.map(l => `- ${l.title}`).join("\n");

  const prompt = `Complete Course Design Review

Course Title: ${state.courseTitle}

CLOs:
${closText}

Assessments:
${assessmentsText}

Modules:
${modulesText}

Lessons:
${lessonsText}

Please analyze this complete course design for:
1. Redundancies across branches
2. Missing prerequisite concepts
3. Alignment between lessons and CLOs
4. Recommendations for improvements`;

  const response = await model.invoke([
    { role: "system", content: getSystemPrompt("synthesis") },
    { role: "user", content: prompt },
  ]);

  return {
    status: "LOCKED" as NodeStatus,
    currentPhase: "synthesis" as const,
    synthesis: response.content as string,
    messages: [new AIMessage(response.content as string)],
  };
}

// ============ Parsing Helpers ============

function parseCLOs(text: string): CLO[] {
  // Simple parsing - in production, use more robust JSON parsing
  const lines = text.split("\n").filter(l => l.trim());
  const clos: CLO[] = [];

  lines.forEach((line, idx) => {
    const match = line.match(/^(?:\d+\.?\s*|\*\s*)?([^-\n]+)$/i);
    if (match) {
      clos.push({
        id: `clo-${idx + 1}`,
        text: match[1].trim(),
        bloomLevel: "Apply", // Default, would be extracted in production
        approved: false,
      });
    }
  });

  return clos.length > 0 ? clos : [{
    id: "clo-1",
    text: text.substring(0, 200),
    bloomLevel: "Understand",
    approved: false,
  }];
}

function parseAssessments(text: string, clos: CLO[]): Assessment[] {
  const lines = text.split("\n").filter(l => l.trim());
  const assessments: Assessment[] = [];

  let currentAssessment: Partial<Assessment> = {};
  let currentId = 0;

  lines.forEach(line => {
    if (line.match(/^\d+\.?\s*|^-\s*/)) {
      if (currentAssessment.title) {
        assessments.push(currentAssessment as Assessment);
      }
      currentId++;
      currentAssessment = {
        id: `assessment-${currentId}`,
        title: line.replace(/^-?\s*\d+\.?\s*/, "").trim(),
        description: "",
        type: "Project",
        closEvaluated: clos.slice(0, 2).map(c => c.id),
        approved: false,
      };
    } else if (currentAssessment.title) {
      currentAssessment.description += " " + line;
    }
  });

  if (currentAssessment.title) {
    assessments.push(currentAssessment as Assessment);
  }

  return assessments.length > 0 ? assessments : [{
    id: "assessment-1",
    title: "Capstone Project",
    description: text.substring(0, 200),
    type: "Project",
    closEvaluated: clos.map(c => c.id),
    approved: false,
  }];
}

function parseModules(text: string, assessmentId: string): Module[] {
  const lines = text.split("\n").filter(l => l.trim());
  const modules: Module[] = [];

  let currentModule: Partial<Module> = {};
  let currentId = 0;

  lines.forEach(line => {
    if (line.match(/^\d+\.?\s*|^-\s*Module/i)) {
      if (currentModule.title) {
        modules.push(currentModule as Module);
      }
      currentId++;
      currentModule = {
        id: `module-${currentId}`,
        title: line.replace(/^-?\s*\d+\.?\s*Module\s*/i, "").trim(),
        description: "",
        topics: [],
        assessmentId,
        approved: false,
      };
    } else if (currentModule.title) {
      if (line.match(/^-?\s*/)) {
        currentModule.topics?.push(line.replace(/^-?\s*/, "").trim());
      } else {
        currentModule.description += " " + line;
      }
    }
  });

  if (currentModule.title) {
    modules.push(currentModule as Module);
  }

  return modules.length > 0 ? modules : [{
    id: "module-1",
    title: "Introduction",
    description: text.substring(0, 200),
    topics: ["Overview", "Key Concepts"],
    assessmentId,
    approved: false,
  }];
}

function parseLessons(text: string, moduleId: string): LessonPlan[] {
  const lines = text.split("\n").filter(l => l.trim());
  const lessons: LessonPlan[] = [];

  let currentLesson: Partial<LessonPlan> = {};
  let currentId = 0;

  lines.forEach(line => {
    if (line.match(/^\d+\.?\s*|^-\s*Lesson|^Lesson\s*\d+/i)) {
      if (currentLesson.title) {
        lessons.push(currentLesson as LessonPlan);
      }
      currentId++;
      currentLesson = {
        id: `lesson-${currentId}`,
        title: line.replace(/^-?\s*\d+\.?\s*|^-\s*Lesson\s*|Lesson\s*\d+/i, "").trim() || `Lesson ${currentId}`,
        duration: 50,
        objectives: [],
        hook: "",
        directInstruction: "",
        application: "",
        wrapUp: "",
        moduleId,
        approved: false,
      };
    } else if (currentLesson.title) {
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes("hook") || lowerLine.includes("engagement")) {
        currentLesson.hook = line.split(":")[1] || line;
      } else if (lowerLine.includes("direct instruction") || lowerLine.includes("teaching")) {
        currentLesson.directInstruction = line.split(":")[1] || line;
      } else if (lowerLine.includes("application") || lowerLine.includes("activity")) {
        currentLesson.application = line.split(":")[1] || line;
      } else if (lowerLine.includes("wrap") || lowerLine.includes("closure")) {
        currentLesson.wrapUp = line.split(":")[1] || line;
      } else if (line.match(/^-?\s*/)) {
        currentLesson.objectives?.push(line.replace(/^-?\s*/, "").trim());
      }
    }
  });

  if (currentLesson.title) {
    lessons.push(currentLesson as LessonPlan);
  }

  return lessons.length > 0 ? lessons : [{
    id: "lesson-1",
    title: "Introduction to Topic",
    duration: 50,
    objectives: ["Understand key concepts"],
    hook: "Brief introduction and motivation",
    directInstruction: "Core concepts explanation",
    application: "Practice exercises",
    wrapUp: "Summary and Q&A",
    moduleId,
    approved: false,
  }];
}
