# Getting Started

This guide walks you through setting up Homey Dasher from scratch.

## Prerequisites

- **Homey Pro** on your local network
- A device to run Homey Dasher on (NAS, Raspberry Pi, PC, or anything with Docker/Node.js)
- Your Homey's local IP address (e.g. `http://192.168.1.100`)

## Step 1: Generate a Homey API Token

Homey Dasher connects to your Homey Pro via its local API. You need an API token to authenticate.

1. Log in to [https://my.homey.app](https://my.homey.app)
2. Go to **Settings** (cog icon at the bottom left)
3. Click **API Keys** (or "API-Sleutels" in Dutch)
4. Click **New API Key** ("Nieuwe API sleutel")
5. Grant access to at least: **Devices**, **Flows**, **Variables**, **Zones**, and **Moods**
   - To be safe, check **Homey** at the top to grant all permissions
6. Copy the generated token — you'll need it in the next step

## Step 2: Install Homey Dasher

Choose the method that works best for your setup.

---

### Option A: Docker Compose (recommended)

The easiest way to get running. A pre-built multi-architecture image (amd64 + arm64) is available on GitHub Container Registry.

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
      - HOMEY_TOKEN=YOUR_API_TOKEN
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

Replace:
- `YOUR_HOMEY_IP` with your Homey's IP address (e.g. `192.168.1.100`)
- `YOUR_API_TOKEN` with the token from Step 1
- `Europe/Amsterdam` with your timezone

Then run:

```bash
docker compose up -d
```

Homey Dasher will be available at **http://your-host:3001**.

> **Note:** If you don't use camera widgets, you can omit the `go2rtc` service and the `GO2RTC_URL` / `depends_on` lines.

#### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `HOMEY_ADDRESS` | Yes | — | Your Homey Pro's local address (e.g. `http://192.168.1.100`) |
| `HOMEY_TOKEN` | Yes | — | API token generated in Step 1 |
| `PORT` | No | `3001` | HTTP port the server listens on |
| `DATA_DIR` | No | `/app/data` | Directory for persistent data (dashboards, uploads) |
| `GO2RTC_URL` | No | `http://localhost:1984` | URL of the go2rtc instance (for camera widget streams) |
| `TZ` | No | System default | Timezone (e.g. `Europe/Amsterdam`) |

---

### Option B: Synology NAS

Synology Container Manager supports Docker Compose via its **Project** feature.

#### 1. Create the project folder

Open **File Station**, navigate to the `docker` folder, and create a subfolder called `homeydasher`.

Inside that folder, create a file called `docker-compose.yml` with the following contents (replace `YOUR_HOMEY_IP` and `YOUR_API_TOKEN` with your actual values):

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
      - HOMEY_TOKEN=YOUR_API_TOKEN
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

#### 2. Create a Project in Container Manager

1. Open **Container Manager** > **Project**
2. Click **Create**
3. Set the project name to `homeydasher`
4. Set the path to `/volume1/docker/homeydasher`
5. Select **Use existing docker-compose.yml**
6. Click **Next**, review the settings, and click **Done**

Container Manager will pull the images and start both containers.

#### 3. Open the dashboard

Homey Dasher will be available at **http://YOUR_NAS_IP:3001**.

---

### Option C: Manual Installation

Requirements: **Node.js 18+** and **pnpm**.

#### 1. Clone and install

```bash
git clone https://github.com/b03tz/HomeyDasher.git
cd HomeyDasher
pnpm install
```

#### 2. Configure

Create a `.env` file in the project root:

```env
HOMEY_ADDRESS=http://YOUR_HOMEY_IP
HOMEY_TOKEN=YOUR_API_TOKEN
```

#### 3. Run in development mode

```bash
# Terminal 1 — Backend (port 3001)
pnpm --filter @homecontrol/backend dev

# Terminal 2 — Frontend (port 5173, proxies to backend)
pnpm --filter @homecontrol/frontend dev
```

Open **http://localhost:5173** in your browser.

#### 4. Production build

```bash
pnpm build
node packages/backend/dist/index.js
```

The backend serves both the API and frontend on port **3001**.

---

## Step 3: Open the Dashboard

Navigate to your Homey Dasher URL in a browser. You'll see an empty dashboard ready to be configured.

**What to do next:**

1. **[Create your first dashboard](Dashboard-Management.md)** — set up the grid, background, and layout
2. **[Add widgets](Widgets.md)** — pick from 20 widget types to display and control your devices
3. **[Customize the look](Theming.md)** — apply custom colors and backgrounds to individual widgets

## Connection Status

The header shows a small colored dot indicating the connection to your Homey:

| Color | Status | Meaning |
|-------|--------|---------|
| Green | Connected | Live connection to Homey, real-time updates active |
| Orange | Reconnecting | Connection lost, attempting to reconnect |
| Red | Disconnected | No connection — check your Homey address and network |

## Hiding the Header

For a clean full-screen look on wall-mounted displays:

1. Click the chevron-up button in the header
2. The header hides and a small pill appears at the top center of the screen
3. Tap the pill to bring the header back
