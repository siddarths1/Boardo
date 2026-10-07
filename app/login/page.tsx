import { authConfigured, currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
export default async function LoginPage() {
  if (await currentUser()) redirect("/dashboard");
  return <div className="login-shell"><div className="brand"><span className="brand-mark">b</span> boardo.</div><p className="eyebrow">YOUR DAY, WITH INTENTION</p><h1>Make room for<br />what matters.</h1><p className="lead">A little clarity. A realistic plan.<br />One useful next step.</p><LoginForm configured={authConfigured()} /></div>;
}
