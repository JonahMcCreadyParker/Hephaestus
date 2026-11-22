import fs from 'node:fs'
import path from 'node:path'

import { app, shell } from 'electron'

import brand from '../desktop-brand.json'

export function registerHephaestusShortcuts(log: (message: string) => void): void {
  const target = process.execPath
  const previousTarget = path.join(path.dirname(target), 'Hermes.exe')
  const resourcesIcon = path.join(process.resourcesPath, 'icon.ico')

  const directories = [
    path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
    app.getPath('desktop')
  ]

  for (const directory of directories) {
    const shortcut = path.join(directory, `${brand.name}.lnk`)
    const previousShortcut = path.join(directory, 'Hermes.lnk')

    try {
      if (fs.existsSync(shortcut)) {
        const existing = shell.readShortcutLink(shortcut)

        if (existing.target.toLowerCase() !== target.toLowerCase()) {
          continue
        }

        if (
          existing.appUserModelId !== brand.appId &&
          !shell.writeShortcutLink(shortcut, 'update', { target, appUserModelId: brand.appId })
        ) {
          throw new Error('Could not set the shortcut app identity')
        }
      } else if (!shell.writeShortcutLink(shortcut, 'create', {
        target,
        appUserModelId: brand.appId,
        cwd: app.getPath('home'),
        description: brand.attribution,
        icon: fs.existsSync(resourcesIcon) ? resourcesIcon : target,
        iconIndex: 0
      })) {
        throw new Error('Could not create the shortcut')
      }

      // This replaces only the old, uncustomized shortcut for the same checkout.
      if (fs.existsSync(previousShortcut)) {
        const previous = shell.readShortcutLink(previousShortcut)

        if (previous.target.toLowerCase() === previousTarget.toLowerCase() && !previous.args) {
          fs.unlinkSync(previousShortcut)
        }
      }
    } catch (error) {
      log(`[shortcuts] ${shortcut}: ${String(error)}`)
    }
  }
}
