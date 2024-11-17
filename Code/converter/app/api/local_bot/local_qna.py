from fastapi import FastAPI, HTTPException, APIRouter, Request
import os
import tempfile
import requests
import chromadb
from chromadb.utils import embedding_functions
from uuid import uuid4
from fastapi import FastAPI, HTTPException, Request, APIRouter
from fastapi import UploadFile
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
# from app.local_load.model_loader import load_llm_model, load_embedding_model  # 모델 로드 함수 임포트
from langchain_core.prompts import ChatPromptTemplate
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains import create_retrieval_chain

from app.local_load.model_loader import RAG


localQna = APIRouter(prefix='/localQna')

ragInstance = RAG(file_name="test")

pdf_file_path = ''


@localQna.post('/answer')
async def generate_answer(request: Request):
    data = await request.json()
    query = data.get('query')

    result = ragInstance.generate_response(query)
    return {'answer': result}

# FastAPI 경로 처리
@localQna.post("/upload")
async def upload(request: Request):
    global pdf_file_path, ragInstance
    data = await request.json()
    print(data)
    # text = data.get("text")
    imageurl = data.get("pdf")

    # 요청 본문에서 필수 필드 확인
    if not imageurl:
        raise HTTPException(status_code=400, detail="Missing text or imageurl")
    
    # PDF 파일을 메모리로 로드
    response = requests.get(imageurl)
    if response.status_code != 200:
        raise HTTPException(status_code=404, detail="PDF file not found")
    
    # PDF 데이터를 임시 파일로 저장
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
        tmp_file.write(response.content)
        pdf_file_path = tmp_file.name

    ragInstance.add_chunks(pdf_file_path)
    print('RAG Instance Initiated...')

 
    os.remove(pdf_file_path)

    # 응답 반환
    return {"answer": 'ok'}