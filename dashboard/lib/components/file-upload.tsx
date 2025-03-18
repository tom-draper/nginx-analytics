'use client';

import { useState, useRef, Dispatch, SetStateAction } from 'react';
import * as pako from 'pako';

export default function FileUpload({ setAccessLogs, setErrorLogs }: { setAccessLogs: Dispatch<SetStateAction<string[]>>, setErrorLogs: Dispatch<SetStateAction<string[]>> }) {
	const [files, setFiles] = useState<File[]>([]);
	const [isDragging, setIsDragging] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [currentFileIndex, setCurrentFileIndex] = useState(0);
	const [processedContent, setProcessedContent] = useState<string[]>([]);
	const [isProcessed, setIsProcessed] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(true);
	};

	const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
	};

	const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		if (!isDragging) {
			setIsDragging(true);
		}
	};

	const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);

		const droppedFiles = e.dataTransfer?.files;
		if (droppedFiles && droppedFiles.length > 0) {
			const filesArray = Array.from(droppedFiles);
			setFiles(filesArray);
			setIsProcessed(false);
			setProcessedContent([]);
		}
	};

	const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files.length > 0) {
			const filesArray = Array.from(e.target.files);
			setFiles(filesArray);
			setIsProcessed(false);
			setProcessedContent([]);
		}
	};

	const removeFile = (index: number) => {
		setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
	};

	const processFile = async (file: File): Promise<string[]> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();

			reader.onload = async (event) => {
				try {
					let logContent = '';

					// Check if the file is a gzip file
					if (file.name.endsWith('.gz')) {
						// Get the binary data from the file
						const content = event.target?.result;
						if (!content) throw new Error('Failed to read file');

						// Convert to Uint8Array for pako
						let compressedData: Uint8Array;
						if (content instanceof ArrayBuffer) {
							compressedData = new Uint8Array(content);
						} else {
							throw new Error('Expected ArrayBuffer');
						}

						// Decompress the content
						const decompressedData = pako.inflate(compressedData);

						// Convert Uint8Array to string
						logContent = new TextDecoder().decode(decompressedData);
					} else {
						// For plain text files, just get the content as text
						logContent = event.target?.result as string || '';
					}

					// Parse the logs
					const logs = logContent.split('\n').filter(line => line.trim().length > 0);
					resolve(logs);
				} catch (error) {
					reject(error);
				}
			};

			reader.onerror = () => {
				reject(new Error('File reading failed'));
			};

			// Read the file as ArrayBuffer for gzip files, or as text for log files
			if (file.name.endsWith('.gz')) {
				reader.readAsArrayBuffer(file);
			} else {
				reader.readAsText(file);
			}
		});
	};

	const handleUpload = async () => {
		if (files.length === 0) {
			return;
		}

		setIsUploading(true);
		setUploadProgress(0);
		setIsProcessed(false);
		setCurrentFileIndex(0);
		setProcessedContent([]);

		try {
			let accessLogs: string[] = [];
			let errorLogs: string[] = [];

			// Process each file sequentially
			for (let i = 0; i < files.length; i++) {
				setCurrentFileIndex(i);
				const fileProgress = (i / files.length) * 100;
				setUploadProgress(fileProgress);

				// Process the current file
				const logs = await processFile(files[i]);
				if (files[i].name.includes('error')) {
					errorLogs = [...errorLogs, ...logs];
				} else {
					accessLogs = [...accessLogs, ...logs];
				}

				// Update progress
				setUploadProgress(((i + 1) / files.length) * 100);
			}

			// Update the state with all processed content
			setProcessedContent(accessLogs);

			// Also update the parent component
			setAccessLogs(accessLogs);
			setErrorLogs(errorLogs);

			setTimeout(() => {
				setIsUploading(false);
				setUploadProgress(0);
				setIsProcessed(true);
			}, 500);
		} catch (error) {
			console.error('Processing failed:', error);
			setIsUploading(false);
			setUploadProgress(0);
		}
	};

	const triggerFileInput = () => {
		if (fileInputRef.current) {
			fileInputRef.current.click();
		}
	};

	const totalSize = files.reduce((total, file) => total + file.size, 0);
	const formattedTotalSize = (totalSize / 1024).toFixed(2);

	return (
		<div className="flex flex-col items-center justify-center p-4 pb-[10vh] w-full">
			<div className="w-full max-w-md bg-opacity-80 backdrop-blur-sm border border-[var(--border-color)] rounded shadow-lg overflow-hidden">
				<div className="p-8 pointer-events-auto">
					<div className="flex flex-col items-center mb-8">
						<div className="p-3 mb-4">
							<img src="logo.svg" alt="Nginx Analytics Logo" className="h-14" />
						</div>
						<h1 className="text-xl font-bold text-gray-800 dark:text-white">Nginx Analytics</h1>
						<p className="mt-2 text-gray-500 dark:text-gray-400 text-center">
							Upload your Nginx log files
						</p>
					</div>

					<div
						className={`border-2 border-dashed rounded p-8 text-center mb-6 transition-colors
              ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-700'}
              ${files.length > 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-500' : ''}
              hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer`}
						onDragEnter={handleDragEnter}
						onDragOver={handleDragOver}
						onDragLeave={handleDragLeave}
						onDrop={handleDrop}
						onClick={triggerFileInput}
					>
						<input
							type="file"
							ref={fileInputRef}
							className="hidden"
							accept=".log,.gz,text/plain,application/gzip"
							onChange={handleFileInputChange}
							multiple
						/>

						<div className="mb-4">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								className={`mx-auto h-12 w-12 ${files.length > 0 ? 'text-[var(--highlight)]' : 'text-gray-400'}`}
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={1.5}
									d={files.length > 0 ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" : "M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"}
								/>
							</svg>
						</div>

						{files.length > 0 ? (
							<div>
								<p className="text-sm font-medium text-[var(--highlight)]">
									{files.length} file{files.length > 1 ? 's' : ''} selected ({formattedTotalSize} KB)
								</p>
								<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
									Click to add or change files
								</p>
							</div>
						) : (
							<div>
								<p className="text-sm font-medium text-gray-700 dark:text-gray-300">
									Drop your .log or .gz files here or click to browse
								</p>
								<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
									Contents are private and never leave your device
								</p>
							</div>
						)}
					</div>

					{/* File List */}
					{files.length > 0 && !isProcessed && !isUploading && (
						<div className="mb-6 max-h-48 overflow-y-auto">
							<h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Selected Files:</h3>
							<ul className="space-y-2">
								{files.map((file, index) => (
									<li key={index} className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-2 rounded">
										<div className="flex items-center space-x-2 truncate max-w-[80%]">
											<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
											</svg>
											<span className="text-xs truncate text-gray-700 dark:text-gray-300">{file.name}</span>
										</div>
										<button
											onClick={(e) => {
												e.stopPropagation();
												removeFile(index);
											}}
											className="text-[var(--error)] opacity-60 hover:text-red-600 text-xs cursor-pointer"
										>
											<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4">
												<path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
											</svg>
										</button>
									</li>
								))}
							</ul>
						</div>
					)}

					{files.length > 0 && !isUploading && !isProcessed && (
						<button
							onClick={handleUpload}
							className="w-full cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
						>
							Analyze Log Files
						</button>
					)}

					{isUploading && (
						<div className="w-full">
							<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-2">
								<div
									className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
									style={{ width: `${uploadProgress}%` }}
								></div>
							</div>
							<p className="text-xs text-center text-gray-500 dark:text-gray-400 mb-1">
								{uploadProgress < 100 ? (
									<>Processing files: {currentFileIndex + 1} of {files.length} ({Math.round(uploadProgress)}%)</>
								) : (
									'Processing complete!'
								)}
							</p>
							{files.length > 0 && currentFileIndex < files.length && (
								<p className="text-xs text-center text-gray-500 dark:text-gray-400">
									Current file: {files[currentFileIndex].name}
								</p>
							)}
						</div>
					)}

					{isProcessed && processedContent.length > 0 && (
						<div className="mt-6">
							<h2 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
								Log Preview ({processedContent.length} lines from {files.length} files)
							</h2>
							<div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-3 overflow-auto max-h-48">
								<pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
									{processedContent.slice(0, 5).map((line, index) => (
										<div key={index} className="mb-1">{line}</div>
									))}
									{processedContent.length > 5 && (
										<div className="text-gray-500 italic">... {processedContent.length - 5} more lines</div>
									)}
								</pre>
							</div>

							<div className="mt-4">
								<button
									onClick={() => {
										// Reset to allow for another set of files
										setFiles([]);
										setProcessedContent([]);
										setIsProcessed(false);
									}}
									className="w-full cursor-pointer bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition-colors"
								>
									Process More Files
								</button>
							</div>
						</div>
					)}

					{isProcessed && processedContent.length === 0 && (
						<div className="mt-6 text-center">
							<p className="text-red-500">No content found in the files. Please try other files.</p>
							<button
								onClick={() => {
									setFiles([]);
									setIsProcessed(false);
								}}
								className="mt-4 w-full cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
							>
								Try Again
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}