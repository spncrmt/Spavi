# Spavi - Medical Documentation Automation

Convert clinical notes into Epic SmartSection format using AI. This MVP turns raw clinical text into structured HPI, Physical Exam, Assessment, and Plan sections.

## Features

- 📝 Paste clinical text or upload PDF (OCR support with tesseract.js)
- 🤖 AI-powered formatting using Claude or GPT
- 📋 One-click copy to clipboard for each section
- ⚡ Fast, client-side processing with serverless API
- 🎨 Clean UI built with Next.js and Tailwind CSS
- 🚀 Deploy to Vercel in minutes

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **AI APIs**: Anthropic Claude or OpenAI GPT
- **Deployment**: Vercel (free tier)
- **OCR** (optional): tesseract.js

## Getting Started

### Prerequisites

- Node.js 18+ installed
- An API key from either:
  - [Anthropic Claude](https://console.anthropic.com/) (recommended)
  - [OpenAI](https://platform.openai.com/api-keys)

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   ```

3. **Add your API key** to `.env.local`:
   ```bash
   # For Claude (recommended)
   ANTHROPIC_API_KEY=sk-ant-your-api-key-here

   # OR for OpenAI
   OPENAI_API_KEY=sk-your-openai-key-here

   # For local AI with Ollama (optional)
   AI_PROVIDER=ollama          # Options: "claude", "openai", "ollama"
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=llama3.1
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Open [http://localhost:3000](http://localhost:3000)** in your browser

## Usage

1. Paste clinical text into the input area (or click "Load Example")
2. Click "Generate SmartSections"
3. View formatted HPI, Physical Exam, Assessment, and Plan
4. Click the copy button on any section to copy to clipboard

### Example Input

```
Patient presents with cough and fever for 3 days. Reports productive cough
with yellow sputum. Denies chest pain or shortness of breath. No recent travel.
Temp 100.2°F, BP 120/80, HR 88, RR 16. Lungs: mild crackles right lower lobe.
Heart: regular rate and rhythm. Otherwise unremarkable exam.
```

### Example Output

- **HPI**: Patient reports 3 days of cough and fever with productive yellow sputum...
- **Physical Exam**: Temp 100.2°F, BP 120/80, HR 88, RR 16. Mild crackles RLL...
- **Assessment**: Acute bronchitis, likely bacterial
- **Plan**: Prescribe azithromycin, increase fluids, rest, follow-up in 5 days

## Project Structure

```
spavi/
├── components/
│   └── SectionCard.tsx       # Renders SmartSection with copy button
├── lib/
│   └── prompt.ts             # AI prompt templates
├── pages/
│   ├── api/
│   │   └── generate.ts       # Serverless API endpoint
│   ├── _app.tsx              # Next.js app wrapper
│   └── index.tsx             # Main UI page
├── styles/
│   └── globals.css           # Global styles + Tailwind
├── .env.example              # Environment variable template
├── .gitignore
├── next.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── tsconfig.json
```

## Deployment to Vercel

1. **Install Vercel CLI** (optional):
   ```bash
   npm install -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel
   ```
   Or simply push to GitHub and import in [Vercel Dashboard](https://vercel.com/new)

3. **Add environment variables** in Vercel:
   - Go to Project Settings → Environment Variables
   - Add `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`
   - Redeploy

## API Configuration

The app supports multiple AI providers:

- **Claude (recommended)**: Uses `claude-3-5-sonnet-20241022` model - fastest, best quality
- **OpenAI**: Uses `gpt-4o-mini` model - fast, reliable
- **Ollama (local)**: Uses local LLMs (default: `llama3.1`) - private, on-device

The API endpoint (`/api/generate`) will prefer Claude if both keys are present, unless overridden.

### Local AI with Ollama

For complete privacy, you can run AI processing entirely on your device using Ollama:

#### Installation

```bash
# Install Ollama (macOS)
brew install ollama

# Or download from https://ollama.ai

# Pull the recommended model
ollama pull llama3.1

# Start Ollama server (run in background)
ollama serve
```

#### Configuration

Add to your `.env.local`:

```bash
# Set Ollama as default provider (optional)
AI_PROVIDER=ollama

# Ollama settings (optional, these are defaults)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1
```

#### Using the UI Toggle

You can also switch between providers using the toggle in the dashboard header:
- Select "Ollama (Local)" to process documents entirely on-device
- The app will show "🔒 Local Mode" when Ollama is active
- Documents processed locally are NOT de-identified (no PHI leaves your machine)

#### Performance Notes

- **Cloud APIs (Claude/OpenAI)**: ~10 seconds per fax
- **Ollama on M1/M2/M3/M4 Mac**: ~15-25 seconds per fax
- Llama 3.1 8B produces good results, slightly less polished than Claude
- For best local results, consider `llama3.1:70b` if you have sufficient RAM

## Security & Privacy

⚠️ **IMPORTANT**: This is a demo application only.

- **DO NOT** upload real patient data (PHI/PII)
- **DO NOT** use in production medical settings
- All processing happens via API calls to Claude/OpenAI
- No data is stored in databases
- No backend persistence

## Customization

### Change AI Model

Edit `pages/api/generate.ts`:

```typescript
// For Claude
model: 'claude-3-5-sonnet-20241022'

// For OpenAI
model: 'gpt-4o-mini'
```

### Modify Prompt Template

Edit `lib/prompt.ts` to customize how SmartSections are generated.

### Add More Sections

1. Update `SmartSections` interface in `lib/prompt.ts`
2. Add new section cards in `pages/index.tsx`

## Troubleshooting

### "No API key configured" error
- Verify `.env.local` exists and contains valid API key
- Restart the dev server after adding environment variables

### API errors
- Check API key is valid and has credits
- Verify API endpoint is accessible
- Check browser console for detailed error messages

### Build errors
- Run `npm install` to ensure all dependencies are installed
- Delete `.next` folder and rebuild: `rm -rf .next && npm run build`

## License

MIT

## Acknowledgments

Built with Next.js, Tailwind CSS, and AI models from Anthropic and OpenAI.
