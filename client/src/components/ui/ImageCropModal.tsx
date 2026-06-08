import { useState, useRef, useCallback, useEffect } from 'react';
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
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const canvas = document.createElement('canvas');
  canvas.width = 300;
  canvas.height = 300;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    image,
    crop.x * scaleX, crop.y * scaleY,
    crop.width * scaleX, crop.height * scaleY,
    0, 0, 300, 300,
  );
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      b => (b ? resolve(b) : reject(new Error('Canvas empty'))),
      'image/jpeg',
      0.92,
    ),
  );
}

function percentCropToPixels(crop: Crop, imgEl: HTMLImageElement): PixelCrop {
  const { width, height } = imgEl;
  return {
    unit: 'px',
    x: (crop.x / 100) * width,
    y: (crop.y / 100) * height,
    width: (crop.width / 100) * width,
    height: (crop.height / 100) * height,
  };
}

export function ImageCropModal({ uid, onSaved, onCancel }: Props) {
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [zoom, setZoom] = useState(80);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setCompletedCrop(undefined);
    const reader = new FileReader();
    reader.addEventListener('load', () => setImgSrc(reader.result?.toString() ?? ''));
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const c = centerCrop(
      makeAspectCrop({ unit: '%', width: zoom }, 1, width, height),
      width, height,
    );
    setCrop(c);
    setCompletedCrop(percentCropToPixels(c, e.currentTarget));
  }, [zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleZoom(newZoom: number) {
    setZoom(newZoom);
    if (!imgRef.current) return;
    const { width, height } = imgRef.current;
    const c = centerCrop(
      makeAspectCrop({ unit: '%', width: newZoom }, 1, width, height),
      width, height,
    );
    setCrop(c);
    setCompletedCrop(percentCropToPixels(c, imgRef.current));
  }

  useEffect(() => {
    if (!crop || !imgRef.current || crop.unit !== '%') return;
    setCompletedCrop(percentCropToPixels(crop, imgRef.current));
  }, [crop]);

  async function handleSave() {
    if (!imgRef.current || !completedCrop) {
      setError('Please select an image and crop area first.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const blob = await getCroppedBlob(imgRef.current, completedCrop);
      const storageRef = ref(storage, `profilePictures/${uid}`);

      const uploadPromise = uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Upload timed out — check your connection.')), 15_000),
      );
      await Promise.race([uploadPromise, timeout]);

      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, 'users', uid), { photoURL: url });
      onSaved(url);
    } catch (err) {
      console.error('Upload failed', err);
      setError(err instanceof Error ? err.message : 'Upload failed — check your connection and try again.');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col gap-4">
        <h2 className="text-lg font-bold text-white">Update Profile Picture</h2>

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

        {imgSrc && (
          <>
            <div className="flex justify-center">
              <ReactCrop
                crop={crop}
                onChange={c => setCrop(c)}
                onComplete={c => setCompletedCrop(c)}
                aspect={1}
                circularCrop
                className="rounded-xl overflow-hidden"
                style={{ maxHeight: 260 }}
              >
                <img
                  ref={imgRef}
                  src={imgSrc}
                  alt="crop"
                  onLoad={onImageLoad}
                  style={{ maxHeight: 260, display: 'block' }}
                />
              </ReactCrop>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-sm select-none">🔍−</span>
              <input
                type="range"
                min={20}
                max={95}
                step={1}
                value={zoom}
                onChange={e => handleZoom(Number(e.target.value))}
                className="flex-1 accent-teamA"
              />
              <span className="text-gray-400 text-sm select-none">🔍+</span>
            </div>
            <p className="text-center text-xs text-gray-500 -mt-2">
              Drag slider to zoom · drag the circle to reposition
            </p>

            {completedCrop && imgRef.current && (
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs text-gray-500 uppercase tracking-wide">Preview</span>
                <CropPreview image={imgRef.current} crop={completedCrop} />
              </div>
            )}
          </>
        )}

        {error && (
          <p className="text-red-400 text-xs text-center">{error}</p>
        )}

        <div className="flex gap-3">
          <Button variant="ghost" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!imgSrc || !completedCrop || saving}
            className="flex-1"
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Canvas-based circular preview — matches exactly what getCroppedBlob will save.
function CropPreview({ image, crop }: { readonly image: HTMLImageElement; readonly crop: PixelCrop }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || crop.width === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    ctx.clearRect(0, 0, 80, 80);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      image,
      crop.x * scaleX, crop.y * scaleY,
      crop.width * scaleX, crop.height * scaleY,
      0, 0, 80, 80,
    );
  }, [image, crop]);

  return (
    <canvas
      ref={canvasRef}
      width={80}
      height={80}
      className="rounded-full border-2 border-white/20"
    />
  );
}
