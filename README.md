<p align="center">
  <img src="screenshots/screenshot_1.png" alt="HomeyDasher Dashboard" width="100%" />
</p>

<h1 align="center">Homey Dasher</h1>

<p align="center">
  A customizable, real-time web dashboard for <strong>Homey Pro</strong>.<br/>
  Built with Vue 3 and Fastify, designed to run on anything from a Raspberry Pi touchscreen to a NAS.
</p>

<p align="center">
  HomeyDasher connects to your Homey Pro via its local API and gives you a drag-and-drop dashboard with live state updates over Socket.io.
</p>

---

## Features

- **Real-time updates** — Device states sync instantly via Socket.io
- **Drag-and-drop dashboard editor** — Resize and position widgets freely on a configurable grid
- **Multiple dashboards** — Create separate dashboards with their own layouts and switch between them
- **Per-widget theming** — Customize colors, backgrounds, and images on every widget individually
- **Background images** — Set custom backgrounds per dashboard or per widget with blur and overlay controls
- **Backup & restore** — Export and import dashboard configurations as JSON
- **7,600+ icons** — Material Design Icons (MDI) via Iconify, bundled offline — searchable icon picker for switches, buttons, dashboards, and more
- **Dark themed** — Built for always-on wall-mounted displays
- **Camera streams** — Live RTSP camera feeds via go2rtc (MSE/WebSocket)
- **Docker ready** — Deploy with Docker Compose (includes go2rtc sidecar for camera streams)

### Widget Library

**22 widget types** across four categories:

| Display | Charts | Control | Utility |
|---------|--------|---------|---------|
| Number | Insights Line Chart | Switch | Text |
| Status (LED) | Live Chart | Slider | Container |
| Gauge | Bar Chart | Knob | Dashboard Switch |
| Group Status | Pie / Doughnut | Flow Button | |
| Weather | Multi-Line Chart | Enum | |
| Clock | | Image Switch | |
| Camera | | | |
| Battery | | | |

---

## Screenshots

### Dashboard Examples

Two different dashboard layouts showing the variety of widgets working together — gauges, charts, switches, status LEDs, weather, and more.

<p align="center">
  <img src="screenshots/screenshot_1.png" alt="Dashboard example 1" width="100%" />
</p>

<p align="center">
  <img src="screenshots/screenshot_2.png" alt="Dashboard example 2" width="100%" />
</p>

### Battery & Image Switch Dashboard

Battery indicators, image-based switches, and large slider/toggle controls.

<p align="center">
  <img src="screenshots/screenshot_battery.png" alt="Battery dashboard" width="100%" />
</p>

### Icon Picker (7,600+ Material Design Icons)

Every switch, flow button, and dashboard can have a custom icon chosen from the full Material Design Icons library. Search by keyword to find the perfect icon.

<p align="center">
  <img src="screenshots/screenshot_icon_picker.png" alt="Icon picker" width="49%" />
  <img src="screenshots/screenshot_icon_picker_search.png" alt="Icon picker search" width="49%" />
</p>

### Add Widget Wizard

Widgets are organized into four categories: Display, Charts, Control, and Utility. Pick a type, configure it, and place it on the grid.

<p align="center">
  <img src="screenshots/screenshot_widgets_1.png" alt="Widget wizard — Display" width="49%" />
  <img src="screenshots/screenshot_widgets_2.png" alt="Widget wizard — Charts" width="49%" />
</p>

<p align="center">
  <img src="screenshots/screenshot_widgets_3.png" alt="Widget wizard — Control" width="49%" />
  <img src="screenshots/screenshot_widgets_4.png" alt="Widget wizard — Utility" width="49%" />
</p>

### Widget Configuration

Every widget has a full configuration panel. Set data sources, units, multipliers, decimals, colors, and more — all in a clean modal editor.

<p align="center">
  <img src="screenshots/screenshot_widget_configuration.png" alt="Widget configuration" width="60%" />
</p>

### Per-Widget Theming

Each widget can be individually themed with custom colors for background, text, borders, and accent. Copy and paste themes between widgets or apply to all widgets at once. Widgets can also have their own background images.

<p align="center">
  <img src="screenshots/screenshot_widget_theming.png" alt="Widget theming" width="60%" />
</p>

### Grid Editor

Drag widgets to reposition them, resize by adjusting column and row spans. The grid overlay shows available placement slots.

<p align="center">
  <img src="screenshots/screenshot_grid_move.png" alt="Grid drag and drop" width="80%" />
</p>

### Settings

Manage multiple dashboards, configure grid dimensions, set background images with blur and overlay, and adjust widget appearance globally.

<p align="center">
  <img src="screenshots/screenshot_settings.png" alt="Settings panel" width="80%" />
</p>

---

## Prerequisites

- **Homey Pro** on your local network
- **Homey API token** — To generate one:
  1. Log in to [https://my.homey.app](https://my.homey.app)
  2. Go to **Settings** (cog icon at the bottom left)
  3. Click **API Keys** (or "API-Sleutels" in Dutch)
  4. Click **New API Key** ("Nieuwe API sleutel")
  5. Grant access to at least: **Devices, Flows, Variables, Zones, and Moods**. To be safe, check **Homey** at the top to grant all permissions.
- Your Homey's local IP address (e.g. `http://192.168.1.100`)

---

## Installation

### Docker Compose (recommended)

The easiest way to run HomeyDasher. A pre-built image is available on GitHub Container Registry.

Camera widgets require [go2rtc](https://github.com/AlexxIT/go2rtc) as a sidecar container to transcode RTSP streams. The docker-compose setup below includes everything you need.

Create a `docker-compose.yml`:

```yaml
services:
  homeydasher:
    image: ghcr.io/b03tz/homeydasher:latest
    container_name: homeydasher
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      - HOMEY_ADDRESS=http://YOUR_HOMEY_IP
      - HOMEY_TOKEN=YOUR_HOMEY_API_TOKEN
      - TZ=Europe/Amsterdam
      - DATA_DIR=/app/data
      - GO2RTC_URL=http://go2rtc:1984
    volumes:
      - homeydasher-data:/app/data
    depends_on:
      - go2rtc

  go2rtc:
    image: alexxit/go2rtc
    container_name: go2rtc
    restart: unless-stopped

volumes:
  homeydasher-data:
```

Then run:

```bash
docker compose up -d
```

HomeyDasher will be available at `http://localhost:3001/`.

> **Note:** If you don't use camera widgets, you can omit the `go2rtc` service and the `GO2RTC_URL` / `depends_on` lines.

---

### Synology NAS

Synology Container Manager supports Docker Compose via its **Project** feature.

#### Step 1 — Create the project folder

Open **File Station**, navigate to the `docker` folder, and create a subfolder called `homeydasher`.

Inside that folder, create a file called `docker-compose.yml` with the following contents (replace `YOUR_HOMEY_IP` and `YOUR_HOMEY_API_TOKEN` with your actual values):

```yaml
services:
  homeydasher:
    image: ghcr.io/b03tz/homeydasher:latest
    container_name: homeydasher
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      - HOMEY_ADDRESS=http://YOUR_HOMEY_IP
      - HOMEY_TOKEN=YOUR_HOMEY_API_TOKEN
      - TZ=Europe/Amsterdam
      - DATA_DIR=/app/data
      - GO2RTC_URL=http://go2rtc:1984
    volumes:
      - homeydasher-data:/app/data
    depends_on:
      - go2rtc

  go2rtc:
    image: alexxit/go2rtc
    container_name: go2rtc
    restart: unless-stopped

volumes:
  homeydasher-data:
```

#### Step 2 — Create a Project in Container Manager

1. Open **Container Manager** > **Project**
2. Click **Create**
3. Set the project name to `homeydasher`
4. Set the path to `/volume1/docker/homeydasher`
5. Select **Use existing docker-compose.yml**
6. Click **Next**, review the settings, and click **Done**

Container Manager will pull the images and start both containers.

#### Step 3 — Open the dashboard

HomeyDasher will be available at `http://YOUR_NAS_IP:3001/`.

---

### Manual installation

Requirements: **Node.js >= 18** and **pnpm**.

#### 1. Clone and install dependencies

```bash
git clone https://github.com/b03tz/HomeyDasher.git
cd HomeyDasher
pnpm install
```

#### 2. Configure environment

Create a `.env` file in the project root:

```env
HOMEY_ADDRESS=http://YOUR_HOMEY_IP
HOMEY_TOKEN=YOUR_HOMEY_API_TOKEN
```

#### 3. Development

Run the backend and frontend in dev mode:

```bash
# Terminal 1 — Backend (port 3001)
pnpm --filter @homecontrol/backend dev

# Terminal 2 — Frontend (port 5173, proxies API to backend)
pnpm --filter @homecontrol/frontend dev
```

Open `http://localhost:5173/` in your browser.

#### 4. Production build

```bash
pnpm build
node packages/backend/dist/index.js
```

The backend serves both the API and the frontend build on port **3001**.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Vue 3, Vite, Pinia, Chart.js, Socket.io client |
| Backend | Fastify, Socket.io, homey-api |
| Shared | TypeScript type definitions |
| Monorepo | pnpm workspaces |

## License

This project is licensed under [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/).

You are free to use and share this software with attribution. You may modify it for personal use, but you may not distribute modified versions or use it commercially.
