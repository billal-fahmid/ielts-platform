export type FieldConfig = {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "checkbox" | "json-list" | "relation" | "relation-multi";
  options?: string[];
  required?: boolean;
  /** Small helper text under the field. */
  hint?: string;
  /** Visible lines for textarea fields. */
  rows?: number;
  /**
   * For type "relation" (pick one) or "relation-multi" (pick several): records of another resource.
   * `labelKey` is the column shown to the admin; `filter` limits the choices to records whose column equals the value.
   */
  relation?: { resource: string; labelKey: string; filter?: { key: string; value: string } };
};

export type ResourceMeta = {
  label: string;
  fields: FieldConfig[];
  listColumns: string[];
};

export const resourceMeta: Record<string, ResourceMeta> = {
  courses: {
    label: "Courses",
    listColumns: ["title", "category", "track", "published"],
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea", required: true },
      { key: "category", label: "Category", type: "select", options: ["BEGINNER", "ELEMENTARY", "INTERMEDIATE", "ADVANCED"], required: true },
      { key: "track", label: "Track", type: "select", options: ["ENGLISH", "IELTS"], required: true },
      { key: "image", label: "Image path", type: "text" },
      { key: "order", label: "Order", type: "number" },
      { key: "published", label: "Published", type: "checkbox" },
    ],
  },
  modules: {
    label: "Modules",
    listColumns: ["title", "courseId", "order"],
    fields: [
      { key: "courseId", label: "Course ID", type: "text", required: true },
      { key: "title", label: "Title", type: "text", required: true },
      { key: "order", label: "Order", type: "number" },
    ],
  },
  lessons: {
    label: "Lessons",
    listColumns: ["title", "moduleId", "xpReward", "order"],
    fields: [
      { key: "moduleId", label: "Module ID", type: "text", required: true },
      { key: "title", label: "Title", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea" },
      { key: "content", label: "Content", type: "textarea", required: true },
      { key: "videoUrl", label: "Video URL", type: "text" },
      { key: "audioUrl", label: "Audio URL", type: "text" },
      { key: "xpReward", label: "XP Reward", type: "number" },
      { key: "order", label: "Order", type: "number" },
    ],
  },
  vocabulary: {
    label: "Vocabulary",
    listColumns: ["word", "meaning", "category", "difficulty"],
    fields: [
      { key: "word", label: "Word", type: "text", required: true },
      { key: "meaning", label: "Meaning", type: "text", required: true },
      { key: "banglaMeaning", label: "Bangla meaning", type: "text" },
      { key: "pronunciation", label: "Pronunciation", type: "text" },
      { key: "example", label: "Example sentence", type: "textarea" },
      { key: "synonym", label: "Synonym", type: "text" },
      { key: "antonym", label: "Antonym", type: "text" },
      { key: "difficulty", label: "Difficulty", type: "select", options: ["EASY", "MEDIUM", "HARD"] },
      { key: "category", label: "Category", type: "select", options: ["DAILY", "IELTS", "ACADEMIC", "GENERAL"] },
    ],
  },
  grammarTopics: {
    label: "Grammar Topics",
    listColumns: ["title", "order"],
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "description", label: "Short description", type: "text" },
      { key: "explanation", label: "Explanation", type: "textarea", required: true },
      { key: "order", label: "Order", type: "number" },
    ],
  },
  quizzes: {
    label: "Quizzes",
    listColumns: ["title", "type"],
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "type", label: "Type", type: "select", options: ["LESSON", "GRAMMAR", "ASSESSMENT", "MOCK_TEST"], required: true },
      { key: "lessonId", label: "Lesson ID (optional)", type: "text" },
      { key: "grammarTopicId", label: "Grammar Topic ID (optional)", type: "text" },
    ],
  },
  questions: {
    label: "Questions",
    listColumns: ["prompt", "type", "quizId"],
    fields: [
      { key: "quizId", label: "Quiz ID", type: "text", required: true },
      { key: "type", label: "Type", type: "select", options: ["MCQ", "TRUE_FALSE", "FILL_BLANK"], required: true },
      { key: "prompt", label: "Prompt", type: "textarea", required: true },
      { key: "options", label: "Options (one per line)", type: "json-list" },
      { key: "correctAnswer", label: "Correct answer", type: "text", required: true },
      { key: "explanation", label: "Explanation", type: "textarea" },
      { key: "skillCategory", label: "Skill category", type: "select", options: ["GRAMMAR", "VOCABULARY", "READING", "LISTENING"] },
      { key: "order", label: "Order", type: "number" },
    ],
  },
  badges: {
    label: "Badges",
    listColumns: ["title", "code"],
    fields: [
      { key: "code", label: "Code", type: "text", required: true },
      { key: "title", label: "Title", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea", required: true },
      { key: "icon", label: "Icon (lucide name)", type: "text" },
    ],
  },
  users: {
    label: "Users",
    listColumns: ["name", "email", "role"],
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "role", label: "Role", type: "select", options: ["STUDENT", "TEACHER", "ADMIN"], required: true },
    ],
  },

  // ---------- IELTS content (questions have their own page: /admin/ielts-questions) ----------
  readingPassages: {
    label: "Reading Passages",
    listColumns: ["title", "testType", "passageNumber", "difficulty", "wordCount", "published"],
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "testType", label: "Test type", type: "select", options: ["ACADEMIC", "GENERAL_TRAINING"], required: true },
      { key: "passageNumber", label: "Passage number (1-3)", type: "number" },
      { key: "topic", label: "Topic", type: "text" },
      { key: "difficulty", label: "Difficulty", type: "select", options: ["EASY", "MEDIUM", "HARD"], required: true },
      { key: "timeLimitSeconds", label: "Time limit (seconds)", type: "number", hint: "1200 = 20 minutes" },
      { key: "bodyText", label: "Passage text", type: "textarea", required: true, rows: 10, hint: "Leave a blank line between paragraphs." },
      { key: "published", label: "Published", type: "checkbox", hint: "A passage can be published once it has at least one published question." },
    ],
  },
  listeningTests: {
    label: "Listening Tests",
    listColumns: ["title", "difficulty", "timeLimitSeconds", "published"],
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "difficulty", label: "Difficulty", type: "select", options: ["EASY", "MEDIUM", "HARD"], required: true },
      { key: "timeLimitSeconds", label: "Time limit (seconds)", type: "number", hint: "1800 = 30 minutes" },
      { key: "published", label: "Published", type: "checkbox", hint: "A test can be published once it has a section with a published question." },
    ],
  },
  listeningSections: {
    label: "Listening Sections",
    listColumns: ["listeningTestId", "sectionNumber", "context", "audioUrl", "order"],
    fields: [
      { key: "listeningTestId", label: "Listening test", type: "relation", relation: { resource: "listeningTests", labelKey: "title" }, required: true },
      { key: "sectionNumber", label: "Section number (1-4)", type: "number", required: true },
      { key: "audioUrl", label: "Audio path or URL", type: "text", required: true, hint: "For example /audio/listening/my-test-s1.wav (a file inside the public folder) or a full https:// link." },
      { key: "context", label: "Context shown to students", type: "textarea", rows: 2, hint: "One sentence, e.g. “A conversation between a student and a receptionist.”" },
      { key: "transcript", label: "Transcript", type: "textarea", rows: 8, hint: "Hidden until the student submits the test." },
      { key: "order", label: "Order", type: "number" },
    ],
  },
  writingPrompts: {
    label: "Writing Prompts",
    listColumns: ["taskType", "category", "promptText", "published"],
    fields: [
      { key: "taskType", label: "Task", type: "select", options: ["TASK1", "TASK2"], required: true },
      {
        key: "category",
        label: "Category",
        type: "select",
        options: ["GRAPH", "CHART", "TABLE", "MAP", "PROCESS", "OPINION", "DISCUSSION", "ADVANTAGE_DISADVANTAGE", "PROBLEM_SOLUTION", "TWO_PART"],
        required: true,
        hint: "Task 1: graph, chart, table, map, process. Task 2: opinion, discussion, advantage/disadvantage, problem/solution, two-part.",
      },
      { key: "promptText", label: "Prompt", type: "textarea", required: true, rows: 6 },
      { key: "imageUrl", label: "Task 1 image path or URL", type: "text", hint: "For example /writing/my-chart.svg" },
      { key: "visualDescription", label: "Text description of the visual", type: "textarea", rows: 4, hint: "Required for Task 1. Used as alt text and given to the AI, which cannot see the image." },
      { key: "published", label: "Published", type: "checkbox" },
    ],
  },
  speakingPrompts: {
    label: "Speaking Prompts",
    listColumns: ["part", "topic", "questionText", "published"],
    fields: [
      { key: "part", label: "Part", type: "select", options: ["PART1", "PART2", "PART3"], required: true },
      { key: "topic", label: "Topic", type: "text", required: true },
      {
        key: "questionText",
        label: "Question or cue card",
        type: "textarea",
        required: true,
        rows: 6,
        hint: "Part 2 cue cards: first line is the task, then “You should say:” with one “- point” per line.",
      },
      { key: "followUpOfTopic", label: "Follows Part 2 topic (Part 3 only)", type: "text", hint: "Type the exact topic of the Part 2 cue card this question follows." },
      { key: "published", label: "Published", type: "checkbox" },
    ],
  },
  mockTests: {
    label: "Mock Tests",
    listColumns: ["title", "testType", "listeningTestId", "readingPassageIds", "published"],
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "testType", label: "Test type", type: "select", options: ["ACADEMIC", "GENERAL_TRAINING"], required: true },
      { key: "listeningTestId", label: "Listening test", type: "relation", relation: { resource: "listeningTests", labelKey: "title" }, required: true },
      {
        key: "readingPassageIds",
        label: "Reading passages",
        type: "relation-multi",
        relation: { resource: "readingPassages", labelKey: "title" },
        required: true,
        hint: "Passages run in passage-number order, each on its own clock.",
      },
      {
        key: "writingTask1PromptId",
        label: "Writing Task 1 prompt",
        type: "relation",
        relation: { resource: "writingPrompts", labelKey: "promptText", filter: { key: "taskType", value: "TASK1" } },
        required: true,
      },
      {
        key: "writingTask2PromptId",
        label: "Writing Task 2 prompt",
        type: "relation",
        relation: { resource: "writingPrompts", labelKey: "promptText", filter: { key: "taskType", value: "TASK2" } },
        required: true,
      },
      {
        key: "published",
        label: "Published",
        type: "checkbox",
        hint: "Everything above must be published and have published questions. Speaking uses the published Speaking prompts.",
      },
    ],
  },
};
