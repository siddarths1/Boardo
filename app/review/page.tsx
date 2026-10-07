import { requirePageUser } from "@/lib/auth";
import { ReviewClient } from "@/components/ReviewClient";
export default async function ReviewPage() { await requirePageUser(); return <ReviewClient />; }
