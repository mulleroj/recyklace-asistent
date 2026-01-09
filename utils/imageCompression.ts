/**
 * Compress and resize image before sending to AI
 * Reduces data transfer and speeds up API calls
 * 
 * @param imageData - Base64 image data
 * @param maxWidth - Maximum width in pixels (default: 1024)
 * @param maxHeight - Maximum height in pixels (default: 1024)
 * @param quality - JPEG quality 0-1 (default: 0.8)
 * @returns Compressed base64 image data
 */
export async function compressImage(
    imageData: string,
    maxWidth: number = 1024,
    maxHeight: number = 1024,
    quality: number = 0.8
): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = () => {
            // Calculate new dimensions while maintaining aspect ratio
            let width = img.width;
            let height = img.height;

            if (width > maxWidth || height > maxHeight) {
                const aspectRatio = width / height;

                if (width > height) {
                    width = maxWidth;
                    height = Math.round(width / aspectRatio);
                } else {
                    height = maxHeight;
                    width = Math.round(height * aspectRatio);
                }
            }

            // Create canvas and draw resized image
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Failed to get canvas context'));
                return;
            }

            // Use better image smoothing
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            ctx.drawImage(img, 0, 0, width, height);

            // Convert to JPEG with specified quality
            const compressedData = canvas.toDataURL('image/jpeg', quality);

            // Extract just the base64 data (remove data:image/jpeg;base64, prefix)
            const base64Data = compressedData.split(',')[1];

            // Log compression stats
            const originalSize = imageData.length;
            const compressedSize = base64Data.length;
            const reduction = ((1 - compressedSize / originalSize) * 100).toFixed(1);

            console.log(`Image compressed: ${originalSize} → ${compressedSize} bytes (${reduction}% reduction)`);
            console.log(`Dimensions: ${img.width}x${img.height} → ${width}x${height}`);

            resolve(base64Data);
        };

        img.onerror = () => {
            reject(new Error('Failed to load image'));
        };

        // Handle both full data URLs and raw base64
        if (imageData.startsWith('data:')) {
            img.src = imageData;
        } else {
            img.src = `data:image/jpeg;base64,${imageData}`;
        }
    });
}

/**
 * Get image dimensions without loading full image
 */
export async function getImageDimensions(imageData: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = () => {
            resolve({ width: img.width, height: img.height });
        };

        img.onerror = () => {
            reject(new Error('Failed to load image'));
        };

        if (imageData.startsWith('data:')) {
            img.src = imageData;
        } else {
            img.src = `data:image/jpeg;base64,${imageData}`;
        }
    });
}
