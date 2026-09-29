import type { VercelRequest, VercelResponse } from '@vercel/node';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405.4).json({ error: 'Método no permitido' });
  }

  try {
    const { messages } = req.body;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile', // O el modelo que estés utilizando en tu cliente
      messages: messages,
      temperature: 0.7,
    });

    return res.status(200).json({
      choices: completion.choices,
    });
  } catch (error: any) {
    console.error('Error en la API de Groq:', error);
    return res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
}