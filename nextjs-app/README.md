# Tacit Agent Platform - Next.js for Vercel

Expert-Driven AI Agent with Human-in-the-Loop Safety Controls.

## Deploy to Vercel

### Step 1: Push to GitHub
Push your entire project (including this `nextjs-app` folder) to a GitHub repository.

### Step 2: Import to Vercel
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New" > "Project"
3. Import your GitHub repository
4. **IMPORTANT:** Set the "Root Directory" to `nextjs-app` in the project settings
5. Framework Preset should auto-detect as "Next.js"

### Step 3: Add Environment Variable
In Vercel project settings > Environment Variables, add:
- `GEMINI_API_KEY` - Your Google AI API key

### Step 4: Deploy
Click Deploy and wait for the build to complete.

## Local Development

```bash
cd nextjs-app
npm install
npm run dev
```

Open [http://localhost:5000](http://localhost:5000)

## Features

- Tacit Knowledge Rules - Expert-defined heuristics
- PDF Document Upload - RAG-based knowledge retrieval (pure JavaScript, no Python needed)
- Human-in-the-Loop - Approval workflow for high-risk scenarios
- Gemini AI - Powered by Google's Gemini 2.5 Flash model

## Environment Variables

- `GEMINI_API_KEY` - Your Google AI API key (required)

## Architecture Notes

This version is designed for Vercel's serverless environment:
- **Storage**: In-memory with globalThis persistence
- **RAG**: Pure JavaScript TF-IDF implementation
- **PDF Processing**: Uses pdf-parse (pure JavaScript)
- **No Python**: Everything runs in Node.js
