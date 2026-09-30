const OpenAI = require("openai");

const hrDecisionPattern = /(approve my leave|is my time off approved|salary|benefits|compensation|raise|pay band|promotion decision)/i;
const missingInfoPattern = /(where do i park|wifi password|work from home|wfh policy|parking)/i;

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

function tokenize(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function scorePassage(questionTokens, passage) {
  const haystack = `${passage.heading} ${passage.text} ${(passage.keywords || []).join(" ")}`.toLowerCase();
  let score = 0;

  for (const token of questionTokens) {
    if (haystack.includes(token)) score += 2;
  }

  for (const keyword of passage.keywords || []) {
    if (questionTokens.includes(keyword.toLowerCase())) score += 3;
  }

  return score;
}

function selectTopPassages(question, passages = [], limit = 3) {
  const tokens = tokenize(question);

  return passages
    .map((passage) => ({
      passage,
      score: scorePassage(tokens, passage)
    }))
    .sort((a, b) => b.score - a.score)
    .filter((entry) => entry.score > 0)
    .slice(0, limit)
    .map((entry) => entry.passage);
}

function toSourceList(passages = []) {
  return passages.map((p) => ({
    id: p.id,
    title: `${p.guideTitle} — ${p.heading}`,
    excerpt: p.text,
    url: p.url
  }));
}

function buildContextBlock(passages = []) {
  return passages
    .map(
      (p, idx) =>
        `Source ${idx + 1}\nTitle: ${p.guideTitle} — ${p.heading}\nPassage: ${p.text}\nURL: ${p.url}`
    )
    .join("\n\n");
}

async function answerWithOpenAI(question, topPassages, fallbackAnswer) {
  if (!openai) {
    return fallbackAnswer;
  }

  const contextBlock = buildContextBlock(topPassages);
  const response = await openai.responses.create({
    model: OPENAI_MODEL,
    input: [
      {
        role: "system",
        content:
          "You are an onboarding assistant. Use only the provided source passages. If the answer is not in the sources, say you cannot find it in the onboarding guides and advise contacting HR/manager. Do not invent policies. Keep the answer concise."
      },
      {
        role: "user",
        content: `Question: ${question}\n\nAvailable sources:\n${contextBlock}`
      }
    ]
  });

  const text = (response.output_text || "").trim();
  return text || fallbackAnswer;
}

async function answerQuestion(question, passages = []) {
  const rawQuestion = (question || "").trim();
  const lower = rawQuestion.toLowerCase();

  if (!rawQuestion) {
    return {
      answer: "Please enter a question so I can help.",
      sources: [],
      mode: "empty"
    };
  }

  if (hrDecisionPattern.test(lower)) {
    return {
      answer:
        "I can’t make HR decisions. Please contact your manager for approval status and HR for compensation or benefits details.",
      sources: [],
      mode: "escalate"
    };
  }

  if (lower.includes("tool") && (lower.includes("choose") || lower.includes("pick") || lower.includes("use"))) {
    return {
      answer:
        "I can help with tools, but I should confirm your options first. Share the options you’re considering and your goal, and I’ll recommend one.",
      sources: [],
      mode: "confirm-options"
    };
  }

  if (!passages.length) {
    return {
      answer:
        "No onboarding sources are currently assigned to your account. Please ask HR to assign at least one source guide.",
      sources: [],
      mode: "no-sources"
    };
  }

  const top = selectTopPassages(rawQuestion, passages, 3);

  if (!top.length || missingInfoPattern.test(lower)) {
    return {
      answer:
        "I couldn’t find that in the onboarding guides, so I don’t want to guess. Please ask HR or your manager for the official answer.",
      sources: [],
      mode: "not-found"
    };
  }

  const fallbackAnswer = top.map((p) => p.text).join(" ");
  const sources = toSourceList(top);

  let answer = fallbackAnswer;

  try {
    answer = await answerWithOpenAI(rawQuestion, top, fallbackAnswer);
  } catch (error) {
    console.warn("OpenAI answering failed, using local fallback:", error?.message || error);
  }

  return {
    answer,
    sources,
    mode: "grounded"
  };
}

module.exports = {
  answerQuestion
};
