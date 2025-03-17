'use client';

import { useState, useRef, Dispatch, SetStateAction } from 'react';

export default function FileUpload({ setAccessLogs }: { setAccessLogs: Dispatch<SetStateAction<string[]>>}) {
	const [file, setFile] = useState<File | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
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

		const files = e.dataTransfer?.files;
		if (files && files.length > 0) {
			handleFile(files[0]);
		}
	};

	const handleFileInputChange = (e: any) => {
		if (e.target.files && e.target.files.length > 0) {
			handleFile(e.target.files[0]);
		}
	};

	const handleFile = (file: File) => {
		setFile(file);
	};

	const handleUpload = async () => {
		if (!file) {
			return;
		}

		try {
			const logs = await file.text()
			setAccessLogs(logs.split('\n'))
		} catch (error) {
			console.error('Upload failed:', error);
		}
	};

	const triggerFileInput = () => {
		if (fileInputRef.current) {
			fileInputRef.current.click();
		}
	};

	return (
		<div className="flex items-center justify-center p-4 pb-[10vh]">
			<div className="w-md bg-opacity-80 backdrop-blur-sm border border-[var(--border-color)] rounded shadow-lg overflow-hidden">
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
              ${file ? 'bg-green-50 dark:bg-green-900/20 border-green-500' : ''}
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
							accept=".log,text/plain"
							onChange={handleFileInputChange}
						/>

						<div className="mb-4">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								className={`mx-auto h-12 w-12 ${file ? 'text-[var(--highlight)]' : 'text-gray-400'}`}
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={1.5}
									d={file ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" : "M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"}
								/>
							</svg>
						</div>

						{file ? (
							<div>
								<p className="text-sm font-medium text-[var(--highlight)]">
									{file.name} ({(file.size / 1024).toFixed(2)} KB)
								</p>
								<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
									Click to change file
								</p>
							</div>
						) : (
							<div>
								<p className="text-sm font-medium text-gray-700 dark:text-gray-300">
									Drop your log file here or click to browse
								</p>
							</div>
						)}
					</div>

					{file && !isUploading && (
						<button
							onClick={handleUpload}
							className="w-full cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
						>
							Analyze Log File
						</button>
					)}

					{isUploading && (
						<div className="w-full">
							<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-4">
								<div
									className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
									style={{ width: `${uploadProgress}%` }}
								></div>
							</div>
							<p className="text-xs text-center text-gray-500 dark:text-gray-400">
								Uploading... {uploadProgress}%
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}