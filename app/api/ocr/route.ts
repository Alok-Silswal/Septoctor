export const runtime = "nodejs";

import { NextResponse } from "next/server";
import vision from "@google-cloud/vision";

// Cloud Run uses the attached service account automatically
const client = new vision.ImageAnnotatorClient();

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json(
        { error: "Image not provided" },
        { status: 400 }
      );
    }

    const [result] = await client.textDetection({
      image: { content: imageBase64 },
    });

    const text =
      result.fullTextAnnotation?.text ||
      result.textAnnotations?.[0]?.description ||
      "";

    return NextResponse.json({ text });
  } catch (err) {
    console.error("OCR error:", err);
    return NextResponse.json(
      { error: "OCR failed" },
      { status: 500 }
    );
  }
}
