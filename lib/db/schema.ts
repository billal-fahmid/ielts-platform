import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

// ---------- USERS & PROFILE ----------
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["STUDENT", "TEACHER", "ADMIN"] })
    .notNull()
    .default("STUDENT"),
  image: text("image"),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  phone: text("phone"),
  englishLevel: text("english_level", {
    enum: ["A1", "A2", "B1", "B2", "C1"],
  }),
  ieltsTarget: real("ielts_target"),
  targetExamDate: text("target_exam_date"),
  countryGoal: text("country_goal"),
  education: text("education"),
  reason: text("reason", {
    enum: ["STUDY_ABROAD", "WORK", "IMMIGRATION", "PERSONAL"],
  }),
  focusSkill: text("focus_skill", {
    enum: ["GRAMMAR", "VOCABULARY", "READING", "LISTENING", "SPEAKING", "WRITING"],
  }),
  onboardingCompleted: integer("onboarding_completed", { mode: "boolean" }).default(false),
  xp: integer("xp").notNull().default(0),
  gLevel: integer("g_level").notNull().default(1),
  streak: integer("streak").notNull().default(0),
  lastStudyDate: text("last_study_date"),
  dailyGoalMinutes: integer("daily_goal_minutes").notNull().default(20),
  /** Whether important notifications are also sent by email. In-app notifications are always on. */
  emailNotifications: integer("email_notifications", { mode: "boolean" }).notNull().default(true),
});

// ---------- COURSES ----------
export const courses = sqliteTable("courses", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category", {
    enum: ["BEGINNER", "ELEMENTARY", "INTERMEDIATE", "ADVANCED"],
  }).notNull(),
  track: text("track", { enum: ["ENGLISH", "IELTS", "CAREER"] }).notNull().default("ENGLISH"),
  image: text("image"),
  order: integer("order").notNull().default(0),
  published: integer("published", { mode: "boolean" }).notNull().default(true),
  /** Code of the cheapest plan that can open this course (see plans). */
  requiredPlan: text("required_plan").notNull().default("FREE"),
});

export const modules = sqliteTable("modules", {
  id: text("id").primaryKey(),
  courseId: text("course_id").notNull(),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  order: integer("order").notNull().default(0),
});

export const lessons = sqliteTable("lessons", {
  id: text("id").primaryKey(),
  moduleId: text("module_id").notNull(),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  content: text("content").notNull().default(""),
  videoUrl: text("video_url"),
  audioUrl: text("audio_url"),
  examples: text("examples", { mode: "json" }).$type<string[]>().default([]),
  vocabularyIds: text("vocabulary_ids", { mode: "json" }).$type<string[]>().default([]),
  order: integer("order").notNull().default(0),
  xpReward: integer("xp_reward").notNull().default(10),
});

// ---------- QUIZ ENGINE (reused for lessons, grammar, assessment) ----------
export const quizzes = sqliteTable("quizzes", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type", {
    enum: ["LESSON", "GRAMMAR", "ASSESSMENT", "MOCK_TEST"],
  }).notNull(),
  lessonId: text("lesson_id"),
  grammarTopicId: text("grammar_topic_id"),
  timeLimitSeconds: integer("time_limit_seconds"),
});

export const questions = sqliteTable("questions", {
  id: text("id").primaryKey(),
  quizId: text("quiz_id").notNull(),
  type: text("type", { enum: ["MCQ", "TRUE_FALSE", "FILL_BLANK"] }).notNull(),
  prompt: text("prompt").notNull(),
  options: text("options", { mode: "json" }).$type<string[]>().default([]),
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation"),
  skillCategory: text("skill_category", {
    enum: ["GRAMMAR", "VOCABULARY", "READING", "LISTENING"],
  }),
  order: integer("order").notNull().default(0),
});

export const quizAttempts = sqliteTable("quiz_attempts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  quizId: text("quiz_id").notNull(),
  score: integer("score").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  answers: text("answers", { mode: "json" }).$type<Record<string, string>>().default({}),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

// ---------- GRAMMAR LAB ----------
export const grammarTopics = sqliteTable("grammar_topics", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  explanation: text("explanation").notNull(),
  examples: text("examples", { mode: "json" }).$type<string[]>().default([]),
  order: integer("order").notNull().default(0),
});

// ---------- VOCABULARY ----------
export const vocabulary = sqliteTable("vocabulary", {
  id: text("id").primaryKey(),
  word: text("word").notNull(),
  meaning: text("meaning").notNull(),
  banglaMeaning: text("bangla_meaning"),
  pronunciation: text("pronunciation"),
  example: text("example"),
  synonym: text("synonym"),
  antonym: text("antonym"),
  difficulty: text("difficulty", { enum: ["EASY", "MEDIUM", "HARD"] }).notNull().default("EASY"),
  category: text("category", {
    enum: ["DAILY", "IELTS", "ACADEMIC", "GENERAL"],
  }).notNull().default("GENERAL"),
});

export const userVocabulary = sqliteTable("user_vocabulary", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  vocabularyId: text("vocabulary_id").notNull(),
  status: text("status", { enum: ["NEW", "LEARNED", "DIFFICULT"] }).notNull().default("NEW"),
  boxLevel: integer("box_level").notNull().default(1),
  lastReviewed: text("last_reviewed"),
});

// ---------- PROGRESS / GAMIFICATION ----------
export const progress = sqliteTable("progress", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  lessonId: text("lesson_id").notNull(),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  completedAt: text("completed_at"),
  lastPosition: integer("last_position").notNull().default(0),
});

export const badges = sqliteTable("badges", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull().default("Award"),
});

export const userBadges = sqliteTable("user_badges", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  badgeId: text("badge_id").notNull(),
  earnedAt: text("earned_at").default(sql`(CURRENT_TIMESTAMP)`),
});

// ---------- ASSESSMENT ----------
export const assessments = sqliteTable("assessments", {
  id: text("id").primaryKey(),
  quizId: text("quiz_id").notNull(),
  title: text("title").notNull(),
});

export const assessmentResults = sqliteTable("assessment_results", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  overallScore: real("overall_score").notNull(),
  grammarScore: real("grammar_score").notNull(),
  vocabularyScore: real("vocabulary_score").notNull(),
  readingScore: real("reading_score").notNull(),
  listeningScore: real("listening_score").notNull(),
  estimatedLevel: text("estimated_level").notNull(),
  weakAreas: text("weak_areas", { mode: "json" }).$type<string[]>().default([]),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

// ---------- BOOKMARKS ----------
export const bookmarks = sqliteTable("bookmarks", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  lessonId: text("lesson_id").notNull(),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

// ---------- MARKETING CONTENT ----------
export const teachers = sqliteTable("teachers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  title: text("title").notNull(),
  bio: text("bio").notNull(),
  image: text("image"),
  specialties: text("specialties", { mode: "json" }).$type<string[]>().default([]),
});

export const testimonials = sqliteTable("testimonials", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  quote: text("quote").notNull(),
  image: text("image"),
  rating: integer("rating").notNull().default(5),
});

export const blogPosts = sqliteTable("blog_posts", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(),
  image: text("image"),
  category: text("category").notNull().default("General"),
  publishedAt: text("published_at").default(sql`(CURRENT_TIMESTAMP)`),
});

// ---------- IELTS READING ----------
export const readingPassages = sqliteTable("reading_passages", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  testType: text("test_type", { enum: ["ACADEMIC", "GENERAL_TRAINING"] }).notNull(),
  passageNumber: integer("passage_number").notNull().default(1),
  bodyText: text("body_text").notNull(),
  wordCount: integer("word_count").notNull().default(0),
  topic: text("topic"),
  difficulty: text("difficulty", { enum: ["EASY", "MEDIUM", "HARD"] }).notNull().default("MEDIUM"),
  timeLimitSeconds: integer("time_limit_seconds").notNull().default(1200),
  published: integer("published", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

// ---------- IELTS LISTENING ----------
export const listeningTests = sqliteTable("listening_tests", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  difficulty: text("difficulty", { enum: ["EASY", "MEDIUM", "HARD"] }).notNull().default("MEDIUM"),
  timeLimitSeconds: integer("time_limit_seconds").notNull().default(1800),
  published: integer("published", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

export const listeningSections = sqliteTable("listening_sections", {
  id: text("id").primaryKey(),
  listeningTestId: text("listening_test_id").notNull(),
  sectionNumber: integer("section_number").notNull(),
  audioUrl: text("audio_url").notNull(),
  transcript: text("transcript"),
  context: text("context"),
  order: integer("order").notNull().default(0),
});

// ---------- IELTS QUESTION BANK (Listening + Reading, generalized) ----------
export const ieltsQuestions = sqliteTable("ielts_questions", {
  id: text("id").primaryKey(),
  skill: text("skill", { enum: ["LISTENING", "READING"] }).notNull(),
  passageId: text("passage_id"),
  listeningSectionId: text("listening_section_id"),
  questionType: text("question_type", {
    enum: [
      "MCQ_SINGLE",
      "MCQ_MULTI",
      "MATCHING",
      "TRUE_FALSE_NOT_GIVEN",
      "YES_NO_NOT_GIVEN",
      "FORM_COMPLETION",
      "SENTENCE_COMPLETION",
      "SUMMARY_COMPLETION",
      "MAP_LABELING",
      "SHORT_ANSWER",
    ],
  }).notNull(),
  prompt: text("prompt").notNull(),
  // type-specific rendering data: options[], matching items/targets, image url + label points, blanks/word-limit, etc.
  content: text("content", { mode: "json" }).$type<Record<string, unknown>>().notNull().default({}),
  // flexible correct-answer shape: string | string[] | Record<string,string>
  correctAnswer: text("correct_answer", { mode: "json" }).$type<unknown>().notNull(),
  points: integer("points").notNull().default(1),
  explanation: text("explanation"),
  difficulty: text("difficulty", { enum: ["EASY", "MEDIUM", "HARD"] }).notNull().default("MEDIUM"),
  topic: text("topic"),
  tags: text("tags", { mode: "json" }).$type<string[]>().default([]),
  order: integer("order").notNull().default(0),
  published: integer("published", { mode: "boolean" }).notNull().default(false),
});

// ---------- IELTS LISTENING/READING ATTEMPTS ----------
export const ieltsAttempts = sqliteTable("ielts_attempts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  skill: text("skill", { enum: ["LISTENING", "READING"] }).notNull(),
  listeningTestId: text("listening_test_id"),
  readingPassageId: text("reading_passage_id"),
  status: text("status", { enum: ["IN_PROGRESS", "COMPLETED", "ABANDONED"] }).notNull().default("IN_PROGRESS"),
  // per-question answers, flexible shape keyed by ieltsQuestions.id
  answers: text("answers", { mode: "json" }).$type<Record<string, unknown>>().default({}),
  rawScore: integer("raw_score"),
  totalQuestions: integer("total_questions"),
  bandScore: real("band_score"),
  timeSpentSeconds: integer("time_spent_seconds").notNull().default(0),
  // Set when this attempt belongs to a full mock test; standalone practice never resumes these.
  mockAttemptId: text("mock_attempt_id"),
  startedAt: text("started_at").default(sql`(CURRENT_TIMESTAMP)`),
  completedAt: text("completed_at"),
});

// ---------- IELTS WRITING ----------
export const writingPrompts = sqliteTable("writing_prompts", {
  id: text("id").primaryKey(),
  taskType: text("task_type", { enum: ["TASK1", "TASK2"] }).notNull(),
  category: text("category", {
    enum: [
      "GRAPH",
      "CHART",
      "TABLE",
      "MAP",
      "PROCESS",
      "OPINION",
      "DISCUSSION",
      "ADVANTAGE_DISADVANTAGE",
      "PROBLEM_SOLUTION",
      "TWO_PART",
    ],
  }).notNull(),
  promptText: text("prompt_text").notNull(),
  imageUrl: text("image_url"),
  // Text version of the Task 1 visual: used as alt text and given to the AI evaluator (it can't see the image).
  visualDescription: text("visual_description"),
  sampleAnswer: text("sample_answer"),
  published: integer("published", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

export const writingSubmissions = sqliteTable("writing_submissions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  promptId: text("prompt_id"),
  promptTextSnapshot: text("prompt_text_snapshot").notNull(),
  taskType: text("task_type", { enum: ["TASK1", "TASK2"] }).notNull(),
  content: text("content").notNull().default(""),
  wordCount: integer("word_count").notNull().default(0),
  status: text("status", { enum: ["DRAFT", "SUBMITTED", "EVALUATED"] }).notNull().default("DRAFT"),
  timeSpentSeconds: integer("time_spent_seconds").notNull().default(0),
  // Set when this essay belongs to a full mock test; standalone practice never resumes these.
  mockAttemptId: text("mock_attempt_id"),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
  submittedAt: text("submitted_at"),
});

export const writingEvaluations = sqliteTable("writing_evaluations", {
  id: text("id").primaryKey(),
  submissionId: text("submission_id").notNull().unique(),
  estimatedBand: real("estimated_band").notNull(),
  fluencyCoherence: real("fluency_coherence").notNull(),
  lexicalResource: real("lexical_resource").notNull(),
  grammarAccuracy: real("grammar_accuracy").notNull(),
  taskResponse: real("task_response").notNull(),
  strengths: text("strengths", { mode: "json" }).$type<string[]>().default([]),
  weaknesses: text("weaknesses", { mode: "json" }).$type<string[]>().default([]),
  grammarCorrections: text("grammar_corrections", { mode: "json" })
    .$type<{ original: string; corrected: string; explanation: string }[]>()
    .default([]),
  vocabularySuggestions: text("vocabulary_suggestions", { mode: "json" }).$type<string[]>().default([]),
  improvementPlan: text("improvement_plan", { mode: "json" }).$type<string[]>().default([]),
  bandRangeLow: real("band_range_low"),
  bandRangeHigh: real("band_range_high"),
  coherenceFeedback: text("coherence_feedback"),
  structureFeedback: text("structure_feedback"),
  modelUsed: text("model_used"),
  rawAiResponse: text("raw_ai_response"),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

// ---------- IELTS SPEAKING ----------
export const speakingPrompts = sqliteTable("speaking_prompts", {
  id: text("id").primaryKey(),
  part: text("part", { enum: ["PART1", "PART2", "PART3"] }).notNull(),
  topic: text("topic").notNull(),
  questionText: text("question_text").notNull(),
  followUpOfTopic: text("follow_up_of_topic"),
  published: integer("published", { mode: "boolean" }).notNull().default(false),
});

export const speakingSessions = sqliteTable("speaking_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  mode: text("mode", { enum: ["FULL_TEST", "PART1_PRACTICE", "PART2_PRACTICE", "PART3_PRACTICE"] }).notNull(),
  topic: text("topic"),
  status: text("status", { enum: ["IN_PROGRESS", "COMPLETED"] }).notNull().default("IN_PROGRESS"),
  totalDurationSeconds: integer("total_duration_seconds").notNull().default(0),
  startedAt: text("started_at").default(sql`(CURRENT_TIMESTAMP)`),
  completedAt: text("completed_at"),
});

export const speakingTurns = sqliteTable("speaking_turns", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  part: text("part", { enum: ["PART1", "PART2", "PART3"] }).notNull(),
  promptId: text("prompt_id"),
  questionText: text("question_text").notNull(),
  transcript: text("transcript").notNull().default(""),
  audioMetrics: text("audio_metrics", { mode: "json" })
    .$type<{
      wpm: number;
      pauseCount: number;
      totalPauseMs: number;
      fillerWordCount: number;
      repeatedWordCount: number;
      durationSeconds: number;
      /** True when the answer was typed instead of spoken (no speech recognition available). */
      typed?: boolean;
    }>()
    .default({ wpm: 0, pauseCount: 0, totalPauseMs: 0, fillerWordCount: 0, repeatedWordCount: 0, durationSeconds: 0 }),
  order: integer("order").notNull().default(0),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

export const speakingEvaluations = sqliteTable("speaking_evaluations", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  estimatedBand: real("estimated_band").notNull(),
  fluencyCoherence: real("fluency_coherence").notNull(),
  lexicalResource: real("lexical_resource").notNull(),
  grammarAccuracy: real("grammar_accuracy").notNull(),
  pronunciationEstimate: real("pronunciation_estimate").notNull(),
  bandRangeLow: real("band_range_low"),
  bandRangeHigh: real("band_range_high"),
  coherenceFeedback: text("coherence_feedback"),
  pronunciationNotes: text("pronunciation_notes"),
  strengths: text("strengths", { mode: "json" }).$type<string[]>().default([]),
  weaknesses: text("weaknesses", { mode: "json" }).$type<string[]>().default([]),
  fillerWordCount: integer("filler_word_count").notNull().default(0),
  repeatedWordCount: integer("repeated_word_count").notNull().default(0),
  suggestions: text("suggestions", { mode: "json" }).$type<string[]>().default([]),
  isEstimate: integer("is_estimate", { mode: "boolean" }).notNull().default(true),
  modelUsed: text("model_used"),
  rawAiResponse: text("raw_ai_response"),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

// ---------- AI TUTOR ----------
export const aiTutorConversations = sqliteTable("ai_tutor_conversations", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull().default("New conversation"),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
});

export const aiTutorMessages = sqliteTable("ai_tutor_messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull(),
  role: text("role", { enum: ["USER", "ASSISTANT"] }).notNull(),
  content: text("content").notNull(),
  language: text("language", { enum: ["EN", "BN", "MIXED"] }),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

// ---------- RECOMMENDATIONS & STUDY PLAN ----------
export const learningRecommendations = sqliteTable("learning_recommendations", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  category: text("category", {
    enum: ["GRAMMAR", "VOCABULARY", "READING", "LISTENING", "WRITING", "SPEAKING"],
  }).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  actionUrl: text("action_url"),
  priority: integer("priority").notNull().default(0),
  status: text("status", { enum: ["ACTIVE", "DISMISSED", "COMPLETED"] }).notNull().default("ACTIVE"),
  source: text("source"),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

export const studyPlans = sqliteTable("study_plans", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  generatedAt: text("generated_at").default(sql`(CURRENT_TIMESTAMP)`),
  targetExamDate: text("target_exam_date"),
  // array of { day, focus, tasks: [{ type, refId, title, durationMinutes, completed }] }
  days: text("days", { mode: "json" }).$type<Array<Record<string, unknown>>>().default([]),
  /** Short overview written by the AI coach; null when the plan is rule-based only. */
  summary: text("summary"),
  /** True once the AI coach notes were added. The plan itself is always built from rules and real content. */
  aiAssisted: integer("ai_assisted", { mode: "boolean" }).notNull().default(false),
});

// ---------- MOCK TEST ----------
export const mockTests = sqliteTable("mock_tests", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  testType: text("test_type", { enum: ["ACADEMIC", "GENERAL_TRAINING"] }).notNull(),
  listeningTestId: text("listening_test_id"),
  readingPassageIds: text("reading_passage_ids", { mode: "json" }).$type<string[]>().default([]),
  writingTask1PromptId: text("writing_task1_prompt_id"),
  writingTask2PromptId: text("writing_task2_prompt_id"),
  speakingTopic: text("speaking_topic"),
  published: integer("published", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

export const mockTestAttempts = sqliteTable("mock_test_attempts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  mockTestId: text("mock_test_id").notNull(),
  status: text("status", { enum: ["IN_PROGRESS", "COMPLETED", "ABANDONED"] }).notNull().default("IN_PROGRESS"),
  currentSection: text("current_section", {
    enum: ["LISTENING", "READING", "WRITING", "SPEAKING", "DONE"],
  })
    .notNull()
    .default("LISTENING"),
  listeningAttemptId: text("listening_attempt_id"),
  // One attempt per reading passage, in the mock's passage order.
  readingAttemptIds: text("reading_attempt_ids", { mode: "json" }).$type<string[]>().default([]),
  readingAttemptId: text("reading_attempt_id"),
  // Wall-clock start of the 60-minute writing section (the deadline survives closing the tab).
  writingStartedAt: text("writing_started_at"),
  writingSubmissionIds: text("writing_submission_ids", { mode: "json" }).$type<string[]>().default([]),
  speakingSessionId: text("speaking_session_id"),
  listeningBand: real("listening_band"),
  readingBand: real("reading_band"),
  writingBand: real("writing_band"),
  speakingBand: real("speaking_band"),
  overallBand: real("overall_band"),
  startedAt: text("started_at").default(sql`(CURRENT_TIMESTAMP)`),
  completedAt: text("completed_at"),
});

// ---------- PLATFORM: OPERATIONS & SECURITY ----------
export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    actorId: text("actor_id"),
    actorRole: text("actor_role"),
    /** e.g. "resource.update", "user.role_change", "notification.broadcast" */
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>().default({}),
    ip: text("ip"),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => [index("audit_logs_created_idx").on(t.createdAt), index("audit_logs_actor_idx").on(t.actorId), index("audit_logs_entity_idx").on(t.entityType, t.entityId)]
);

export const errorLogs = sqliteTable(
  "error_logs",
  {
    id: text("id").primaryKey(),
    /** Where it happened: "server", "api", "client", a route path... */
    source: text("source").notNull(),
    message: text("message").notNull(),
    stack: text("stack"),
    path: text("path"),
    method: text("method"),
    userId: text("user_id"),
    digest: text("digest"),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => [index("error_logs_created_idx").on(t.createdAt)]
);

export const emailMessages = sqliteTable(
  "email_messages",
  {
    id: text("id").primaryKey(),
    userId: text("user_id"),
    toEmail: text("to_email").notNull(),
    subject: text("subject").notNull(),
    bodyText: text("body_text").notNull(),
    bodyHtml: text("body_html"),
    /** OUTBOX = not sent because no email provider is configured (development). */
    status: text("status", { enum: ["SENT", "FAILED", "OUTBOX"] }).notNull(),
    provider: text("provider").notNull(),
    error: text("error"),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => [index("email_messages_created_idx").on(t.createdAt)]
);

export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    type: text("type", {
      enum: ["COURSE", "TEACHER_FEEDBACK", "LIVE_CLASS", "ASSIGNMENT", "PAYMENT", "SUBSCRIPTION", "STREAK", "ACHIEVEMENT", "COMMUNITY", "SYSTEM"],
    }).notNull(),
    title: text("title").notNull(),
    body: text("body"),
    /** Internal link to open when the notification is clicked. */
    url: text("url"),
    readAt: text("read_at"),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => [index("notifications_user_created_idx").on(t.userId, t.createdAt), index("notifications_user_read_idx").on(t.userId, t.readAt)]
);

export const uploadedFiles = sqliteTable(
  "uploaded_files",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    kind: text("kind", { enum: ["VIDEO", "AUDIO", "IMAGE", "DOCUMENT"] }).notNull(),
    originalName: text("original_name").notNull(),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(),
    storageKey: text("storage_key").notNull().unique(),
    /** PUBLIC = anyone with the link; MEMBERS = signed-in users; PRIVATE = owner and staff only. */
    visibility: text("visibility", { enum: ["PUBLIC", "MEMBERS", "PRIVATE"] }).notNull().default("MEMBERS"),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => [index("uploaded_files_owner_idx").on(t.ownerId)]
);

// ---------- COURSE ENROLLMENT ----------
export const enrollments = sqliteTable(
  "enrollments",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    courseId: text("course_id").notNull(),
    status: text("status", { enum: ["ACTIVE", "COMPLETED", "DROPPED"] }).notNull().default("ACTIVE"),
    enrolledAt: text("enrolled_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
    completedAt: text("completed_at"),
  },
  (t) => [uniqueIndex("enrollments_user_course_uq").on(t.userId, t.courseId), index("enrollments_course_idx").on(t.courseId)]
);

// ---------- SUBSCRIPTION PLANS ----------
export const plans = sqliteTable("plans", {
  id: text("id").primaryKey(),
  /** FREE, BASIC, PREMIUM or PRO. The ladder is fixed; everything else about a plan is editable. */
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  /** Prices in Bangladeshi taka (whole taka). */
  priceMonthly: integer("price_monthly").notNull().default(0),
  priceYearly: integer("price_yearly"),
  /** Feature keys this plan unlocks (see lib/plans/features.ts). */
  features: text("features", { mode: "json" }).$type<string[]>().notNull().default([]),
  /** Marketing bullet points shown on the pricing page. */
  bullets: text("bullets", { mode: "json" }).$type<string[]>().notNull().default([]),
  /** Daily limits. Empty means unlimited. */
  vocabPerDay: integer("vocab_per_day"),
  quizzesPerDay: integer("quizzes_per_day"),
  /** Higher rank means a higher plan. Used to decide whether a plan covers a course. */
  rank: integer("rank").notNull().default(0),
  highlighted: integer("highlighted", { mode: "boolean" }).notNull().default(false),
  /** Shown on the pricing page and open for new purchases. */
  published: integer("published", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    planId: text("plan_id").notNull(),
    status: text("status", { enum: ["ACTIVE", "EXPIRED", "CANCELLED"] }).notNull().default("ACTIVE"),
    /** How it started: an administrator granted it, a payment completed, or a promotion. */
    source: text("source", { enum: ["ADMIN", "PAYMENT", "PROMO"] }).notNull().default("ADMIN"),
    startedAt: text("started_at").notNull(),
    /** ISO time the paid period ends. Access stops after this moment. */
    currentPeriodEnd: text("current_period_end").notNull(),
    cancelledAt: text("cancelled_at"),
    /** Set once the "ending soon" reminder has been sent. */
    reminderSentAt: text("reminder_sent_at"),
    /** The payment transaction that created it (filled in by the payment system). */
    transactionId: text("transaction_id"),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => [index("subscriptions_user_idx").on(t.userId, t.status), index("subscriptions_end_idx").on(t.currentPeriodEnd)]
);

// ---------- RELATIONS (for query convenience) ----------
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, { fields: [users.id], references: [profiles.userId] }),
  quizAttempts: many(quizAttempts),
  progress: many(progress),
}));

export const coursesRelations = relations(courses, ({ many }) => ({
  modules: many(modules),
}));

export const modulesRelations = relations(modules, ({ one, many }) => ({
  course: one(courses, { fields: [modules.courseId], references: [courses.id] }),
  lessons: many(lessons),
}));

export const lessonsRelations = relations(lessons, ({ one }) => ({
  module: one(modules, { fields: [lessons.moduleId], references: [modules.id] }),
}));

export const quizzesRelations = relations(quizzes, ({ many }) => ({
  questions: many(questions),
}));

export const questionsRelations = relations(questions, ({ one }) => ({
  quiz: one(quizzes, { fields: [questions.quizId], references: [quizzes.id] }),
}));

// ---------- IELTS RELATIONS ----------
export const readingPassagesRelations = relations(readingPassages, ({ many }) => ({
  questions: many(ieltsQuestions),
}));

export const listeningTestsRelations = relations(listeningTests, ({ many }) => ({
  sections: many(listeningSections),
}));

export const listeningSectionsRelations = relations(listeningSections, ({ one, many }) => ({
  test: one(listeningTests, { fields: [listeningSections.listeningTestId], references: [listeningTests.id] }),
  questions: many(ieltsQuestions),
}));

export const ieltsQuestionsRelations = relations(ieltsQuestions, ({ one }) => ({
  passage: one(readingPassages, { fields: [ieltsQuestions.passageId], references: [readingPassages.id] }),
  section: one(listeningSections, { fields: [ieltsQuestions.listeningSectionId], references: [listeningSections.id] }),
}));

export const writingSubmissionsRelations = relations(writingSubmissions, ({ one }) => ({
  prompt: one(writingPrompts, { fields: [writingSubmissions.promptId], references: [writingPrompts.id] }),
  evaluation: one(writingEvaluations, { fields: [writingSubmissions.id], references: [writingEvaluations.submissionId] }),
}));

export const speakingSessionsRelations = relations(speakingSessions, ({ many, one }) => ({
  turns: many(speakingTurns),
  evaluation: one(speakingEvaluations, { fields: [speakingSessions.id], references: [speakingEvaluations.sessionId] }),
}));

export const speakingTurnsRelations = relations(speakingTurns, ({ one }) => ({
  session: one(speakingSessions, { fields: [speakingTurns.sessionId], references: [speakingSessions.id] }),
}));

export const aiTutorConversationsRelations = relations(aiTutorConversations, ({ many }) => ({
  messages: many(aiTutorMessages),
}));

export const aiTutorMessagesRelations = relations(aiTutorMessages, ({ one }) => ({
  conversation: one(aiTutorConversations, { fields: [aiTutorMessages.conversationId], references: [aiTutorConversations.id] }),
}));

export const mockTestsRelations = relations(mockTests, ({ one }) => ({
  listeningTest: one(listeningTests, { fields: [mockTests.listeningTestId], references: [listeningTests.id] }),
}));
