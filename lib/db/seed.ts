import { db, sqlite } from "./index";
import {
  users,
  profiles,
  courses,
  modules,
  lessons,
  quizzes,
  questions,
  grammarTopics,
  vocabulary,
  badges,
  teachers,
  testimonials,
  blogPosts,
  readingPassages,
  ieltsQuestions,
  listeningTests,
  listeningSections,
  writingPrompts,
  speakingPrompts,
  mockTests,
  enrollments,
  notifications,
  plans,
  subscriptions,
  coupons,
  paymentAccounts,
  batches,
  batchMembers,
  assignments,
  assignmentSubmissions,
  speakingSlots,
  liveClasses,
  communityPosts,
  communityComments,
  speakingRooms,
  speakingRoomMembers,
  studyCountries,
  learningResources,
  communityCategories,
} from "./schema";
import { resourceDefs, studyCountryDefs } from "./study-abroad-content";
import { careerCourses } from "./career-content";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import path from "node:path";

function uid() {
  return crypto.randomUUID();
}

async function main() {
  // The seed erases every table first. On a live site that would delete real students and payments.
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PRODUCTION_SEED !== "yes") {
    console.error("Refusing to seed: this erases all data. On a brand-new empty database only, set ALLOW_PRODUCTION_SEED=yes to load the starter content.");
    process.exit(1);
  }
  console.log("Seeding database...");

  // ---------- clear existing (idempotent dev seed) ----------
  const tables = [
    "community_categories",
    "study_countries",
    "learning_resources",
    "certificates",
    "challenge_completions",
    "referral_events",
    "referral_codes",
    "speaking_room_members",
    "speaking_rooms",
    "community_bans",
    "community_reports",
    "community_likes",
    "community_comments",
    "community_posts",
    "class_materials",
    "class_attendance",
    "live_classes",
    "speaking_slots",
    "writing_reviews",
    "assignment_submissions",
    "assignments",
    "batch_members",
    "batches",
    "user_badges",
    "assessment_results",
    "assessments",
    "bookmarks",
    "progress",
    "user_vocabulary",
    "vocabulary",
    "quiz_attempts",
    "questions",
    "quizzes",
    "grammar_topics",
    "lessons",
    "modules",
    "courses",
    "badges",
    "teachers",
    "testimonials",
    "blog_posts",
    // IELTS (Milestone 2)
    "ielts_attempts",
    "ielts_questions",
    "reading_passages",
    "listening_sections",
    "listening_tests",
    "writing_evaluations",
    "writing_submissions",
    "writing_prompts",
    "speaking_evaluations",
    "speaking_turns",
    "speaking_sessions",
    "speaking_prompts",
    "ai_tutor_messages",
    "ai_tutor_conversations",
    "learning_recommendations",
    "study_plans",
    "mock_test_attempts",
    "mock_tests",
    // Platform (Milestone 3)
    "payment_events",
    "coupon_redemptions",
    "transactions",
    "coupons",
    "payment_accounts",
    "subscriptions",
    "plans",
    "notifications",
    "enrollments",
    "email_messages",
    "audit_logs",
    "error_logs",
    "uploaded_files",
    "profiles",
    "users",
  ];
  for (const t of tables) sqlite.exec(`DELETE FROM ${t};`);

  // ---------- USERS ----------
  const adminPass = await bcrypt.hash("admin123", 10);
  const teacherPass = await bcrypt.hash("teacher123", 10);
  const studentPass = await bcrypt.hash("student123", 10);

  const adminId = uid();
  const teacherId = uid();
  const studentId = uid();

  db.insert(users)
    .values([
      { id: adminId, name: "Admin User", email: "admin@banglaenglish.app", passwordHash: adminPass, role: "ADMIN" },
      { id: teacherId, name: "Nusrat Jahan", email: "teacher@banglaenglish.app", passwordHash: teacherPass, role: "TEACHER" },
      { id: studentId, name: "Rafiq Islam", email: "student@banglaenglish.app", passwordHash: studentPass, role: "STUDENT" },
    ])
    .run();

  db.insert(profiles)
    .values([
      { id: uid(), userId: adminId, onboardingCompleted: true, xp: 0, gLevel: 1, streak: 0 },
      { id: uid(), userId: teacherId, onboardingCompleted: true, xp: 0, gLevel: 1, streak: 0 },
      {
        id: uid(),
        userId: studentId,
        onboardingCompleted: true,
        englishLevel: "B1",
        ieltsTarget: 7,
        targetExamDate: "2026-12-15",
        reason: "STUDY_ABROAD",
        focusSkill: "WRITING",
        xp: 340,
        gLevel: 2,
        streak: 4,
        lastStudyDate: new Date().toISOString().slice(0, 10),
        countryGoal: "Canada",
        education: "BSc in Computer Science",
        dailyGoalMinutes: 20,
      },
    ])
    .run();

  // ---------- BADGES ----------
  db.insert(badges)
    .values([
      { id: uid(), code: "FIRST_LESSON", title: "First Lesson", description: "Completed your first lesson", icon: "GraduationCap" },
      { id: uid(), code: "STREAK_7", title: "7 Day Streak", description: "Studied 7 days in a row", icon: "Flame" },
      { id: uid(), code: "WORDS_100", title: "100 Words", description: "Learned 100 vocabulary words", icon: "BookOpen" },
      { id: uid(), code: "GRAMMAR_MASTER", title: "Grammar Master", description: "Completed every Grammar Lab topic", icon: "Sparkles" },
      { id: uid(), code: "FIRST_MOCK", title: "First Mock Test", description: "Completed your first IELTS mock test", icon: "FileCheck" },
    ])
    .run();

  // ---------- SUBSCRIPTION PLANS ----------
  const planRows = [
    {
      code: "FREE", name: "Free", rank: 0, priceMonthly: 0, priceYearly: null as number | null, highlighted: false,
      description: "Find your level and start learning basic English.",
      features: [] as string[], vocabPerDay: 5 as number | null, quizzesPerDay: 3 as number | null,
      bullets: ["Placement test", "Beginner and Elementary English courses", "5 new vocabulary words a day", "3 quizzes a day", "Progress tracking"],
    },
    {
      code: "BASIC", name: "Basic", rank: 1, priceMonthly: 299, priceYearly: 2999, highlighted: false,
      description: "All courses and IELTS practice materials.",
      features: ["IELTS_PRACTICE", "MOCK_TESTS"], vocabPerDay: null, quizzesPerDay: null,
      bullets: ["All English, Career and IELTS courses", "Unlimited vocabulary and quizzes", "IELTS Listening and Reading practice", "Full IELTS mock tests", "7-day study plan"],
    },
    {
      code: "PREMIUM", name: "Premium", rank: 2, priceMonthly: 799, priceYearly: 7999, highlighted: true,
      description: "Add AI feedback on your writing, speaking and questions.",
      features: ["IELTS_PRACTICE", "MOCK_TESTS", "ADVANCED_MOCK", "AI_TUTOR", "AI_WRITING", "AI_SPEAKING"], vocabPerDay: null, quizzesPerDay: null,
      bullets: ["Everything in Basic", "AI Tutor in English and বাংলা", "AI Writing feedback", "AI Speaking practice", "AI marking in mock tests"],
    },
    {
      code: "PRO", name: "Pro", rank: 3, priceMonthly: 1999, priceYearly: 19999, highlighted: false,
      description: "Everything, plus live classes and real teachers.",
      features: ["IELTS_PRACTICE", "MOCK_TESTS", "ADVANCED_MOCK", "AI_TUTOR", "AI_WRITING", "AI_SPEAKING", "LIVE_CLASSES", "TEACHER_FEEDBACK", "ONE_ON_ONE"], vocabPerDay: null, quizzesPerDay: null,
      bullets: ["Everything in Premium", "Live classes with teachers", "Teacher feedback on writing and speaking", "1-on-1 speaking sessions"],
    },
  ];
  const planIds: Record<string, string> = {};
  for (const p of planRows) {
    planIds[p.code] = uid();
    db.insert(plans).values({ id: planIds[p.code], ...p, published: true }).run();
  }

  // ---------- COURSES / MODULES / LESSONS ----------
  const courseDefs = [
    {
      slug: "beginner-english",
      title: "Beginner English",
      description: "Start your English journey: alphabet, pronunciation, and everyday basics.",
      category: "BEGINNER" as const,
      track: "ENGLISH" as const,
      image: "/courses/beginner.svg",
      modules: [
        { title: "Alphabet & Pronunciation", lessons: ["The English Alphabet", "Vowel Sounds", "Consonant Sounds"] },
        { title: "Basic Vocabulary", lessons: ["Numbers & Colors", "Family Members", "Everyday Objects"] },
        { title: "Sentence Formation", lessons: ["Subject + Verb + Object", "Asking Simple Questions"] },
      ],
    },
    {
      slug: "elementary-english",
      title: "Elementary English",
      description: "Build confidence with tenses, questions, and everyday conversation.",
      category: "ELEMENTARY" as const,
      track: "ENGLISH" as const,
      image: "/courses/elementary.svg",
      modules: [
        { title: "Tenses Basics", lessons: ["Present Simple", "Past Simple", "Future with 'Going to'"] },
        { title: "Everyday Conversations", lessons: ["Greetings & Introductions", "Shopping & Prices", "Common Expressions"] },
      ],
    },
    {
      slug: "intermediate-english",
      title: "Intermediate English",
      description: "Sharpen grammar, vocabulary, and speaking for real-world fluency.",
      category: "INTERMEDIATE" as const,
      track: "ENGLISH" as const,
      image: "/courses/intermediate.svg",
      modules: [
        { title: "Complex Sentences", lessons: ["Compound Sentences", "Complex Sentences with Clauses"] },
        { title: "Speaking & Listening", lessons: ["Describing Experiences", "Understanding Native Speed Audio"] },
      ],
    },
    {
      slug: "advanced-english",
      title: "Advanced English",
      description: "Academic and professional English for high-level communication.",
      category: "ADVANCED" as const,
      track: "ENGLISH" as const,
      image: "/courses/advanced.svg",
      modules: [
        { title: "Academic English", lessons: ["Academic Vocabulary", "Critical Reading Strategies"] },
      ],
    },
    {
      slug: "ielts-writing-mastery",
      title: "IELTS Writing Mastery",
      description: "Task 1 and Task 2 strategies to reach Band 7+.",
      category: "INTERMEDIATE" as const,
      track: "IELTS" as const,
      image: "/courses/ielts-writing.svg",
      modules: [
        { title: "Task 1: Reports", lessons: ["Describing Graphs & Charts", "Describing Processes"] },
        { title: "Task 2: Essays", lessons: ["Essay Structure", "Opinion Essays"] },
      ],
    },
    {
      slug: "ielts-speaking-confidence",
      title: "IELTS Speaking Confidence",
      description: "Practice all three parts of the IELTS Speaking test.",
      category: "INTERMEDIATE" as const,
      track: "IELTS" as const,
      image: "/courses/ielts-speaking.svg",
      modules: [
        { title: "Part 1: Introduction", lessons: ["Common Part 1 Topics"] },
        { title: "Part 2: Cue Card", lessons: ["Structuring a 2-Minute Talk"] },
      ],
    },
  ];

  let lessonOrderCounter = 0;
  const createdLessonSlugs: string[] = [];

  for (const c of courseDefs) {
    const courseId = uid();
    db.insert(courses)
      .values({
        id: courseId,
        slug: c.slug,
        title: c.title,
        description: c.description,
        category: c.category,
        track: c.track,
        image: c.image,
        order: 0,
        published: true,
        requiredPlan: c.category === "BEGINNER" || c.category === "ELEMENTARY" ? "FREE" : "BASIC",
      })
      .run();

    c.modules.forEach((m, mi) => {
      const moduleId = uid();
      db.insert(modules)
        .values({ id: moduleId, courseId, slug: `${c.slug}-m${mi + 1}`, title: m.title, order: mi })
        .run();

      m.lessons.forEach((title, li) => {
        const lessonSlug = `${c.slug}-m${mi + 1}-l${li + 1}`;
        createdLessonSlugs.push(lessonSlug);
        const lessonId = uid();
        db.insert(lessons)
          .values({
            id: lessonId,
            moduleId,
            slug: lessonSlug,
            title,
            description: `Learn about "${title}" with clear examples and practice.`,
            content: buildLessonContent(title),
            videoUrl: null,
            audioUrl: null,
            examples: [
              `Example: "${title}" used in a simple sentence.`,
              `Example: A second sentence showing "${title}" in context.`,
            ],
            vocabularyIds: [],
            order: lessonOrderCounter++,
            xpReward: 15,
          })
          .run();

        // one small quiz per lesson
        const quizId = uid();
        db.insert(quizzes).values({ id: quizId, title: `${title} Quiz`, type: "LESSON", lessonId }).run();
        db.insert(questions)
          .values([
            {
              id: uid(),
              quizId,
              type: "MCQ",
              prompt: `Which sentence best demonstrates "${title}"?`,
              options: ["Option A (correct)", "Option B", "Option C", "Option D"],
              correctAnswer: "Option A (correct)",
              explanation: `Option A correctly demonstrates ${title}.`,
              order: 0,
            },
            {
              id: uid(),
              quizId,
              type: "TRUE_FALSE",
              prompt: `True or False: "${title}" is an important part of this level's curriculum.`,
              options: ["True", "False"],
              correctAnswer: "True",
              explanation: "Yes — this topic is a core part of the curriculum at this level.",
              order: 1,
            },
          ])
          .run();
      });
    });
  }

  // ---------- ENGLISH FOR CAREER ----------
  careerCourses.forEach((c, ci) => {
    const courseId = uid();
    db.insert(courses)
      .values({ id: courseId, slug: c.slug, title: c.title, description: c.description, category: c.category, track: "CAREER", image: null, order: 100 + ci, published: true, requiredPlan: "BASIC", ownerId: teacherId })
      .run();
    const moduleId = uid();
    db.insert(modules).values({ id: moduleId, courseId, slug: `${c.slug}-m1`, title: c.moduleTitle, order: 0 }).run();

    c.lessons.forEach((l, li) => {
      const lessonId = uid();
      db.insert(lessons)
        .values({
          id: lessonId,
          moduleId,
          slug: `${c.slug}-m1-l${li + 1}`,
          title: l.title,
          description: `${c.title}: ${l.title}`,
          content: l.content,
          videoUrl: null,
          audioUrl: null,
          examples: l.examples,
          vocabularyIds: [],
          order: lessonOrderCounter++,
          xpReward: 20,
        })
        .run();
      const quizId = uid();
      db.insert(quizzes).values({ id: quizId, title: `${l.title} Quiz`, type: "LESSON", lessonId }).run();
      db.insert(questions)
        .values(
          l.quiz.map((q, qi) => ({ id: uid(), quizId, type: "MCQ" as const, prompt: q.prompt, options: q.options, correctAnswer: q.answer, explanation: q.explanation, order: qi }))
        )
        .run();
    });
  });

  // ---------- GRAMMAR LAB ----------
  const grammarDefs = [
    { title: "Parts of Speech", explanation: "Nouns, verbs, adjectives, adverbs, pronouns, prepositions, conjunctions, and interjections are the building blocks of every English sentence." },
    { title: "Tenses", explanation: "English has 12 main tenses formed from present, past, and future combined with simple, continuous, perfect, and perfect continuous aspects." },
    { title: "Articles", explanation: "'A' and 'an' are indefinite articles used for non-specific nouns; 'the' is the definite article used for specific nouns." },
    { title: "Prepositions", explanation: "Prepositions like in, on, at, by, and with show relationships of time, place, and direction between words in a sentence." },
    { title: "Modals", explanation: "Modal verbs (can, could, may, might, must, should, will, would) express ability, possibility, permission, or obligation." },
    { title: "Conditionals", explanation: "Zero, first, second, and third conditionals describe real, possible, hypothetical, and past-hypothetical situations." },
    { title: "Passive Voice", explanation: "The passive voice (be + past participle) shifts focus from the doer of an action to the action's receiver." },
    { title: "Reported Speech", explanation: "Reported speech converts direct quotes into indirect statements, usually shifting tense and pronouns." },
    { title: "Relative Clauses", explanation: "Relative clauses (who, which, that, whose) add extra information about a noun in a sentence." },
    { title: "Subject-Verb Agreement", explanation: "Subjects and verbs must agree in number: singular subjects take singular verbs, plural subjects take plural verbs." },
  ];

  grammarDefs.forEach((g, i) => {
    const topicId = uid();
    const slug = g.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    db.insert(grammarTopics)
      .values({
        id: topicId,
        slug,
        title: g.title,
        description: g.explanation.slice(0, 90) + "...",
        explanation: g.explanation,
        examples: [
          `Example 1 illustrating ${g.title}.`,
          `Example 2 illustrating ${g.title}.`,
          `Example 3 illustrating ${g.title}.`,
        ],
        order: i,
      })
      .run();

    const quizId = uid();
    db.insert(quizzes).values({ id: quizId, title: `${g.title} Practice`, type: "GRAMMAR", grammarTopicId: topicId }).run();
    db.insert(questions)
      .values([
        {
          id: uid(),
          quizId,
          type: "MCQ",
          prompt: `Choose the sentence that correctly demonstrates ${g.title}.`,
          options: ["Correct example", "Incorrect example A", "Incorrect example B", "Incorrect example C"],
          correctAnswer: "Correct example",
          explanation: `The correct example properly applies the rules of ${g.title}.`,
          skillCategory: "GRAMMAR",
          order: 0,
        },
        {
          id: uid(),
          quizId,
          type: "FILL_BLANK",
          prompt: `Fill in the blank to correctly use ${g.title}: "____"`,
          options: [],
          correctAnswer: "answer",
          explanation: `"answer" is the correct word to complete this ${g.title} example.`,
          skillCategory: "GRAMMAR",
          order: 1,
        },
      ])
      .run();
  });

  // ---------- VOCABULARY ----------
  const vocabDefs: Array<{
    word: string;
    meaning: string;
    bn: string;
    example: string;
    synonym: string;
    antonym: string;
    difficulty: "EASY" | "MEDIUM" | "HARD";
    category: "DAILY" | "IELTS" | "ACADEMIC" | "GENERAL";
  }> = [
    { word: "Abundant", meaning: "Existing in large quantities", bn: "প্রচুর", example: "The region has abundant rainfall.", synonym: "Plentiful", antonym: "Scarce", difficulty: "MEDIUM", category: "IELTS" },
    { word: "Benevolent", meaning: "Kind and generous", bn: "দয়ালু", example: "The benevolent donor funded the school.", synonym: "Kind", antonym: "Malicious", difficulty: "HARD", category: "ACADEMIC" },
    { word: "Commute", meaning: "Travel regularly to and from work", bn: "নিয়মিত যাতায়াত করা", example: "She commutes to Dhaka every day.", synonym: "Travel", antonym: "Stay", difficulty: "EASY", category: "DAILY" },
    { word: "Diligent", meaning: "Showing care in one's work", bn: "পরিশ্রমী", example: "He is a diligent student.", synonym: "Hardworking", antonym: "Lazy", difficulty: "MEDIUM", category: "GENERAL" },
    { word: "Empirical", meaning: "Based on observation rather than theory", bn: "অভিজ্ঞতালব্ধ", example: "The study relies on empirical evidence.", synonym: "Observed", antonym: "Theoretical", difficulty: "HARD", category: "ACADEMIC" },
    { word: "Fluctuate", meaning: "To rise and fall irregularly", bn: "ওঠানামা করা", example: "Prices fluctuate throughout the year.", synonym: "Vary", antonym: "Stabilize", difficulty: "MEDIUM", category: "IELTS" },
    { word: "Grocery", meaning: "Food and household items sold in a store", bn: "মুদি সামগ্রী", example: "I need to buy groceries today.", synonym: "Provisions", antonym: "—", difficulty: "EASY", category: "DAILY" },
    { word: "Hypothesis", meaning: "A proposed explanation for a phenomenon", bn: "অনুমান", example: "The scientist tested her hypothesis.", synonym: "Theory", antonym: "Fact", difficulty: "HARD", category: "ACADEMIC" },
    { word: "Itinerary", meaning: "A planned route or journey", bn: "ভ্রমণসূচি", example: "Our itinerary includes three cities.", synonym: "Schedule", antonym: "—", difficulty: "MEDIUM", category: "GENERAL" },
    { word: "Juvenile", meaning: "Relating to young people", bn: "কিশোর", example: "Juvenile crime rates have declined.", synonym: "Young", antonym: "Adult", difficulty: "MEDIUM", category: "IELTS" },
    { word: "Keen", meaning: "Having enthusiasm or interest", bn: "আগ্রহী", example: "She is keen to learn English.", synonym: "Eager", antonym: "Indifferent", difficulty: "EASY", category: "DAILY" },
    { word: "Legitimate", meaning: "Conforming to the law or rules", bn: "বৈধ", example: "It is a legitimate business.", synonym: "Valid", antonym: "Illegal", difficulty: "HARD", category: "ACADEMIC" },
    { word: "Meticulous", meaning: "Showing great attention to detail", bn: "সূক্ষ্ম", example: "He is meticulous about his work.", synonym: "Careful", antonym: "Careless", difficulty: "HARD", category: "IELTS" },
    { word: "Negotiate", meaning: "To discuss to reach an agreement", bn: "দর কষাকষি করা", example: "They negotiated a better price.", synonym: "Bargain", antonym: "Refuse", difficulty: "MEDIUM", category: "GENERAL" },
    { word: "Obligation", meaning: "A duty or commitment", bn: "বাধ্যবাধকতা", example: "Paying rent is a legal obligation.", synonym: "Duty", antonym: "Choice", difficulty: "MEDIUM", category: "IELTS" },
    { word: "Pragmatic", meaning: "Dealing with things realistically", bn: "বাস্তববাদী", example: "We need a pragmatic solution.", synonym: "Practical", antonym: "Idealistic", difficulty: "HARD", category: "ACADEMIC" },
    { word: "Query", meaning: "A question, especially expressing doubt", bn: "প্রশ্ন", example: "I have a query about the bill.", synonym: "Question", antonym: "Answer", difficulty: "EASY", category: "DAILY" },
    { word: "Resilient", meaning: "Able to recover quickly from difficulty", bn: "স্থিতিস্থাপক", example: "The community is resilient after the flood.", synonym: "Tough", antonym: "Fragile", difficulty: "MEDIUM", category: "IELTS" },
    { word: "Substantial", meaning: "Of considerable importance or size", bn: "উল্লেখযোগ্য", example: "They made substantial progress.", synonym: "Significant", antonym: "Minor", difficulty: "MEDIUM", category: "IELTS" },
    { word: "Tedious", meaning: "Too long, slow, or dull", bn: "একঘেয়ে", example: "The lecture was tedious.", synonym: "Boring", antonym: "Exciting", difficulty: "EASY", category: "DAILY" },
  ];

  db.insert(vocabulary)
    .values(
      vocabDefs.map((v) => ({
        id: uid(),
        word: v.word,
        meaning: v.meaning,
        banglaMeaning: v.bn,
        pronunciation: `/${v.word.toLowerCase()}/`,
        example: v.example,
        synonym: v.synonym,
        antonym: v.antonym,
        difficulty: v.difficulty,
        category: v.category,
      }))
    )
    .run();

  // ---------- ASSESSMENT QUIZ ----------
  const assessmentQuizId = uid();
  db.insert(quizzes).values({ id: assessmentQuizId, title: "English Placement Assessment", type: "ASSESSMENT" }).run();

  const assessmentQuestions: Array<{ prompt: string; options: string[]; correct: string; cat: "GRAMMAR" | "VOCABULARY" | "READING" | "LISTENING" }> = [
    { prompt: "She ___ to school every day.", options: ["go", "goes", "going", "gone"], correct: "goes", cat: "GRAMMAR" },
    { prompt: "They ___ dinner when I called.", options: ["eat", "ate", "were eating", "eaten"], correct: "were eating", cat: "GRAMMAR" },
    { prompt: "By next year, she ___ her degree.", options: ["will complete", "will have completed", "completes", "completed"], correct: "will have completed", cat: "GRAMMAR" },
    { prompt: "If it rains, we ___ the picnic.", options: ["cancel", "will cancel", "canceled", "canceling"], correct: "will cancel", cat: "GRAMMAR" },
    { prompt: "Choose the correct article: I saw ___ elephant at the zoo.", options: ["a", "an", "the", "no article"], correct: "an", cat: "GRAMMAR" },
    { prompt: "Synonym of 'Abundant':", options: ["Scarce", "Plentiful", "Empty", "Small"], correct: "Plentiful", cat: "VOCABULARY" },
    { prompt: "Antonym of 'Diligent':", options: ["Hardworking", "Careful", "Lazy", "Keen"], correct: "Lazy", cat: "VOCABULARY" },
    { prompt: "'Fluctuate' most nearly means:", options: ["Stabilize", "Vary", "Increase only", "Decrease only"], correct: "Vary", cat: "VOCABULARY" },
    { prompt: "Choose the word that fits: The report was ___ and hard to follow.", options: ["clear", "concise", "convoluted", "brief"], correct: "convoluted", cat: "VOCABULARY" },
    { prompt: "'Meticulous' describes someone who is:", options: ["Careless", "Detail-oriented", "Fast", "Lazy"], correct: "Detail-oriented", cat: "VOCABULARY" },
    { prompt: "Reading: 'Despite the rain, the match continued.' What happened?", options: ["The match was canceled", "The match continued anyway", "It didn't rain", "The players left"], correct: "The match continued anyway", cat: "READING" },
    { prompt: "Reading: 'He rarely arrives late.' This means he:", options: ["Is usually on time", "Is always late", "Never comes", "Comes early always"], correct: "Is usually on time", cat: "READING" },
    { prompt: "Reading: Choose the best summary of: 'Renewable energy use is rising as costs fall.'", options: ["Renewable energy is declining", "Cheaper costs are increasing renewable energy use", "Costs are rising", "Energy use is falling"], correct: "Cheaper costs are increasing renewable energy use", cat: "READING" },
    { prompt: "Reading: 'Although tired, she finished the race.' What is implied?", options: ["She gave up", "She persevered despite fatigue", "She was not tired", "She didn't finish"], correct: "She persevered despite fatigue", cat: "READING" },
    { prompt: "Reading: What does 'nonetheless' signal in a sentence?", options: ["Addition", "Contrast", "Cause", "Example"], correct: "Contrast", cat: "READING" },
    { prompt: "Listening: A speaker says 'The meeting has been pushed back.' This means the meeting is:", options: ["Canceled", "Earlier", "Delayed", "Confirmed"], correct: "Delayed", cat: "LISTENING" },
    { prompt: "Listening: You hear 'I'd rather stay in tonight.' The speaker prefers to:", options: ["Go out", "Stay home", "Travel", "Sleep early"], correct: "Stay home", cat: "LISTENING" },
    { prompt: "Listening: 'Could you turn it down a bit?' is a request to:", options: ["Increase volume", "Decrease volume", "Turn it off", "Turn it on"], correct: "Decrease volume", cat: "LISTENING" },
    { prompt: "Listening: 'That's a bit out of my budget' means the item is:", options: ["Affordable", "Too expensive", "Free", "On sale"], correct: "Too expensive", cat: "LISTENING" },
    { prompt: "Listening: 'Let's touch base next week' means they will:", options: ["Meet or talk next week", "Never speak again", "Meet today", "Cancel plans"], correct: "Meet or talk next week", cat: "LISTENING" },
  ];

  db.insert(questions)
    .values(
      assessmentQuestions.map((q, i) => ({
        id: uid(),
        quizId: assessmentQuizId,
        type: "MCQ" as const,
        prompt: q.prompt,
        options: q.options,
        correctAnswer: q.correct,
        explanation: `The correct answer is "${q.correct}".`,
        skillCategory: q.cat,
        order: i,
      }))
    )
    .run();

  // ---------- IELTS READING ----------
  const passage1Id = uid();
  const passage1Body = `Over the past two decades, beekeeping has moved from rural farmland into the heart of major cities. Rooftops in New York, balconies in London, and community gardens in Singapore now host thousands of hives, a trend commonly known as urban beekeeping. Enthusiasts argue that cities, with their diverse flowering plants and relative absence of large-scale pesticide use, can actually provide a richer and more stable diet for bees than many intensively farmed rural areas.

The ecological benefits of this movement extend well beyond honey production. Bees are essential pollinators, and their presence in urban areas supports the reproduction of street trees, park flowers, and community vegetable gardens. Researchers have found that neighbourhoods with active apiaries — the technical term for a collection of beehives — often show measurably higher biodiversity among flowering plants than comparable neighbourhoods without them.

Despite these advantages, urban beekeeping is not without its challenges. Space is often extremely limited, forcing keepers to site hives on rooftops or in narrow courtyards. Many cities also require beekeepers to register each hive with local authorities before it can be legally maintained, partly to track the spread of disease. Varroa mites, a parasite that weakens entire colonies, remain the single greatest health threat to urban hives, spreading quickly wherever hives are placed close together.

Even so, most urban beekeeping associations report steady growth in membership each year, and several cities have begun offering subsidies to encourage new keepers. Whether this momentum can be sustained as cities become denser remains an open question, but for now, the rooftop hive shows no sign of disappearing.`;

  db.insert(readingPassages)
    .values({
      id: passage1Id,
      title: "The Rise of Urban Beekeeping",
      testType: "ACADEMIC",
      passageNumber: 1,
      bodyText: passage1Body,
      wordCount: passage1Body.split(/\s+/).length,
      topic: "Environment",
      difficulty: "MEDIUM",
      timeLimitSeconds: 1200,
      published: true,
    })
    .run();

  db.insert(ieltsQuestions)
    .values([
      {
        id: uid(),
        skill: "READING",
        passageId: passage1Id,
        questionType: "MCQ_SINGLE",
        prompt: "Why do some enthusiasts believe cities can be better for bees than farmland?",
        content: {
          options: [
            "Cities have fewer flowering plants",
            "Cities often use less large-scale pesticide and offer varied flowers",
            "Cities have more rainfall than farmland",
            "Bees prefer artificial light in cities",
          ],
        },
        correctAnswer: "Cities often use less large-scale pesticide and offer varied flowers",
        explanation: "The passage states cities have 'diverse flowering plants and relative absence of large-scale pesticide use'.",
        order: 0,
        published: true,
      },
      {
        id: uid(),
        skill: "READING",
        passageId: passage1Id,
        questionType: "TRUE_FALSE_NOT_GIVEN",
        prompt: "Neighbourhoods with active apiaries tend to show lower biodiversity than those without.",
        content: {},
        correctAnswer: "FALSE",
        explanation: "The passage states these neighbourhoods show higher, not lower, biodiversity.",
        order: 1,
        published: true,
      },
      {
        id: uid(),
        skill: "READING",
        passageId: passage1Id,
        questionType: "TRUE_FALSE_NOT_GIVEN",
        prompt: "All cities currently offer financial subsidies to new beekeepers.",
        content: {},
        correctAnswer: "NOT_GIVEN",
        explanation: "The passage says 'several cities', not all cities, so this cannot be confirmed as true or false.",
        order: 2,
        published: true,
      },
      {
        id: uid(),
        skill: "READING",
        passageId: passage1Id,
        questionType: "MATCHING",
        prompt: "Match each term to its correct description.",
        content: {
          items: ["Apiary", "Varroa mite", "Pollination"],
          options: [
            "A collection of beehives",
            "A parasite that weakens bee colonies",
            "The process bees support by transferring pollen between flowers",
          ],
        },
        correctAnswer: {
          Apiary: "A collection of beehives",
          "Varroa mite": "A parasite that weakens bee colonies",
          Pollination: "The process bees support by transferring pollen between flowers",
        },
        explanation: "See paragraphs 2 and 3 for each term's definition.",
        order: 3,
        published: true,
      },
      {
        id: uid(),
        skill: "READING",
        passageId: passage1Id,
        questionType: "SENTENCE_COMPLETION",
        prompt: "Beekeepers must often register each hive with ______ authorities.",
        content: { wordLimit: 1 },
        correctAnswer: "local",
        explanation: "'Many cities also require beekeepers to register each hive with local authorities...'",
        order: 4,
        published: true,
      },
      {
        id: uid(),
        skill: "READING",
        passageId: passage1Id,
        questionType: "SHORT_ANSWER",
        prompt: "What is named as the greatest health threat to urban beehives?",
        content: { wordLimit: 3 },
        correctAnswer: ["Varroa mites", "Varroa mite"],
        explanation: "'Varroa mites... remain the single greatest health threat to urban hives.'",
        order: 5,
        published: true,
      },
    ])
    .run();

  const passage2Id = uid();
  const passage2Body = `The Riverside Community Library welcomes residents of all ages to join as members. Membership is free for children under twelve and for residents over sixty-five; all other adults pay a small annual fee of $15.

To register, new members should bring a valid photo ID and proof of address, such as a utility bill, to the front desk during opening hours. Membership cards are usually ready within ten minutes and are valid for twelve months from the date of issue.

Members may borrow up to eight items at a time, including books, magazines, and audiobooks. Items are normally loaned for three weeks, though DVDs and best-seller titles are limited to a one-week loan period. Items returned after the due date incur a late fee of fifty cents per day, up to a maximum of ten dollars per item.

The library also offers free Wi-Fi, a children's story hour every Saturday morning, and a quiet study room that can be booked in advance through the front desk or the library's website.`;

  db.insert(readingPassages)
    .values({
      id: passage2Id,
      title: "Riverside Community Library — Membership Guide",
      testType: "GENERAL_TRAINING",
      passageNumber: 1,
      bodyText: passage2Body,
      wordCount: passage2Body.split(/\s+/).length,
      topic: "Community services",
      difficulty: "EASY",
      timeLimitSeconds: 900,
      published: true,
    })
    .run();

  db.insert(ieltsQuestions)
    .values([
      {
        id: uid(),
        skill: "READING",
        passageId: passage2Id,
        questionType: "FORM_COMPLETION",
        prompt: "Membership is free for children under ______ years old.",
        content: { wordLimit: 1 },
        correctAnswer: "twelve",
        explanation: "'Membership is free for children under twelve...'",
        order: 0,
        published: true,
      },
      {
        id: uid(),
        skill: "READING",
        passageId: passage2Id,
        questionType: "FORM_COMPLETION",
        prompt: "Adults must pay an annual fee of $______.",
        content: { wordLimit: 1 },
        correctAnswer: "15",
        explanation: "'...all other adults pay a small annual fee of $15.'",
        order: 1,
        published: true,
      },
      {
        id: uid(),
        skill: "READING",
        passageId: passage2Id,
        questionType: "FORM_COMPLETION",
        prompt: "New members must bring a valid photo ID and proof of ______.",
        content: { wordLimit: 1 },
        correctAnswer: "address",
        explanation: "'...bring a valid photo ID and proof of address...'",
        order: 2,
        published: true,
      },
      {
        id: uid(),
        skill: "READING",
        passageId: passage2Id,
        questionType: "SHORT_ANSWER",
        prompt: "How many items can a member borrow at one time?",
        content: { wordLimit: 1 },
        correctAnswer: ["8", "eight"],
        explanation: "'Members may borrow up to eight items at a time...'",
        order: 3,
        published: true,
      },
      {
        id: uid(),
        skill: "READING",
        passageId: passage2Id,
        questionType: "MCQ_SINGLE",
        prompt: "Which items have a shorter loan period than three weeks?",
        content: {
          options: ["Magazines", "DVDs and best-sellers", "Audiobooks", "Study room bookings"],
        },
        correctAnswer: "DVDs and best-sellers",
        explanation: "'...DVDs and best-seller titles are limited to a one-week loan period.'",
        order: 4,
        published: true,
      },
      {
        id: uid(),
        skill: "READING",
        passageId: passage2Id,
        questionType: "TRUE_FALSE_NOT_GIVEN",
        prompt: "The library charges a late fee that can exceed ten dollars per item.",
        content: {},
        correctAnswer: "FALSE",
        explanation: "Late fees are capped at 'a maximum of ten dollars per item'.",
        order: 5,
        published: true,
      },
    ])
    .run();

  // ---------- IELTS LISTENING ----------
  // Scripts drive both the generated audio (scripts/generate-listening-audio.ps1) and the transcripts.
  type ScriptLine = { speaker: string; text: string };
  const listeningScripts = JSON.parse(readFileSync(path.join(process.cwd(), "scripts/listening-scripts.json"), "utf8")) as Record<
    "s1" | "s2",
    { context: string; lines: ScriptLine[] }
  >;
  const toTranscript = (lines: ScriptLine[]) => lines.map((l) => `${l.speaker}: ${l.text}`).join("\n");

  const listeningTestId = uid();
  const section1Id = uid();
  const section2Id = uid();

  db.insert(listeningTests)
    .values({
      id: listeningTestId,
      title: "Campus Life — Practice Test 1",
      difficulty: "EASY",
      timeLimitSeconds: 900,
      published: true,
    })
    .run();

  db.insert(listeningSections)
    .values([
      {
        id: section1Id,
        listeningTestId,
        sectionNumber: 1,
        audioUrl: "/audio/listening/campus-life-s1.wav",
        transcript: toTranscript(listeningScripts.s1.lines),
        context: listeningScripts.s1.context,
        order: 0,
      },
      {
        id: section2Id,
        listeningTestId,
        sectionNumber: 2,
        audioUrl: "/audio/listening/campus-life-s2.wav",
        transcript: toTranscript(listeningScripts.s2.lines),
        context: listeningScripts.s2.context,
        order: 1,
      },
    ])
    .run();

  const mapContent = { imageUrl: "/listening/campus-map.svg", labels: ["A", "B", "C", "D", "E", "F"] };

  db.insert(ieltsQuestions)
    .values([
      {
        id: uid(),
        skill: "LISTENING",
        listeningSectionId: section1Id,
        questionType: "FORM_COMPLETION",
        prompt: "Surname: ______",
        content: { wordLimit: 1 },
        correctAnswer: "Harper",
        explanation: "The caller spells his surname: H-A-R-P-E-R.",
        order: 0,
        published: true,
      },
      {
        id: uid(),
        skill: "LISTENING",
        listeningSectionId: section1Id,
        questionType: "FORM_COMPLETION",
        prompt: "Type of membership chosen: ______ membership",
        content: { wordLimit: 1 },
        correctAnswer: "student",
        explanation: "The receptionist offers the student membership and the caller accepts it.",
        order: 1,
        published: true,
      },
      {
        id: uid(),
        skill: "LISTENING",
        listeningSectionId: section1Id,
        questionType: "FORM_COMPLETION",
        prompt: "Monthly fee: £______",
        content: { wordLimit: 1 },
        correctAnswer: ["22", "twenty-two"],
        explanation: "'The student membership is twenty-two pounds a month.'",
        order: 2,
        published: true,
      },
      {
        id: uid(),
        skill: "LISTENING",
        listeningSectionId: section1Id,
        questionType: "MCQ_SINGLE",
        prompt: "What extra does the caller get with a twelve-month contract?",
        content: { options: ["A gym towel", "A free personal training session", "A swimming lesson", "A locker key"] },
        correctAnswer: "A free personal training session",
        explanation: "'If you sign a twelve-month contract, you get a free personal training session in your first week.'",
        order: 3,
        published: true,
      },
      {
        id: uid(),
        skill: "LISTENING",
        listeningSectionId: section1Id,
        questionType: "MCQ_SINGLE",
        prompt: "When is the gym busiest?",
        content: { options: ["Early morning", "Lunchtime", "Evening, after 5 pm", "Weekends"] },
        correctAnswer: "Evening, after 5 pm",
        explanation: "The receptionist says it is quiet in the morning and at lunchtime but 'gets crowded in the evening, after five o'clock'.",
        order: 4,
        published: true,
      },
      {
        id: uid(),
        skill: "LISTENING",
        listeningSectionId: section1Id,
        questionType: "MATCHING",
        prompt: "Match each facility to its opening time.",
        content: { items: ["Pool", "Gym", "Sauna"], options: ["6 am", "7 am", "9 am"] },
        correctAnswer: { Pool: "6 am", Gym: "7 am", Sauna: "9 am" },
        explanation: "'The pool opens at six... the gym opens at seven, and the sauna doesn't open until nine.'",
        order: 5,
        published: true,
      },
      {
        id: uid(),
        skill: "LISTENING",
        listeningSectionId: section1Id,
        questionType: "SENTENCE_COMPLETION",
        prompt: "The induction session takes place every ______ morning.",
        content: { wordLimit: 1 },
        correctAnswer: "Saturday",
        explanation: "'It runs every Saturday morning at ten o'clock.'",
        order: 6,
        published: true,
      },
      {
        id: uid(),
        skill: "LISTENING",
        listeningSectionId: section2Id,
        questionType: "MAP_LABELING",
        prompt: "Which building is the student café?",
        content: mapContent,
        correctAnswer: "C",
        explanation: "The café is 'on your left, near the entrance' — the building marked C.",
        order: 0,
        published: true,
      },
      {
        id: uid(),
        skill: "LISTENING",
        listeningSectionId: section2Id,
        questionType: "MAP_LABELING",
        prompt: "Which building is the library?",
        content: mapContent,
        correctAnswer: "B",
        explanation: "The library is 'directly on your left, opposite the fountain' — the building marked B.",
        order: 1,
        published: true,
      },
      {
        id: uid(),
        skill: "LISTENING",
        listeningSectionId: section2Id,
        questionType: "MAP_LABELING",
        prompt: "Which building is the science block?",
        content: mapContent,
        correctAnswer: "E",
        explanation: "The science block is 'opposite the library, on the right of the fountain' — the building marked E.",
        order: 2,
        published: true,
      },
      {
        id: uid(),
        skill: "LISTENING",
        listeningSectionId: section2Id,
        questionType: "MAP_LABELING",
        prompt: "Which building is the sports hall?",
        content: mapContent,
        correctAnswer: "D",
        explanation: "The sports hall is 'in the top right corner' — the building marked D.",
        order: 3,
        published: true,
      },
      {
        id: uid(),
        skill: "LISTENING",
        listeningSectionId: section2Id,
        questionType: "SENTENCE_COMPLETION",
        prompt: "You need to swipe your ______ card to enter the library.",
        content: { wordLimit: 1 },
        correctAnswer: "student",
        explanation: "'You need to swipe your student card to get in.'",
        order: 4,
        published: true,
      },
      {
        id: uid(),
        skill: "LISTENING",
        listeningSectionId: section2Id,
        questionType: "MCQ_MULTI",
        prompt: "Which TWO facilities stay open around the clock during exam weeks?",
        content: { options: ["The library", "The café", "The computer lab", "The sports hall"], selectCount: 2 },
        correctAnswer: ["The library", "The computer lab"],
        explanation: "'The library and the computer lab stay open around the clock, but the café and the sports hall close at ten.'",
        order: 5,
        published: true,
      },
      {
        id: uid(),
        skill: "LISTENING",
        listeningSectionId: section2Id,
        questionType: "SUMMARY_COMPLETION",
        prompt: "At the end of the tour, each student collects a welcome ______.",
        content: { wordLimit: 1 },
        correctAnswer: "pack",
        explanation: "'...where each of you will collect a welcome pack.'",
        order: 6,
        published: true,
      },
    ])
    .run();

  // ---------- IELTS WRITING ----------
  const task1Tail =
    "Summarise the information by selecting and reporting the main features, and make comparisons where relevant.\n\nWrite at least 150 words.";
  const task2Tail =
    "Give reasons for your answer and include any relevant examples from your own knowledge or experience.\n\nWrite at least 250 words.";

  db.insert(writingPrompts)
    .values([
      {
        id: uid(),
        taskType: "TASK1",
        category: "CHART",
        promptText: `The chart below shows the percentage of households with internet access in three countries in 2005 and 2020.\n\n${task1Tail}`,
        imageUrl: "/writing/bar-chart-internet.svg",
        visualDescription:
          "Bar chart showing the percentage of households with internet access in three countries in 2005 and 2020. United Kingdom: 60% in 2005 and 95% in 2020. Brazil: 20% in 2005 and 74% in 2020. India: 5% in 2005 and 50% in 2020.",
        published: true,
      },
      {
        id: uid(),
        taskType: "TASK1",
        category: "GRAPH",
        promptText: `The graph below shows the percentage of commuters in one city who used three types of transport between 2000 and 2020.\n\n${task1Tail}`,
        imageUrl: "/writing/line-graph-transport.svg",
        visualDescription:
          "Line graph showing the percentage of commuters using car, bus and bicycle in one city from 2000 to 2020 at five-year intervals. Car: 55% (2000), 58% (2005), 60% (2010), 54% (2015), 45% (2020). Bus: 30%, 28%, 25%, 27%, 30%. Bicycle: 5%, 6%, 8%, 12%, 18%.",
        published: true,
      },
      {
        id: uid(),
        taskType: "TASK1",
        category: "TABLE",
        promptText: `The table below shows average monthly household spending in one city in 2010 and 2020.\n\n${task1Tail}`,
        imageUrl: "/writing/table-spending.svg",
        visualDescription:
          "Table of average monthly household spending in US dollars in 2010 and 2020. Housing: 620 (2010), 850 (2020). Food: 310, 360. Transport: 140, 190. Entertainment: 90, 70.",
        published: true,
      },
      {
        id: uid(),
        taskType: "TASK1",
        category: "PROCESS",
        promptText: `The diagram below shows how paper is recycled.\n\n${task1Tail}`,
        imageUrl: "/writing/process-recycling.svg",
        visualDescription:
          "Diagram with six steps showing how paper is recycled: 1 waste paper is collected; 2 it is sorted and cleaned; 3 it is mixed with water into pulp; 4 ink is removed; 5 the pulp is pressed and dried; 6 the paper is rolled and cut to size.",
        published: true,
      },
      {
        id: uid(),
        taskType: "TASK2",
        category: "OPINION",
        promptText: `Nowadays many people choose to work from home rather than in an office.\n\nTo what extent do you agree or disagree that this is a positive development?\n\n${task2Tail}`,
        published: true,
      },
      {
        id: uid(),
        taskType: "TASK2",
        category: "DISCUSSION",
        promptText: `Some people think that university education should be free for all students, while others believe that students should pay for it.\n\nDiscuss both these views and give your own opinion.\n\n${task2Tail}`,
        published: true,
      },
      {
        id: uid(),
        taskType: "TASK2",
        category: "ADVANTAGE_DISADVANTAGE",
        promptText: `More and more people are buying goods online instead of in local shops.\n\nDo the advantages of this trend outweigh the disadvantages?\n\n${task2Tail}`,
        published: true,
      },
      {
        id: uid(),
        taskType: "TASK2",
        category: "PROBLEM_SOLUTION",
        promptText: `In many large cities, traffic congestion is becoming a serious problem.\n\nWhat are the causes of this problem, and what measures could be taken to reduce it?\n\n${task2Tail}`,
        published: true,
      },
      {
        id: uid(),
        taskType: "TASK2",
        category: "TWO_PART",
        promptText: `Many young people today spend a large amount of their free time on social media.\n\nWhy do you think this is? Is this a positive or negative development?\n\n${task2Tail}`,
        published: true,
      },
    ])
    .run();

  // ---------- IELTS SPEAKING ----------
  const part1Topics: Record<string, string[]> = {
    Hometown: [
      "Where is your hometown, and what is it famous for?",
      "What do you like most about living there?",
      "Has your hometown changed much in recent years?",
      "Would you like to live in your hometown in the future? Why, or why not?",
    ],
    "Work or studies": [
      "Do you work, or are you a student?",
      "What do you enjoy most about your work or studies?",
      "Why did you choose this job or subject?",
      "What would you like to do in the future?",
    ],
    "Free time": [
      "What do you like to do in your free time?",
      "Do you prefer spending your free time alone or with other people? Why?",
      "Has the way you spend your free time changed since you were a child?",
      "Is there a hobby you would like to try in the future?",
    ],
    "Food and cooking": [
      "What kinds of food do you enjoy eating?",
      "Do you often cook for yourself or for your family?",
      "Is there a traditional dish from your country that you would recommend?",
      "Do you think people eat more healthily now than in the past?",
    ],
  };

  const cueCards: { topic: string; text: string; part3: string[] }[] = [
    {
      topic: "A book you enjoyed reading",
      text: "Describe a book that you enjoyed reading.\nYou should say:\n- what the book was and who wrote it\n- what it was about\n- when and where you read it\nand explain why you enjoyed reading it.",
      part3: [
        "Do you think reading habits have changed in recent years? In what ways?",
        "Why do some people prefer paper books to e-books?",
        "Should schools do more to encourage children to read? How?",
        "How might books and reading change in the future?",
      ],
    },
    {
      topic: "A place you visited",
      text: "Describe a place you visited that you found interesting.\nYou should say:\n- where the place is\n- when you went there and who you went with\n- what you did there\nand explain why you found it interesting.",
      part3: [
        "Why do people like to travel to other places?",
        "What are the benefits and drawbacks of tourism for local communities?",
        "Do you think it is better to travel alone or in a group? Why?",
        "How can governments protect popular tourist sites?",
      ],
    },
    {
      topic: "A person who helped you",
      text: "Describe a person who has helped you in your life.\nYou should say:\n- who the person is\n- how you know them\n- how they helped you\nand explain why their help was important to you.",
      part3: [
        "What qualities make someone a good mentor?",
        "Do people in your country rely more on family or friends for help?",
        "How has technology changed the way people ask for and give help?",
        "Is it important for children to learn to solve problems on their own? Why?",
      ],
    },
  ];

  db.insert(speakingPrompts)
    .values([
      ...Object.entries(part1Topics).flatMap(([topic, qs]) =>
        qs.map((q) => ({ id: uid(), part: "PART1" as const, topic, questionText: q, published: true }))
      ),
      ...cueCards.map((c) => ({ id: uid(), part: "PART2" as const, topic: c.topic, questionText: c.text, published: true })),
      ...cueCards.flatMap((c) =>
        c.part3.map((q) => ({ id: uid(), part: "PART3" as const, topic: c.topic, questionText: q, followUpOfTopic: c.topic, published: true }))
      ),
    ])
    .run();

  // ---------- IELTS MOCK TEST ----------
  const allWritingPrompts = db.select().from(writingPrompts).all();
  db.insert(mockTests)
    .values({
      id: uid(),
      title: "IELTS Academic Mock Test 1",
      testType: "ACADEMIC",
      listeningTestId,
      readingPassageIds: [passage1Id],
      writingTask1PromptId: allWritingPrompts.find((p) => p.taskType === "TASK1" && p.category === "CHART")!.id,
      writingTask2PromptId: allWritingPrompts.find((p) => p.taskType === "TASK2" && p.category === "OPINION")!.id,
      published: true,
    })
    .run();

  // ---------- TEACHERS ----------
  db.insert(teachers)
    .values([
      { id: uid(), name: "Nusrat Jahan", title: "Senior IELTS Trainer", bio: "8+ years preparing Bangladeshi students for Band 7+ scores.", image: "/teachers/t1.svg", specialties: ["IELTS Writing", "IELTS Speaking"] },
      { id: uid(), name: "Kamal Hossain", title: "Grammar Specialist", bio: "Former university lecturer focused on grammar fundamentals.", image: "/teachers/t2.svg", specialties: ["Grammar", "Academic English"] },
      { id: uid(), name: "Farhana Akter", title: "Vocabulary & Reading Coach", bio: "Helps students build IELTS-ready vocabulary fast.", image: "/teachers/t3.svg", specialties: ["Vocabulary", "Reading"] },
      { id: uid(), name: "Imran Chowdhury", title: "Listening & Speaking Coach", bio: "Specializes in accent training and listening strategy.", image: "/teachers/t4.svg", specialties: ["Listening", "Speaking"] },
    ])
    .run();

  // ---------- TESTIMONIALS ----------
  db.insert(testimonials)
    .values([
      { id: uid(), name: "Sadia Rahman", role: "IELTS Band 7.5 · Study in UK", quote: "The structured lessons and mock tests helped me hit my target band in 3 months.", image: "/students/s1.svg", rating: 5 },
      { id: uid(), name: "Tanvir Ahmed", role: "Band 7 · Work Visa Australia", quote: "Vocabulary flashcards and daily streaks kept me consistent every single day.", image: "/students/s2.svg", rating: 5 },
      { id: uid(), name: "Mitu Sultana", role: "B2 → C1 Learner", quote: "Grammar Lab explanations finally made conditionals make sense to me.", image: "/students/s3.svg", rating: 4 },
    ])
    .run();

  // ---------- BLOG ----------
  db.insert(blogPosts)
    .values([
      {
        id: uid(),
        slug: "5-tips-ielts-writing-task-2",
        title: "5 Tips to Improve Your IELTS Writing Task 2 Score",
        excerpt: "Simple, high-impact changes that can lift your Task 2 band score.",
        content: "Structure your essay clearly, use topic sentences, support ideas with examples, vary sentence types, and always leave time to proofread. These five habits consistently separate Band 6 essays from Band 7+ essays.",
        image: "/blog/writing-tips.svg",
        category: "IELTS Writing",
      },
      {
        id: uid(),
        slug: "building-vocabulary-daily-habit",
        title: "How to Build Vocabulary as a Daily Habit",
        excerpt: "Small, consistent practice beats cramming — here's how to make it stick.",
        content: "Use spaced repetition with flashcards, review 10-15 words a day, and put new words into your own example sentences. Consistency over weeks builds vocabulary far more effectively than occasional long study sessions.",
        image: "/blog/vocabulary-habit.svg",
        category: "Vocabulary",
      },
      {
        id: uid(),
        slug: "common-grammar-mistakes-bangladeshi-learners",
        title: "Common Grammar Mistakes Bangladeshi Learners Make",
        excerpt: "Article usage, prepositions, and tense mistakes — and how to fix them.",
        content: "Many learners struggle with article usage ('a' vs 'the'), preposition choice, and present perfect vs. past simple. Practicing with targeted grammar drills in the Grammar Lab helps correct these patterns quickly.",
        image: "/blog/grammar-mistakes.svg",
        category: "Grammar",
      },
    ])
    .run();

  // ---------- STUDY ABROAD AND RESOURCES ----------
  studyCountryDefs.forEach((c, i) => db.insert(studyCountries).values({ id: uid(), ...c, order: i }).run());
  resourceDefs.forEach((r, i) => db.insert(learningResources).values({ id: uid(), ...r, order: i }).run());

  // ---------- DEMO ENROLMENTS & NOTIFICATIONS ----------
  const enrolledCourse = db.select().from(courses).all().find((c) => c.slug === "beginner-english");
  if (enrolledCourse) db.insert(enrollments).values({ id: uid(), userId: studentId, courseId: enrolledCourse.id }).run();
  db.insert(notifications)
    .values([
      { id: uid(), userId: studentId, type: "SYSTEM", title: "Welcome to BanglaEnglish!", body: "Take the placement test to find your level, then start your first lesson.", url: "/dashboard/assessment" },
      { id: uid(), userId: studentId, type: "COURSE", title: "New: English for Career courses", body: "Job interviews, CVs, emails and more. Take a look.", url: "/dashboard/courses?track=CAREER" },
    ])
    .run();

  // The demo student has the Pro plan so every feature (including teacher feedback and 1-on-1 sessions) can be tried; new sign-ups start on Free.
  db.insert(subscriptions)
    .values({
      id: uid(),
      userId: studentId,
      planId: planIds.PRO,
      source: "ADMIN",
      startedAt: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 90 * 86_400_000).toISOString(),
    })
    .run();

  // ---------- DEMO PAYMENT SETUP (replace with your real accounts in the admin panel) ----------
  db.insert(paymentAccounts)
    .values([
      { id: uid(), method: "BKASH", accountName: "BanglaEnglish (DEMO - not real)", accountNumber: "01700000001", instructions: "Use Send Money and write your email in the reference.", order: 0, active: true },
      { id: uid(), method: "NAGAD", accountName: "BanglaEnglish (DEMO - not real)", accountNumber: "01700000002", order: 1, active: true },
      { id: uid(), method: "ROCKET", accountName: "BanglaEnglish (DEMO - not real)", accountNumber: "017000000023", order: 2, active: true },
      { id: uid(), method: "BANK_TRANSFER", accountName: "BanglaEnglish Ltd (DEMO - not real)", accountNumber: "1234567890123", bankName: "Demo Bank", branch: "Mymensingh", order: 3, active: true },
    ])
    .run();
  const jobInterview = db.select().from(courses).all().find((c) => c.slug === "job-interview-english");
  db.insert(coupons)
    .values([
      { id: uid(), code: "IELTS20", description: "20% off any paid plan", type: "PERCENT", value: 20, maxDiscount: 500, perUserLimit: 1, planCodes: [], courseIds: [], active: true },
      { id: uid(), code: "SAVE100", description: "৳100 off Basic", type: "FIXED", value: 100, minAmount: 299, perUserLimit: 1, planCodes: ["BASIC"], courseIds: [], active: true },
      { id: uid(), code: "CAREER25", description: "25% off when you upgrade from Job Interview English", type: "PERCENT", value: 25, perUserLimit: 1, planCodes: [], courseIds: jobInterview ? [jobInterview.id] : [], active: true },
    ])
    .run();

  // ---------- DEMO TEACHING: a batch and an assignment for the demo teacher ----------
  const careerCourse = db.select().from(courses).all().find((c) => c.slug === "job-interview-english");
  if (careerCourse) db.insert(enrollments).values({ id: uid(), userId: studentId, courseId: careerCourse.id }).run();
  const batchId = uid();
  db.insert(batches).values({ id: batchId, teacherId, name: "IELTS Evening Batch", description: "Evening group for students aiming at Band 7.", courseId: careerCourse?.id ?? null, capacity: 30 }).run();
  db.insert(batchMembers).values({ id: uid(), batchId, studentId }).run();
  const dueDate = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
  db.insert(assignments)
    .values({
      id: uid(),
      teacherId,
      batchId,
      title: "Introduce yourself in an interview",
      instructions: "Write about 150 words: how you would introduce yourself at the start of a job interview. Mention your studies, one strength and one goal.",
      dueAt: dueDate,
      maxScore: 10,
      published: true,
      publishedAt: new Date().toISOString(),
    })
    .run();

  // ---------- DEMO SPEAKING SLOTS (Bangladesh time; replace the meeting link with your own) ----------
  const slotAt = (daysAhead: number, hour: number) => new Date(Date.parse(new Date(Date.now() + daysAhead * 86_400_000).toISOString().slice(0, 10) + "T00:00:00+06:00") + hour * 3_600_000).toISOString();
  db.insert(speakingSlots)
    .values([
      { id: uid(), teacherId, startsAt: slotAt(2, 16), durationMinutes: 15, meetingUrl: "https://example.com/replace-with-your-meeting-link" },
      { id: uid(), teacherId, startsAt: slotAt(2, 17), durationMinutes: 15, meetingUrl: "https://example.com/replace-with-your-meeting-link" },
      { id: uid(), teacherId, startsAt: slotAt(3, 16), durationMinutes: 30, meetingUrl: "https://example.com/replace-with-your-meeting-link" },
    ])
    .run();

  // ---------- DEMO LIVE CLASS (a free Jitsi room, tomorrow evening Bangladesh time) ----------
  const classId = uid();
  const classStart = new Date(Date.parse(new Date(Date.now() + 86_400_000).toISOString().slice(0, 10) + "T00:00:00+06:00") + 19 * 3_600_000).toISOString();
  db.insert(liveClasses)
    .values({ id: classId, teacherId, batchId, title: "IELTS Speaking Part 2 workshop", description: "Cue-card strategies and live practice.", startsAt: classStart, durationMinutes: 60, provider: "JITSI", meetingUrl: "https://meet.jit.si/BanglaEnglish-" + classId.replace(/-/g, "") })
    .run();

  // ---------- DEMO COMMUNITY AND SPEAKING ROOM ----------
  const categoryDefs = [["english", "English", "Grammar, vocabulary and everyday English"], ["ielts", "IELTS", "Test tips, strategy and band scores"], ["speaking", "Speaking", "Fluency, pronunciation and practice partners"], ["writing", "Writing", "Essays, letters and feedback"], ["study-abroad", "Study Abroad", "Universities, visas and scholarships"], ["career", "Career", "Interviews, CVs and workplace English"]] as const;
  const categoryIds: Record<string, string> = {};
  categoryDefs.forEach(([slug, name, description], i) => {
    categoryIds[slug] = uid();
    db.insert(communityCategories).values({ id: categoryIds[slug], slug, name, description, order: i }).run();
  });
  const welcomeId = uid();
  const questionId = uid();
  db.insert(communityPosts)
    .values([
      { id: welcomeId, authorId: teacherId, kind: "DISCUSSION", categoryId: categoryIds.english, title: "Welcome to the BanglaEnglish community", body: "Ask questions, share what is working for you, and help each other. Be kind, write in your own words, and report anything that breaks the rules.", tags: ["welcome"], pinned: true },
      { id: questionId, authorId: studentId, kind: "QUESTION", categoryId: categoryIds.ielts, title: "How do I stop running out of time in Reading?", body: "I always finish only two passages. Any tips for skimming faster?", tags: ["ielts-reading", "time"] },
    ])
    .run();
  db.insert(communityComments).values({ id: uid(), postId: questionId, authorId: teacherId, body: "Spend about 20 minutes per passage, read the questions first, and do not re-read the whole text for every question." }).run();
  const roomId = uid();
  const roomStart = new Date(Date.parse(new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10) + "T00:00:00+06:00") + 20 * 3_600_000).toISOString();
  db.insert(speakingRooms).values({ id: roomId, hostId: teacherId, roomType: "IELTS_SPEAKING", title: "Friendly Part 2 practice", topic: "Describe a place you would like to visit", targetBand: 6, startsAt: roomStart, durationMinutes: 45, capacity: 5, provider: "JITSI", meetingUrl: "https://meet.jit.si/BanglaEnglish-" + roomId.replace(/-/g, "") }).run();
  db.insert(speakingRoomMembers).values({ id: uid(), roomId, userId: teacherId }).run();

  console.log("Seed complete.");
  console.log("Demo accounts:");
  console.log("  Admin:   admin@banglaenglish.app / admin123");
  console.log("  Teacher: teacher@banglaenglish.app / teacher123");
  console.log("  Student: student@banglaenglish.app / student123");
}

function buildLessonContent(title: string) {
  return `In this lesson you will learn about **${title}**. We'll cover the core rules, look at real examples, and practice using it in short exercises so it becomes natural in your everyday English.

Key points:
1. Understand what "${title}" means and when to use it.
2. Study the example sentences below.
3. Complete the short quiz to check your understanding.

Take your time, review the examples twice, and try creating one sentence of your own using "${title}" before moving on.`;
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
