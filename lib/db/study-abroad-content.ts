/**
 * Starting content for the Study Abroad pages. Figures are rough guides only: fees, visa rules and English-test
 * requirements change every year and differ by university. Edit them (and add countries) in Admin → Study abroad
 * countries, and always check the official immigration website and the university before applying.
 */
export type CountryDef = {
  slug: string;
  name: string;
  flag: string;
  summary: string;
  tuitionRange: string;
  livingCost: string;
  ieltsRequirement: string;
  ieltsMin: number;
  englishRequirements: string;
  visaInfo: string;
  workRights: string;
  universities: string[];
  applicationChecklist: string[];
  visaResources: string[];
  intakes: string[];
  popularCities: string[];
  scholarships: string[];
};

const OTHER_TESTS =
  "Most universities also accept other English tests such as TOEFL iBT, PTE Academic and Cambridge English, and many now accept the Duolingo English Test. Some will waive the test if your earlier study was taught in English, but this varies by university and usually needs an official letter from your school, so ask each university directly.";

/** The steps every applicant follows, with one country-specific step added in the middle. */
const checklist = (countrySpecific: string, afterOffer: string[] = []) => [
  "Choose your course and shortlist universities",
  "Check each university's entry requirements: grades, subjects and English score",
  "Book and take IELTS (or another accepted English test) early enough to retake it if needed",
  "Gather your documents: passport, academic transcripts and certificates",
  "Write your statement of purpose or personal statement",
  "Ask teachers or employers for reference letters",
  "Apply online before the deadline and pay the application fee",
  "Accept your offer and pay any deposit",
  countrySpecific,
  ...afterOffer,
  "Arrange proof of funds and health insurance",
  "Apply for your student visa and book travel and accommodation",
];

export const studyCountryDefs: CountryDef[] = [
  {
    slug: "canada",
    name: "Canada",
    flag: "🇨🇦",
    summary: "Welcoming, multicultural and known for high-quality universities and colleges, with clear routes for international graduates to gain work experience. Popular with Bangladeshi students for both degrees and shorter college diplomas.",
    tuitionRange: "About CAD 15,000–35,000 a year for undergraduate study; postgraduate and professional programmes often cost more.",
    livingCost: "About CAD 15,000–20,000 a year, and more in Toronto and Vancouver.",
    ieltsRequirement: "Usually 6.0–6.5 overall for undergraduate and 6.5–7.0 for postgraduate study. Some programmes and colleges ask for more.",
    ieltsMin: 6,
    englishRequirements: OTHER_TESTS + " Programmes taught in French, mainly in Quebec, ask for French tests instead.",
    visaInfo: "Most students need a study permit from Immigration, Refugees and Citizenship Canada (IRCC). You normally need an acceptance letter from a designated learning institution, proof you can pay your first year's fees and living costs, and a clean record. Rules, caps and financial requirements change often, so check the IRCC website before you apply.",
    workRights: "Study permit holders can usually work part-time off campus during term and full-time in scheduled breaks, and many graduates of eligible programmes can apply for a post-graduation work permit. The number of allowed hours and the eligible programmes change, so check the current rules.",
    universities: ["University of Toronto", "University of British Columbia", "McGill University", "University of Waterloo", "University of Alberta", "Seneca and other public colleges (diploma programmes)"],
    applicationChecklist: checklist("Receive your letter of acceptance from a designated learning institution"),
    visaResources: ["IRCC: study in Canada | https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada.html", "EduCanada (official study guide) | https://www.educanada.ca/"],
    intakes: ["September (main intake)", "January", "May (some colleges)"],
    popularCities: ["Toronto", "Vancouver", "Montreal", "Calgary", "Ottawa"],
    scholarships: ["University entrance scholarships (many universities offer merit awards)", "Vanier Canada Graduate Scholarships (doctoral study)", "Lester B. Pearson International Scholarship (University of Toronto)"],
  },
  {
    slug: "australia",
    name: "Australia",
    flag: "🇦🇺",
    summary: "Strong universities, a big international student community and cities that regularly rank among the best places to live as a student. Vocational and university pathways are both well developed.",
    tuitionRange: "About AUD 20,000–45,000 a year, depending on the level and subject.",
    livingCost: "About AUD 25,000–30,000 a year; Sydney and Melbourne are at the higher end.",
    ieltsRequirement: "Usually 6.0–6.5 overall for undergraduate and 6.5–7.0 for postgraduate study. Nursing, teaching and some health courses ask for higher bands in each skill.",
    ieltsMin: 6,
    englishRequirements: OTHER_TESTS + " Some universities run their own English pathway courses that let you start after a period of English study.",
    visaInfo: "You apply for a Student visa (subclass 500) after receiving a Confirmation of Enrolment. You need to show you are a genuine student, have enough funds, hold Overseas Student Health Cover, and meet English and character requirements. Rules and processing priorities change, so use the Department of Home Affairs website.",
    workRights: "Student visa holders can usually work a limited number of hours in study periods and more in breaks, and some graduates can apply for a temporary graduate visa. Check the current limits before you rely on work income.",
    universities: ["University of Melbourne", "University of Sydney", "Australian National University", "UNSW Sydney", "Monash University", "University of Queensland"],
    applicationChecklist: checklist("Receive your Confirmation of Enrolment (CoE)", ["Arrange Overseas Student Health Cover (OSHC)"]),
    visaResources: ["Student visa (subclass 500) | https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500", "Study Australia (official guide) | https://www.studyaustralia.gov.au/"],
    intakes: ["February (main intake)", "July", "November (some providers)"],
    popularCities: ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide"],
    scholarships: ["Australia Awards Scholarships", "Destination Australia Program", "University international scholarships (merit-based)"],
  },
  {
    slug: "united-kingdom",
    name: "United Kingdom",
    flag: "🇬🇧",
    summary: "Historic universities, one-year master's degrees and a global reputation. Shorter courses can mean lower total cost and a faster route to work.",
    tuitionRange: "About GBP 12,000–30,000 a year; medicine and some business programmes cost more.",
    livingCost: "About GBP 12,000–15,000 a year outside London and noticeably more in London.",
    ieltsRequirement: "Usually 6.0–6.5 overall for undergraduate and 6.5–7.0 for postgraduate study, often with minimum sub-scores. Visa applications sometimes need an approved test centre and test type, so check before you book.",
    ieltsMin: 6,
    englishRequirements: OTHER_TESTS + " For a visa, some universities can accept their own English assessment while others need a test from an approved provider, so check what your university and the UK government require before you book.",
    visaInfo: "Most international students apply for a Student visa. You need a Confirmation of Acceptance for Studies (CAS) from a licensed sponsor, proof of funds held for a set period, an English-language result that meets the rules, and to pay the Immigration Health Surcharge. Check GOV.UK for the current requirements.",
    workRights: "Degree-level students can usually work part-time during term and full-time in holidays, and eligible graduates can apply for the Graduate route to work after their studies. Confirm the current conditions on GOV.UK.",
    universities: ["University of Oxford", "University of Cambridge", "Imperial College London", "University College London", "University of Manchester", "University of Edinburgh"],
    applicationChecklist: checklist("Receive your Confirmation of Acceptance for Studies (CAS)", ["Pay the Immigration Health Surcharge with your visa application"]),
    visaResources: ["Student visa (GOV.UK) | https://www.gov.uk/student-visa", "Study UK (British Council) | https://study-uk.britishcouncil.org/"],
    intakes: ["September (main intake)", "January (some courses)"],
    popularCities: ["London", "Manchester", "Edinburgh", "Birmingham", "Glasgow"],
    scholarships: ["Chevening Scholarships (postgraduate)", "Commonwealth Scholarships", "GREAT Scholarships", "University international scholarships"],
  },
  {
    slug: "united-states",
    name: "United States",
    flag: "🇺🇸",
    summary: "The widest choice of universities and programmes in the world, with generous funding for strong applicants, especially at postgraduate level. Applications ask for more than test scores: essays, references and activities matter.",
    tuitionRange: "About USD 20,000–50,000 a year; some private universities cost more.",
    livingCost: "About USD 12,000–20,000 a year, depending on the city.",
    ieltsRequirement: "Usually 6.0–7.0 overall depending on the university and level. Many US universities also accept other English tests, and some ask for a standardised admissions test as well.",
    ieltsMin: 6,
    englishRequirements: OTHER_TESTS + " TOEFL iBT is especially common in the US, and many universities accept the Duolingo English Test. Graduate programmes may also ask for a GRE or GMAT score.",
    visaInfo: "Most students need an F-1 visa. After you are admitted, the university issues a Form I-20; you pay the SEVIS fee, complete the visa application and attend an interview at the US embassy. Show clear study plans and how you will pay. Check the US Department of State website for current steps.",
    workRights: "F-1 students can usually work part-time on campus during term. Off-campus work is limited, and optional practical training (OPT) lets many graduates work in their field after study. Details depend on your programme, so confirm them with the university's international office.",
    universities: ["Massachusetts Institute of Technology", "Stanford University", "University of California campuses", "New York University", "University of Texas at Austin", "Arizona State University"],
    applicationChecklist: checklist("Receive your Form I-20 and pay the SEVIS fee", ["Prepare for your visa interview"]),
    visaResources: ["Student visas (U.S. Department of State) | https://travel.state.gov/content/travel/en/us-visas/study/student-visa.html", "EducationUSA (official advising) | https://educationusa.state.gov/"],
    intakes: ["Fall (August–September, main intake)", "Spring (January)"],
    popularCities: ["Boston", "New York", "Chicago", "Austin", "Seattle"],
    scholarships: ["Fulbright Foreign Student Program (postgraduate)", "University merit scholarships and assistantships", "Departmental funding for research degrees"],
  },
  {
    slug: "ireland",
    name: "Ireland",
    flag: "🇮🇪",
    summary: "An English-speaking country in the European Union with a strong technology, pharmaceutical and finance sector, friendly cities and universities that welcome international students. Smaller and more personal than many destinations.",
    tuitionRange: "About EUR 10,000–25,000 a year for undergraduate study for non-EU students; medicine and some other programmes cost more.",
    livingCost: "About EUR 10,000–15,000 a year, and more in Dublin.",
    ieltsRequirement: "Usually 6.0–6.5 overall for undergraduate and 6.5 for postgraduate study, sometimes with minimum sub-scores.",
    ieltsMin: 6,
    englishRequirements: OTHER_TESTS,
    visaInfo: "Students from Bangladesh normally need a study visa before travelling. You apply online after you receive an offer, show proof of funds and your academic documents, and register with immigration after you arrive. Requirements change, so use the official Irish immigration website.",
    workRights: "Students on eligible full-time courses can usually work a limited number of hours a week in term and more in holidays, and eligible graduates can apply for a graduate scheme to stay and look for work. The details depend on the level of your course, so check the current rules.",
    universities: ["Trinity College Dublin", "University College Dublin", "University of Galway", "University College Cork", "Dublin City University", "University of Limerick"],
    applicationChecklist: checklist("Receive your offer letter and confirm your place", ["Register with immigration after you arrive"]),
    visaResources: ["Coming to study in Ireland (Irish Immigration) | https://www.irishimmigration.ie/coming-to-study-in-ireland/", "Education in Ireland (official guide) | https://www.educationinireland.com/"],
    intakes: ["September (main intake)", "January (some courses)"],
    popularCities: ["Dublin", "Cork", "Galway", "Limerick"],
    scholarships: ["Government of Ireland International Education Scholarship", "University international scholarships"],
  },
  {
    slug: "germany",
    name: "Germany",
    flag: "🇩🇪",
    summary: "Strong engineering and science education, and many public universities with very low or no tuition fees. Many master's programmes are taught in English, though daily life is easier with some German.",
    tuitionRange: "Most public universities charge little or no tuition, only a semester contribution of about EUR 150–350 per term. Private universities and some programmes charge fees.",
    livingCost: "About EUR 11,000–13,000 a year. You usually need to show proof of funds, often through a blocked account.",
    ieltsRequirement: "For English-taught programmes usually 6.0–6.5 overall. German-taught programmes ask for a German test (such as TestDaF or DSH) instead.",
    ieltsMin: 6,
    englishRequirements: "English-taught programmes usually accept IELTS or TOEFL iBT, and some accept other tests or a school letter. German-taught programmes need a German language certificate such as TestDaF, DSH or Goethe. Check your programme, as requirements differ.",
    visaInfo: "Students from Bangladesh normally apply for a national student visa and then a residence permit. You need admission or a conditional letter, proof of funds, health insurance and your academic documents, and getting an embassy appointment can take a while, so start early.",
    workRights: "Students can usually work a limited number of days per year, and graduates can apply to stay to look for work related to their degree. Check the official rules, as limits change.",
    universities: ["Technical University of Munich", "Ludwig Maximilian University of Munich", "Heidelberg University", "RWTH Aachen University", "Humboldt University of Berlin", "TU Berlin"],
    applicationChecklist: checklist("Check whether you apply directly or through uni-assist, and get any needed certified translations", ["Open a blocked account if your visa requires one"]),
    visaResources: ["Study in Germany (DAAD) | https://www.study-in-germany.de/en/", "Make it in Germany: study | https://www.make-it-in-germany.com/en/study-training/"],
    intakes: ["Winter semester (October, main intake)", "Summer semester (April, fewer programmes)"],
    popularCities: ["Berlin", "Munich", "Hamburg", "Aachen", "Dresden"],
    scholarships: ["DAAD scholarships", "Deutschlandstipendium (national scholarship, applied for at your university)", "University and foundation scholarships"],
  },
  {
    slug: "new-zealand",
    name: "New Zealand",
    flag: "🇳🇿",
    summary: "A safe, friendly country with a small-class teaching style and good pathways from study to work. Smaller cities mean lower living costs than the big destinations.",
    tuitionRange: "About NZD 22,000–40,000 a year, depending on the level and subject.",
    livingCost: "About NZD 20,000–25,000 a year.",
    ieltsRequirement: "Usually 6.0–6.5 overall for undergraduate and 6.5 for postgraduate study, with minimum sub-scores for some courses.",
    ieltsMin: 6,
    englishRequirements: OTHER_TESTS,
    visaInfo: "You apply for a Fee Paying Student Visa with an offer of place, proof of funds and health and character checks. Check Immigration New Zealand for the current requirements and processing times.",
    workRights: "Students on eligible programmes can usually work part-time during term and full-time in holidays, and some graduates can apply for a post-study work visa. Check the current conditions.",
    universities: ["University of Auckland", "University of Otago", "Victoria University of Wellington", "University of Canterbury", "Massey University", "Auckland University of Technology"],
    applicationChecklist: checklist("Receive your offer of place from a New Zealand education provider"),
    visaResources: ["Student visa (Immigration New Zealand) | https://www.immigration.govt.nz/new-zealand-visas/visas/visa/fee-paying-student-visa", "Study with New Zealand (official guide) | https://www.studywithnewzealand.govt.nz/"],
    intakes: ["February (main intake)", "July"],
    popularCities: ["Auckland", "Wellington", "Christchurch", "Dunedin", "Hamilton"],
    scholarships: ["New Zealand Excellence Awards", "Commonwealth Scholarships in New Zealand", "University international scholarships"],
  },
];

export type ResourceDef = { title: string; description: string; kind: "PDF" | "LINK" | "VIDEO" | "AUDIO"; url: string; category: string; requiredPlan: "FREE" | "BASIC" | "PREMIUM" | "PRO" };

export const resourceDefs: ResourceDef[] = [
  { title: "5 tips to improve your IELTS Writing Task 2 score", description: "Five habits that separate Band 6 essays from Band 7 and above.", kind: "LINK", url: "/blog/5-tips-ielts-writing-task-2", category: "IELTS Writing", requiredPlan: "FREE" },
  { title: "Build vocabulary as a daily habit", description: "How to use spaced repetition and your own sentences so new words stick.", kind: "LINK", url: "/blog/building-vocabulary-daily-habit", category: "Vocabulary", requiredPlan: "FREE" },
  { title: "Common grammar mistakes and how to fix them", description: "Articles, prepositions and tenses that Bangladeshi learners often mix up.", kind: "LINK", url: "/blog/common-grammar-mistakes-bangladeshi-learners", category: "Grammar", requiredPlan: "FREE" },
  { title: "British Council LearnEnglish", description: "Free lessons, videos and practice activities from the British Council.", kind: "LINK", url: "https://learnenglish.britishcouncil.org/", category: "General English", requiredPlan: "FREE" },
  { title: "BBC Learning English", description: "Free listening and vocabulary programmes at every level.", kind: "LINK", url: "https://www.bbc.co.uk/learningenglish", category: "General English", requiredPlan: "FREE" },
  { title: "Official IELTS website", description: "Test information, booking and official preparation material from the IELTS partners.", kind: "LINK", url: "https://www.ielts.org/", category: "IELTS Practice", requiredPlan: "FREE" },
  { title: "IELTS Reading and Listening practice library", description: "Timed passages and tests with instant scoring and band estimates.", kind: "LINK", url: "/dashboard/ielts/reading", category: "IELTS Practice", requiredPlan: "BASIC" },
  { title: "Full IELTS mock tests", description: "Sit a complete Listening, Reading, Writing and Speaking test.", kind: "LINK", url: "/dashboard/ielts/mock-test", category: "IELTS Practice", requiredPlan: "BASIC" },
  { title: "AI Writing coach", description: "Submit an essay and get an estimated band with feedback on each criterion.", kind: "LINK", url: "/dashboard/ielts/writing", category: "AI tools", requiredPlan: "PREMIUM" },
  { title: "Book a 1-on-1 speaking session", description: "Practise with a real teacher on a video call and get scored feedback.", kind: "LINK", url: "/dashboard/speaking-sessions", category: "Teacher support", requiredPlan: "PRO" },
];
