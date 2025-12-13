# Tacit Agent Platform - Next.js for Vercel

Expert-Driven AI Agent with Human-in-the-Loop Safety Controls.

## Deploy to Vercel

1. Push this `nextjs-app` folder to a GitHub repository
2. Import the project to Vercel
3. Add environment variable: `GEMINI_API_KEY`
4. Deploy!

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:5000](http://localhost:5000)

## Features

- Tacit Knowledge Rules - Expert-defined heuristics
- PDF Document Upload - RAG-based knowledge retrieval
- Human-in-the-Loop - Approval workflow for high-risk scenarios
- Gemini AI - Powered by Google's Gemini 2.5 Flash model

## Environment Variables

- `GEMINI_API_KEY` - Your Google AI API key (required)
