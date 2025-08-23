import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import puppeteer from 'puppeteer';

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

    if (!file || !file.originalFilename.endsWith('.md')) {
      return res.status(400).json({ error: 'Please upload a valid .md file' });
    }

    // Read the markdown file
    const markdownContent = fs.readFileSync(file.filepath, 'utf8');
    
    // Convert markdown to HTML
    const htmlContent = marked(markdownContent);
    
    // Create full HTML document
    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              line-height: 1.6; 
              max-width: 800px; 
              margin: 0 auto; 
              padding: 20px; 
            }
            h1, h2, h3, h4, h5, h6 { color: #333; }
            code { 
              background-color: #f4f4f4; 
              padding: 2px 4px; 
              border-radius: 3px; 
            }
            pre { 
              background-color: #f4f4f4; 
              padding: 10px; 
              border-radius: 5px; 
              overflow-x: auto; 
            }
            blockquote { 
              border-left: 4px solid #ddd; 
              margin: 0; 
              padding-left: 20px; 
            }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `;

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({
      headless: "new", // Use "new" for new headless mode
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(fullHtml);
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });
    
    await browser.close();

    // Clean up uploaded file
    fs.unlinkSync(file.filepath);

    // Set response headers for file download
    const filename = file.originalFilename.replace('.md', '.pdf');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    return res.send(pdfBuffer);

  } catch (error) {
    console.error('Error converting MD to PDF:', error);
    return res.status(500).json({ error: 'Failed to convert file' });
  }
}

