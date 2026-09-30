require("dotenv").config();

const path = require("path");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const db = require("./src/db");
const { answerQuestion } = require("./src/qa");
const { guides, getAllPassages } = require("./src/knowledge");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function createToken(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, {
    expiresIn: "7d"
  });
}

function getVisibleGuideIdsForUser(user) {
  if (user.role === "hr") {
    return guides.map((guide) => guide.id);
  }

  const ids = Array.isArray(user.visibleGuideIds) ? user.visibleGuideIds : [];
  return ids.length ? ids : guides.map((guide) => guide.id);
}

function getVisiblePassagesForUser(user) {
  const visibleIds = new Set(getVisibleGuideIdsForUser(user));
  return getAllPassages().filter((passage) => visibleIds.has(passage.guideId));
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing authentication token" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    db.getUserById(payload.id)
      .then((user) => {
        if (!user) {
          return res.status(401).json({ error: "Invalid or expired token" });
        }

        req.user = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          visibleGuideIds: user.visibleGuideIds
        };

        return next();
      })
      .catch(next);
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function requireHr(req, res, next) {
  if (req.user?.role !== "hr") {
    return res.status(403).json({ error: "HR access required" });
  }

  return next();
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true, app: "OnboardAI", database: db.mode() });
});

app.post("/api/auth/signup", async (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required" });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  const normalizedEmail = email.toLowerCase();
  const existing = await db.getUserByEmail(normalizedEmail);
  if (existing) {
    return res.status(409).json({ error: "An account already exists for this email" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  let user;

  try {
    user = await db.createUser({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash
    });
  } catch (error) {
    const message = String(error?.message || "").toLowerCase();
    if (message.includes("unique") || message.includes("duplicate")) {
      return res.status(409).json({ error: "An account already exists for this email" });
    }

    throw error;
  }

  const token = createToken(user);
  return res.status(201).json({ token, user });
});

app.post("/api/auth/signin", async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = await db.getUserByEmail(email.toLowerCase());

  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const passwordOk = await bcrypt.compare(password, user.passwordHash);
  if (!passwordOk) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    visibleGuideIds: user.visibleGuideIds
  };
  const token = createToken(payload);

  return res.json({ token, user: payload });
});

app.get("/api/auth/me", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

app.get("/api/guides", authMiddleware, (req, res) => {
  const visibleGuideIds = new Set(getVisibleGuideIdsForUser(req.user));
  const visibleGuides = guides.filter((guide) => visibleGuideIds.has(guide.id));
  res.json({ guides: visibleGuides });
});

app.get("/api/hr/employees", authMiddleware, requireHr, async (req, res) => {
  const employees = await db.listEmployees();
  return res.json({ employees });
});

app.patch("/api/hr/employees/:employeeId/sources", authMiddleware, requireHr, async (req, res) => {
  const { employeeId } = req.params;
  const { guideIds } = req.body || {};

  if (!Array.isArray(guideIds)) {
    return res.status(400).json({ error: "guideIds must be an array" });
  }

  const updated = await db.updateEmployeeVisibleGuides({ employeeId, guideIds });

  if (!updated) {
    return res.status(404).json({ error: "Employee not found" });
  }

  return res.json({ employee: updated });
});

app.post("/api/ask", authMiddleware, async (req, res) => {
  const { question } = req.body || {};
  const visiblePassages = getVisiblePassagesForUser(req.user);
  const result = answerQuestion(question, visiblePassages);

  await db.insertQuestionLog({
    userId: req.user.id,
    question: (question || "").trim(),
    answer: result.answer
  });

  return res.json(result);
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

async function start() {
  await db.init();
  app.listen(PORT, () => {
    console.log(`OnboardAI is running on http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error("Failed to start OnboardAI:", error);
  process.exit(1);
});
