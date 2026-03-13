import { GoogleGenAI } from "@google/genai";
import fs from "fs";

async function generateLogo() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          text: 'A professional and modern logo for a travel app named "Travolor". The logo should feature a stylized airplane and a torch with a flame, combined with vibrant colors like orange and blue. The text "Travolor" should be clearly visible in a clean, stylized font. High quality, vector style, transparent background.',
        },
      ],
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      const base64EncodeString = part.inlineData.data;
      const buffer = Buffer.from(base64EncodeString, 'base64');
      fs.writeFileSync('public/travolor-logo.png', buffer);
      console.log('Logo generated and saved to public/travolor-logo.png');
    }
  }
}

generateLogo().catch(console.error);
