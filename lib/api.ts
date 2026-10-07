import { User } from "@prisma/client";
import { requireUser } from "./auth";
import { apiError, sameOrigin } from "./http";
export async function authenticated(request: Request, action: (user: User) => Promise<Response>) {
  try {
    const user = await requireUser();
    if (!["GET", "HEAD"].includes(request.method)) sameOrigin(request);
    return await action(user);
  } catch (error) { return apiError(error); }
}
