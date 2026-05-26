export default async function handler(req, res) {
  // Solo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { prompt, model, temperature } = req.body;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Falta el prompt o está vacío' });
  }

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    console.error('Falta variable de entorno GROQ_API_KEY');
    return res.status(500).json({ error: 'Configuración del servidor incompleta' });
  }

  // Modelo por defecto y temperatura desde el cliente (con fallback seguro)
  const modelName   = model       || 'llama-3.3-70b-versatile';
  const tempValue   = typeof temperature === 'number' && temperature >= 0 && temperature <= 1
                      ? temperature
                      : 0.7;

  // max_tokens aumentado para no truncar respuestas de chunks grandes
  const MAX_TOKENS = 2048;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model:       modelName,
        messages:    [{ role: 'user', content: prompt }],
        temperature: tempValue,
        max_tokens:  MAX_TOKENS
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Error de Groq:', errorData);
      const msg = errorData?.error?.message || `Error HTTP ${response.status} de Groq`;
      return res.status(response.status).json({ error: msg });
    }

    const data        = await response.json();
    const paraphrased = data?.choices?.[0]?.message?.content;

    if (!paraphrased) {
      return res.status(500).json({ error: 'La API devolvió una respuesta vacía' });
    }

    return res.status(200).json({ paraphrased });

  } catch (error) {
    console.error('Error interno en paraphrase handler:', error);
    return res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
  }
}
