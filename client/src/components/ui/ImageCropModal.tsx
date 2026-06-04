import { useState, useRef, useCallback } from 'react';
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { storage, db } from '../../firebase';
import { Button } from './Button';

interface Props {
  readonly uid: string;
  readonly onSaved: (url: string) => void;
  readonly onCancel: () => void;
}

function getCroppedBlob(image: HTMLImageElement, crop: PixelCrop): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = 300;
  canvas.height = 300;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    300,
    300,
  );
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('Canvas empty'))),
      'image/jpeg',
      0.92,
    ),
  );
}

export function ImageCropModal({ uid, onSaved, onCancel }: Props) {
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [saving, setSaving] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener('load', () => setImgSrc(reader.result?.toString() ?? ''));
    reader.readAsDataURL(file);
  }

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const c = centerCrop(
      makeAspectCrop({ unit: '%', width: 80 }, 1, width, height),
      width,
      height,
    );
    setCrop(c);
  }, []);

  async function handleSave() {
    if (!imgRef.current || !completedCrop) return;
    setSaving(true);
    try {
      const blob = await getCroppedBlob(imgRef.current, completedCrop);
      const storageRef = ref(storage, `profilePictures/${uid}`);
      await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, 'users', uid), { photoURL: url });
      onSaved(url);
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
        <h2 className="text-lg font-bold text-white">Update Profile Picture</h2>

        {/* File picker */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChange}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-3 rounded-xl border-2 border-dashed border-gray-600
            text-gray-400 hover:border-teamA hover:text-teamALight transition-colors text-sm"
        >
          {imgSrc ? '📂 Choose different image' : '📂 Choose image'}
        </button>

        {/* Crop editor */}
        {imgSrc && (
          <div className="flex flex-col items-center gap-4">
            <ReactCrop
              crop={crop}
              onChange={c => setCrop(c)}
              onComplete={c => setCompletedCrop(c)}
              aspect={1}
              circularCrop
              className="rounded-xl overflow-hidden max-h-64"
            >
              <img
                ref={imgRef}
                src={imgSrc}
                alt="crop"
                onLoad={onImageLoad}
                className="max-h-64 w-auto"
              />
            </ReactCrop>

            {/* Live circular preview */}
            {completedCrop && imgRef.current && (
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs text-gray-500 uppercase tracking-wide">Preview</span>
                <CropPreview image={imgRef.current} crop={completedCrop} />
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="ghost" onClick={onCancel} className="flex-1">Cancel</Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!completedCrop || saving}
            className="flex-1"
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CropPreview({ image, crop }: { image: HTMLImageElement; crop: PixelCrop }) {
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const previewSize = 64;
  const scale = previewSize / crop.width;

  return (
    <div
      className="rounded-full overflow-hidden border-2 border-white/20"
      style={{ width: previewSize, height: previewSize }}
    >
      <img
        src={image.src}
        alt="preview"
        style={{
          width: image.width * scaleX * scale,
          height: image.height * scaleY * scale,
          marginLeft: -crop.x * scaleX * scale,
          marginTop: -crop.y * scaleY * scale,
        }}
      />
    </div>
  );
}
