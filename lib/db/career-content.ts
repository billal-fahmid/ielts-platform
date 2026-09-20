/**
 * "English for Career" courses: real lesson text, examples and quiz questions (not templates).
 * Teachers and admins can edit or extend all of this from the admin panel.
 */
export type CareerQuiz = { prompt: string; options: string[]; answer: string; explanation: string };
export type CareerLesson = { title: string; content: string; examples: string[]; quiz: CareerQuiz[] };
export type CareerCourse = {
  slug: string;
  title: string;
  description: string;
  category: "ELEMENTARY" | "INTERMEDIATE" | "ADVANCED";
  moduleTitle: string;
  lessons: CareerLesson[];
};

export const careerCourses: CareerCourse[] = [
  {
    slug: "job-interview-english",
    title: "Job Interview English",
    description: "Answer the most common interview questions with confidence, from “Tell me about yourself” to salary talk.",
    category: "INTERMEDIATE",
    moduleTitle: "Interview essentials",
    lessons: [
      {
        title: "Tell Me About Yourself",
        content: `This is usually the first question, and it sets the tone. Do not read your CV aloud. Give a short story in three parts: present, past, future.

1. Present: your current role or studies, in one sentence.
2. Past: one or two experiences that prepared you for this job.
3. Future: why this position is the next step for you.

Keep it under one minute. Speak about skills that match the job advertisement, and end with a positive sentence about the company.`,
        examples: [
          "I'm a software engineer with three years of experience building web applications.",
          "Before that, I studied Computer Science at Dhaka University and led a small project team.",
          "I'm excited about this role because it lets me work on products used by thousands of customers.",
        ],
        quiz: [
          { prompt: "What is the best structure for “Tell me about yourself”?", options: ["Present, past, future", "Your full life story from childhood", "Only your hobbies", "Your salary expectations"], answer: "Present, past, future", explanation: "A short present–past–future story shows your value and keeps the answer focused." },
          { prompt: "About how long should this answer be?", options: ["Under one minute", "Five minutes", "One sentence only", "Ten minutes"], answer: "Under one minute", explanation: "Interviewers want a clear summary, not a speech." },
        ],
      },
      {
        title: "Talking About Strengths and Weaknesses",
        content: `When you describe strengths, choose two or three that the job needs, and prove each one with a short example. When you describe a weakness, choose a real but manageable one, and explain what you are doing to improve.

Useful pattern for strengths: "I'm good at ... For example, ..."
Useful pattern for weaknesses: "I used to find ... difficult, so I started ... and now ..."

Avoid saying "I don't have any weaknesses" or naming a weakness that is essential for the job.`,
        examples: [
          "I'm good at solving problems under pressure. For example, I fixed a payment bug within two hours before a product launch.",
          "I used to find public speaking difficult, so I joined a speaking club, and now I present to my team every month.",
        ],
        quiz: [
          { prompt: "How should you support a strength?", options: ["With a short real example", "By repeating it three times", "By comparing yourself to other candidates", "By saying nothing more"], answer: "With a short real example", explanation: "An example turns a claim into evidence." },
          { prompt: "Which weakness answer is best?", options: ["“I used to struggle with deadlines, so I now plan my week every Sunday.”", "“I have no weaknesses.”", "“I'm always late.”", "“I don't like working with people.”"], answer: "“I used to struggle with deadlines, so I now plan my week every Sunday.”", explanation: "It is honest, not essential to most jobs, and shows improvement." },
        ],
      },
    ],
  },
  {
    slug: "cv-resume-english",
    title: "CV and Resume English",
    description: "Write a clear, professional CV with strong action verbs, measurable achievements and correct formatting.",
    category: "INTERMEDIATE",
    moduleTitle: "Writing your CV",
    lessons: [
      {
        title: "Action Verbs and Achievements",
        content: `Start each bullet point with a strong past-tense action verb, then add what you did and the result. Numbers make results believable.

Weak: "Responsible for social media."
Strong: "Managed the company's social media accounts and increased followers by 40% in six months."

Good verbs: managed, led, designed, improved, reduced, launched, trained, negotiated.
Use the present tense only for the job you have now. Do not use "I" in a CV.`,
        examples: [
          "Led a team of five sales officers and increased monthly revenue by 25%.",
          "Reduced customer response time from 24 hours to 4 hours by creating a support checklist.",
          "Designed and launched an online course that attracted 800 students.",
        ],
        quiz: [
          { prompt: "Which bullet point is strongest?", options: ["Improved website speed by 30% by compressing images.", "Responsible for the website.", "I worked on the website.", "Website things."], answer: "Improved website speed by 30% by compressing images.", explanation: "It begins with an action verb and shows a measurable result." },
          { prompt: "Which tense is used for past jobs on a CV?", options: ["Past simple", "Future simple", "Present continuous", "Any tense"], answer: "Past simple", explanation: "Finished jobs are described with the past simple; only your current job uses the present." },
        ],
      },
      {
        title: "Writing a Professional Summary",
        content: `A professional summary is two or three lines at the top of your CV. It tells the reader who you are, what you do best, and what you want.

Formula: [Job title] with [number] years of experience in [field]. Skilled in [two or three skills]. Looking for [type of role] to [goal].

Write it last, tailor it to each job, and avoid empty words like "hard-working" unless you can prove them.`,
        examples: [
          "Marketing executive with four years of experience in digital campaigns. Skilled in SEO, content writing and analytics. Seeking a senior role to grow brand awareness.",
          "Recent Business graduate with strong Excel and presentation skills, looking for an entry-level analyst position.",
        ],
        quiz: [
          { prompt: "Where does the professional summary go?", options: ["At the top of the CV", "At the very end", "On a separate page", "Inside the hobbies section"], answer: "At the top of the CV", explanation: "Recruiters read the top first, so the summary must be there." },
          { prompt: "How long should it be?", options: ["Two or three lines", "Two pages", "One word", "Ten paragraphs"], answer: "Two or three lines", explanation: "It is a short introduction, not a full biography." },
        ],
      },
    ],
  },
  {
    slug: "professional-email-writing",
    title: "Professional Email Writing",
    description: "Write clear, polite work emails: requests, follow-ups, apologies and replies.",
    category: "ELEMENTARY",
    moduleTitle: "Everyday work emails",
    lessons: [
      {
        title: "Structure of a Professional Email",
        content: `A good work email is short and easy to act on. Use this structure:

1. Subject line: specific, for example "Meeting request: project update on Tuesday".
2. Greeting: "Dear Mr Rahman," or "Hi Sara," depending on how well you know the person.
3. Purpose in the first sentence: "I'm writing to ask about ..."
4. Details in short paragraphs.
5. Clear next step: "Could you please reply by Friday?"
6. Closing: "Kind regards," or "Best regards," and your name.

Check spelling and the recipient before you press send.`,
        examples: [
          "Subject: Request for leave, 10–12 June",
          "I'm writing to confirm our meeting on Tuesday at 10 a.m.",
          "Could you please send me the report by Friday? Kind regards, Nusrat",
        ],
        quiz: [
          { prompt: "Which subject line is best?", options: ["Invoice 4521: payment due 30 June", "Hello", "Urgent!!!", "Question"], answer: "Invoice 4521: payment due 30 June", explanation: "A specific subject helps the reader understand and find the email later." },
          { prompt: "Where should you state why you are writing?", options: ["In the first sentence", "In the last sentence", "In the signature", "Nowhere"], answer: "In the first sentence", explanation: "Busy readers should understand the purpose immediately." },
        ],
      },
      {
        title: "Polite Requests and Replies",
        content: `Polite language makes your emails effective. Use modal verbs for requests: "Could you...?", "Would you mind...?" Say "Thank you for your email" when replying, and "I look forward to hearing from you" to close.

To decline politely: "Unfortunately, I won't be able to ... but I can ..."
To apologise: "I apologise for the delay. I'll send it by tomorrow."

Avoid commands such as "Send me the file." Write "Could you please send me the file?" instead.`,
        examples: [
          "Could you please share the updated schedule?",
          "Thank you for your quick reply. I'll confirm the details tomorrow.",
          "Unfortunately, I won't be able to attend, but I can send my notes.",
        ],
        quiz: [
          { prompt: "Which request is the most polite?", options: ["Could you please send me the file?", "Send me the file.", "I want the file now.", "File."], answer: "Could you please send me the file?", explanation: "“Could you please...” is a polite, standard workplace request." },
          { prompt: "How do you decline politely?", options: ["Unfortunately, I won't be able to attend, but I can send my notes.", "No.", "I don't want to.", "That is a bad idea."], answer: "Unfortunately, I won't be able to attend, but I can send my notes.", explanation: "It softens the refusal and offers an alternative." },
        ],
      },
    ],
  },
  {
    slug: "office-communication",
    title: "Office Communication",
    description: "Speak and write naturally with colleagues: meetings, phone calls and small talk.",
    category: "INTERMEDIATE",
    moduleTitle: "Working with colleagues",
    lessons: [
      {
        title: "Speaking Up in Meetings",
        content: `In meetings, you need short phrases to join in politely.

Agreeing: "I agree with that." / "That's a good point."
Disagreeing politely: "I see your point, but I think ..."
Interrupting: "Sorry to interrupt, may I add something?"
Asking for repetition: "Could you say that again, please?"
Giving an opinion: "In my view, ..." / "I suggest we ..."

Speak slowly, keep sentences short, and take brief notes so you can summarise the decisions at the end.`,
        examples: [
          "I see your point, but I think we should test the idea with a small group first.",
          "Sorry to interrupt, may I add something about the deadline?",
          "To summarise, we agreed to launch on the 15th.",
        ],
        quiz: [
          { prompt: "How can you disagree politely?", options: ["I see your point, but I think ...", "You are wrong.", "That is stupid.", "No way."], answer: "I see your point, but I think ...", explanation: "It respects the other person before giving your view." },
          { prompt: "What is a polite way to ask someone to repeat?", options: ["Could you say that again, please?", "What?", "Speak clearly.", "Again."], answer: "Could you say that again, please?", explanation: "It is polite and clear." },
        ],
      },
      {
        title: "Phone Calls at Work",
        content: `Phone calls are hard because you cannot see the other person. Use clear, standard phrases.

Answering: "Good morning, Bright Solutions, Rina speaking. How can I help you?"
Asking who is calling: "May I ask who's calling?"
Transferring: "One moment, please. I'll put you through."
Taking a message: "Would you like to leave a message?"
Checking details: "Could you spell that, please?"

Speak slowly, repeat numbers and names, and thank the caller before you finish.`,
        examples: [
          "Good afternoon, Bright Solutions, Rina speaking.",
          "I'm afraid Mr Karim is in a meeting. Would you like to leave a message?",
          "Let me repeat that: your order number is 4-7-2-9.",
        ],
        quiz: [
          { prompt: "You need to connect a caller to a colleague. What do you say?", options: ["One moment, please. I'll put you through.", "Wait.", "Not me.", "Call again."], answer: "One moment, please. I'll put you through.", explanation: "It is the standard polite phrase for transferring a call." },
          { prompt: "Why do you repeat numbers and names?", options: ["To avoid mistakes", "To waste time", "To sound loud", "It is not needed"], answer: "To avoid mistakes", explanation: "On the phone it is easy to mishear details, so you confirm them." },
        ],
      },
    ],
  },
  {
    slug: "presentation-english",
    title: "Presentation English",
    description: "Plan, open and deliver clear presentations, and handle questions with confidence.",
    category: "INTERMEDIATE",
    moduleTitle: "Presenting with confidence",
    lessons: [
      {
        title: "Opening and Structuring Your Talk",
        content: `A clear opening tells the audience what to expect. Greet them, introduce yourself, state the topic and outline the structure.

Opening: "Good morning everyone. My name is ... and today I'm going to talk about ..."
Outline: "I'll start with ..., then I'll move on to ..., and finally ..."
Moving between points: "Now let's turn to ..." / "That brings me to ..."
Closing: "To sum up, ..." / "Thank you for listening. Are there any questions?"

Use one main idea per slide and speak to the audience, not the screen.`,
        examples: [
          "Good morning everyone. Today I'm going to talk about how we can reduce delivery times.",
          "I'll start with the problem, then I'll move on to our solution, and finally I'll share the results.",
          "To sum up, three changes will save us two days per order.",
        ],
        quiz: [
          { prompt: "What should the opening of a presentation include?", options: ["Topic and outline of the talk", "Only a joke", "The conclusion", "Nothing"], answer: "Topic and outline of the talk", explanation: "Listeners follow better when they know the structure." },
          { prompt: "Which phrase moves to the next point?", options: ["That brings me to ...", "Goodbye.", "I forgot.", "Sorry."], answer: "That brings me to ...", explanation: "It is a signpost phrase that guides the audience." },
        ],
      },
      {
        title: "Handling Questions",
        content: `Questions show that people are interested. Stay calm and use phrases that give you time to think.

Welcoming: "That's a good question."
Clarifying: "Do you mean ...?"
Buying time: "Let me think about that for a moment."
If you do not know: "I don't have that information right now, but I'll find out and get back to you."
Closing a topic: "Does that answer your question?"

Never guess an answer to look clever. Being honest builds trust.`,
        examples: [
          "That's a good question. Let me think about that for a moment.",
          "Do you mean the cost for the first year or the total cost?",
          "I don't have that information right now, but I'll find out and email you.",
        ],
        quiz: [
          { prompt: "You do not know the answer. What is best?", options: ["I'll find out and get back to you.", "Make something up.", "Ignore the question.", "Say the question is silly."], answer: "I'll find out and get back to you.", explanation: "Honesty and a promise to follow up keep the audience's trust." },
          { prompt: "Which phrase checks that you understood a question?", options: ["Do you mean ...?", "Next slide.", "Be quiet.", "I disagree."], answer: "Do you mean ...?", explanation: "Clarifying avoids answering the wrong question." },
        ],
      },
    ],
  },
  {
    slug: "client-communication-english",
    title: "Client Communication",
    description: "Build good relationships with clients: greetings, updates, managing expectations and solving problems.",
    category: "INTERMEDIATE",
    moduleTitle: "Talking to clients",
    lessons: [
      {
        title: "Updates and Managing Expectations",
        content: `Clients like clear, honest updates. Say what is finished, what is next, and when it will be ready. If something is late, tell them early.

Progress: "I'm pleased to update you that the design is complete."
Next steps: "The next step is testing, which will take about three days."
Delay: "Unfortunately, there will be a short delay because of ... We expect to deliver by Thursday."
Promise carefully: "We aim to ..." is safer than "We guarantee ..." when you are not sure.

End with a question or an offer to help.`,
        examples: [
          "I'm pleased to update you that the first draft is complete.",
          "Unfortunately, there will be a short delay because of a supplier issue. We expect to deliver by Thursday.",
          "Please let me know if you would like to discuss the schedule.",
        ],
        quiz: [
          { prompt: "When should you tell a client about a delay?", options: ["As early as possible", "After the deadline", "Never", "Only if they ask"], answer: "As early as possible", explanation: "Early, honest news lets the client plan and keeps trust." },
          { prompt: "Which is a careful promise?", options: ["We aim to deliver by Friday.", "We guarantee everything, always.", "It will definitely be perfect.", "Trust me."], answer: "We aim to deliver by Friday.", explanation: "“Aim to” is realistic and avoids breaking a promise." },
        ],
      },
      {
        title: "Handling Complaints",
        content: `A complaint is a chance to keep a client. Follow four steps: listen, apologise, solve, follow up.

Listen: "I understand your concern."
Apologise: "I'm sorry for the inconvenience."
Solve: "Here is what we can do: we'll replace the item today."
Follow up: "I'll call you tomorrow to make sure everything is fine."

Stay calm and polite. Do not blame others, and do not argue about who is right; focus on the solution.`,
        examples: [
          "I understand your concern, and I'm sorry for the inconvenience.",
          "Here is what we can do: we'll send a replacement today at no cost.",
          "I'll call you tomorrow to make sure everything is working.",
        ],
        quiz: [
          { prompt: "What are the four steps for a complaint?", options: ["Listen, apologise, solve, follow up", "Ignore, blame, argue, hang up", "Delay, deny, repeat, leave", "Laugh, agree, forget, close"], answer: "Listen, apologise, solve, follow up", explanation: "This sequence calms the client and fixes the problem." },
          { prompt: "Which sentence apologises well?", options: ["I'm sorry for the inconvenience.", "It's not my fault.", "You should read the rules.", "Whatever."], answer: "I'm sorry for the inconvenience.", explanation: "It is polite and takes responsibility without blame." },
        ],
      },
    ],
  },
  {
    slug: "freelancing-english",
    title: "Freelancing English",
    description: "Win clients and work smoothly online: profiles, proposals, negotiating rates and delivering projects.",
    category: "INTERMEDIATE",
    moduleTitle: "Getting started as a freelancer",
    lessons: [
      {
        title: "Writing a Winning Proposal",
        content: `A good proposal is personal, short and focused on the client's problem. Use this plan:

1. Greeting with the client's name.
2. Show you understood the job: "I read your description carefully, and I understand you need ..."
3. Explain how you will do it in two or three clear steps.
4. Prove you can: one relevant example or result.
5. Give the price and timeline: "I can complete this in seven days for $150."
6. Finish with a call to action: "I'd be happy to discuss the details."

Do not copy and paste the same message for every job.`,
        examples: [
          "Hello Mr Wilson, I read your description carefully, and I understand you need a logo for a new café.",
          "I recently designed a brand identity for a local bakery that increased their online orders by 30%.",
          "I can complete this in seven days for $150. I'd be happy to discuss the details.",
        ],
        quiz: [
          { prompt: "What should a proposal focus on?", options: ["The client's problem", "Only your life story", "A long list of unrelated skills", "Complaining about low prices"], answer: "The client's problem", explanation: "Clients hire people who solve their specific problem." },
          { prompt: "Which closing works best?", options: ["I'd be happy to discuss the details.", "Reply now or never.", "Bye.", "Pay first."], answer: "I'd be happy to discuss the details.", explanation: "It is polite and invites the next step." },
        ],
      },
      {
        title: "Negotiating Rates and Deadlines",
        content: `Talk about money and time clearly and politely.

State your rate with confidence: "My rate for this project is $200."
Explain the value: "That includes two rounds of changes."
When the client offers less: "I understand your budget. I can reduce the scope to ... for that price."
Deadlines: "I can deliver the first version by Wednesday and the final files by Friday."
Ask for a deposit: "I start work after a 50% advance payment."

Put the agreement in writing and confirm it by email.`,
        examples: [
          "My rate for this project is $200, including two rounds of changes.",
          "I understand your budget. I can reduce the scope and complete the main pages for $150.",
          "I start work after a 50% advance payment.",
        ],
        quiz: [
          { prompt: "A client offers less than your rate. What is a good response?", options: ["I understand your budget. I can reduce the scope for that price.", "That's insulting.", "No.", "Fine, free then."], answer: "I understand your budget. I can reduce the scope for that price.", explanation: "It stays polite and offers a fair alternative." },
          { prompt: "Why confirm the agreement by email?", options: ["To have it in writing", "To make the email longer", "It is illegal not to", "For no reason"], answer: "To have it in writing", explanation: "A written record prevents misunderstandings later." },
        ],
      },
    ],
  },
];
