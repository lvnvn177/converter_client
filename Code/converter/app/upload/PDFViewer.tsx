'use client'
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from "next/navigation";
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { Send, ZoomIn, ZoomOut, ChevronUp, ChevronDown } from "lucide-react";
import {useTypewriter, Cursor} from "react-simple-typewriter";
import { IconDots } from "@tabler/icons-react";
import { Bot, User } from 'lucide-react';

import Modal from '../../components/Modal';
import ChatLoader from '../../components/ChatLoader';
import styles from '../../styles/uploadPage.module.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

export default function PDFViewer() {
    const [totalPages, setTotalPages] = useState(0)
    const [pageNumber, setPageNumber] = useState(1);
    const [pageScale, setPageScale] = useState(1.0);
    const [selectedText, setSelectedText] = useState('');
    const [translatedText, setTranslatedText] = useState('');
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [loading, setLoading] = useState(false);
    const [qaHistory, setQaHistory] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const scroll = useRef(null);
    const [scrollEventBlocked, setScrollEventBlocked] = useState(false);
  
    const apiServer = process.env.NEXT_PUBLIC_API_SERVER;
    const searchParams = useSearchParams();
    const imageurl = searchParams.get("image_url");
    
    function onDocumentLoadSuccess({ numPages }) {
        setTotalPages(numPages);
        console.log(`총 페이지 수: ${numPages}`);
    }

    useEffect(() => {
        console.log(`현재 페이지: ${pageNumber}`);
    }, [pageNumber]);

    const handleMouseUp = () => {
        const selection = window.getSelection();
        const selectedText = selection.toString();
        if (selectedText.length > 0) {
            console.log("선택된 텍스트:", selectedText);
            setSelectedText(selectedText);
            translateText(selectedText);
        }
    };

    useEffect(() => {
        const textLayer = document.querySelector('.react-pdf__Page__textContent');

        if (textLayer) {
            console.log(`마우스 감지`);
            textLayer.addEventListener('mouseup', handleMouseUp);
        } else {
            console.log("마우스 감지 실패.");
        }

        return () => {
            if (textLayer) {
                textLayer.removeEventListener('mouseup', handleMouseUp);
            }
        };
    }, [handleMouseUp]);

    const translateText = async (text) => {
        try {
            console.log("Translating text:", text);
            // http://127.0.0.1:2000
            const response = await fetch(`${apiServer}/translate/translateText`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Accept'
                },
                credentials: 'include',
                body: JSON.stringify({ text }),
            });
            const data = await response.json();
            setTranslatedText(data.translatedText);
            setIsModalOpen(true);
        } catch (error) {
            console.error('Error translating text:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const currentQuestion = question.trim()
        if (!currentQuestion) return;

        setLoading(true);
        setQuestion('');
        const newQuestion = { question: currentQuestion, answer: null };
        setQaHistory((prevHistory) => [...prevHistory, newQuestion]);
        
        try {
            const response = await fetch(`${apiServer}/localQna/answer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Accept'
                },
                credentials: 'include',
                body: JSON.stringify({ 
                    query: question,
                })
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();

            setQaHistory((prevHistory) => {
                const updatedHistory = [...prevHistory];
                updatedHistory[updatedHistory.length - 1].answer = data.answer;
                return updatedHistory;
            });

        } catch (error) {
            console.error('Error fetching the answer:', error);
        } finally {
            setLoading(false);
        }
    };

    const QaHistoryItem = ({ question, answer }) => {
        const [text] = useTypewriter({
            words: [answer],
            loop: 1,
            typeSpeed: 50,
            deleteSpeed: 0,
        });
    };

    const goToPage = (page) => {
        const target = scroll.current;
        const pageHeight = target.scrollHeight / totalPages;
        setScrollEventBlocked(true);
        target.scrollTo({ top: (page - 1) * pageHeight, behavior: 'auto' });
        setTimeout(() => setScrollEventBlocked(false), 500);
    };

    return (
        <div className={styles.container}>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} translatedText={translatedText} />
            
            <div className={styles.pdfSection}>
                <div className={styles.menuBar}> 
                    <div className={styles.pagescale}>
                        <button onClick={() => setPageScale(pageScale >= 4 ? 4 : pageScale + 0.1)} style={{ marginRight: '10px' }}>
                            <ZoomIn />
                        </button>
                        <button onClick={() => setPageScale(pageScale <= 0.5 ? 0.5 : pageScale - 0.1)}>
                            <ZoomOut />
                        </button>
                    </div>

                    <div className={styles.pagebutton}>
                        <button
                            onClick={() => {
                                if (pageNumber > 1) {
                                    const newPage = pageNumber - 1;
                                    setPageNumber(newPage);
                                    goToPage(newPage);
                                }
                            }}
                            disabled={pageNumber <= 1}
                            className={styles.beforemenuButton}
                        >
                            <ChevronUp />
                        </button>
                        <input
                            type="text"
                            value={pageNumber || ''}
                            onChange={e => {
                                const v = e.target.value;
                                if (v === '') {
                                    setPageNumber(1);
                                } else {
                                    const numValue = parseInt(v, 10);
                                    if (!isNaN(numValue) && numValue >= 1 && numValue <= totalPages) {
                                        setPageNumber(numValue);
                                        goToPage(numValue);
                                    }
                                }
                            }}
                            min={1}
                            max={totalPages}
                            className={styles.pageInput}
                        />

                        <button
                            onClick={() => {
                                if (pageNumber < totalPages) {
                                    const newPage = pageNumber + 1;
                                    setPageNumber(newPage);
                                    goToPage(newPage);
                                }
                            }}
                            disabled={pageNumber >= totalPages}
                            className={styles.aftermenuButton}
                        >
                            <ChevronDown />
                        </button>
                    </div>
                </div>
                
                <div
                    className={styles.pdfViewer}
                    ref={scroll}
                    onScroll={(e) => {
                        const target = e.target as HTMLDivElement;
                        const scrollTop = target.scrollTop;
                        const scrollHeight = target.scrollHeight;
                        const pageHeight = scrollHeight / totalPages;

                        let currentPage = Math.ceil(scrollTop / pageHeight);
                        currentPage = Math.min(currentPage, totalPages - 1);
                        setPageNumber(currentPage + 1);
                    }}
                >
                    <Document file={imageurl} onLoadSuccess={onDocumentLoadSuccess}>
                        {Array.from(new Array(totalPages), (el, index) => (
                            <Page key={`page_${index + 1}`} pageNumber={index + 1} scale={pageScale} />
                        ))}
                    </Document>
                </div>
            </div>

            <div className={styles.chatSection}>
                <div className={styles.historySection}>
                    {qaHistory.map((qa, index) => (
                        <div key={index} className={styles.messageContainer}>
                            <div className={`${styles.qaBubble} ${styles.qaQuestion}`}>
                                <div className={styles.messageRow}>
                                    <User className={styles.usericon} />
                                    <div className={styles.messageContent}>
                                        {qa.question}
                                    </div>
                                </div>
                            </div>

                            <div className={`${styles.qaBubble} ${styles.qaAnswer}`}>
                                <div className={styles.messageRow}>
                                    <Bot className={styles.boticon} />
                                    <div className={styles.messageContent}>
                                        {qa.answer !== null ? (
                                            qa.answer
                                        ) : (
                                            <ChatLoader size="32px" color="blue" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <form 
                    onSubmit={handleSubmit} 
                    className={styles.form}
                >
                    <input 
                        type='text'
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder='Enter your question'
                        className={styles.input}
                    />
                    <button
                        className={`${styles.submitButton} ${
                            question.trim() ? styles.submitButtonEnabled : styles.submitButtonDisabled
                        }`}
                        type="submit"
                        disabled={!question.trim()}
                    >
                        <Send className='size-4' />
                    </button>
                </form>
            </div>
        </div>
    );
}