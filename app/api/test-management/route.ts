import { NextRequest, NextResponse } from 'next/server'
import { managementClient } from '@/lib/auth0'

export async function GET(request: NextRequest) {
  console.log("=== Testing Management API in Vercel Environment ===")
  console.log("Management API Client Config:")
  console.log("- AUTH0_MANAGEMENT_CLIENT_ID:", process.env.AUTH0_MANAGEMENT_CLIENT_ID ? "SET" : "NOT SET")
  console.log("- AUTH0_MANAGEMENT_CLIENT_SECRET:", process.env.AUTH0_MANAGEMENT_CLIENT_SECRET ? "SET" : "NOT SET")
  console.log("- AUTH0_MANAGEMENT_API_DOMAIN:", process.env.AUTH0_MANAGEMENT_API_DOMAIN)
  console.log("- DEFAULT_CONNECTION_ID:", process.env.DEFAULT_CONNECTION_ID)
  console.log("- AUTH0_ADMIN_ROLE_ID:", process.env.AUTH0_ADMIN_ROLE_ID)

  try {
    console.log("Testing organizations.getAll()...")
    const orgs = await managementClient.organizations.getAll({ per_page: 1 })
    console.log("✓ Successfully accessed organizations API, found", orgs.data.length, "organizations")

    console.log("Testing organization creation...")
    const testOrgName = `test-org-${Date.now()}`
    const testOrg = await managementClient.organizations.create({
      name: testOrgName,
      display_name: `Test Organization ${Date.now()}`,
      enabled_connections: [
        {
          connection_id: process.env.DEFAULT_CONNECTION_ID,
        },
      ],
    })
    
    console.log("✓ Test organization created:", testOrg.data.id)
    
    await managementClient.organizations.delete({ id: testOrg.data.id })
    console.log("✓ Test organization cleaned up")

    return NextResponse.json({ 
      success: true, 
      message: "Management API test successful",
      organizationsFound: orgs.data.length
    })

  } catch (error: any) {
    console.error("❌ Management API test failed:")
    console.error("Error message:", error.message)
    console.error("Error statusCode:", error.statusCode)
    console.error("Error body:", error.body)
    console.error("Full error:", JSON.stringify(error, null, 2))

    return NextResponse.json({ 
      success: false, 
      error: error.message,
      statusCode: error.statusCode,
      body: error.body
    }, { status: 500 })
  }
}
