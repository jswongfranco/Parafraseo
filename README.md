# ✍️ ParafraseAI

&gt; Parafraseador inteligente con preservación de estructura. Convierte tus documentos manteniendo títulos, formato y significado.

[![Deploy on Vercel](https://img.shields.io/badge/Deploy-Vercel-black?style=flat&logo=vercel)](https://vercel.com)
[![Groq API](https://img.shields.io/badge/Powered%20by-Groq-orange?style=flat)](https://groq.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

![Demo](assets/demo.gif)

## ✨ Características

- 📄 **Soporta PDF, DOCX, DOC y TXT** – arrastra o pega texto directamente
- 🎯 **Preservación inteligente** – mantiene títulos, números, fechas y términos técnicos
- 🎚️ **4 tonos de escritura** – Natural, Académico, Formal, Conversacional
- ⚡ **3 niveles de intensidad** – Conservador, Medio, Agresivo
- 🤖 **3 modelos de IA** – Llama 3.3 70B, Llama 3.1 8B, Mixtral 8x7B
- 📥 **Exporta a DOCX o TXT** con formato preservado
- 🔄 **Procesamiento por segmentos** – maneja documentos largos sin problemas

## 🚀 Demo en vivo

👉 [https://parafraseai.vercel.app](https://tu-url.vercel.app)

## 🛠️ Tecnologías

| Frontend | Backend | IA |
|----------|---------|-----|
| HTML5 + CSS3 + Vanilla JS | Vercel Serverless Functions | Groq API (Llama, Mixtral) |
| PDF.js, Mammoth.js, docx.js | Node.js | Temperatura ajustable |

## 📦 Instalación local

```bash
# 1. Clona el repositorio
git clone https://github.com/jswongfranco/Parafraseo.git
cd Parafraseo

# 2. Crea tu archivo de variables de entorno
cp .env.example .env
# Edita .env y añade tu GROQ_API_KEY

# 3. Instala Vercel CLI (si no lo tienes)
npm i -g vercel

# 4. Despliega en modo desarrollo
vercel dev
