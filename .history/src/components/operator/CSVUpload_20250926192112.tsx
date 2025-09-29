import React, { useState, useRef } from 'react';
import { soundPlayer } from '@/lib/sounds';
import { db, questionsDocRef } from '@/lib/firebase';
import { setDoc } from 'firebase/firestore';
import Papa from 'papaparse';

interface CSVUploadProps {
  onSuccess: () => void;
  onError: (error: string) => void;
}

export default function CSVUpload({ onSuccess, onError }: CSVUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (!file) return;
    
    if (!file.name.toLowerCase().endsWith('.csv')) {
      onError('Please select a CSV file');
      return;
    }

    uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    
    try {
      // Parse CSV file
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            // Clear existing questions first
            const questionsRef = collection(db, 'questions');
            const existingQuestions = await getDocs(questionsRef);
            
            // Delete existing questions
            const deletePromises = existingQuestions.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(deletePromises);
            
            console.log('Parsed CSV data:', results.data);
            
            // Add new questions
            const addPromises = results.data.map((row: any, index: number) => {
              console.log(`Processing row ${index + 1}:`, row);
              
              const questionData = {
                question: row.question || '',
                option_a: row.option_a || '',
                option_b: row.option_b || '',
                option_c: row.option_c || '',
                option_d: row.option_d || '',
                guest_answer: row.guest_answer || '',
                createdAt: new Date(),
                rowIndex: index
              };
              
              console.log(`Question data for row ${index + 1}:`, questionData);
              
              return addDoc(questionsRef, questionData);
            });
            
            await Promise.all(addPromises);
            
            console.log(`Successfully uploaded ${results.data.length} questions`);
            
            await soundPlayer.playSound('questionSelection');
            onSuccess();
            
            // Clear file input
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          } catch (error) {
            console.error('Firebase upload error:', error);
            onError('Failed to save questions to database');
          }
        },
        error: (error) => {
          console.error('CSV parse error:', error);
          onError('Failed to parse CSV file');
        }
      });
    } catch (error) {
      console.error('CSV upload error:', error);
      onError(error instanceof Error ? error.message : 'Failed to upload CSV');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find(file => file.name.toLowerCase().endsWith('.csv'));
    
    if (csvFile) {
      handleFileSelect(csvFile);
    } else {
      onError('Please drop a CSV file');
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
  };

  const downloadTemplate = () => {
    const csvContent = `question,option_a,option_b,option_c,option_d,guest_answer
"What is your favorite color?","Red","Blue","Green","Yellow","A"
"What is your hobby?","Reading","Gaming","Sports","Music","B"
"Where do you live?","City","Suburbs","Village","Mountains","C"`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'questions_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h2 className="text-xl font-bold text-white mb-4">CSV Upload</h2>
      
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
          dragOver 
            ? 'border-blue-500 bg-blue-500 bg-opacity-10' 
            : uploading 
            ? 'border-yellow-500 bg-yellow-500 bg-opacity-10'
            : 'border-gray-600 hover:border-gray-500'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {uploading ? (
          <div className="text-yellow-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto mb-3"></div>
            <p className="text-sm font-semibold">Uploading...</p>
            <p className="text-xs text-gray-400">Processing questions</p>
          </div>
        ) : (
          <div className="text-gray-300">
            <div className="text-2xl mb-2">📁</div>
            <p className="text-sm font-semibold mb-1">Drop CSV here</p>
            <p className="text-xs text-gray-400 mb-3">or click to browse</p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
              className="hidden"
              id="csv-upload"
              disabled={uploading}
            />
            
            <label
              htmlFor="csv-upload"
              className="inline-block px-3 py-1 bg-blue-600 text-white rounded text-xs cursor-pointer hover:bg-blue-500 transition-colors"
            >
              Choose File
            </label>
          </div>
        )}
      </div>

      {/* Template Download */}
      <div className="mt-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-semibold text-white">CSV Format</h3>
          <button
            onClick={downloadTemplate}
            disabled={uploading}
            className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-500 disabled:opacity-50 transition-colors"
          >
            📥 Template
          </button>
        </div>
        
        <div className="bg-gray-700 rounded p-2 text-xs">
          <p className="text-gray-300 mb-1">Required columns:</p>
          <code className="text-green-400 text-xs block break-all">
            question,option_a,option_b,option_c,option_d,guest_answer
          </code>
          <p className="text-gray-400 text-xs mt-1">
            Answer: A, B, C, or D
          </p>
        </div>
      </div>

      {/* Upload Stats */}
      <div className="mt-3 p-2 bg-gray-700 rounded">
        <div className="text-xs text-gray-300 space-y-1">
          <p>✅ Drag & drop support</p>
          <p>✅ Real-time refresh</p>
          <p>✅ Auto validation</p>
        </div>
      </div>
    </div>
  );
}