import { Resend } from "resend";

type TaskItem = {
  title: string;
  priority: string;
  dueDate: Date | null;
  project?: { name: string };
};

export async function sendDailyDigest(to: string, tasks: TaskItem[], appUrl?: string): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY);
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set");
  }

  const baseUrl = appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const listItems = tasks
    .slice(0, 20)
    .map(
      (t) =>
        `• [${t.priority}] ${t.title}${t.project?.name ? ` (${t.project.name})` : ""}${t.dueDate ? ` — Due ${new Date(t.dueDate).toLocaleDateString()}` : ""}`
    )
    .join("\n");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 16px;">
  <h1 style="font-size: 1.25rem;">Today's top priorities</h1>
  <p style="color: #666;">Here are your most important tasks for today:</p>
  <pre style="white-space: pre-wrap; background: #f5f5f5; padding: 12px; border-radius: 8px;">${listItems || "No active tasks."}</pre>
  <p style="margin-top: 24px;">
    <a href="${baseUrl}/dashboard" style="color: #4f46e5;">Open dashboard →</a>
  </p>
</body>
</html>
  `.trim();

  await resend.emails.send({
    from: process.env.RESEND_FROM ?? "Todo Kanban <onboarding@resend.dev>",
    to: [to],
    subject: "Your daily task digest",
    html,
  });
}
