import { useState } from 'react';
import Head from 'next/head';

export default function Home() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [conversionType, setConversionType] = useState('md-to-pdf');
  const [isLoading, setIsLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [downloadFilename, setDownloadFilename] = useState('');
  const [error, setError] = useState('');

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
    setDownloadUrl(null);
    setError('');
  };

  const handleConvert = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    // Validate file type
    const fileExtension = selectedFile.name.split('.').pop().toLowerCase();
    if (conversionType === 'md-to-pdf' && fileExtension !== 'md') {
      setError('Please select a .md file for MD to PDF conversion');
      return;
    }
    if (conversionType === 'pdf-to-md' && fileExtension !== 'pdf') {
      setError('Please select a .pdf file for PDF to MD conversion');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`/api/${conversionType}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Conversion failed');
      }

      // Create download URL
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);

      // Set filename for download
      const originalName = selectedFile.name.split('.')[0];
      const newExtension = conversionType === 'md-to-pdf' ? 'pdf' : 'md';
      setDownloadFilename(`${originalName}.${newExtension}`);

    } catch (error) {
      setError('Failed to convert file. Please try again.');
      console.error('Conversion error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (downloadUrl) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = downloadFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setDownloadUrl(null);
    setError('');
    document.getElementById('file-input').value = '';
  };

  return (
    <>
      <Head>
        <title>File Converter - MD ↔ PDF</title>
        <meta name="description" content="Convert between Markdown and PDF files easily" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="container">
        <header>
          <h1>File Converter</h1>
          <p>Convert between Markdown (.md) and PDF files</p>
        </header>

        <main>
          <div className="converter-card">
            {/* Conversion Type Selection */}
            <div className="conversion-type">
              <label>
                <input
                  type="radio"
                  name="conversion"
                  value="md-to-pdf"
                  checked={conversionType === 'md-to-pdf'}
                  onChange={(e) => setConversionType(e.target.value)}
                />
                MD → PDF
              </label>
              <label>
                <input
                  type="radio"
                  name="conversion"
                  value="pdf-to-md"
                  checked={conversionType === 'pdf-to-md'}
                  onChange={(e) => setConversionType(e.target.value)}
                />
                PDF → MD
              </label>
            </div>

            {/* File Upload */}
            <div className="file-upload">
              <input
                id="file-input"
                type="file"
                accept={conversionType === 'md-to-pdf' ? '.md' : '.pdf'}
                onChange={handleFileSelect}
                disabled={isLoading}
              />
              <label htmlFor="file-input" className="file-label">
                {selectedFile ? selectedFile.name : 'Choose file...'}
              </label>
            </div>

            {/* Error Message */}
            {error && <div className="error">{error}</div>}

            {/* Convert Button */}
            {!isLoading && !downloadUrl && (
              <button 
                className="convert-btn" 
                onClick={handleConvert}
                disabled={!selectedFile}
              >
                Convert File
              </button>
            )}

            {/* Loading Screen */}
            {isLoading && (
              <div className="loading">
                <div className="spinner"></div>
                <p>Converting your file...</p>
              </div>
            )}

            {/* Download Button */}
            {downloadUrl && (
              <div className="download-section">
                <p className="success">✓ Conversion completed!</p>
                <button className="download-btn" onClick={handleDownload}>
                  Download {downloadFilename}
                </button>
                <button className="reset-btn" onClick={resetForm}>
                  Convert Another File
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

