import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { message, conversationHistory, patientContext } = await req.json();

    console.log('Chat API called with message:', message.substring(0, 50));

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    console.log('API Key exists:', !!apiKey);
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    // Build the conversation context — include full SHAP data for explainability
    const mlPred = patientContext?.mlPrediction ?? null
    const shapAll = patientContext?.shapAllFeatures ?? []
    const shapExpected = patientContext?.shapExpectedValue ?? null

    // Build a concise SHAP table for the prompt
    const shapTable =
      shapAll.length > 0
        ? shapAll
            .map(
              (f: { display_name: string; impact: number }) =>
                `${f.display_name}: ${f.impact > 0 ? "+" : ""}${f.impact.toFixed(4)}`
            )
            .join("\n")
        : "Not available"

    const systemPrompt = `You are a medical AI assistant specialized in neonatal sepsis analysis. You're helping doctors interpret ML-generated risk assessment reports.

${mlPred ? `ML Prediction Summary:
- Sepsis Probability: ${(mlPred.sepsis_probability * 100).toFixed(1)}%
- Sepsis Label: ${mlPred.sepsis_label === 1 ? "Yes" : "No"}
- Risk Category: ${mlPred.risk_bucket}
- Confidence: ${(mlPred.confidence * 100).toFixed(1)}%` : ""}

${shapExpected !== null ? `SHAP Baseline (expected) Value: ${shapExpected}` : ""}

SHAP Feature Contributions (all features, sorted by absolute impact):
Positive values push prediction TOWARDS sepsis, negative push AWAY from sepsis.
${shapTable}

${patientContext ? `Patient Assessment Data (raw inputs):
${JSON.stringify(
  Object.fromEntries(
    Object.entries(patientContext).filter(
      ([k]) => !["mlPrediction", "shapAllFeatures", "shapExpectedValue", "riskScore"].includes(k)
    )
  ),
  null,
  2
)}` : ""}

Your role:
- Answer questions about the sepsis risk assessment and SHAP explainability
- When doctors ask "why", refer to the SHAP contributions above
- Explain which features contributed most to the prediction and by how much
- Explain that SHAP values represent how much each feature pushed the prediction above or below the baseline
- Provide clinical insights based on the data
- Suggest potential interventions or monitoring strategies
- Always remind doctors that you're an AI assistant and final decisions should be made by qualified healthcare professionals

Be concise, clear, and evidence-based in your responses.`;

    // Prepare messages for Gemini
    const contents = [
      {
        role: 'user',
        parts: [{ text: systemPrompt }]
      },
      {
        role: 'model',
        parts: [{ text: 'I understand. I\'m here to help you interpret the neonatal sepsis risk assessment. What would you like to know?' }]
      }
    ];

    // Add conversation history - limit to last 6 messages to prevent token overflow
    const recentHistory = conversationHistory && conversationHistory.length > 0 
      ? conversationHistory.slice(-6) 
      : [];
    
    recentHistory.forEach((msg: { role: string; content: string }) => {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      });
    });

    // Add current message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const requestBody = {
      contents: contents,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        }
      ]
    };

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to get response from Gemini API', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Extract the response text
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.';

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
