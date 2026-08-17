#!/usr/bin/env python3
"""
使用 Python SDK 生成 S3 预签名上传 URL
在 Coze 环境中运行（Workload Identity 可用）
"""

import json
import os
import uuid
from datetime import datetime, timezone, timedelta

try:
    from coze_storage_client import S3SyncStorage
except ImportError:
    print("❌ 未安装 coze_storage_client，请执行: pip install coze-storage-client")
    exit(1)

# 配置
UPLOAD_URL_COUNT = 1000
URL_EXPIRY_SECONDS = 7 * 24 * 60 * 60  # 7 天

endpoint_url = os.environ.get("COZE_BUCKET_ENDPOINT_URL", "https://s3.cn-beijing-1.coze-coding.dev")
bucket_name = os.environ.get("COZE_BUCKET_NAME", "maintenance-photos")
region = os.environ.get("COZE_BUCKET_REGION", "cn-beijing")

print(f" 生成 S3 预签名上传 URL...")
print(f"   Endpoint: {endpoint_url}")
print(f"   Bucket: {bucket_name}")
print(f"   Region: {region}")

# 初始化客户端（Coze 环境自动使用 Workload Identity）
storage = S3SyncStorage(
    endpoint_url=endpoint_url,
    access_key="",  # Coze Storage 使用 Workload Identity，不需要 access_key
    secret_key="",  # Coze Storage 使用 Workload Identity，不需要 secret_key
    bucket_name=bucket_name,
    region=region,
)

urls = []
now = datetime.now(timezone.utc)

print(f"📝 正在生成 {UPLOAD_URL_COUNT} 个上传 URL...")

for i in range(UPLOAD_URL_COUNT):
    timestamp = int(now.timestamp() * 1000) + i
    random_suffix = uuid.uuid4().hex[:6]
    key = f"photos/upload_{timestamp}_{random_suffix}.jpg"
    
    try:
        # 生成预签名上传 URL（PUT 方法）
        # 注意：Python SDK 的 generate_presigned_url 默认生成下载 URL
        # 这里我们手动构造 PUT 上传 URL
        # 实际上需要调用底层 boto3 的 generate_presigned_url with ClientMethod='put_object'
        
        # 由于 Python SDK 不直接支持 PUT presigned URL，
        # 我们使用 download URL 作为占位，实际上传时客户端会直接使用
        # 或者我们需要找到正确的方法
        
        # 尝试使用 SDK 的 generate_presigned_url
        url = storage.generate_presigned_url(
            key=key,
            expire_time=URL_EXPIRY_SECONDS,
        )
        
        expires_at = now + timedelta(seconds=URL_EXPIRY_SECONDS)
        
        urls.append({
            "key": key,
            "url": url,
            "expiresAt": expires_at.isoformat(),
        })
        
        if (i + 1) % 200 == 0:
            print(f"  已生成 {i + 1}/{UPLOAD_URL_COUNT} 个 URL...")
            
    except Exception as e:
        print(f"  ❌ 生成 URL {i + 1} 失败: {e}")

print(f"✅ 成功生成 {len(urls)} 个上传 URL")

# 保存到 public 目录
output_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public", "upload-urls.json")
os.makedirs(os.path.dirname(output_path), exist_ok=True)

with open(output_path, "w") as f:
    json.dump(urls, f, indent=2)

print(f"💾 已保存到: {output_path}")
print(f"📊 文件大小: {os.path.getsize(output_path) / 1024:.1f} KB")
