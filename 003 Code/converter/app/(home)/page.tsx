import React, { Suspense } from "react";
import FileUploaderDrag from "../../components/FileUpload_drop";
import styles from "../../styles/component.module.css";

export const metadata = {
    title: "Home",
};

export default function HomePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <div className={styles.container}> 
                <FileUploaderDrag />
            </div>
        </Suspense>
    );
}