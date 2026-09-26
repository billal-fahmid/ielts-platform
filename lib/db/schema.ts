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
  // Google's stable account id, set when the person signs in with Google.
  googleSub: text("google_sub").unique(),
  // Set when the person proved they own the address (Google confirmed it). Password sign-ups start unverified.
  emailVerifiedAt: text("email_verified_at"),
  // Raised to sign out every session of this account at once (login tokens carry the number they were issued with).
  sessionVersion: integer("session_version").notNull().default(0),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
}, (t) => [index("users_role_idx").on(t.role), index("users_created_idx").on(t.createdAt)]);

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
  /** How this student appears on leaderboards: as "Learner ab12" (default), as first name and initial, or not at all. */
  leaderboardVisibility: text("leaderboard_visibility", { enum: ["ANONYMOUS", "NAME", "HIDDEN"] }).notNull().default("ANONYMOUS"),
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
  /** The teacher who created and manages the course. Empty for platform-owned courses (admins manage those). */
  ownerId: text("owner_id"),
}, (t) => [index("courses_published_track_idx").on(t.published, t.track), index("courses_owner_idx").on(t.ownerId)]);

export const modules = sqliteTable("modules", {
  id: text("id").primaryKey(),
  courseId: text("course_id").notNull(),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  order: integer("order").notNull().default(0),
}, (t) => [index("modules_course_idx").on(t.courseId, t.order)]);

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
}, (t) => [index("lessons_module_idx").on(t.moduleId, t.order)]);

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
}, (t) => [index("questions_quiz_idx").on(t.quizId, t.order)]);

export const quizAttempts = sqliteTable("quiz_attempts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  quizId: text("quiz_id").notNull(),
  score: integer("score").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  answers: text("answers", { mode: "json" }).$type<Record<string, string>>().default({}),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
}, (t) => [index("quiz_attempts_user_idx").on(t.userId, t.createdAt), index("quiz_attempts_quiz_idx").on(t.quizId)]);

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
}, (t) => [index("user_vocabulary_user_idx").on(t.userId, t.status)]);

// ---------- PROGRESS / GAMIFICATION ----------
export const progress = sqliteTable("progress", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  lessonId: text("lesson_id").notNull(),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  completedAt: text("completed_at"),
  lastPosition: integer("last_position").notNull().default(0),
}, (t) => [index("progress_user_idx").on(t.userId, t.completed), index("progress_lesson_idx").on(t.lessonId)]);

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
}, (t) => [index("user_badges_user_idx").on(t.userId)]);

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
}, (t) => [index("assessment_results_user_idx").on(t.userId, t.createdAt)]);

// ---------- BOOKMARKS ----------
export const bookmarks = sqliteTable("bookmarks", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  lessonId: text("lesson_id").notNull(),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
}, (t) => [index("bookmarks_user_idx").on(t.userId)]);

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
  /** Drafts (unticked) are hidden from the public blog and from search. */
  published: integer("published", { mode: "boolean" }).notNull().default(true),
  author: text("author"),
  tags: text("tags", { mode: "json" }).$type<string[]>().default([]),
  publishedAt: text("published_at").default(sql`(CURRENT_TIMESTAMP)`),
}, (t) => [index("blog_posts_published_idx").on(t.published, t.publishedAt)]);

// ---------- STUDY ABROAD AND RESOURCES (content managed in the admin panel) ----------
export const studyCountries = sqliteTable("study_countries", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  /** An emoji flag shown beside the name. */
  flag: text("flag"),
  summary: text("summary").notNull(),
  tuitionRange: text("tuition_range"),
  livingCost: text("living_cost"),
  /** The typical IELTS requirement in words (universities differ), e.g. "6.5 overall, no band below 6.0". */
  ieltsRequirement: text("ielts_requirement"),
  /** The usual minimum overall band, for comparing with a student's target. */
  ieltsMin: real("ielts_min"),
  /** General English requirements beyond IELTS: other accepted tests, language of study, waivers. */
  englishRequirements: text("english_requirements"),
  visaInfo: text("visa_info"),
  workRights: text("work_rights"),
  /** Example universities (not a ranking or a recommendation). */
  universities: text("universities", { mode: "json" }).$type<string[]>().default([]),
  /** Steps to apply, in order. */
  applicationChecklist: text("application_checklist", { mode: "json" }).$type<string[]>().default([]),
  /** Official visa pages, one per line as "Label | https://address". */
  visaResources: text("visa_resources", { mode: "json" }).$type<string[]>().default([]),
  intakes: text("intakes", { mode: "json" }).$type<string[]>().default([]),
  popularCities: text("popular_cities", { mode: "json" }).$type<string[]>().default([]),
  scholarships: text("scholarships", { mode: "json" }).$type<string[]>().default([]),
  image: text("image"),
  order: integer("order").notNull().default(0),
  published: integer("published", { mode: "boolean" }).notNull().default(true),
}, (t) => [index("study_countries_published_idx").on(t.published, t.order)]);

/** Guides, worksheets, links and videos students can open. Items can require a plan. */
export const learningResources = sqliteTable(
  "learning_resources",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    kind: text("kind", { enum: ["PDF", "LINK", "VIDEO", "AUDIO"] }).notNull().default("PDF"),
    /** An uploaded file (/api/files/...) or a full https:// link. Never sent to people whose plan doesn't include it. */
    url: text("url").notNull(),
    category: text("category").notNull().default("General"),
    /** The cheapest plan that can open it (FREE, BASIC, PREMIUM or PRO). */
    requiredPlan: text("required_plan").notNull().default("FREE"),
    order: integer("order").notNull().default(0),
    published: integer("published", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => [index("learning_resources_category_idx").on(t.category)]
);

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
}, (t) => [index("ielts_attempts_user_idx").on(t.userId, t.skill, t.status), index("ielts_attempts_mock_idx").on(t.mockAttemptId)]);

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
}, (t) => [index("writing_submissions_user_idx").on(t.userId, t.status, t.createdAt)]);

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
}, (t) => [index("speaking_sessions_user_idx").on(t.userId, t.status)]);

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
}, (t) => [index("ai_tutor_conversations_user_idx").on(t.userId, t.updatedAt)]);

export const aiTutorMessages = sqliteTable("ai_tutor_messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull(),
  role: text("role", { enum: ["USER", "ASSISTANT"] }).notNull(),
  content: text("content").notNull(),
  language: text("language", { enum: ["EN", "BN", "MIXED"] }),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
}, (t) => [index("ai_tutor_messages_convo_idx").on(t.conversationId, t.createdAt)]);

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
}, (t) => [index("learning_recommendations_user_idx").on(t.userId, t.status)]);

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
}, (t) => [index("mock_test_attempts_user_idx").on(t.userId, t.status)]);

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
    source: text("source", { enum: ["ADMIN", "PAYMENT", "PROMO", "REFERRAL"] }).notNull().default("ADMIN"),
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

// ---------- PAYMENTS AND COUPONS ----------
/** Where students send money for manual (bKash / Nagad / Rocket / bank) payments. Edited by admins. */
export const paymentAccounts = sqliteTable("payment_accounts", {
  id: text("id").primaryKey(),
  method: text("method", { enum: ["BKASH", "NAGAD", "ROCKET", "BANK_TRANSFER"] }).notNull(),
  accountName: text("account_name").notNull(),
  /** Mobile wallet number or bank account number. */
  accountNumber: text("account_number").notNull(),
  bankName: text("bank_name"),
  branch: text("branch"),
  instructions: text("instructions"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  order: integer("order").notNull().default(0),
});

export const coupons = sqliteTable("coupons", {
  id: text("id").primaryKey(),
  /** Upper-case code students type, e.g. IELTS20. */
  code: text("code").notNull().unique(),
  description: text("description"),
  type: text("type", { enum: ["PERCENT", "FIXED"] }).notNull(),
  /** Percent (1-100) or a fixed amount in taka. */
  value: integer("value").notNull(),
  /** Caps a percentage discount, in taka. */
  maxDiscount: integer("max_discount"),
  /** The price before discount must be at least this many taka. */
  minAmount: integer("min_amount"),
  startsAt: text("starts_at"),
  expiresAt: text("expires_at"),
  /** Total number of times it can be used. Empty means unlimited. */
  usageLimit: integer("usage_limit"),
  perUserLimit: integer("per_user_limit").notNull().default(1),
  /** Only these plan codes. Empty means every paid plan. */
  planCodes: text("plan_codes", { mode: "json" }).$type<string[]>().notNull().default([]),
  /** Only when checkout started from one of these courses. Empty means anywhere. */
  courseIds: text("course_ids", { mode: "json" }).$type<string[]>().notNull().default([]),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

export const transactions = sqliteTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    planId: text("plan_id").notNull(),
    period: text("period", { enum: ["MONTHLY", "YEARLY"] }).notNull(),
    /** How many days of access this payment buys. */
    days: integer("days").notNull(),
    /** List price, discount and final price in whole taka. */
    baseAmount: integer("base_amount").notNull(),
    discountAmount: integer("discount_amount").notNull().default(0),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull().default("BDT"),
    couponId: text("coupon_id"),
    couponCode: text("coupon_code"),
    /** The course page the student came from, used for course-specific coupons. */
    courseId: text("course_id"),
    method: text("method", { enum: ["BKASH", "NAGAD", "ROCKET", "BANK_TRANSFER", "CARD", "COUPON"] }).notNull(),
    /** Which integration handles it: manual, sslcommerz, or none (free with a coupon). */
    provider: text("provider").notNull(),
    status: text("status", { enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED", "REFUNDED"] }).notNull().default("PENDING"),
    /** The wallet TrxID, bank reference or gateway reference. */
    providerReference: text("provider_reference"),
    senderNumber: text("sender_number"),
    failureReason: text("failure_reason"),
    submittedAt: text("submitted_at"),
    verifiedAt: text("verified_at"),
    verifiedBy: text("verified_by"),
    refundedAt: text("refunded_at"),
    refundedBy: text("refunded_by"),
    refundReason: text("refund_reason"),
    /** The subscription this payment created. */
    subscriptionId: text("subscription_id"),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text("updated_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => [
    index("transactions_user_idx").on(t.userId, t.createdAt),
    index("transactions_status_idx").on(t.status, t.createdAt),
    // A wallet TrxID can only be used once, unless the earlier attempt was rejected.
    uniqueIndex("transactions_reference_uq").on(t.method, t.providerReference).where(sql`status != 'FAILED' AND provider_reference IS NOT NULL`),
  ]
);

export const couponRedemptions = sqliteTable(
  "coupon_redemptions",
  {
    id: text("id").primaryKey(),
    couponId: text("coupon_id").notNull(),
    userId: text("user_id").notNull(),
    transactionId: text("transaction_id").notNull().unique(),
    discountAmount: integer("discount_amount").notNull(),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => [index("coupon_redemptions_coupon_idx").on(t.couponId, t.userId)]
);

/** Every payment notification a gateway sends us, so a repeated one is never applied twice. */
export const paymentEvents = sqliteTable(
  "payment_events",
  {
    id: text("id").primaryKey(),
    provider: text("provider").notNull(),
    eventId: text("event_id").notNull(),
    type: text("type").notNull(),
    transactionId: text("transaction_id"),
    outcome: text("outcome", { enum: ["APPLIED", "IGNORED", "REJECTED"] }).notNull(),
    note: text("note"),
    receivedAt: text("received_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => [uniqueIndex("payment_events_uq").on(t.provider, t.eventId)]
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

// ---------- TEACHING: BATCHES AND ASSIGNMENTS ----------
export const batches = sqliteTable(
  "batches",
  {
    id: text("id").primaryKey(),
    teacherId: text("teacher_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    /** The course this batch follows, if any. */
    courseId: text("course_id"),
    capacity: integer("capacity"),
    startsOn: text("starts_on"),
    endsOn: text("ends_on"),
    status: text("status", { enum: ["ACTIVE", "ARCHIVED"] }).notNull().default("ACTIVE"),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => [index("batches_teacher_idx").on(t.teacherId)]
);

export const batchMembers = sqliteTable(
  "batch_members",
  {
    id: text("id").primaryKey(),
    batchId: text("batch_id").notNull(),
    studentId: text("student_id").notNull(),
    joinedAt: text("joined_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => [uniqueIndex("batch_members_uq").on(t.batchId, t.studentId), index("batch_members_student_idx").on(t.studentId)]
);

export const assignments = sqliteTable(
  "assignments",
  {
    id: text("id").primaryKey(),
    teacherId: text("teacher_id").notNull(),
    /** Who it is for: every member of the batch, or every student enrolled in the course (at least one is set). */
    batchId: text("batch_id"),
    courseId: text("course_id"),
    title: text("title").notNull(),
    instructions: text("instructions").notNull(),
    /** Optional teacher-uploaded file (worksheet, audio...). */
    attachmentUrl: text("attachment_url"),
    dueAt: text("due_at"),
    maxScore: integer("max_score").notNull().default(100),
    published: integer("published", { mode: "boolean" }).notNull().default(false),
    /** When students were first told about it, so publishing again doesn't notify them twice. */
    publishedAt: text("published_at"),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => [index("assignments_teacher_idx").on(t.teacherId), index("assignments_batch_idx").on(t.batchId), index("assignments_course_idx").on(t.courseId)]
);

export const assignmentSubmissions = sqliteTable(
  "assignment_submissions",
  {
    id: text("id").primaryKey(),
    assignmentId: text("assignment_id").notNull(),
    studentId: text("student_id").notNull(),
    answerText: text("answer_text").notNull().default(""),
    /** Optional link (Google Drive, YouTube...) — students can't upload files. */
    linkUrl: text("link_url"),
    status: text("status", { enum: ["SUBMITTED", "GRADED"] }).notNull().default("SUBMITTED"),
    score: integer("score"),
    feedback: text("feedback"),
    submittedAt: text("submitted_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
    gradedAt: text("graded_at"),
    gradedBy: text("graded_by"),
  },
  (t) => [uniqueIndex("assignment_submissions_uq").on(t.assignmentId, t.studentId), index("assignment_submissions_student_idx").on(t.studentId)]
);

// ---------- GROWTH: REFERRALS, CHALLENGES, CERTIFICATES ----------
export const referralCodes = sqliteTable("referral_codes", {
  userId: text("user_id").primaryKey(),
  code: text("code").notNull().unique(),
  createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

/** What happened to a referral link: someone clicked it, registered through it, or made their first paid purchase. */
export const referralEvents = sqliteTable(
  "referral_events",
  {
    id: text("id").primaryKey(),
    referrerId: text("referrer_id").notNull(),
    code: text("code").notNull(),
    type: text("type", { enum: ["CLICK", "REGISTRATION", "PURCHASE"] }).notNull(),
    /** The new member (for registrations and purchases). */
    refereeId: text("referee_id"),
    /** A one-way fingerprint of the visitor, only used to count one click per person per day. */
    visitorHash: text("visitor_hash"),
    transactionId: text("transaction_id"),
    /** Days of plan given to the referrer for a purchase. */
    rewardDays: integer("reward_days"),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => [uniqueIndex("referral_events_referee_uq").on(t.type, t.refereeId), index("referral_events_referrer_idx").on(t.referrerId, t.type), index("referral_events_visitor_idx").on(t.code, t.visitorHash)]
);

/** A challenge a student completed in one period (for example the weekly "5 lessons" challenge in week 39). Once only. */
export const challengeCompletions = sqliteTable(
  "challenge_completions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    /** Period and challenge together, e.g. "W2026-39:LESSONS". */
    challengeKey: text("challenge_key").notNull(),
    rewardXp: integer("reward_xp").notNull().default(0),
    completedAt: text("completed_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => [uniqueIndex("challenge_completions_uq").on(t.userId, t.challengeKey)]
);

/** A certificate for finishing a course. Its code is what the public verification page checks. */
export const certificates = sqliteTable(
  "certificates",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull().unique(),
    userId: text("user_id").notNull(),
    courseId: text("course_id").notNull(),
    /** Names as they were when it was issued, so later edits do not change what the certificate says. */
    studentName: text("student_name").notNull(),
    courseTitle: text("course_title").notNull(),
    issuedAt: text("issued_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
    revokedAt: text("revoked_at"),
    revokedReason: text("revoked_reason"),
  },
  (t) => [uniqueIndex("certificates_user_course_uq").on(t.userId, t.courseId)]
);

// ---------- COMMUNITY ----------
/** The topics a post can belong to (English, IELTS, Speaking...). Edited by administrators. */
export const communityCategories = sqliteTable("community_categories", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  order: integer("order").notNull().default(0),
  /** Untick to stop new posts being added to it; existing posts stay. */
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const communityPosts = sqliteTable(
  "community_posts",
  {
    id: text("id").primaryKey(),
    authorId: text("author_id").notNull(),
    /** A discussion, or a question that can have one accepted answer. */
    kind: text("kind", { enum: ["DISCUSSION", "QUESTION"] }).notNull().default("DISCUSSION"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    /** The topic the post belongs to. Empty only on posts made before categories existed. */
    categoryId: text("category_id"),
    tags: text("tags", { mode: "json" }).$type<string[]>().default([]),
    /** HIDDEN posts are only visible to moderators (hidden by one, or automatically after several reports). */
    status: text("status", { enum: ["PUBLISHED", "HIDDEN"] }).notNull().default("PUBLISHED"),
    pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
    /** For questions: the comment that answered it. */
    acceptedCommentId: text("accepted_comment_id"),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
    lastActivityAt: text("last_activity_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => [index("community_posts_activity_idx").on(t.status, t.lastActivityAt), index("community_posts_author_idx").on(t.authorId)]
);

export const communityComments = sqliteTable(
  "community_comments",
  {
    id: text("id").primaryKey(),
    postId: text("post_id").notNull(),
    authorId: text("author_id").notNull(),
    body: text("body").notNull(),
    status: text("status", { enum: ["PUBLISHED", "HIDDEN"] }).notNull().default("PUBLISHED"),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => [index("community_comments_post_idx").on(t.postId), index("community_comments_author_idx").on(t.authorId)]
);

export const communityLikes = sqliteTable(
  "community_likes",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    targetType: text("target_type", { enum: ["POST", "COMMENT"] }).notNull(),
    targetId: text("target_id").notNull(),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => [uniqueIndex("community_likes_uq").on(t.userId, t.targetType, t.targetId), index("community_likes_target_idx").on(t.targetType, t.targetId)]
);

export const communityReports = sqliteTable(
  "community_reports",
  {
    id: text("id").primaryKey(),
    reporterId: text("reporter_id").notNull(),
    targetType: text("target_type", { enum: ["POST", "COMMENT"] }).notNull(),
    targetId: text("target_id").notNull(),
    reason: text("reason", { enum: ["SPAM", "ABUSE", "OFF_TOPIC", "OTHER"] }).notNull(),
    details: text("details"),
    status: text("status", { enum: ["OPEN", "ACTIONED", "DISMISSED"] }).notNull().default("OPEN"),
    resolvedBy: text("resolved_by"),
    resolvedAt: text("resolved_at"),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => [uniqueIndex("community_reports_uq").on(t.reporterId, t.targetType, t.targetId), index("community_reports_status_idx").on(t.status), index("community_reports_target_idx").on(t.targetType, t.targetId)]
);

/** Students barred from posting, commenting, liking and hosting rooms. Reading still works. */
export const communityBans = sqliteTable("community_bans", {
  userId: text("user_id").primaryKey(),
  reason: text("reason"),
  bannedBy: text("banned_by").notNull(),
  createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

// ---------- SPEAKING ROOMS (peer practice) ----------
/** A scheduled group speaking-practice room hosted by a student or teacher. Video happens at the meeting link. */
export const speakingRooms = sqliteTable(
  "speaking_rooms",
  {
    id: text("id").primaryKey(),
    hostId: text("host_id").notNull(),
    title: text("title").notNull(),
    /** What kind of practice it is, so people can find the right room. */
    roomType: text("room_type", { enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED", "IELTS_SPEAKING", "DEBATE", "JOB_INTERVIEW"] }).notNull().default("BEGINNER"),
    topic: text("topic"),
    /** Suggested level so people practise with others at a similar stage (an IELTS band, e.g. 6). */
    targetBand: real("target_band"),
    startsAt: text("starts_at").notNull(),
    durationMinutes: integer("duration_minutes").notNull().default(30),
    capacity: integer("capacity").notNull().default(4),
    provider: text("provider").notNull().default("JITSI"),
    meetingUrl: text("meeting_url").notNull(),
    status: text("status", { enum: ["SCHEDULED", "CANCELLED"] }).notNull().default("SCHEDULED"),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => [index("speaking_rooms_start_idx").on(t.status, t.startsAt), index("speaking_rooms_host_idx").on(t.hostId)]
);

export const speakingRoomMembers = sqliteTable(
  "speaking_room_members",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id").notNull(),
    userId: text("user_id").notNull(),
    joinedAt: text("joined_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => [uniqueIndex("speaking_room_members_uq").on(t.roomId, t.userId), index("speaking_room_members_user_idx").on(t.userId)]
);

// ---------- LIVE CLASSES ----------
/** A scheduled online class for a batch (or everyone enrolled in a course). Video happens at the meeting link. */
export const liveClasses = sqliteTable(
  "live_classes",
  {
    id: text("id").primaryKey(),
    teacherId: text("teacher_id").notNull(),
    /** Who it is for: every member of the batch, or every student enrolled in the course (at least one is set). */
    batchId: text("batch_id"),
    courseId: text("course_id"),
    title: text("title").notNull(),
    description: text("description"),
    /** Start time in UTC (ISO). Shown to everyone in Bangladesh time. */
    startsAt: text("starts_at").notNull(),
    durationMinutes: integer("duration_minutes").notNull().default(60),
    /** Which MeetingProvider made or checked the link ("MANUAL" or "JITSI"). */
    provider: text("provider").notNull().default("MANUAL"),
    meetingUrl: text("meeting_url").notNull(),
    status: text("status", { enum: ["SCHEDULED", "CANCELLED"] }).notNull().default("SCHEDULED"),
    cancelReason: text("cancel_reason"),
    recordingUrl: text("recording_url"),
    /** When each reminder went out, so it goes out once. */
    dayReminderSentAt: text("day_reminder_sent_at"),
    hourReminderSentAt: text("hour_reminder_sent_at"),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => [index("live_classes_teacher_idx").on(t.teacherId, t.startsAt), index("live_classes_batch_idx").on(t.batchId), index("live_classes_course_idx").on(t.courseId), index("live_classes_start_idx").on(t.startsAt)]
);

export const classAttendance = sqliteTable(
  "class_attendance",
  {
    id: text("id").primaryKey(),
    classId: text("class_id").notNull(),
    studentId: text("student_id").notNull(),
    status: text("status", { enum: ["PRESENT", "LATE", "ABSENT"] }).notNull(),
    /** Set when the student used the Join button. */
    joinedAt: text("joined_at"),
    /** "SELF" when the Join button recorded it, "TEACHER" when the teacher set or changed it. */
    markedBy: text("marked_by", { enum: ["SELF", "TEACHER"] }).notNull().default("SELF"),
  },
  (t) => [uniqueIndex("class_attendance_uq").on(t.classId, t.studentId), index("class_attendance_student_idx").on(t.studentId)]
);

export const classMaterials = sqliteTable(
  "class_materials",
  {
    id: text("id").primaryKey(),
    classId: text("class_id").notNull(),
    title: text("title").notNull(),
    url: text("url").notNull(),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => [index("class_materials_class_idx").on(t.classId)]
);

// ---------- HUMAN REVIEWS: WRITING AND SPEAKING ----------
/** A student's request for a teacher to review one essay. Teachers pick requests up from a shared queue. */
export const writingReviews = sqliteTable(
  "writing_reviews",
  {
    id: text("id").primaryKey(),
    submissionId: text("submission_id").notNull(),
    studentId: text("student_id").notNull(),
    /** Empty while the request is waiting in the queue. */
    teacherId: text("teacher_id"),
    status: text("status", { enum: ["REQUESTED", "IN_REVIEW", "COMPLETED", "CANCELLED"] }).notNull().default("REQUESTED"),
    /** What the student wants the teacher to look at. */
    studentNote: text("student_note"),
    /** The teacher's own estimate (0 to 9 in half bands), never an official score. */
    bandEstimate: real("band_estimate"),
    taskResponseFeedback: text("task_response_feedback"),
    coherenceFeedback: text("coherence_feedback"),
    vocabularyFeedback: text("vocabulary_feedback"),
    grammarFeedback: text("grammar_feedback"),
    overallComments: text("overall_comments"),
    requestedAt: text("requested_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
    claimedAt: text("claimed_at"),
    completedAt: text("completed_at"),
  },
  (t) => [index("writing_reviews_status_idx").on(t.status), index("writing_reviews_teacher_idx").on(t.teacherId), index("writing_reviews_student_idx").on(t.studentId), index("writing_reviews_submission_idx").on(t.submissionId)]
);

/**
 * A one-to-one speaking session. A teacher publishes a time slot (OPEN); a student books it (BOOKED); the
 * teacher starts it, keeps notes, scores it and leaves feedback (COMPLETED).
 */
export const speakingSlots = sqliteTable(
  "speaking_slots",
  {
    id: text("id").primaryKey(),
    teacherId: text("teacher_id").notNull(),
    /** Start time in UTC (ISO). Shown to everyone in Bangladesh time. */
    startsAt: text("starts_at").notNull(),
    durationMinutes: integer("duration_minutes").notNull().default(15),
    /** Where the two meet (Zoom, Meet...). Live video is not built into the platform. */
    meetingUrl: text("meeting_url").notNull(),
    status: text("status", { enum: ["OPEN", "BOOKED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"] }).notNull().default("OPEN"),
    studentId: text("student_id"),
    bookedAt: text("booked_at"),
    /** What the student wants to practise. */
    studentNote: text("student_note"),
    startedAt: text("started_at"),
    completedAt: text("completed_at"),
    /** Private to the teacher; the student never sees it. */
    teacherNotes: text("teacher_notes"),
    fluencyBand: real("fluency_band"),
    lexicalBand: real("lexical_band"),
    grammarBand: real("grammar_band"),
    pronunciationBand: real("pronunciation_band"),
    overallBand: real("overall_band"),
    feedback: text("feedback"),
    cancelReason: text("cancel_reason"),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => [index("speaking_slots_teacher_idx").on(t.teacherId, t.startsAt), index("speaking_slots_student_idx").on(t.studentId), index("speaking_slots_status_idx").on(t.status, t.startsAt)]
);
