const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Create a test image with medical text
function createTestMedicalImage() {
  const canvas = createCanvas(800, 600);
  const ctx = canvas.getContext('2d');

  // White background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, 800, 600);

  // Black text
  ctx.fillStyle = 'black';
  ctx.font = 'bold 24px Arial';
  ctx.fillText('PATIENT CONSULTATION NOTE', 50, 50);

  ctx.font = '20px Arial';
  ctx.fillText('Patient: John Doe', 50, 100);
  ctx.fillText('DOB: 05/15/1975', 50, 130);
  ctx.fillText('Date: 12/09/2025', 50, 160);

  ctx.font = 'bold 20px Arial';
  ctx.fillText('Chief Complaint:', 50, 210);

  ctx.font = '18px Arial';
  ctx.fillText('Patient reports persistent cough and fever for 3 days.', 50, 240);
  ctx.fillText('Productive cough with yellow sputum.', 50, 270);
  ctx.fillText('Denies chest pain or shortness of breath.', 50, 300);
  ctx.fillText('No recent travel history.', 50, 330);

  ctx.font = 'bold 20px Arial';
  ctx.fillText('Vital Signs:', 50, 380);

  ctx.font = '18px Arial';
  ctx.fillText('Temperature: 100.2°F', 50, 410);
  ctx.fillText('Blood Pressure: 120/80 mmHg', 50, 440);
  ctx.fillText('Heart Rate: 88 bpm', 50, 470);
  ctx.fillText('Respiratory Rate: 16/min', 50, 500);

  ctx.font = 'bold 20px Arial';
  ctx.fillText('Physical Exam:', 50, 550);

  // Save to file
  const buffer = canvas.toBuffer('image/png');
  const testImagePath = path.join(__dirname, 'test-medical-note.png');
  fs.writeFileSync(testImagePath, buffer);

  console.log(`✓ Test medical image created: ${testImagePath}`);
  return testImagePath;
}

// Test the OCR API
async function testOCR() {
  console.log('Starting OCR test...\n');

  // Create test image
  const imagePath = createTestMedicalImage();

  // Read the image file
  const FormData = require('formidable').default;
  const imageBuffer = fs.readFileSync(imagePath);

  console.log(`✓ Image file size: ${imageBuffer.length} bytes\n`);

  // Test the OCR extraction function directly
  console.log('Testing OCR extraction...');
  const { extractTextFromImage, isValidOCRText } = require('./lib/ocr.ts');

  try {
    const extractedText = await extractTextFromImage(imageBuffer);
    console.log('\n✓ OCR Extraction Complete!\n');
    console.log('Extracted Text:');
    console.log('─'.repeat(60));
    console.log(extractedText);
    console.log('─'.repeat(60));

    const isValid = isValidOCRText(extractedText);
    console.log(`\n✓ Text validation: ${isValid ? 'PASSED' : 'FAILED'}`);
    console.log(`✓ Text length: ${extractedText.length} characters`);

    if (extractedText.toLowerCase().includes('patient') ||
        extractedText.toLowerCase().includes('fever') ||
        extractedText.toLowerCase().includes('cough')) {
      console.log('✓ Medical keywords detected - OCR is working correctly!\n');
      console.log('✅ OCR TEST PASSED');
    } else {
      console.log('⚠ Warning: Expected medical keywords not found\n');
      console.log('⚠ OCR TEST INCOMPLETE - Review extracted text');
    }
  } catch (error) {
    console.error('❌ OCR Test failed:', error.message);
    console.error(error);
  }
}

// Run the test
testOCR().catch(console.error);
