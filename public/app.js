const sampleQuestions = {
  "⏰ Time off": [
    "How do I request time off?",
    "How do I request vacation?",
    "Who reviews my time-off request?",
    "What should I do about coverage before my absence?"
  ],
  "👋 First day": [
    "What time do I start on day 1?",
    "When is the welcome call?",
    "When do I get my first-week schedule?",
    "What is the 30-60-90 onboarding plan?"
  ],
  "💬 Support practice": [
    "How do I practice support replies?",
    "Who gives feedback on my drafts?",
    "What do I do in the support inbox?"
  ],
  "💻 Laptop & sign-in": [
    "How do I set up my laptop?",
    "How do I set up multi-factor authentication?",
    "How do I sign in?"
  ],
  "🛠 IT help": [
    "My laptop is not working",
    "Who do I contact for IT help?",
    "Can I share my one-time code?"
  ],
  "🙋 HR decisions (should escalate)": [
    "Can you approve my leave?",
    "Is my time off approved?",
    "What is my salary?",
    "What are my benefits?"
  ],
  "🚫 Out of scope (should avoid guessing)": [
    "Where do I park?",
    "What is the wifi password?",
    "Can I work from home?"
  ]
};

const tokenKey = "onboardai_token";

const authCard = document.getElementById("auth-card");
const appCard = document.getElementById("app-card");
const topSignoutBtn = document.getElementById("top-signout");
const authMessage = document.getElementById("auth-message");
const userName = document.getElementById("user-name");
const userRole = document.getElementById("user-role");

const roleBadge = document.getElementById("role-badge");
const hrPanel = document.getElementById("hr-panel");
const hrStatus = document.getElementById("hr-status");
const employeePicker = document.getElementById("employee-picker");
const employeeSourceList = document.getElementById("employee-source-list");
const saveEmployeeSourcesBtn = document.getElementById("save-employee-sources");
const sourceVisibilitySummary = document.getElementById("source-visibility-summary");

const tabSignin = document.getElementById("tab-signin");
const tabSignup = document.getElementById("tab-signup");
const signinForm = document.getElementById("signin-form");
const signupForm = document.getElementById("signup-form");

const questionInput = document.getElementById("question");
const askBtn = document.getElementById("ask-btn");
const answerBox = document.getElementById("answer-box");
const answerText = document.getElementById("answer-text");
const sourcesEl = document.getElementById("sources");
const sampleQuestionsEl = document.getElementById("sample-questions");

let currentUser = null;
let availableGuides = [];
let employees = [];

function setAuthView(showApp) {
  authCard.classList.toggle("hidden", showApp);
  appCard.classList.toggle("hidden", !showApp);
  topSignoutBtn.classList.toggle("hidden", !showApp);
}

function showMessage(message = "") {
  authMessage.textContent = message;
}

function showHrStatus(message = "", tone = "") {
  hrStatus.textContent = message;
  hrStatus.className = tone ? `message ${tone}` : "message";
}

function setUserContext(user) {
  currentUser = user;
  userName.textContent = user.name;
  userRole.textContent = user.role === "hr" ? "HR" : "Employee";
  roleBadge.textContent = user.role === "hr" ? "HR account" : "Employee account";
  hrPanel.classList.toggle("hidden", user.role !== "hr");
}

function setTabs(mode) {
  const signin = mode === "signin";
  tabSignin.classList.toggle("active", signin);
  tabSignup.classList.toggle("active", !signin);
  signinForm.classList.toggle("hidden", !signin);
  signupForm.classList.toggle("hidden", signin);
  showMessage("");
}

async function api(path, options = {}) {
  const token = localStorage.getItem(tokenKey);
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

async function bootstrapAuth() {
  const token = localStorage.getItem(tokenKey);
  if (!token) {
    setAuthView(false);
    return;
  }

  try {
    const data = await api("/api/auth/me");
    setUserContext(data.user);
    await loadGuideVisibility();

    if (data.user.role === "hr") {
      await loadEmployees();
    }

    setAuthView(true);
  } catch {
    localStorage.removeItem(tokenKey);
    setAuthView(false);
  }
}

function renderSampleQuestions() {
  const frag = document.createDocumentFragment();

  Object.entries(sampleQuestions).forEach(([group, questions]) => {
    const section = document.createElement("section");
    section.className = "sample-group";

    const title = document.createElement("h4");
    title.textContent = group;
    section.appendChild(title);

    questions.forEach((question) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = question;
      btn.addEventListener("click", () => {
        questionInput.value = question;
        questionInput.focus();
      });
      section.appendChild(btn);
    });

    frag.appendChild(section);
  });

  sampleQuestionsEl.appendChild(frag);
}

function renderSources(sources) {
  if (!sources?.length) {
    sourcesEl.innerHTML = "";
    return;
  }

  const list = document.createElement("ul");
  list.className = "source-list";

  sources.forEach((source) => {
    const li = document.createElement("li");
    const link = document.createElement("a");
    link.href = source.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = source.title;

    const excerpt = document.createElement("div");
    excerpt.textContent = source.excerpt;

    li.appendChild(link);
    li.appendChild(excerpt);
    list.appendChild(li);
  });

  sourcesEl.innerHTML = "<h4>Sources</h4>";
  sourcesEl.appendChild(list);
}

function getGuideTitleById(guideId) {
  return availableGuides.find((guide) => guide.id === guideId)?.title || guideId;
}

function renderSourceVisibilitySummary() {
  if (!currentUser) return;

  if (currentUser.role === "hr") {
    sourceVisibilitySummary.textContent = `You can manage which onboarding source guides each employee can access.`;
    return;
  }

  const guideTitles = availableGuides.map((guide) => guide.title);
  sourceVisibilitySummary.textContent = guideTitles.length
    ? `You currently have access to: ${guideTitles.join(", ")}`
    : "No source guides are assigned to your account yet. Ask HR to assign at least one source.";
}

async function loadGuideVisibility() {
  const data = await api("/api/guides");
  availableGuides = data.guides || [];
  renderSourceVisibilitySummary();
}

function renderEmployeePicker() {
  employeePicker.innerHTML = "";

  if (!employees.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No employee accounts found";
    employeePicker.appendChild(option);
    employeeSourceList.innerHTML = "";
    saveEmployeeSourcesBtn.disabled = true;
    return;
  }

  employees.forEach((employee) => {
    const option = document.createElement("option");
    option.value = employee.id;
    option.textContent = `${employee.name} (${employee.email})`;
    employeePicker.appendChild(option);
  });

  saveEmployeeSourcesBtn.disabled = false;
  renderEmployeeSourceChecklist();
}

function renderEmployeeSourceChecklist() {
  const employeeId = employeePicker.value;
  const employee = employees.find((entry) => entry.id === employeeId);

  if (!employee) {
    employeeSourceList.innerHTML = "";
    return;
  }

  const assignedIds = new Set(employee.visibleGuideIds || []);
  const fragment = document.createDocumentFragment();

  availableGuides.forEach((guide) => {
    const label = document.createElement("label");
    label.className = "guide-option";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = guide.id;
    input.checked = assignedIds.has(guide.id);

    const text = document.createElement("span");
    text.textContent = `${guide.title} — ${guide.description}`;

    label.appendChild(input);
    label.appendChild(text);
    fragment.appendChild(label);
  });

  employeeSourceList.innerHTML = "";
  employeeSourceList.appendChild(fragment);
}

async function loadEmployees() {
  const data = await api("/api/hr/employees");
  employees = data.employees || [];
  renderEmployeePicker();

  if (employees.length) {
    const firstEmployee = employees[0];
    const assigned = (firstEmployee.visibleGuideIds || []).map(getGuideTitleById).join(", ");
    showHrStatus(`Loaded ${employees.length} employee account(s). First account currently sees: ${assigned || "No sources"}`);
  } else {
    showHrStatus("No employee accounts found.");
  }
}

async function saveEmployeeSources() {
  const employeeId = employeePicker.value;
  const employee = employees.find((entry) => entry.id === employeeId);

  if (!employee) {
    showHrStatus("Select an employee first.", "error");
    return;
  }

  const selectedGuideIds = [...employeeSourceList.querySelectorAll('input[type="checkbox"]:checked')].map(
    (input) => input.value
  );

  saveEmployeeSourcesBtn.disabled = true;
  saveEmployeeSourcesBtn.textContent = "Saving...";

  try {
    const data = await api(`/api/hr/employees/${employeeId}/sources`, {
      method: "PATCH",
      body: JSON.stringify({ guideIds: selectedGuideIds })
    });

    const updated = data.employee;
    employees = employees.map((entry) => (entry.id === updated.id ? updated : entry));

    const visible = (updated.visibleGuideIds || []).map(getGuideTitleById).join(", ");
    showHrStatus(`Saved. ${updated.name} now sees: ${visible || "No sources"}`);
    renderEmployeeSourceChecklist();
  } catch (error) {
    showHrStatus(error.message, "error");
  } finally {
    saveEmployeeSourcesBtn.disabled = false;
    saveEmployeeSourcesBtn.textContent = "Save source access";
  }
}

signinForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showMessage("");

  const formData = new FormData(signinForm);
  const payload = Object.fromEntries(formData.entries());

  try {
    const data = await api("/api/auth/signin", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    localStorage.setItem(tokenKey, data.token);
    setUserContext(data.user);
    await loadGuideVisibility();
    if (data.user.role === "hr") {
      await loadEmployees();
    }
    setAuthView(true);
  } catch (error) {
    showMessage(error.message);
  }
});

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showMessage("");

  const formData = new FormData(signupForm);
  const payload = Object.fromEntries(formData.entries());

  try {
    const data = await api("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    localStorage.setItem(tokenKey, data.token);
    setUserContext(data.user);
    await loadGuideVisibility();
    setAuthView(true);
  } catch (error) {
    showMessage(error.message);
  }
});

askBtn.addEventListener("click", async () => {
  const question = questionInput.value.trim();
  if (!question) return;

  askBtn.disabled = true;
  askBtn.textContent = "…";

  try {
    const data = await api("/api/ask", {
      method: "POST",
      body: JSON.stringify({ question })
    });

    answerText.textContent = data.answer;
    renderSources(data.sources || []);
    answerBox.classList.remove("hidden");
  } catch (error) {
    answerText.textContent = error.message;
    sourcesEl.innerHTML = "";
    answerBox.classList.remove("hidden");
  } finally {
    askBtn.disabled = false;
    askBtn.textContent = "▶";
  }
});

questionInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    askBtn.click();
  }
});

function signOut() {
  localStorage.removeItem(tokenKey);
  answerBox.classList.add("hidden");
  questionInput.value = "";
  currentUser = null;
  availableGuides = [];
  employees = [];
  sourceVisibilitySummary.textContent = "";
  employeeSourceList.innerHTML = "";
  employeePicker.innerHTML = "";
  showHrStatus("");
  setAuthView(false);
}

document.getElementById("logout").addEventListener("click", signOut);
topSignoutBtn.addEventListener("click", signOut);

employeePicker.addEventListener("change", () => {
  renderEmployeeSourceChecklist();
  showHrStatus("");
});

saveEmployeeSourcesBtn.addEventListener("click", saveEmployeeSources);

tabSignin.addEventListener("click", () => setTabs("signin"));
tabSignup.addEventListener("click", () => setTabs("signup"));

setTabs("signin");
renderSampleQuestions();
bootstrapAuth();
