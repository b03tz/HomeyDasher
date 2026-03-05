# Backup and Restore

Homey Dasher lets you export all your dashboards and settings as a single JSON file, and restore them later. This is useful for migration, sharing setups, or keeping a safe copy before making big changes.

## Exporting a Backup

1. Open **Settings** > **System** tab
2. Click **Export Backup**
3. A JSON file is downloaded to your device, named `homecontrol-backup-YYYY-MM-DD.json`

### What's included in a backup

- All dashboards (widgets, positions, themes, background images references)
- Dashboard metadata (names, icons)
- Grid configuration
- Active dashboard selection
- Device name overrides

### What's NOT included

- Uploaded images (the image files themselves are not in the backup — only the URL references)
- Homey connection settings (address, token)

> If you're migrating to a new server, copy the `data/dashboards/uploads/` directory separately to preserve your uploaded images.

## Restoring a Backup

1. Open **Settings** > **System** tab
2. Click **Import Backup**
3. Select the backup JSON file
4. All existing dashboards are replaced with the backup contents

> **Warning:** Restoring a backup replaces everything. Your current dashboards will be overwritten. Export a backup first if you want to keep your current setup.

## Device Inspector

Also in the **System** tab, you'll find **Open Device Inspector** — a debug tool that lists all devices visible to Homey Dasher with their capabilities. Useful for troubleshooting when a device doesn't appear in the widget configuration, or to find the exact capability IDs.
