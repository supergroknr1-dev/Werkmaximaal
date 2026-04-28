import { getCurrentUser } from "@/lib/auth";
import { verifyAuditChain } from "@/lib/audit";

export async function POST() {
  const admin = await getCurrentUser();
  if (!admin || !admin.isAdmin) {
    return Response.json({ error: "Geen toegang." }, { status: 403 });
  }

  const result = await verifyAuditChain();

  // Convert BigInt to string for JSON serialisation
  if (result.breukBijId !== undefined) {
    result.breukBijId = String(result.breukBijId);
  }

  return Response.json(result);
}
