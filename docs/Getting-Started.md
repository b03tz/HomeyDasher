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

### Option A: Docker (recommended)

The easiest way to get running. A pre-built multi-architecture image (amd64 + arm64) is available on GitHub Container Registry.

```bash
docker run -d --name=homeydasher \
  --pull always \
  -p 3001:3001 \
  -e HOMEY_ADDRESS=http://YOUR_HOMEY_IP \
  -e HOMEY_TOKEN=YOUR_API_TOKEN \
  -e TZ=Europe/Amsterdam \
  -v homeydasher-data:/app/data \
  --restart always \
  ghcr.io/b03tz/homeydasher:latest
```

Replace:
- `YOUR_HOMEY_IP` with your Homey's IP address (e.g. `192.168.1.100`)
- `YOUR_API_TOKEN` with the token from Step 1
- `Europe/Amsterdam` with your timezone

Homey Dasher will be available at **http://your-host:3001**.

#### Docker Compose

If you prefer Docker Compose, create a `docker-compose.yml`:

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
    volumes:
      - homeydasher-data:/app/data

volumes:
  homeydasher-data:
```

Then run:

```bash
docker compose up -d
```

#### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `HOMEY_ADDRESS` | Yes | — | Your Homey Pro's local address (e.g. `http://192.168.1.100`) |
| `HOMEY_TOKEN` | Yes | — | API token generated in Step 1 |
| `PORT` | No | `3001` | HTTP port the server listens on |
| `DATA_DIR` | No | `/app/data` | Directory for persistent data (dashboards, uploads) |
| `TZ` | No | System default | Timezone (e.g. `Europe/Amsterdam`) |

---

### Option B: Synology NAS

#### 1. Create the data folder

Open **File Station**, navigate to the `docker` folder, and create a subfolder called `homeydasher`.

#### 2. Create a scheduled task

Go to **Control Panel** > **Task Scheduler** > **Create** > **Scheduled Task** > **User-defined script**.

Configure the task:

- **Task:** `Install homeydasher`
- **Enabled:** Unchecked
- **User:** `root`
- **Schedule tab:** Select "Run on the following date", set to "Do not repeat"
- **Task Settings tab:** Check "Send run details by email" and enter your email

In the **User-defined script** field, paste:

```bash
docker run -d --name=homeydasher \
  --pull always \
  -p 3001:3001 \
  -e HOMEY_ADDRESS=http://YOUR_HOMEY_IP \
  -e HOMEY_TOKEN=YOUR_API_TOKEN \
  -e TZ=Europe/Amsterdam \
  -v /volume1/docker/homeydasher:/app/data \
  --restart always \
  ghcr.io/b03tz/homeydasher:latest
```

Save the task, click **OK** on the warning, and enter your DSM password to confirm.

#### 3. Run the task

Select the task and click **Run**. Homey Dasher will be available at **http://YOUR_NAS_IP:3001**.

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
2. **[Add widgets](Widgets.md)** — pick from 19 widget types to display and control your devices
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
