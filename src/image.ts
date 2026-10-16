const UPLOAD_LIMIT = 4 * 1024 * 1024;
const TARGET_BYTES = 2 * 1024 * 1024;
const MAX_EDGE = 2048;
const KEEP_TYPES = ["image/jpeg", "image/png", "image/webp"];

function toBlob(canvas: HTMLCanvasElement, quality: number) {
    return new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", quality));
}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
    if ("createImageBitmap" in window) {
        try {
            return await createImageBitmap(file, { imageOrientation: "from-image" });
        }
        catch {
            // 部分浏览器不支持该格式的位图解码，回退到 <img>。
        }
    }
    const url = URL.createObjectURL(file);
    try {
        const image = new Image();
        image.src = url;
        await image.decode();
        return image;
    }
    finally {
        URL.revokeObjectURL(url);
    }
}

/** 在浏览器中把照片缩小并转成 JPEG，手机原图超过 4MB 也能上传。 */
export async function prepareImage(file: File): Promise<File> {
    if (KEEP_TYPES.includes(file.type) && file.size <= TARGET_BYTES)
        return file;
    let source: ImageBitmap | HTMLImageElement;
    try {
        source = await decode(file);
    }
    catch {
        throw new Error("无法读取这张图片，请换一张 JPG、PNG 或 WebP 图片。");
    }
    const width = "naturalWidth" in source ? source.naturalWidth : source.width;
    const height = "naturalHeight" in source ? source.naturalHeight : source.height;
    let scale = Math.min(1, MAX_EDGE / Math.max(width, height));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context)
        throw new Error("当前浏览器无法处理图片，请换一个浏览器重试。");
    for (let attempt = 0; attempt < 5; attempt++) {
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        context.fillStyle = "#fff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(source, 0, 0, canvas.width, canvas.height);
        const blob = await toBlob(canvas, attempt < 2 ? 0.85 : 0.75);
        if (blob && (blob.size <= TARGET_BYTES || (attempt === 4 && blob.size <= UPLOAD_LIMIT))) {
            if ("close" in source)
                source.close();
            return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
        }
        scale *= 0.75;
    }
    if ("close" in source)
        source.close();
    throw new Error("图片太大，压缩后仍超过 4MB，请换一张图片。");
}
