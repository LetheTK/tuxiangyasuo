function compressImage(dataUrl, callback, options = {}) {
    const {
        quality = 0.7,
        maxWidth = 1200,
        maxHeight = 1200,
        format = 'image/jpeg',
        watermark = null
    } = options;

    // 显示加载状态
    document.querySelector('.loading-indicator').hidden = false;
    document.querySelector('.error-message').hidden = true;
    document.querySelector('.success-message').hidden = true;

    return new Promise((resolve, reject) => {
        const img = new Image();
        
        img.onload = () => {
            try {
                // 创建 canvas
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // 计算新的尺寸
                let { width, height } = calculateAspectRatioFit(
                    img.width,
                    img.height,
                    maxWidth,
                    maxHeight
                );

                // 设置 canvas 尺寸
                canvas.width = width;
                canvas.height = height;

                // 绘制图片
                ctx.drawImage(img, 0, 0, width, height);

                // 添加水印
                if (watermark && watermark.text) {
                    ctx.font = watermark.font;
                    ctx.fillStyle = watermark.color;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    
                    // 计算水印位置
                    const padding = 20;
                    const x = width / 2;
                    const y = height - padding;
                    
                    // 绘制水印
                    ctx.fillText(watermark.text, x, y);
                }

                // 压缩图片
                const compressedDataUrl = canvas.toDataURL(format, quality);
                
                // 计算压缩后的大小
                const compressedSize = Math.round(
                    (compressedDataUrl.length - `data:${format};base64,`.length) * 3/4
                );

                // 隐藏加载状态，显示成功消息
                document.querySelector('.loading-indicator').hidden = true;
                document.querySelector('.success-message').hidden = false;

                resolve({
                    dataUrl: compressedDataUrl,
                    size: compressedSize,
                    width,
                    height
                });
                
                if (callback) callback(compressedDataUrl, compressedSize);
            } catch (error) {
                handleError(error);
                reject(error);
            }
        };

        img.onerror = (error) => {
            handleError(error);
            reject(error);
        };

        img.src = dataUrl;
    });
}

// 计算保持宽高比的新尺寸
function calculateAspectRatioFit(srcWidth, srcHeight, maxWidth, maxHeight) {
    const ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
    return {
        width: Math.round(srcWidth * ratio),
        height: Math.round(srcHeight * ratio)
    };
}

// 错误处理
function handleError(error) {
    document.querySelector('.loading-indicator').hidden = true;
    const errorMessage = document.querySelector('.error-message');
    errorMessage.hidden = false;
    document.querySelector('#errorText').textContent = error.message || '图片处理失败';
}

// 1. 使用 Web Worker 处理压缩
const compressionWorker = new Worker('js/compression-worker.js');

// 2. 添加图片预加载
function preloadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
}

// 3. 添加缓存机制
const compressionCache = new Map();

// 4. 添加防抖处理
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
} 