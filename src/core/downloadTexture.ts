/** @file Dev helper: saves a loaded texture as a PNG download (debug key T). */
import type Phaser from 'phaser';

/** Dev helper: saves a loaded texture as a PNG file through the browser (used by the debug key T for the tileset). */
export function downloadTexture(textures: Phaser.Textures.TextureManager, key: string, filename: string): void {
  const image = textures.get(key).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  canvas.getContext('2d')?.drawImage(image, 0, 0);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}
