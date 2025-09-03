// static/script.js
document.addEventListener("DOMContentLoaded", () => {
  const iinInput = document.getElementById("iin");
  const checkIinBtn = document.getElementById("checkIinBtn");
  const iinError = document.getElementById("iinError");
  const userName = document.getElementById("userName");

  // photo elements
  const photoWrapper = document.getElementById("photoWrapper");
  const photoInput = document.getElementById("photo");
  const photoHint = document.getElementById("photoHint");
  const previewArea = document.getElementById("previewArea");
  const previewImage = document.getElementById("previewImage");
  const cropBtn = document.getElementById("cropBtn");
  const clearPhotoBtn = document.getElementById("clearPhotoBtn");

  const submitBtn = document.getElementById("submitBtn");
  const submitMsg = document.getElementById("submitMsg");

  let confirmedUser = null;

  function enablePhotoControls() {
    photoWrapper.classList.remove("disabled");
    // hide the hint quietly
    if (photoHint) photoHint.style.display = "none";
    // enable file input
    if (photoInput) photoInput.removeAttribute("disabled");
  }

  function disablePhotoControls() {
    photoWrapper.classList.add("disabled");
    if (photoHint) photoHint.style.display = "";
    if (photoInput) {
      photoInput.value = "";
      photoInput.setAttribute("disabled", "disabled");
    }
    previewArea.hidden = true;
    previewImage.src = "";
    submitBtn.disabled = true;
    confirmedUser = null;
    
    // Clear cropper if exists
    if (window.faceCropper) {
      window.faceCropper.clearImage();
    }
  }

  checkIinBtn.addEventListener("click", async (ev) => {
    ev.preventDefault();
    const iin = iinInput.value.trim();
    iinError.textContent = "";
    userName.textContent = "";
    disablePhotoControls();

    if (!/^\d{12}$/.test(iin)) {
      iinError.textContent = "Некорректный ИИН";
      return;
    }

    checkIinBtn.disabled = true;
    checkIinBtn.textContent = "Проверка...";

    try {
      const resp = await fetch("/api/get_user_by_iin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ iin }),
      });

      if (!resp.ok) {
        if (resp.status === 404) iinError.textContent = "Пользователь не найден";
        else iinError.textContent = "Ошибка сервера";
        return;
      }

      const data = await resp.json();
      if (data && data.success) {
        confirmedUser = {
          user_id: data.user_id,
          first_name: data.first_name,
          last_name: data.last_name,
          middle_name: data.middle_name,
        };
        userName.textContent = `${confirmedUser.last_name} ${confirmedUser.first_name} ${confirmedUser.middle_name || ""}`;
        enablePhotoControls();
      } else {
        iinError.textContent = data && data.error ? data.error : "Не удалось получить данные";
      }
    } catch (err) {
      console.error("Ошибка при проверке ИИН:", err);
      iinError.textContent = "Сетевая ошибка";
    } finally {
      checkIinBtn.disabled = false;
      checkIinBtn.textContent = "Проверить";
    }
  });

  // Listen for cropper events
  document.addEventListener('photoCropped', (e) => {
    const { file, canvas } = e.detail;
    console.log('Photo cropped successfully:', file);
    
    // Enable submit button when photo is cropped
    if (confirmedUser && file) {
      submitBtn.disabled = false;
    }
  });

  document.addEventListener('photoCleared', () => {
    console.log('Photo cleared');
    // Disable submit button when photo is cleared
    submitBtn.disabled = true;
  });

  // Handle form submission
  submitBtn.addEventListener("click", async () => {
    if (!confirmedUser) { 
      alert("Сначала подтвердите ИИН"); 
      return; 
    }
    
    if (!window.faceCropper) { 
      alert("Нет обработчика изображения"); 
      return; 
    }

    // Check if image is cropped
    if (!window.faceCropper.isCropped()) {
      alert("Сначала обрежьте изображение");
      return;
    }

    // Get cropped image data
    const croppedCanvas = window.faceCropper.getCroppedCanvas();
    if (!croppedCanvas) {
      alert("Ошибка получения обрезанного изображения");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Отправка...";
    submitMsg.textContent = "";

    try {
      // Convert canvas to base64
      const croppedDataUrl = croppedCanvas.toDataURL('image/jpeg', 0.9);

      const payload = {
        iin: iinInput.value.trim(),
        user_id: confirmedUser.user_id,
        photo: croppedDataUrl
      };

      const resp = await fetch("/api/submit-face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        let msg = `Ошибка сервера (${resp.status})`;
        try {
          const j = await resp.json();
          msg = j.error || j.message || msg;
        } catch (e) {
          try {
            msg = await resp.text();
          } catch (e2) {
            // Keep default message
          }
        }
        submitMsg.style.color = "#c53030";
        submitMsg.textContent = msg;
        submitBtn.disabled = false;
        submitBtn.textContent = "Отправить";
        return;
      }

      submitMsg.style.color = "#166534";
      const j = await resp.json().catch(() => null);
      submitMsg.textContent = (j && (j.message || "Отправлено")) || "Отправлено";

      // Reset UI after successful submission
      setTimeout(() => {
        submitBtn.textContent = "Отправить";
        disablePhotoControls();
        userName.textContent = "";
        iinInput.value = "";
        submitMsg.textContent = "";
        confirmedUser = null;
      }, 1500);

    } catch (err) {
      console.error("Submission error:", err);
      submitMsg.style.color = "#c53030";
      submitMsg.textContent = "Сетевая ошибка";
      submitBtn.disabled = false;
      submitBtn.textContent = "Отправить";
    }
  });

  // Enhanced error handling for cropper
  document.addEventListener('cropperError', (e) => {
    const { error } = e.detail;
    console.error('Cropper error:', error);
    
    // Show error message
    if (submitMsg) {
      submitMsg.style.color = "#c53030";
      submitMsg.textContent = `Ошибка обработки изображения: ${error}`;
    }
  });

  // Initialize: ensure photo input initially disabled
  disablePhotoControls();

  // Additional validation for file size and type
  if (photoInput) {
    photoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        // Basic validation before cropper takes over
        if (!file.type.startsWith('image/')) {
          alert('Пожалуйста, выберите файл изображения');
          photoInput.value = '';
          return;
        }
        
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
          alert('Файл слишком большой. Максимальный размер: 10MB');
          photoInput.value = '';
          return;
        }
      }
    });
  }

  // Debug helper - can be removed in production
  window.debugFaceForm = {
    getConfirmedUser: () => confirmedUser,
    getCropper: () => window.faceCropper,
    isCropped: () => window.faceCropper ? window.faceCropper.isCropped() : false,
    getCroppedFile: () => window.faceCropper ? window.faceCropper.getCroppedFile() : null
  };
});
