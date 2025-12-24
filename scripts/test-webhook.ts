/**
 * Test script for the fax webhook endpoint
 *
 * Usage: npx ts-node scripts/test-webhook.ts
 *
 * This script sends a POST request to the local webhook endpoint
 * simulating an incoming fax with a test PDF.
 */

async function testWebhook() {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const webhookUrl = `${baseUrl}/api/webhook/fax-received`;

  // Use a test PDF from the project (or provide a path)
  const testPdfPath = process.argv[2] || 'test3.pdf';

  console.log('Testing fax webhook...');
  console.log(`URL: ${webhookUrl}`);
  console.log(`PDF Path: ${testPdfPath}`);
  console.log('');

  const payload = {
    from: '+1555' + Math.floor(Math.random() * 9000000 + 1000000),
    timestamp: new Date().toISOString(),
    pdfUrl: testPdfPath,
    externalId: 'test-' + Date.now(),
  };

  console.log('Sending payload:', JSON.stringify(payload, null, 2));
  console.log('');

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok) {
      console.log('Success! Fax created with ID:', data.faxId);
      console.log('');
      console.log('You can view the fax at:');
      console.log(`  ${baseUrl}/dashboard/${data.faxId}`);
      console.log('');
      console.log('Or view all faxes at:');
      console.log(`  ${baseUrl}/dashboard`);
    } else {
      console.error('Error:', data.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('Failed to send webhook request:', error);
    process.exit(1);
  }
}

testWebhook();
