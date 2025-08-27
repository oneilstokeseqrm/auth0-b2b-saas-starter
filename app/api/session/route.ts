import { NextRequest, NextResponse } from "next/server"
import { appClient } from "@/lib/auth0"

export const runtime = "nodejs"

export async function GET(_req: NextRequest) {
  try {
    const session = await appClient.getSession()
    const noStoreHeaders = { "Cache-Control": "no-store" }

    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401, headers: noStoreHeaders })
    }

    const user = session.user as Record<string, any>
    const ns = process.env.CUSTOM_CLAIMS_NAMESPACE || "https://hasura.io/jwt/claims"

    const orgId = user.org_id ?? user[`${ns}/org_id`] ?? null
    const orgName = user.org_name ?? user[`${ns}/org_name`] ?? null

    const roles =
      user[`${ns}/roles`] ??
      user[`${ns}/x-hasura-allowed-roles`] ??
      user.roles ??
      []

    const permissions =
      user[`${ns}/permissions`] ??
      user.permissions ??
      []

    const sessionData = {
      user: {
        id: user.sub,
        email: user.email,
        name: user.name,
        picture: user.picture,
        email_verified: Boolean(user.email_verified),
      },
      organization: {
        id: orgId,
        name: orgName,
      },
      roles,
      permissions,
      tenant_id: null,
      metadata: {
        expires_at: user.exp ? new Date(user.exp * 1000).toISOString() : null,
        updated_at: user.updated_at || new Date().toISOString(),
      },
    }

    return NextResponse.json(sessionData, { headers: noStoreHeaders })
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    )
  }
}
