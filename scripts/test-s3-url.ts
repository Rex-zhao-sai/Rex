import { getS3PhotoUrl } from '../src/lib/s3';

const key = "photos/lotus-ict/2026-08/876f2af3-7f03-41f7-a19c-5447d6b5add7/before.jpg";
const url = getS3PhotoUrl(key);
console.log('Generated URL:', url);
