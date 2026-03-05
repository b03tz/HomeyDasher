<script setup lang="ts">
import { ref, watch } from "vue";

const props = defineProps<{
  open: boolean;
  modelValue?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [url: string];
  clear: [];
  close: [];
}>();

const activeTab = ref<"upload" | "library" | "url">("upload");

// Upload tab
const dragOver = ref(false);
const uploading = ref(false);
const uploadError = ref("");

async function uploadFile(file: File) {
  uploading.value = true;
  uploadError.value = "";
  try {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/uploads", { method: "POST", body: form });
    if (!res.ok) {
      const data = await res.json();
      uploadError.value = data.error || "Upload failed";
      return;
    }
    const data = await res.json();
    emit("update:modelValue", data.url);
    emit("close");
  } catch {
    uploadError.value = "Upload failed";
  } finally {
    uploading.value = false;
  }
}

function onFileInput(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) uploadFile(file);
  input.value = "";
}

function onDrop(event: DragEvent) {
  dragOver.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (file) uploadFile(file);
}

// Library tab
const libraryImages = ref<{ filename: string; url: string }[]>([]);
const libraryLoading = ref(false);

async function loadLibrary() {
  libraryLoading.value = true;
  try {
    const res = await fetch("/api/uploads");
    libraryImages.value = await res.json();
  } catch {
    libraryImages.value = [];
  } finally {
    libraryLoading.value = false;
  }
}

function selectFromLibrary(url: string) {
  emit("update:modelValue", url);
  emit("close");
}

async function deleteFromLibrary(filename: string) {
  await fetch(`/api/uploads/${filename}`, { method: "DELETE" });
  libraryImages.value = libraryImages.value.filter((i) => i.filename !== filename);
}

// URL tab
const externalUrl = ref("");

function submitUrl() {
  const url = externalUrl.value.trim();
  if (!url) return;
  emit("update:modelValue", url);
  emit("close");
}

// Load library when switching to library tab or opening modal
watch(
  () => [props.open, activeTab.value] as const,
  ([isOpen, tab]) => {
    if (isOpen && tab === "library") loadLibrary();
  }
);

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      activeTab.value = "upload";
      uploadError.value = "";
      externalUrl.value = "";
    }
  }
);
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="ip-overlay" @click.self="emit('close')">
      <div class="ip-modal">
        <div class="ip-header">
          <h2>Choose Image</h2>
          <button class="ip-close" @click="emit('close')">&times;</button>
        </div>

        <div class="ip-tabs">
          <button
            class="ip-tab"
            :class="{ active: activeTab === 'upload' }"
            @click="activeTab = 'upload'"
          >Upload</button>
          <button
            class="ip-tab"
            :class="{ active: activeTab === 'library' }"
            @click="activeTab = 'library'"
          >Library</button>
          <button
            class="ip-tab"
            :class="{ active: activeTab === 'url' }"
            @click="activeTab = 'url'"
          >URL</button>
        </div>

        <div class="ip-body">
          <!-- Upload tab -->
          <div v-if="activeTab === 'upload'" class="ip-upload">
            <div
              class="ip-dropzone"
              :class="{ 'drag-over': dragOver }"
              @dragover.prevent="dragOver = true"
              @dragleave="dragOver = false"
              @drop.prevent="onDrop"
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p v-if="!uploading">Drop an image here or click to browse</p>
              <p v-else>Uploading...</p>
              <input
                type="file"
                accept="image/*"
                class="ip-file-input"
                @change="onFileInput"
              />
            </div>
            <p v-if="uploadError" class="ip-error">{{ uploadError }}</p>
          </div>

          <!-- Library tab -->
          <div v-if="activeTab === 'library'" class="ip-library">
            <p v-if="libraryLoading" class="ip-empty">Loading...</p>
            <p v-else-if="libraryImages.length === 0" class="ip-empty">No images uploaded yet</p>
            <div v-else class="ip-grid">
              <div
                v-for="img in libraryImages"
                :key="img.filename"
                class="ip-thumb"
                @click="selectFromLibrary(img.url)"
              >
                <img :src="img.url" :alt="img.filename" />
                <button
                  class="ip-thumb-delete"
                  title="Delete image"
                  @click.stop="deleteFromLibrary(img.filename)"
                >&times;</button>
              </div>
            </div>
          </div>

          <!-- URL tab -->
          <div v-if="activeTab === 'url'" class="ip-url">
            <input
              v-model="externalUrl"
              type="url"
              class="ip-url-input"
              placeholder="https://example.com/image.jpg"
              @keyup.enter="submitUrl"
            />
            <div v-if="externalUrl.trim()" class="ip-url-preview">
              <img :src="externalUrl.trim()" alt="Preview" />
            </div>
            <button
              class="ip-url-btn"
              :disabled="!externalUrl.trim()"
              @click="submitUrl"
            >Use this URL</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.ip-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}

.ip-modal {
  background: rgba(12, 18, 30, 0.85);
  border: 1px solid rgba(79, 195, 247, 0.12);
  border-radius: var(--radius);
  width: 90%;
  max-width: 480px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
}

.ip-header {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.ip-header h2 {
  flex: 1;
  font-size: 1.1rem;
  font-weight: 600;
}

.ip-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.4rem;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
  min-width: 48px;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ip-close:hover {
  color: var(--text-primary);
}

.ip-tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
  padding: 0 20px;
}

.ip-tab {
  flex: 1;
  padding: 10px 0;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
}

.ip-tab:hover {
  color: var(--text-primary);
}

.ip-tab.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

.ip-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

/* Upload */
.ip-dropzone {
  border: 2px dashed var(--border);
  border-radius: 12px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  position: relative;
  transition: border-color 0.2s, background 0.2s;
  color: var(--text-secondary);
}

.ip-dropzone:hover,
.ip-dropzone.drag-over {
  border-color: var(--accent);
  background: rgba(79, 195, 247, 0.05);
}

.ip-dropzone p {
  margin-top: 12px;
  font-size: 0.9rem;
}

.ip-file-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.ip-error {
  color: var(--danger);
  font-size: 0.85rem;
  margin-top: 8px;
  text-align: center;
}

/* Library */
.ip-empty {
  text-align: center;
  color: var(--text-secondary);
  padding: 32px 0;
  font-size: 0.9rem;
}

.ip-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.ip-thumb {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.2s;
}

.ip-thumb:hover {
  border-color: var(--accent);
}

.ip-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ip-thumb-delete {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.7);
  color: var(--danger);
  border: none;
  font-size: 1rem;
  cursor: pointer;
  display: none;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.ip-thumb:hover .ip-thumb-delete {
  display: flex;
}

/* URL */
.ip-url {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ip-url-input {
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.9rem;
  outline: none;
}

.ip-url-input:focus {
  border-color: var(--accent);
}

.ip-url-preview {
  border-radius: 8px;
  overflow: hidden;
  max-height: 200px;
  background: rgba(0, 0, 0, 0.2);
}

.ip-url-preview img {
  width: 100%;
  max-height: 200px;
  object-fit: contain;
}

.ip-url-btn {
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px solid var(--accent);
  background: rgba(79, 195, 247, 0.1);
  color: var(--accent);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
}

.ip-url-btn:hover:not(:disabled) {
  background: rgba(79, 195, 247, 0.2);
}

.ip-url-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
