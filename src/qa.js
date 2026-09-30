const hrDecisionPattern = /(approve my leave|is my time off approved|salary|benefits|compensation|raise|pay band|promotion decision)/i;
const missingInfoPattern = /(where do i park|wifi password|work from home|wfh policy|parking)/i;

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

function answerQuestion(question, passages = []) {
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

  const tokens = tokenize(rawQuestion);
  const ranked = passages
    .map((passage) => ({
      passage,
      score: scorePassage(tokens, passage)
    }))
    .sort((a, b) => b.score - a.score)
    .filter((entry) => entry.score > 0);

  if (!passages.length) {
    return {
      answer:
        "No onboarding sources are currently assigned to your account. Please ask HR to assign at least one source guide.",
      sources: [],
      mode: "no-sources"
    };
  }

  if (!ranked.length || missingInfoPattern.test(lower)) {
    return {
      answer:
        "I couldn’t find that in the onboarding guides, so I don’t want to guess. Please ask HR or your manager for the official answer.",
      sources: [],
      mode: "not-found"
    };
  }

  const top = ranked.slice(0, 2).map((entry) => entry.passage);
  const answer = top.map((p) => p.text).join(" ");

  const sources = top.map((p) => ({
    id: p.id,
    title: `${p.guideTitle} — ${p.heading}`,
    excerpt: p.text,
    url: p.url
  }));

  return {
    answer,
    sources,
    mode: "grounded"
  };
}

module.exports = {
  answerQuestion
};
