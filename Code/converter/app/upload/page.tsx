'use client'
import { Suspense } from 'react';
import PDFViewer from './PDFViewer';

export default function UploadPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PDFViewer />
        </Suspense>
    );
}