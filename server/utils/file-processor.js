import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Process uploaded files and extract content for AI analysis
 * @param {Array} uploadedFiles - Array of uploaded file objects
 * @returns {Promise<Object>} - Processed file information
 */
export const processUploadedFiles = async (uploadedFiles) => {
  if (!uploadedFiles || uploadedFiles.length === 0) {
    return { success: true, fileContent: '', fileSummary: '' };
  }

  const processedFiles = [];
  let totalFileContent = '';
  let fileSummary = '';

  for (const file of uploadedFiles) {
    try {
      const fileInfo = {
        name: file.originalname,
        size: file.size,
        type: file.mimetype,
        path: file.path
      };

      let content = '';
      let description = '';

      // Process different file types
      if (file.mimetype.startsWith('image/')) {
        // For images, we'll describe the file and provide metadata
        description = `[Image: ${file.originalname}] - Size: ${Math.round(file.size / 1024)}KB, Type: ${file.mimetype}`;
        content = `User has uploaded an image file: ${file.originalname}. The image is ${Math.round(file.size / 1024)}KB in size and has MIME type ${file.mimetype}. Please analyze this image if possible or ask the user to describe what they want to know about it.`;
      } else if (file.mimetype.startsWith('text/')) {
        // For text files, read the content
        try {
          const textContent = fs.readFileSync(file.path, 'utf8');
          content = `[Text File: ${file.originalname}]\nContent:\n${textContent}`;
          description = `[Text File: ${file.originalname}] - ${textContent.length} characters`;
        } catch (readError) {
          content = `[Text File: ${file.originalname}] - Could not read file content`;
          description = `[Text File: ${file.originalname}] - Read error`;
        }
      } else if (file.mimetype === 'application/pdf') {
        // For PDFs, we'll note that it's a PDF and suggest OCR or description
        content = `[PDF Document: ${file.originalname}] - This is a PDF document. Please ask the user to describe the content or provide a summary of what they want to know about this document.`;
        description = `[PDF: ${file.originalname}] - ${Math.round(file.size / 1024)}KB`;
      } else if (file.mimetype.includes('json')) {
        // For JSON files, try to read and format
        try {
          const jsonContent = fs.readFileSync(file.path, 'utf8');
          const parsedJson = JSON.parse(jsonContent);
          content = `[JSON File: ${file.originalname}]\nContent:\n${JSON.stringify(parsedJson, null, 2)}`;
          description = `[JSON: ${file.originalname}] - ${Object.keys(parsedJson).length} properties`;
        } catch (jsonError) {
          content = `[JSON File: ${file.originalname}] - Invalid JSON format`;
          description = `[JSON: ${file.originalname}] - Parse error`;
        }
      } else if (file.mimetype.includes('csv') || file.originalname.endsWith('.csv')) {
        // For CSV files, read the content
        try {
          const csvContent = fs.readFileSync(file.path, 'utf8');
          const lines = csvContent.split('\n');
          content = `[CSV File: ${file.originalname}]\nContent (first 10 lines):\n${lines.slice(0, 10).join('\n')}${lines.length > 10 ? '\n... (truncated)' : ''}`;
          description = `[CSV: ${file.originalname}] - ${lines.length} rows`;
        } catch (csvError) {
          content = `[CSV File: ${file.originalname}] - Could not read CSV content`;
          description = `[CSV: ${file.originalname}] - Read error`;
        }
      } else {
        // For other file types, provide basic information
        content = `[File: ${file.originalname}] - Type: ${file.mimetype}, Size: ${Math.round(file.size / 1024)}KB. Please ask the user what they want to know about this file.`;
        description = `[File: ${file.originalname}] - ${file.mimetype}, ${Math.round(file.size / 1024)}KB`;
      }

      processedFiles.push({
        ...fileInfo,
        content,
        description
      });

      totalFileContent += content + '\n\n';
      fileSummary += description + '\n';

    } catch (error) {
      console.error(`❌ Error processing file ${file.originalname}:`, error);
      processedFiles.push({
        name: file.originalname,
        size: file.size,
        type: file.mimetype,
        content: `[File: ${file.originalname}] - Error processing file`,
        description: `[File: ${file.originalname}] - Processing error`
      });
    }
  }

  return {
    success: true,
    fileContent: totalFileContent.trim(),
    fileSummary: fileSummary.trim(),
    processedFiles
  };
};

/**
 * Get file type description
 * @param {string} mimetype - MIME type of the file
 * @returns {string} - Human readable file type
 */
export const getFileTypeDescription = (mimetype) => {
  const typeMap = {
    'image/jpeg': 'JPEG Image',
    'image/png': 'PNG Image',
    'image/gif': 'GIF Image',
    'image/webp': 'WebP Image',
    'image/svg+xml': 'SVG Image',
    'text/plain': 'Text File',
    'text/csv': 'CSV File',
    'application/json': 'JSON File',
    'application/pdf': 'PDF Document',
    'application/msword': 'Word Document',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
    'application/vnd.ms-excel': 'Excel Spreadsheet',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel Spreadsheet'
  };

  return typeMap[mimetype] || 'Unknown File Type';
};

/**
 * Check if file type is supported for content extraction
 * @param {string} mimetype - MIME type of the file
 * @returns {boolean} - Whether file content can be extracted
 */
export const isFileTypeSupported = (mimetype) => {
  const supportedTypes = [
    'text/plain',
    'text/csv',
    'application/json',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf'
  ];

  return supportedTypes.includes(mimetype);
};
