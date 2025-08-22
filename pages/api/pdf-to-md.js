import formidable from 'formidable';
import fs from 'fs';
import pdfParse from 'pdf-parse';
import TurndownService from 'turndown';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({
      uploadDir: '/tmp',
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);
    const file = files.file[0];

    if (!file || !file.originalFilename.endsWith('.pdf')) {
      return res.status(400).json({ error: 'Please upload a valid .pdf file' });
    }

    // Read the PDF file
    const pdfBuffer = fs.readFileSync(file.filepath);
    
    // Extract text from PDF
    const pdfData = await pdfParse(pdfBuffer);
    let textContent = pdfData.text;

    // Basic text formatting to improve markdown conversion
    // Add line breaks for better paragraph separation
    textContent = textContent
      .replace(/\n\s*\n/g, '\n\n') // Normalize multiple line breaks
      .replace(/([.!?])\s*\n(?=[A-Z])/g, '$1\n\n') // Add paragraph breaks after sentences
      .trim();

    // Convert to markdown (basic conversion since PDF text doesn't have HTML structure)
    // We'll add some basic markdown formatting based on text patterns
    let markdownContent = textContent
      .replace(/^([A-Z][A-Z\s]+)$/gm, '# $1') // Convert all-caps lines to headers
      .replace(/^(\d+\.\s+.+)$/gm, '$1') // Keep numbered lists as is
      .replace(/^([-•]\s+.+)$/gm, '- $1') // Convert bullet points to markdown
      .replace(/^(\s*)([-•])\s+/gm, '$1- '); // Normalize bullet points

    // Clean up uploaded file
    fs.unlinkSync(file.filepath);

    // Set response headers for file download
    const filename = file.originalFilename.replace('.pdf', '.md');
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    return res.send(markdownContent);

  } catch (error) {
    console.error('Error converting PDF to MD:', error);
    return res.status(500).json({ error: 'Failed to convert file' });
  }
}

