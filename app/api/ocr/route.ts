import { NextResponse } from "next/server"

// Force Node.js runtime (required for Google Cloud Vision SDK)
export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    // Dynamic import to avoid build-time issues
    const vision = await import("@google-cloud/vision")
    
    const client = new vision.ImageAnnotatorClient({
      credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON!)
    })
    
    const { imageBase64 } = await req.json()

    if (!imageBase64) {
      return NextResponse.json(
        { error: "Image not provided" },
        { status: 400 }
      )
    }

    const [result] = await client.textDetection({
      image: { content: imageBase64 }
    })

    const text =
      result.fullTextAnnotation?.text ||
      result.textAnnotations?.[0]?.description ||
      ""

    return NextResponse.json({ text })
  } catch (err) {
    console.error("OCR error:", err)
    return NextResponse.json(
      { error: "OCR failed" },
      { status: 500 }
    )
  }
}
