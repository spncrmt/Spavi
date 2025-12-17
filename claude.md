# Project Context for Epic SmartSection Generator

## Project Overview
We're building an MVP web app that helps doctors convert raw clinical text (typed or OCR'd from faxes) into formatted Epic SmartSections. This is a real pain point - doctors waste 10-15 minutes per patient formatting notes for Epic EMR.

## Core Problem We're Solving
- Doctors scribble notes during visits → Need to format them for Epic
- Faxed documents arrive daily → Need manual transcription into Epic
- Epic requires specific section formats → Time-consuming to structure properly

## Technical Stack
- **Frontend**: Next.js + TailwindCSS
- **OCR**: Tesseract.js (browser-side for simplicity)
- **AI**: Claude or GPT API (via Vercel serverless functions)
- **Database**: None (stateless MVP)
- **Deployment**: Vercel free tier

## Current Implementation Status
- Project structure created with `.cursorrules` and `.claude/config.yaml`
- System prompts configured for medical documentation context
- Basic architecture planned, ready for implementation

## Key Features for MVP
1. **Text Input**: Paste clinical notes or upload faxed documents
2. **OCR Processing**: Extract text from uploaded images/PDFs
3. **Section Selection**: Choose which SmartSections to generate
4. **AI Processing**: Send to Claude/GPT to format into sections
5. **Copy Output**: One-click copy buttons for each section

## Working Principles

### MVP Philosophy
- Start with the simplest working solution
- Add complexity only when users need it
- Functional code that ships beats perfect code that doesn't

### Problem-Solving Approach
When implementing features:
1. **Understand first**: Read existing code and trace data flow
2. **Plan the approach**: Consider simple solutions before complex ones
3. **Implement incrementally**: Get basic functionality working, then enhance
4. **Validate functionality**: Ensure the core use case works smoothly

### File Structure
```
/pages
  index.tsx          # Main UI - text input, file upload, section display
  /api
    generate.ts      # Serverless function for AI calls
/components
  SectionCard.tsx    # Display and copy individual sections
  DocumentUploader.tsx # Handle file uploads and OCR
/lib
  prompt.ts          # Prompt templates for different document types
  ocr.ts            # OCR utilities and text cleaning
/public
  # Static assets if needed
```

## Implementation Guidelines

### When Adding Features
1. **Start with existing code** - Often we can extend what's there
2. **Inline initially** - Extract to functions/components when patterns emerge
3. **Iterate toward clarity** - Refactor once the shape becomes clear

### When Solving Issues
1. **Understand the context** - Read the module and its dependencies
2. **Identify root causes** - Trace where the issue originates
3. **Choose simple fixes** - Prefer straightforward solutions for MVP
4. **Test the solution** - Verify the main workflow still functions

### Code Style Examples
```typescript
// Good for MVP - Clear and functional
const handleGenerate = async () => {
  const response = await fetch('/api/generate', {
    method: 'POST',
    body: JSON.stringify({ text, sections })
  });
  const data = await response.json();
  setResults(data);
};

// Can wait for later - Abstraction without current benefit
interface IGenerator<T> {
  generate(input: T): Promise<GeneratedSection[]>;
  validate(sections: GeneratedSection[]): boolean;
}
```

## Common Medical Document Types

### What We're Processing
1. **Clinical Notes**: Quick visit notes that need structuring
2. **Consultation Letters**: From specialists, need to be incorporated
3. **Lab Results**: Need to be parsed and added to assessment
4. **Faxed Records**: Various documents that need OCR + formatting

### Epic SmartSection Types
- **Common**: HPI, Physical Exam, Assessment, Plan
- **Follow-up**: Interval History, Assessment, Plan
- **Procedure**: Indication, Procedure, Findings, Plan
- **Specialty**: Mental Status Exam (psych), MDM (emergency)

## API Integration Notes

### Claude/GPT Prompting
- Keep prompts focused and specific
- Include only the sections requested by user
- Return clean JSON for easy parsing
- Handle both structured and unstructured input text

### OCR Considerations
- Faxes often have quality issues - provide preview/edit capability
- Medical terminology may need correction - user review helps
- Client-side processing keeps things fast and simple

## Testing Approach for MVP

### Core Functionality Checklist
- [ ] Can paste text and generate sections
- [ ] Can upload image and see OCR'd text
- [ ] Can select/deselect sections
- [ ] Can copy each section individually
- [ ] API errors show helpful messages
- [ ] Works on mobile (responsive)

### Sample Test Scenarios
```javascript
// Scenario 1: Basic clinical note
input: "45yo male, 3 days cough and fever, lungs clear, likely viral URI"
expectedSections: ["HPI", "Physical Exam", "Assessment", "Plan"]

// Scenario 2: Faxed consultation
input: [uploaded fax image]
expectedFlow: OCR → Preview → Edit → Generate → Copy
```

## Common Patterns and Solutions

### OCR Text Quality
- **Situation**: Faxes may have scanning artifacts
- **Approach**: Show preview, allow user editing before processing

### API Rate Limits
- **Situation**: Multiple rapid requests to Claude/GPT
- **Approach**: Clear loading states, disable button during processing

### Large Documents
- **Situation**: Multi-page faxes
- **Approach**: Handle single page well first, then consider pagination

## Development Workflow

### Starting a Session
1. Review this context file
2. Check current implementation
3. Run locally to understand current state
4. Build incrementally toward goals

### Before Implementation
Consider:
- What's the current data flow?
- What's the simplest working solution?
- Can we build on existing code?
- What would make this useful for doctors today?

### Quality Checks
- [ ] Core functionality works smoothly
- [ ] Basic error cases handled
- [ ] Code is readable and maintainable
- [ ] Features work on common devices

## Success Metrics

### MVP Goals
1. Doctor can paste notes → get formatted sections in <10 seconds
2. Doctor can upload fax → review OCR → get sections in <30 seconds
3. Copy buttons work reliably
4. No login required (stateless)
5. Works on phone and desktop

### Future Considerations (Post-MVP)
- User accounts and preferences
- Batch processing capabilities
- Enhanced OCR accuracy
- Advanced medical logic
- HIPAA compliance features

## Communication Approach

When discussing implementation:
- Share reasoning and tradeoffs
- Explain design decisions clearly
- Suggest incremental improvements
- Focus on user value

Example:
"Looking at the current flow, the text goes from input → API → display. We can add the OCR step before the API call. Starting with Tesseract processing in index.tsx keeps things simple, and we can extract to a component as the logic grows."

## Project Mindset
We're building a tool that saves doctors significant time every day. The goal is to deliver working software that provides immediate value. We can always iterate and improve based on real usage and feedback. Getting a functional tool into doctors' hands quickly will teach us more than planning the perfect architecture.

## Key Reminders
- Simplicity enables shipping
- Working code provides value
- User feedback drives iteration
- Every feature should solve a real problem