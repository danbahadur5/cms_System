export function sanitizeHtml(input: string): string {
  if (!input) return "";
  let out = input.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  out = out.replace(/on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  out = out.replace(
    /href\s*=\s*("javascript:[^\"]*"|'javascript:[^']*'|javascript:[^\s>]+)/gi,
    "",
  );
  return out;
}

export function defaultLessonContent(
  day: number | string,
  title = "",
  type?: string,
) {
  const d = Number(day) || 1;
  const safeTitle = String(title || "").trim() || "New Lesson";
  const typeLabel = type
    ? String(type).charAt(0).toUpperCase() + String(type).slice(1)
    : "";
  const heading = `<h1>Day ${d} — ${escapeHtml(safeTitle)}</h1>`;
  const typeLine = typeLabel ? `<h2>${escapeHtml(typeLabel)}</h2>` : "";
  return `${heading}${typeLine}<p></p>`;
}

export function lessonTemplate(
  day: number | string,
  title = "",
  type?: string,
) {
  const d = Number(day) || 1;
  const safeTitle = String(title || "").trim() || "New Lesson";
  const typeLabel = type
    ? String(type).charAt(0).toUpperCase() + String(type).slice(1)
    : "";

  return `
<h1>Day ${d} — ${escapeHtml(safeTitle)}</h1>
${typeLabel ? `<h2>${escapeHtml(typeLabel)}</h2>` : ""}
<h3>Overview</h3>
<p>Briefly describe what this lesson covers and why it matters.</p>

<h3>Learning Objectives</h3>
<ul>
  <li>Understand the key concept 1.</li>
  <li>Apply technique X to solve problem Y.</li>
  <li>Complete a short exercise to reinforce learning.</li>
</ul>

<h3>Materials & Resources</h3>
<ul>
  <li>Slides / notes (PDF)</li>
  <li>Code examples / starter files</li>
  <li>Reference links</li>
</ul>

<h3>Lecture / Explanation</h3>
<p>Detailed explanation of the topic. Include examples, diagrams, and code snippets where useful.</p>

<h3>Step-by-step Activity</h3>
<ol>
  <li>Step 1 — Introduce the problem and show a demonstration.</li>
  <li>Step 2 — Guide learners through the first task.</li>
  <li>Step 3 — Encourage experimentation and self-practice.</li>
</ol>

<h3>Practice</h3>
<p>Provide a short exercise or hands-on task for the learner to complete.</p>

<h3>Assessment / Quiz</h3>
<p>Suggested quick questions to check understanding.</p>

<h3>Further Reading & Links</h3>
<ul>
  <li>External article or documentation</li>
  <li>Video walkthrough</li>
</ul>
`;
}

function escapeHtml(unsafe: string) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
