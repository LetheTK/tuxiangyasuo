document.addEventListener('DOMContentLoaded', () => {
    if (!checkBrowserSupport()) {
        // 禁用上传功能
        document.getElementById('uploadArea').style.pointerEvents = 'none';
        document.getElementById('uploadArea').style.opacity = '0.5';
        return;
    }

    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const previewArea = document.getElementById('previewArea');
    const originalPreview = document.getElementById('originalPreview');
    const compressedPreview = document.getElementById('compressedPreview');
    const originalSize = document.getElementById('originalSize');
    const compressedSize = document.getElementById('compressedSize');
    const downloadBtn = document.getElementById('downloadBtn');

    // 添加压缩设置控件
    const qualityInput = document.getElementById('quality');
    const qualityValue = document.getElementById('qualityValue');
    const maxWidthInput = document.getElementById('maxWidth');
    const formatSelect = document.getElementById('format');

    const enableWatermark = document.getElementById('enableWatermark');
    const watermarkOptions = document.querySelector('.watermark-options');
    const watermarkText = document.getElementById('watermarkText');
    const watermarkColor = document.getElementById('watermarkColor');
    const watermarkSize = document.getElementById('watermarkSize');

    let currentFile = null; // 添加变量存储当前文件

    // 监听水印开关
    enableWatermark.addEventListener('change', () => {
        watermarkOptions.style.display = enableWatermark.checked ? 'flex' : 'none';
        if (currentFile) {
            handleImage(currentFile);
        }
    });

    // 监听水印设置变化
    [watermarkText, watermarkColor, watermarkSize].forEach(element => {
        element.addEventListener('input', debounce(() => {
            if (currentFile && enableWatermark.checked) {
                handleImage(currentFile);
            }
        }, 300));
    });

    // 更新质量显示并重新压缩
    qualityInput.addEventListener('input', () => {
        const value = Math.round(qualityInput.value * 100);
        qualityValue.textContent = `${value}%`;
        
        // 添加质量说明
        let qualityDesc = '';
        if (value >= 80) {
            qualityDesc = '(高质量，文件较大)';
        } else if (value >= 50) {
            qualityDesc = '(平衡模式)';
        } else {
            qualityDesc = '(低质量，文件最小)';
        }
        qualityValue.textContent = `${value}% ${qualityDesc}`;
        
        // 如果有当前文件，重新压缩
        if (currentFile) {
            handleImage(currentFile);
        }
    });

    // 监听其他压缩设置的变化
    maxWidthInput.addEventListener('change', () => {
        if (currentFile) {
            handleImage(currentFile);
        }
    });

    formatSelect.addEventListener('change', () => {
        if (currentFile) {
            handleImage(currentFile);
        }
    });

    // 添加点击上传功能
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });

    // 文件验证
    function validateFile(file) {
        // 检查文件类型
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            throw new Error('不支持的文件格式，请上传 JPG、PNG 或 WEBP 格式的图片');
        }

        // 检查文件大小（最大 10MB）
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            throw new Error('文件太大，请上传小于 10MB 的图片');
        }

        return true;
    }

    // 处理图片上传
    async function handleImage(file) {
        try {
            validateFile(file);
            currentFile = file; // 存当前文件

            // 读取并显示原图
            const reader = new FileReader();
            reader.onload = async (e) => {
                originalPreview.src = e.target.result;
                originalSize.textContent = formatFileSize(file.size);

                try {
                    // 获取压缩设置
                    const compressionOptions = {
                        quality: parseFloat(qualityInput.value),
                        maxWidth: parseInt(maxWidthInput.value),
                        maxHeight: parseInt(maxWidthInput.value),
                        format: formatSelect.value,
                        watermark: enableWatermark.checked ? {
                            text: watermarkText.value,
                            font: `${watermarkSize.value}px Arial`,
                            color: watermarkColor.value + '80' // 添加50%透明度
                        } : null
                    };

                    // 压缩图片
                    const result = await compressImage(e.target.result, null, compressionOptions);

                    // 显示压缩结果
                    compressedPreview.src = result.dataUrl;
                    compressedSize.textContent = formatFileSize(result.size);
                    previewArea.hidden = false;

                    // 设置下载按钮
                    setupDownloadButton(result.dataUrl, file.name);
                } catch (error) {
                    handleError(error);
                }
            };
            reader.readAsDataURL(file);
        } catch (error) {
            handleError(error);
        }
    }

    // 设置下载按钮
    function setupDownloadButton(dataUrl, fileName) {
        downloadBtn.onclick = () => {
            const link = document.createElement('a');
            link.download = `compressed-${fileName}`;
            link.href = dataUrl;
            link.click();
        };
    }

    // 添加拖放处理
    setupDragAndDrop(uploadArea, handleImage);

    // 处理文件选择
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleImage(file);
        }
    });

    // 1. 批量处理功能
    function handleBatchUpload(files) {
        const queue = Array.from(files);
        let processed = 0;

        async function processNext() {
            if (queue.length === 0) {
                showSuccess('所有图片处理完成！');
                return;
            }

            const file = queue.shift();
            await handleImage(file);
            processed++;
            updateProgress(processed, files.length);
            processNext();
        }

        processNext();
    }

    // 2. 水印功能
    function addWatermark(canvas, text) {
        const ctx = canvas.getContext('2d');
        ctx.font = '24px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.textAlign = 'center';
        ctx.fillText(text, canvas.width / 2, canvas.height - 30);
    }

    // 3. 图片统计功能
    function updateImageStats(original, compressed) {
        const ratio = ((original - compressed) / original * 100).toFixed(2);
        document.getElementById('compressionRatio').textContent = `${ratio}%`;
        // 添加更多统计...
    }

    // 4. 自动保存设置
    function saveSettings() {
        const settings = {
            quality: qualityInput.value,
            maxWidth: maxWidthInput.value,
            format: formatSelect.value
        };
        localStorage.setItem('compressionSettings', JSON.stringify(settings));
    }

    // 5. 键盘快捷键
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'o') { // Ctrl+O 打开文件
            e.preventDefault();
            fileInput.click();
        }
        // 添加更多快捷键...
    });
});

// 设置拖放处理
function setupDragAndDrop(element, handleFile) {
    element.addEventListener('dragover', (e) => {
        e.preventDefault();
        element.classList.add('dragover');
    });

    element.addEventListener('dragleave', () => {
        element.classList.remove('dragover');
    });

    element.addEventListener('drop', (e) => {
        e.preventDefault();
        element.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) {
            handleFile(file);
        }
    });
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 添加浏览器特性检测
function checkBrowserSupport() {
    const features = {
        canvas: !!document.createElement('canvas').getContext,
        fileReader: 'FileReader' in window,
        dragAndDrop: 'draggable' in document.createElement('div')
    };

    const missingFeatures = Object.entries(features)
        .filter(([, supported]) => !supported)
        .map(([feature]) => feature);

    if (missingFeatures.length > 0) {
        const errorMessage = document.querySelector('.error-message');
        errorMessage.hidden = false;
        document.querySelector('#errorText').textContent = 
            `您的浏览器不支持以下功能：${missingFeatures.join(', ')}，请使用最新版本的Chrome、Firefox、Safari或Edge浏览器。`;
        return false;
    }

    return true;
} 