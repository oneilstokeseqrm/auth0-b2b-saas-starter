"use server"

import { redirect } from "next/navigation"
import slugify from "@sindresorhus/slugify"

import { managementClient, onboardingClient } from "@/lib/auth0"

export async function createOrganization(formData: FormData) {
  console.log("=== Organization Creation Started ===")
  console.log("Management API Client Config:")
  console.log("- AUTH0_MANAGEMENT_CLIENT_ID:", process.env.AUTH0_MANAGEMENT_CLIENT_ID ? "SET" : "NOT SET")
  console.log("- AUTH0_MANAGEMENT_CLIENT_SECRET:", process.env.AUTH0_MANAGEMENT_CLIENT_SECRET ? "SET" : "NOT SET")
  console.log("- AUTH0_MANAGEMENT_API_DOMAIN:", process.env.AUTH0_MANAGEMENT_API_DOMAIN)
  
  const session = await onboardingClient.getSession()
  console.log("Session check:", session ? "Valid session found" : "No session")
  
  if (session) {
    console.log("User ID:", session.user.sub)
    console.log("User email:", session.user.email)
    console.log("Email verified:", session.user.email_verified)
  }

  if (!session) {
    console.log("Redirecting to signup - no session")
    return redirect("/onboarding/signup")
  }

  const organizationName = formData.get("organization_name")
  console.log("Organization name:", organizationName)

  if (!organizationName || typeof organizationName !== "string") {
    console.log("Invalid organization name")
    return {
      error: "Organization name is required.",
    }
  }

  let organization
  const slugifiedName = slugify(organizationName)
  console.log("Slugified name:", slugifiedName)
  console.log("DEFAULT_CONNECTION_ID:", process.env.DEFAULT_CONNECTION_ID)
  console.log("AUTH0_ADMIN_ROLE_ID:", process.env.AUTH0_ADMIN_ROLE_ID)

  try {
    console.log("=== Step 1: Creating organization ===")
    console.log("Organization name:", organizationName, "Slugified:", slugifiedName)
    ;({ data: organization } = await managementClient.organizations.create({
      name: slugifiedName,
      display_name: organizationName,
      enabled_connections: [
        {
          connection_id: process.env.DEFAULT_CONNECTION_ID,
        },
      ],
    }))
    console.log("✓ Organization created successfully:", organization.id)

    console.log("=== Step 2: Adding member ===")
    console.log("Adding user:", session.user.sub, "to organization:", organization.id)
    await managementClient.organizations.addMembers(
      {
        id: organization.id,
      },
      {
        members: [session.user.sub],
      }
    )
    console.log("✓ Member added successfully")

    console.log("=== Step 3: Adding member roles ===")
    console.log("Adding role:", process.env.AUTH0_ADMIN_ROLE_ID, "to user:", session.user.sub)
    await managementClient.organizations.addMemberRoles(
      {
        id: organization.id,
        user_id: session.user.sub,
      },
      {
        roles: [process.env.AUTH0_ADMIN_ROLE_ID],
      }
    )
    console.log("✓ Member roles added successfully")
  } catch (error: any) {
    console.error("=== ORGANIZATION CREATION ERROR ===")
    console.error("Error message:", error.message)
    console.error("Error statusCode:", error.statusCode)
    console.error("Error body:", error.body)
    console.error("Full error object:", JSON.stringify(error, null, 2))
    console.error("Session user ID:", session?.user?.sub)
    console.error("Organization name:", organizationName)
    console.error("DEFAULT_CONNECTION_ID:", process.env.DEFAULT_CONNECTION_ID)
    console.error("AUTH0_ADMIN_ROLE_ID:", process.env.AUTH0_ADMIN_ROLE_ID)
    console.error("=== END ERROR DETAILS ===")
    
    return {
      error: `Failed to create organization: ${error.message || 'Unknown error'}`,
    }
  }

  console.log("=== Success - redirecting to login ===")
  const authParams = new URLSearchParams({
    organization: organization.id,
    returnTo: "/dashboard",
  })

  redirect(`/api/auth/login?${authParams.toString()}`)
}
