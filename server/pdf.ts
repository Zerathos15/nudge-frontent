import { PDFParse } from 'pdf-parse';
import { GoogleGenAI } from '@google/genai';

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // 1. Try local PDFParse
  try {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const text = typeof result === 'string' ? result : result?.text || '';
    if (text && text.trim().length > 20) {
      return text.trim();
    }
  } catch (err) {
    console.warn('Local PDFParse failed, trying Gemini multimodal extraction:', err);
  }

  // 2. Multimodal Gemini PDF extraction fallback
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const base64Data = buffer.toString('base64');
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: base64Data,
          },
        },
        {
          text: 'Extract all the textual content, headings, tables, schedules, modules, topics, and rules from this document verbatim and in structured format.',
        },
      ],
    });

    const text = response.text || '';
    if (text.trim().length > 20) {
      return text.trim();
    }
  } catch (err: any) {
    console.error('Gemini multimodal extraction error:', err);
  }

  throw new Error('Failed to extract readable text from PDF document.');
}
