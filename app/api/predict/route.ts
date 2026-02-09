import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const ML_API_BASE =
      process.env.ML_API_BASE ?? process.env.NEXT_PUBLIC_ML_API_BASE

    if (!ML_API_BASE) {
      return NextResponse.json(
        { detail: "ML_API_BASE or NEXT_PUBLIC_ML_API_BASE must be set in your environment" },
        { status: 500 }
      )
    }

    const body = await request.json()

    const upstreamResponse = await fetch(`${ML_API_BASE}/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    const upstreamText = await upstreamResponse.text()

    if (!upstreamResponse.ok) {
      console.error(`[/api/predict] Upstream returned ${upstreamResponse.status}:`, upstreamText)
    }

    return new NextResponse(upstreamText, {
      status: upstreamResponse.status,
      headers: {
        "Content-Type": "application/json",
      },
    })
  } catch (error) {
    console.error("[/api/predict] Failed to reach ML backend:", error)
    return NextResponse.json(
      { detail: "ML backend is unreachable" },
      { status: 503 }
    )
  }
}
