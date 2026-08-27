import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folderPath = String(formData.get('folderPath') || 'VR');
    const fileName = String(formData.get('fileName') || 'recording.webm');
    const metadata = formData.get('metadata');

    if (!file || !fileName) {
      return NextResponse.json({ error: 'Missing video file.' }, { status: 400 });
    }

    const safeFolder = folderPath
      .replace(/\\/g, '/')
      .replace(/^\/+|\/+$/g, '')
      .replace(/^public\//, '');
    const targetDir = join(process.cwd(), 'public', safeFolder);
    await mkdir(targetDir, { recursive: true });

    const arrayBuffer = await file.arrayBuffer();
    const fullPath = join(targetDir, fileName);
    await writeFile(fullPath, Buffer.from(arrayBuffer));

    const recordMeta = metadata ? JSON.parse(String(metadata)) : {};

    return NextResponse.json({
      success: true,
      filePath: `${safeFolder}/${fileName}`,
      publicUrl: `/${safeFolder}/${fileName}`,
      metadata: recordMeta,
      duration: Number(recordMeta.duration || 0),
    });
  } catch (error: any) {
    console.error('VR upload failed:', error);
    return NextResponse.json({ error: error?.message || 'Failed to save VR recording.', }, { status: 500 });
  }
}
