const guides = [
  {
    id: "guide-hr-onboarding",
    title: "Guide 1: HR Onboarding Basics",
    description: "Day-one schedule and time-off process.",
    passages: [
      {
        id: "src-hr-1",
        heading: "First day start time",
        text: "On day 1, new hires start at 9:00 AM local time. Join the onboarding chat 10 minutes early to test audio.",
        keywords: ["start", "day 1", "first day", "9:00", "onboarding"]
      },
      {
        id: "src-hr-2",
        heading: "Welcome call and first-week schedule",
        text: "The welcome call is at 10:30 AM on day 1. Your full first-week schedule is emailed by HR before 5:00 PM on your first day.",
        keywords: ["welcome call", "schedule", "first week", "emailed", "HR"]
      },
      {
        id: "src-hr-3",
        heading: "Requesting time off",
        text: "Request time off in the People Portal under Time Off. Submit requests at least 10 calendar days in advance and include your coverage plan.",
        keywords: ["time off", "vacation", "people portal", "request", "coverage"]
      },
      {
        id: "src-hr-4",
        heading: "Approval flow for leave",
        text: "Your direct manager reviews time-off requests. HR can answer policy questions, but only your manager approves or denies requests.",
        keywords: ["reviews", "approve", "manager", "hr", "leave"]
      }
    ]
  },
  {
    id: "guide-support-practice",
    title: "Guide 2: Support Team Practice Playbook",
    description: "Drafting support replies and receiving feedback.",
    passages: [
      {
        id: "src-support-1",
        heading: "Practice support replies",
        text: "Use the Sandbox Inbox for your first week. Draft replies to sample tickets before sending anything to customers.",
        keywords: ["practice", "draft", "sandbox inbox", "tickets", "first week"]
      },
      {
        id: "src-support-2",
        heading: "Feedback process",
        text: "Post draft replies in the #support-coaching channel. Your assigned mentor reviews drafts twice daily and gives feedback.",
        keywords: ["feedback", "mentor", "support-coaching", "draft replies", "reviews"]
      },
      {
        id: "src-support-3",
        heading: "Working in the support inbox",
        text: "For live tickets, first tag urgency, then check macros, then write a clear and empathetic response. Escalate billing or legal issues to a lead.",
        keywords: ["support inbox", "live tickets", "urgency", "macros", "escalate"]
      }
    ]
  },
  {
    id: "guide-demo-onboarding",
    title: "Guide 4: Demo Onboarding Handbook",
    description: "General onboarding expectations and communication norms.",
    passages: [
      {
        id: "src-demo-1",
        heading: "30-60-90 onboarding plan",
        text: "During your first 30 days, focus on product basics and shadowing. By day 60, handle standard tickets independently. By day 90, own a weekly queue block with mentor spot-checks.",
        keywords: ["30-60-90", "onboarding plan", "shadowing", "tickets", "mentor"]
      },
      {
        id: "src-demo-2",
        heading: "Daily standup expectations",
        text: "Post your standup update by 9:30 AM in #support-standup using: yesterday, today, blockers. Tag your mentor if a blocker is unresolved after one business day.",
        keywords: ["standup", "blockers", "support-standup", "mentor", "daily update"]
      },
      {
        id: "src-demo-3",
        heading: "Escalation response times",
        text: "Escalate urgent customer-impacting issues within 15 minutes to the on-call lead. Non-urgent escalations should be documented in the ticket within the same business day.",
        keywords: ["escalation", "urgent", "on-call", "lead", "response times"]
      },
      {
        id: "src-demo-4",
        heading: "Communication quality checklist",
        text: "Before sending customer replies, verify tone, confirm next steps, and include a clear owner and timeline. Keep messages concise and avoid internal jargon.",
        keywords: ["communication", "checklist", "tone", "next steps", "timeline"]
      }
    ]
  },
  {
    id: "guide-it-security",
    title: "Guide 3: IT Setup and Security",
    description: "Laptop setup, sign-in, MFA, and IT help.",
    passages: [
      {
        id: "src-it-1",
        heading: "Laptop setup",
        text: "Turn on your laptop, connect to internet, run Company Setup Assistant, and install security updates before opening work apps.",
        keywords: ["laptop", "setup", "assistant", "security updates", "install"]
      },
      {
        id: "src-it-2",
        heading: "Sign-in and multi-factor authentication",
        text: "Sign in with your company email and temporary password, then set up multi-factor authentication in the Authenticator app during first sign-in.",
        keywords: ["sign in", "mfa", "multi-factor", "authenticator", "password"]
      },
      {
        id: "src-it-3",
        heading: "IT support contact",
        text: "If your laptop is not working, contact IT Help in #it-help or email it-help@company.example. Include a screenshot and device serial number.",
        keywords: ["it help", "laptop not working", "contact", "it-help", "screenshot"]
      },
      {
        id: "src-it-4",
        heading: "Security policy",
        text: "Never share one-time codes, passwords, or recovery codes with anyone, including teammates and managers.",
        keywords: ["one-time code", "share code", "security policy", "passwords", "recovery codes"]
      }
    ]
  }
];

function sourceUrl(id) {
  return `/sources.html#${id}`;
}

function getGuideIds() {
  return guides.map((guide) => guide.id);
}

function getAllPassages() {
  return guides.flatMap((guide) =>
    guide.passages.map((passage) => ({
      guideId: guide.id,
      guideTitle: guide.title,
      guideDescription: guide.description,
      ...passage,
      url: sourceUrl(passage.id)
    }))
  );
}

module.exports = {
  guides,
  getGuideIds,
  getAllPassages,
  sourceUrl
};
