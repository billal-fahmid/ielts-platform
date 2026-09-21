import { PLAN_FEATURES, FEATURE_LABELS, PLAN_CODES } from "@/lib/plans/features";

export type FieldConfig = {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "checkbox" | "json-list" | "relation" | "relation-multi" | "multi-select";
  options?: string[];
  /** For "multi-select": readable names for the option values. */
  optionLabels?: Record<string, string>;
  /** Shown but can't be changed once the record exists. */
  readOnly?: boolean;
  /** For numbers: an empty box saves "no value" (for example, no daily limit). */
  nullable?: boolean;
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
  /** For type "text": also offer to upload a file, and fill the field with its link. */
  upload?: { kinds: ("VIDEO" | "AUDIO" | "IMAGE" | "DOCUMENT")[]; visibility?: "PUBLIC" | "MEMBERS" };
};

export type ResourceMeta = {
  label: string;
  /** Set to false for fixed lists such as the four subscription plans. */
  canCreate?: boolean;
  canDelete?: boolean;
  fields: FieldConfig[];
  listColumns: string[];
};

export const resourceMeta: Record<string, ResourceMeta> = {
  courses: {
    label: "Courses",
    listColumns: ["title", "category", "track", "requiredPlan", "published"],
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea", required: true },
      { key: "category", label: "Category", type: "select", options: ["BEGINNER", "ELEMENTARY", "INTERMEDIATE", "ADVANCED"], required: true },
      { key: "track", label: "Track", type: "select", options: ["ENGLISH", "IELTS", "CAREER"], required: true },
      { key: "requiredPlan", label: "Cheapest plan that includes it", type: "select", options: [...PLAN_CODES], required: true, hint: "Students on a lower plan see it as locked." },
      { key: "image", label: "Image path", type: "text", upload: { kinds: ["IMAGE"], visibility: "PUBLIC" } },
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
      { key: "videoUrl", label: "Video URL", type: "text", upload: { kinds: ["VIDEO"] } },
      { key: "audioUrl", label: "Audio URL", type: "text", upload: { kinds: ["AUDIO"] } },
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
      { key: "audioUrl", label: "Audio path or URL", type: "text", required: true, upload: { kinds: ["AUDIO"] }, hint: "For example /audio/listening/my-test-s1.wav (a file inside the public folder) or a full https:// link." },
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
      { key: "imageUrl", label: "Task 1 image path or URL", type: "text", upload: { kinds: ["IMAGE"], visibility: "PUBLIC" }, hint: "For example /writing/my-chart.svg" },
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
  plans: {
    label: "Plans",
    canCreate: false,
    canDelete: false,
    listColumns: ["code", "name", "priceMonthly", "priceYearly", "rank", "published"],
    fields: [
      { key: "code", label: "Code", type: "text", readOnly: true, hint: "FREE, BASIC, PREMIUM or PRO. Fixed." },
      { key: "name", label: "Name", type: "text", required: true },
      { key: "description", label: "Short description", type: "textarea", rows: 2 },
      { key: "priceMonthly", label: "Monthly price (৳)", type: "number", required: true, hint: "Whole taka. 0 for the free plan." },
      { key: "priceYearly", label: "Yearly price (৳)", type: "number", nullable: true, hint: "Leave empty to hide the yearly option." },
      {
        key: "features",
        label: "Included features",
        type: "multi-select",
        options: [...PLAN_FEATURES],
        optionLabels: FEATURE_LABELS,
        hint: "These are enforced: students without a feature see a locked page.",
      },
      { key: "bullets", label: "Pricing page bullet points", type: "json-list", rows: 6, hint: "One per line. Only marketing text; the ticks above decide what is unlocked." },
      { key: "vocabPerDay", label: "New vocabulary words per day", type: "number", nullable: true, hint: "Leave empty for unlimited." },
      { key: "quizzesPerDay", label: "Quizzes per day", type: "number", nullable: true, hint: "Leave empty for unlimited." },
      { key: "rank", label: "Rank", type: "number", required: true, hint: "Higher plans have a higher rank. Free is 0." },
      { key: "highlighted", label: "Highlight on pricing page (Most popular)", type: "checkbox" },
      { key: "published", label: "Show on pricing page and allow purchase", type: "checkbox" },
    ],
  },
  coupons: {
    label: "Coupons",
    listColumns: ["code", "type", "value", "expiresAt", "usageLimit", "active"],
    fields: [
      { key: "code", label: "Code", type: "text", required: true, readOnly: true, hint: "Letters, numbers, - and _ (3 to 30). Students type it at checkout, for example IELTS20. It can't be changed later." },
      { key: "description", label: "Note for students", type: "text", nullable: true, hint: "Shown when the coupon is applied." },
      { key: "type", label: "Discount type", type: "select", options: ["PERCENT", "FIXED"], required: true },
      { key: "value", label: "Discount value", type: "number", required: true, hint: "A percentage (1 to 100) or an amount in taka." },
      { key: "maxDiscount", label: "Largest discount (৳)", type: "number", nullable: true, hint: "Caps a percentage discount. Leave empty for no cap." },
      { key: "minAmount", label: "Smallest purchase (৳)", type: "number", nullable: true, hint: "The price before discount must be at least this much." },
      { key: "startsAt", label: "Starts on", type: "text", nullable: true, hint: "Date as YYYY-MM-DD. Leave empty to start now." },
      { key: "expiresAt", label: "Expires on", type: "text", nullable: true, hint: "Date as YYYY-MM-DD. The coupon works through the end of that day." },
      { key: "usageLimit", label: "Total uses", type: "number", nullable: true, hint: "Leave empty for unlimited." },
      { key: "perUserLimit", label: "Uses per student", type: "number", required: true },
      { key: "planCodes", label: "Only for these plans", type: "multi-select", options: ["BASIC", "PREMIUM", "PRO"], hint: "Tick none to allow every paid plan." },
      { key: "courseIds", label: "Only from these courses", type: "relation-multi", relation: { resource: "courses", labelKey: "title" }, hint: "Course-specific: works only when the student upgrades from one of these courses. Tick none for everywhere." },
      { key: "active", label: "Active", type: "checkbox" },
    ],
  },
  paymentAccounts: {
    label: "Payment accounts",
    listColumns: ["method", "accountName", "accountNumber", "active"],
    fields: [
      { key: "method", label: "Method", type: "select", options: ["BKASH", "NAGAD", "ROCKET", "BANK_TRANSFER"], required: true },
      { key: "accountName", label: "Account name", type: "text", required: true },
      { key: "accountNumber", label: "Number", type: "text", required: true, hint: "Students send real money here. For bKash, Nagad and Rocket use the merchant or personal mobile number; for a bank, the account number." },
      { key: "bankName", label: "Bank name", type: "text", nullable: true, hint: "Bank transfer only." },
      { key: "branch", label: "Branch", type: "text", nullable: true },
      { key: "instructions", label: "Extra instructions", type: "textarea", rows: 3, nullable: true, hint: "For example: use Send Money, not Payment, and put your email in the reference." },
      { key: "order", label: "Order", type: "number" },
      { key: "active", label: "Active (offered at checkout)", type: "checkbox" },
    ],
  },
};
