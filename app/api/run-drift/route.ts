import { NextResponse } from "next/server"

export async function POST() {
  const ML_API_BASE = process.env.NEXT_PUBLIC_ML_API_BASE

  await fetch(`${ML_API_BASE}/run-drift`, {
    method: "POST",
  })

  return NextResponse.json({ ok: true })
}
