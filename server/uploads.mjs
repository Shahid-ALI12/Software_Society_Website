import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { getDownloadURL } from 'firebase-admin/storage';
import { exact, invalid } from './schema.mjs';
import { RequestError } from './security/errors.mjs';
export async function normalizeImage(body){
 exact(body,['base64']);
 if(typeof body.base64!=='string'||body.base64.length>2800000||!body.base64.length||!/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(body.base64))throw invalid();
 const input=Buffer.from(body.base64,'base64');if(input.length>2*1024*1024)throw new RequestError(413,'image_too_large','Choose a photo smaller than 2 MB.');
 try{
  const decoder=sharp(input,{limitInputPixels:24000000,animated:false});
  const metadata=await decoder.metadata();
  if(!['jpeg','png','webp'].includes(metadata.format)||(metadata.pages||1)>1)throw invalid();
  return await decoder.rotate().resize({width:1920,height:1920,fit:'inside',withoutEnlargement:true}).webp({quality:82}).toBuffer();
 }catch{throw new RequestError(400,'invalid_image','Choose a still JPEG, PNG or WebP photo under 24 megapixels.');}
}
export async function uploadImage(bucket,body){
 if(process.env.ENABLE_PHOTO_UPLOADS!=='true')throw new RequestError(503,'storage_not_configured','Direct uploads are not enabled yet. Use a supported hosted photo URL instead.');
 const bytes=await normalizeImage(body),file=bucket.file('public-media/'+randomUUID()+'.webp');
 try{
  await file.save(bytes,{resumable:false,metadata:{contentType:'image/webp',cacheControl:'public,max-age=31536000,immutable',metadata:{firebaseStorageDownloadTokens:randomUUID()}}});
  return {url:await getDownloadURL(file)};
 }catch{throw new RequestError(503,'storage_unavailable','Photo upload failed. Check Storage configuration and try again.');}
}
