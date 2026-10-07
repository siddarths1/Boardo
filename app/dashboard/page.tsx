import { requirePageUser } from "@/lib/auth";
import { TodayClient } from "@/components/TodayClient";
export default async function DashboardPage() { await requirePageUser(); return <TodayClient />; }
