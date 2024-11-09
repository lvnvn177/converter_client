from fastapi import FastAPI, UploadFile, HTTPException, APIRouter
from fastapi.responses import JSONResponse
import os
import urllib
import math
import requests
import boto3
from dotenv import load_dotenv
from boto3 import client
from botocore.exceptions import BotoCoreError, ClientError
from mangum import Mangum  # Lambda에서 FastAPI 실행을 위해 Mangum 추가

load_dotenv()

BUCKET_NAME = os.environ.get('S3_BUCKET')
s3r = APIRouter(prefix='/s3r')
s3_client = client( 
    "s3",
    aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY'),
    region_name="ap-northeast-2"
)

app = FastAPI()
app.include_router(s3r)

@app.get("/")
async def root():
    return {"message": "Hello from FastAPI on Lambda!"}

@s3r.post("/upload", tags=['s3r'])
async def upload(file: UploadFile):
    # S3 파일 업로드
    filename = file.filename.replace(" ", "_")
    s3_key = f"uploads/11-04-2024/{filename}" 

    try:
        s3_client.upload_fileobj(file.file, BUCKET_NAME, s3_key)
    except (BotoCoreError, ClientError) as e:
        raise HTTPException(status_code=500, detail=f"S3 Upload Fails: {str(e)}")

    url = f"https://s3-ap-northeast-2.amazonaws.com/{BUCKET_NAME}/{urllib.parse.quote(s3_key, safe='~()*!.\'')}"
    return JSONResponse(content={"url": url, "fileName": filename})

@s3r.get("/list", tags=['s3r'])
async def list_files():
    # S3 파일 목록 가져오기
    try:
        file_list = get_file_list_s3(BUCKET_NAME)
        return JSONResponse(content=file_list)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch file list: {str(e)}")

@s3r.delete("/delete", tags=['s3r'])
async def delete_file(fileName: str):
    # S3 파일 삭제
    try:
        s3_key = f"uploads/11-04-2024/{fileName}"
        s3_client.delete_object(Bucket=BUCKET_NAME, Key=s3_key)
        return JSONResponse(content={"message": f"File '{fileName}' deleted successfully."})
    except (BotoCoreError, ClientError) as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")

# Mangum 핸들러 추가
handler = Mangum(app)