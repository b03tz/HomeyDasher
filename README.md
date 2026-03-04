# HomeyDasher

A customizable, real-time web dashboard for **Homey Pro**. Built with Vue 3 and Fastify, designed to run on anything from a Raspberry Pi touchscreen to a NAS.

HomeyDasher connects to your Homey Pro via its local API and gives you a drag-and-drop dashboard with live state updates over Socket.io.

## Features

- **Real-time updates** — Device states sync instantly via Socket.io
- **Drag-and-drop dashboard editor** — Resize and position widgets freely on a grid
- **Multiple dashboards** — Create separate dashboards and switch between them
- **18 widget types:**
  - **Switch** — Toggle devices on/off
  - **Button** — Trigger Homey flows
  - **Slider** — Control numeric values with a range input
  - **Knob** — Rotary control for numeric values
  - **Gauge** — Display values with warning/danger thresholds
  - **Number** — Show numeric readings (small/medium/large)
  - **Status** — Device capability status (list or LED mode)
  - **Group Status** — Aggregate multiple devices (count, allOff, sum)
  - **Text** — Custom text or HTML content
  - **Clock** — Analog or digital clock with date
  - **Chart** — Historical device data (1 hour to 31 days)
  - **Live Chart** — Real-time streaming data
  - **Weather** — Weather data from Homey
  - **Enum** — Capability option selector (popup or scroll)
  - **Container** — Nested widget grid (2-8 columns, 1-8 rows)
  - **Dashboard Switch** — Quick navigation between dashboards
- **Backup & restore** — Export and import dashboard configurations
- **Dark themed** — Built for wall-mounted displays

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

### Docker (recommended)

The easiest way to run HomeyDasher. A pre-built image is available on GitHub Container Registry.

```bash
docker run -d --name=homeydasher \
  -p 3001:3001 \
  -e HOMEY_ADDRESS=http://YOUR_HOMEY_IP \
  -e HOMEY_TOKEN=YOUR_HOMEY_API_TOKEN \
  -e TZ=Europe/Amsterdam \
  -v homeydasher-data:/app/data \
  --restart always \
  ghcr.io/b03tz/homecontrol:latest
```

HomeyDasher will be available at `http://localhost:3001/`.

#### Docker Compose

Create a `docker-compose.yml`:

```yaml
services:
  homeydasher:
    image: ghcr.io/b03tz/homecontrol:latest
    container_name: homeydasher
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      - HOMEY_ADDRESS=http://YOUR_HOMEY_IP
      - HOMEY_TOKEN=YOUR_HOMEY_API_TOKEN
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

---

### Synology NAS

#### Step 1 — Create the data folder

Open **File Station**, navigate to the `docker` folder, and create a new subfolder called `homeydasher` (all lowercase).

#### Step 2 — Create a scheduled task

Go to **Control Panel** > **Task Scheduler** > **Create** > **Scheduled Task** > **User-defined script**.

Configure the task:

- **Task:** `Install homeydasher`
- **Enabled:** Unchecked
- **User:** `root`
- **Schedule tab:** Select "Run on the following date" (leave the date as-is), set to "Do not repeat"
- **Task Settings tab:** Check "Send run details by email" and enter your email address

In the **User-defined script** field, paste the following (replace `yourHomeyIP` and `yourHomeyApiToken` with your actual values):

```bash
docker run -d --name=homeydasher \
-p 3001:3001 \
-e HOMEY_ADDRESS=http://yourhomeyIP \
-e HOMEY_TOKEN=yourHomeyApiToken \
-e TZ=Europe/Amsterdam \
-v /volume1/docker/homeydasher:/app/data \
--restart always \
ghcr.io/b03tz/homecontrol:latest
```

Save the task and press **OK** on the warning dialog. It will ask for your DSM password to confirm.

#### Step 3 — Run the task

Click the task and press the **Run** button at the top (or right-click > Run), then click **OK**.

HomeyDasher will now be installed and available at `http://YOUR_NAS_IP:3001/`.

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
