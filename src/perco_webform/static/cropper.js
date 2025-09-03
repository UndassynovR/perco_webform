/**
 * Face Registration Cropper
 * Automatic 3:4 aspect ratio cropping for face photos
 */

class FaceCropper {
  constructor() {
    this.cropper = null;
    this.originalImage = null;
    this.croppedCanvas = null;
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }

  init() {
    this.previewImage = document.getElementById('previewImage');
    this.previewArea = document.getElementById('previewArea');
    this.cropBtn = document.getElementById('cropBtn');
    this.clearPhotoBtn = document.getElementById('clearPhotoBtn');
    this.photoInput = document.getElementById('photo');

    this.bindEvents();
  }

  bindEvents() {
    // Handle file selection
    this.photoInput?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.loadImage(file);
      }
    });

    // Handle crop button
    this.cropBtn?.addEventListener('click', () => {
      this.performCrop();
    });

    // Handle clear button
    this.clearPhotoBtn?.addEventListener('click', () => {
      this.clearImage();
    });
  }

  loadImage(file) {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.showError('Пожалуйста, выберите файл изображения');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      this.showError('Файл слишком большой. Максимальный размер: 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      this.originalImage = new Image();
      this.originalImage.onload = () => {
        this.showPreview(e.target.result);
        this.initCropper();
      };
      this.originalImage.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  showPreview(imageSrc) {
    this.previewImage.src = imageSrc;
    this.previewArea.hidden = false;
    
    // Update crop button text
    this.cropBtn.textContent = 'Обрезать автоматически (3:4)';
    this.cropBtn.disabled = false;
  }

  initCropper() {
    // Destroy existing cropper if any
    if (this.cropper) {
      this.cropper.destroy();
    }

    // Initialize Cropper.js with 3:4 aspect ratio
    this.cropper = new Cropper(this.previewImage, {
      aspectRatio: 3 / 4,
      viewMode: 1,
      dragMode: 'move',
      autoCropArea: 0.8,
      restore: false,
      guides: true,
      center: true,
      highlight: true,
      cropBoxMovable: true,
      cropBoxResizable: true,
      toggleDragModeOnDblclick: false,
      responsive: true,
      modal: true,
      background: true,
      ready: () => {
        // Auto-detect face area and position crop box
        this.autoPositionCropBox();
      },
      cropend: () => {
        // Update crop button when crop area changes
        this.cropBtn.textContent = 'Применить обрезку (3:4)';
      }
    });
  }

  autoPositionCropBox() {
    if (!this.cropper) return;

    // Get image dimensions
    const imageData = this.cropper.getImageData();
    const containerData = this.cropper.getContainerData();
    
    // Calculate optimal crop box size and position
    // Aim for center-top positioning (good for portraits)
    const cropBoxWidth = Math.min(imageData.naturalWidth * 0.7, containerData.width * 0.8);
    const cropBoxHeight = cropBoxWidth * (4 / 3);
    
    // Position slightly above center for better face framing
    const x = (imageData.naturalWidth - cropBoxWidth) / 2;
    const y = (imageData.naturalHeight - cropBoxHeight) / 2 - (imageData.naturalHeight * 0.1);
    
    this.cropper.setCropBoxData({
      left: x,
      top: Math.max(0, y),
      width: cropBoxWidth,
      height: cropBoxHeight
    });
  }

  performCrop() {
    if (!this.cropper) return;

    // Get cropped canvas
    const canvas = this.cropper.getCroppedCanvas({
      width: 480,  // Target width for 3:4 ratio
      height: 640, // Target height for 3:4 ratio
      minWidth: 240,
      minHeight: 320,
      maxWidth: 960,
      maxHeight: 1280,
      fillColor: '#fff',
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high'
    });

    if (canvas) {
      this.croppedCanvas = canvas;
      
      // Update preview with cropped image
      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      this.showCroppedPreview(croppedDataUrl);
      
      // Store cropped image data for form submission
      this.storeCroppedImage(canvas);
      
      // Enable submit button
      this.enableSubmit();
    }
  }

  showCroppedPreview(dataUrl) {
    // Destroy cropper and show final result
    if (this.cropper) {
      this.cropper.destroy();
      this.cropper = null;
    }

    // Update preview image
    this.previewImage.src = dataUrl;
    this.previewImage.classList.add('cropped-preview');
    
    // Update button states
    this.cropBtn.textContent = 'Обрезано ✓';
    this.cropBtn.disabled = true;
    this.cropBtn.classList.add('success');
    
    // Show success message
    const previewArea = this.previewArea;
    let successMsg = previewArea.querySelector('.success-msg');
    if (!successMsg) {
      successMsg = document.createElement('div');
      successMsg.className = 'success-msg';
      successMsg.textContent = 'Фото успешно обрезано в соотношении 3:4';
      previewArea.appendChild(successMsg);
    }
  }

  storeCroppedImage(canvas) {
    // Convert canvas to blob for form submission
    canvas.toBlob((blob) => {
      // Create a new File object from the blob
      const croppedFile = new File([blob], 'cropped-photo.jpg', {
        type: 'image/jpeg',
        lastModified: Date.now()
      });

      // Store reference for later use
      this.croppedFile = croppedFile;
      
      // Dispatch custom event for main script
      document.dispatchEvent(new CustomEvent('photoCropped', {
        detail: { file: croppedFile, canvas: canvas }
      }));
    }, 'image/jpeg', 0.9);
  }

  clearImage() {
    // Destroy cropper
    if (this.cropper) {
      this.cropper.destroy();
      this.cropper = null;
    }

    // Clear file input
    this.photoInput.value = '';
    
    // Hide preview
    this.previewArea.hidden = true;
    
    // Clear stored data
    this.originalImage = null;
    this.croppedCanvas = null;
    this.croppedFile = null;
    
    // Reset button states
    this.cropBtn?.classList.remove('success');
    
    // Disable submit
    this.disableSubmit();
    
    // Clear success message
    const successMsg = this.previewArea?.querySelector('.success-msg');
    if (successMsg) {
      successMsg.remove();
    }

    // Dispatch clear event
    document.dispatchEvent(new CustomEvent('photoCleared'));
  }

  enableSubmit() {
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
      submitBtn.disabled = false;
    }
  }

  disableSubmit() {
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
      submitBtn.disabled = true;
    }
  }

  showError(message) {
    // You can integrate this with your existing error display system
    console.error('Cropper Error:', message);
    alert(message); // Simple fallback - replace with your error display
  }

  // Public method to get cropped image data
  getCroppedFile() {
    return this.croppedFile;
  }

  getCroppedCanvas() {
    return this.croppedCanvas;
  }

  // Public method to check if image is cropped
  isCropped() {
    return !!this.croppedFile;
  }
}

// Initialize cropper when script loads
window.faceCropper = new FaceCropper();
