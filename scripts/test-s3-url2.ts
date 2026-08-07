import { getS3PhotoUrl } from '../src/lib/s3';

const key = "lotus-ict_2026-08_1785767835171-kkqvdgj_before_df80e6b7.jpg";
const url = getS3PhotoUrl(key);
console.log('Generated URL:', url);
