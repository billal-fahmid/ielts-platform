export type FieldConfig = {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "checkbox" | "json-list";
  options?: string[];
  required?: boolean;
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
};
