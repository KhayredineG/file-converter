import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import wkhtmltopdf from 'wkhtmltopdf';
import { Readable } from 'stream';

// Set the path to the wkhtmltopdf executable
wkhtmltopdf.command = 'C:\\Program Files\\wkhtmltopdf\\bin\\wkhtmltopdf.exe';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = formidable({
    uploadDir: path.join(process.cwd(), 'tmp'),
    keepExtensions: true,
  });

  // Ensure upload directory exists
  if (!fs.existsSync(form.options.uploadDir)) {
    fs.mkdirSync(form.options.uploadDir, { recursive: true });
  }

  try {
    const [fields, files] = await form.parse(req);

    if (!files.file || !Array.isArray(files.file) || files.file.length === 0) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = files.file[0];

    if (!file || !file.originalFilename.endsWith('.md')) {
      return res.status(400).json({ error: 'Please upload a valid .md file' });
    }

    const markdownContent = fs.readFileSync(file.filepath, 'utf8');
    const htmlContent = marked(markdownContent);

    const pdfBuffer = await new Promise((resolve, reject) => {
      const stream = wkhtmltopdf(htmlContent, { pageSize: 'A4' });
      const chunks = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('error', (err) => reject(err));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });


    // Clean up temporary files
    try {
      if (fs.existsSync(file.filepath)) {
        fs.unlinkSync(file.filepath);
      }
    } catch (cleanupError) {
      console.error('Error cleaning up file:', cleanupError);
    }

    const filename = file.originalFilename.replace('.md', '.pdf');
    // Set response headers for file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    return res.send(pdfBuffer);

  } catch (error) {
    console.error('Error converting MD to PDF:', error);
    return res.status(500).json({ error: 'Failed to convert file' });
  }
}

