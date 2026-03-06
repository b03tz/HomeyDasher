<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from "vue";
import type { CameraWidget as CameraWidgetType } from "@homecontrol/shared";
import WidgetHeader from "../WidgetHeader.vue";

const props = defineProps<{
  widget: CameraWidgetType;
}>();

const videoEl = ref<HTMLVideoElement | null>(null);
const error = ref("");
const connected = ref(false);

let ws: WebSocket | null = null;
let mediaSource: MediaSource | null = null;
let sourceBuffer: SourceBuffer | null = null;
let bufferQueue: ArrayBuffer[] = [];
let isUpdating = false;

/** Derive the same safe stream name as the backend */
function rtspUrlToStreamName(rtspUrl: string): string {
  try {
    const u = new URL(rtspUrl);
    const host = u.hostname.replace(/\./g, "_");
    const port = u.port && u.port !== "554" ? `_${u.port}` : "";
    const path = u.pathname.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
    return `cam_${host}${port}${path ? "_" + path : ""}`;
  } catch {
    return "cam_" + rtspUrl.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_").slice(0, 60);
  }
}

/** Codecs supported by go2rtc — filter to what the browser actually supports */
const GO2RTC_CODECS = [
  'avc1.640029',      // H.264 high 4.1
  'avc1.64002A',      // H.264 high 4.2
  'avc1.640033',      // H.264 high 5.1
  'hvc1.1.6.L153.B0', // H.265 main 5.1
  'mp4a.40.2',        // AAC LC
  'mp4a.40.5',        // AAC HE
  'flac',
  'opus',
];

function supportedCodecs(): string {
  const MS = (window as any).ManagedMediaSource || MediaSource;
  if (!MS?.isTypeSupported) return '';
  return GO2RTC_CODECS
    .filter(c => MS.isTypeSupported(`video/mp4; codecs="${c}"`))
    .join();
}

const wsUrl = computed(() => {
  const rtsp = props.widget.config.rtspUrl;
  if (!rtsp) return "";
  const streamName = rtspUrlToStreamName(rtsp);
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  // In production the backend serves the frontend (same origin).
  // In dev, Vite runs on 5173 — connect to the backend directly on 3001
  // to avoid Vite's WebSocket proxy issues with Origin headers.
  const host = import.meta.env.DEV
    ? `${window.location.hostname}:3001`
    : window.location.host;
  return `${proto}//${host}/api/go2rtc/ws?src=${encodeURIComponent(streamName)}`;
});

function appendBuffer() {
  if (!sourceBuffer || isUpdating || bufferQueue.length === 0) return;
  if (sourceBuffer.updating) return;
  isUpdating = true;
  const buf = bufferQueue.shift()!;
  try {
    sourceBuffer.appendBuffer(buf);
  } catch {
    // Buffer full — remove old data and retry
    isUpdating = false;
  }
}

function connect() {
  disconnect();
  error.value = "";

  if (!wsUrl.value) {
    error.value = "No RTSP URL configured.";
    return;
  }

  try {
    ws = new WebSocket(wsUrl.value);
    ws.binaryType = "arraybuffer";
  } catch (e) {
    error.value = `Connection failed: ${(e as Error).message}`;
    return;
  }

  ws.onopen = () => {
    // Request MSE stream with supported codecs (matches go2rtc's video-rtc.js protocol)
    const codecs = supportedCodecs();
    ws!.send(JSON.stringify({ type: "mse", value: codecs }));
  };

  ws.onmessage = (event) => {
    if (typeof event.data === "string") {
      const msg = JSON.parse(event.data);
      if (msg.type === "mse") {
        // msg.value contains the codec string, e.g. 'video/mp4; codecs="avc1.640029"'
        setupMediaSource(msg.value);
      }
    } else {
      // Binary — queue for SourceBuffer
      bufferQueue.push(event.data);
      appendBuffer();
    }
  };

  ws.onerror = () => {
    error.value = "WebSocket error — check that go2rtc is running alongside the app.";
  };

  ws.onclose = () => {
    connected.value = false;
  };
}

function setupMediaSource(codec: string) {
  if (!videoEl.value) return;

  mediaSource = new MediaSource();
  videoEl.value.src = URL.createObjectURL(mediaSource);

  mediaSource.addEventListener("sourceopen", () => {
    try {
      sourceBuffer = mediaSource!.addSourceBuffer(codec);
      sourceBuffer.mode = "segments";
      sourceBuffer.addEventListener("updateend", () => {
        isUpdating = false;
        appendBuffer();
        // Keep buffer trimmed to ~10s to prevent memory growth
        if (sourceBuffer && !sourceBuffer.updating && videoEl.value) {
          const buffered = sourceBuffer.buffered;
          if (buffered.length > 0) {
            const end = buffered.end(buffered.length - 1);
            if (end - buffered.start(0) > 10) {
              try { sourceBuffer.remove(0, end - 5); } catch { /* ignore */ }
            }
          }
        }
      });
      connected.value = true;
      // Auto-play
      videoEl.value?.play().catch(() => { /* autoplay blocked — user can tap */ });
    } catch (e) {
      error.value = `Codec not supported: ${codec}`;
    }
  });
}

function disconnect() {
  if (ws) {
    ws.onopen = null;
    ws.onmessage = null;
    ws.onerror = null;
    ws.onclose = null;
    ws.close();
    ws = null;
  }
  if (mediaSource && mediaSource.readyState === "open") {
    try { mediaSource.endOfStream(); } catch { /* ignore */ }
  }
  sourceBuffer = null;
  mediaSource = null;
  bufferQueue = [];
  isUpdating = false;
  connected.value = false;
}

function onVisibilityChange() {
  if (document.hidden) {
    disconnect();
  } else {
    connect();
  }
}

onMounted(() => {
  connect();
  document.addEventListener("visibilitychange", onVisibilityChange);
});
onUnmounted(() => {
  disconnect();
  document.removeEventListener("visibilitychange", onVisibilityChange);
});
watch(wsUrl, connect);
</script>

<template>
  <div class="camera-widget">
    <WidgetHeader :title="widget.title" :hidden="widget.hideTitle" />
    <div class="camera-view">
      <video
        v-show="connected && !error"
        ref="videoEl"
        muted
        autoplay
        playsinline
        class="camera-video"
      />
      <div v-if="error" class="camera-error">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
        <span class="error-text">{{ error }}</span>
        <button class="retry-btn" @click="connect">Retry</button>
      </div>
      <div v-else-if="!connected" class="camera-loading">Connecting...</div>
    </div>
  </div>
</template>

<style scoped>
.camera-widget {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  backdrop-filter: blur(var(--card-blur, 18px));
  -webkit-backdrop-filter: blur(var(--card-blur, 18px));
  box-shadow: var(--card-shadow);
  transition: box-shadow 0.3s, border-color 0.3s;
}

.camera-widget:hover {
  border-color: rgba(79, 195, 247, 0.5);
  box-shadow: var(--card-shadow), 0 0 24px rgba(79, 195, 247, 0.12);
}

.camera-view {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  position: relative;
  border-radius: 6px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.4);
}

.camera-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.camera-loading {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.camera-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary);
  font-size: 0.8rem;
  padding: 12px;
  text-align: center;
}

.camera-error svg { opacity: 0.4; }

.error-text { max-width: 200px; }

.retry-btn {
  padding: 4px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.8rem;
  cursor: pointer;
}

.retry-btn:hover { border-color: var(--accent); }
</style>
