const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { getGuideIds } = require("./knowledge");

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/onboardai";

let User;
let QuestionLog;

function mapUser(doc) {
  if (!doc) return null;

  return {
    id: String(doc._id),
    name: doc.name,
    email: doc.email,
    role: doc.role || "employee",
    visibleGuideIds: Array.isArray(doc.visibleGuideIds) ? doc.visibleGuideIds : [],
    passwordHash: doc.passwordHash
  };
}

function mapPublicUser(doc) {
  if (!doc) return null;

  return {
    id: String(doc._id),
    name: doc.name,
    email: doc.email,
    role: doc.role || "employee",
    visibleGuideIds: Array.isArray(doc.visibleGuideIds) ? doc.visibleGuideIds : []
  };
}

function normalizeGuideIds(guideIds) {
  const validIds = new Set(getGuideIds());

  return [...new Set(Array.isArray(guideIds) ? guideIds : [])].filter((id) => validIds.has(id));
}

async function ensureDemoUsers() {
  const allGuideIds = getGuideIds();

  const demoUsers = [
    {
      name: "Demo HR",
      email: "hr.demo@onboardai.local",
      password: "DemoHR123!",
      role: "hr",
      visibleGuideIds: allGuideIds
    },
    {
      name: "Demo Employee",
      email: "employee.demo@onboardai.local",
      password: "DemoEmp123!",
      role: "employee",
      visibleGuideIds: allGuideIds
    }
  ];

  for (const demoUser of demoUsers) {
    const passwordHash = await bcrypt.hash(demoUser.password, 10);

    await User.updateOne(
      { email: demoUser.email },
      {
        $setOnInsert: {
          name: demoUser.name,
          email: demoUser.email,
          passwordHash,
          role: demoUser.role,
          visibleGuideIds: demoUser.visibleGuideIds
        }
      },
      { upsert: true }
    );
  }
}

async function init() {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  await mongoose.connect(mongoUri);

  const userSchema = new mongoose.Schema(
    {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, unique: true, lowercase: true, trim: true },
      passwordHash: { type: String, required: true },
      role: { type: String, enum: ["employee", "hr"], default: "employee" },
      visibleGuideIds: { type: [String], default: [] }
    },
    { timestamps: true }
  );

  const questionLogSchema = new mongoose.Schema(
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      question: { type: String, required: true, trim: true },
      answer: { type: String, required: true, trim: true }
    },
    { timestamps: true }
  );

  User = mongoose.models.User || mongoose.model("User", userSchema);
  QuestionLog = mongoose.models.QuestionLog || mongoose.model("QuestionLog", questionLogSchema);

  await ensureDemoUsers();
}

async function getUserById(id) {
  const user = await User.findById(id).lean();
  return mapUser(user);
}

async function getUserByEmail(email) {
  const user = await User.findOne({ email: email.toLowerCase() }).lean();
  return mapUser(user);
}

async function createUser({ name, email, passwordHash }) {
  const allGuideIds = getGuideIds();

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: "employee",
    visibleGuideIds: allGuideIds
  });

  return mapUser(user);
}

async function listEmployees() {
  const users = await User.find({ role: "employee" }).sort({ createdAt: 1 }).lean();
  return users.map(mapPublicUser);
}

async function updateEmployeeVisibleGuides({ employeeId, guideIds }) {
  const normalizedGuideIds = normalizeGuideIds(guideIds);

  const user = await User.findOneAndUpdate(
    { _id: employeeId, role: "employee" },
    { $set: { visibleGuideIds: normalizedGuideIds } },
    { new: true }
  ).lean();

  return mapPublicUser(user);
}

async function insertQuestionLog({ userId, question, answer }) {
  await QuestionLog.create({
    userId,
    question,
    answer
  });
}

function mode() {
  return "mongo";
}

module.exports = {
  init,
  getUserById,
  getUserByEmail,
  createUser,
  listEmployees,
  updateEmployeeVisibleGuides,
  insertQuestionLog,
  normalizeGuideIds,
  mode
};
