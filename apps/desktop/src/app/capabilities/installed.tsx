import { useStore } from '@nanostores/react'
import { lazy } from 'react'

import { registry } from '@/contrib/registry'
import { translateNow } from '@/i18n'
import { subscribeRuntimeI18nLocale } from '@/i18n/runtime'
import { useStoreSelector } from '@/lib/use-session-slice'
import { $gateway, activeGatewayConnectionId } from '@/store/gateway'
import { $activeGatewayProfile } from '@/store/profile'

import { ROUTES_AREA, SIDEBAR_NAV_AREA } from '../routes'

const CapabilitiesView = lazy(async () => ({ default: (await import('./index')).CapabilitiesView }))
const installedPath = '/installed'

function InstalledCapabilitiesPage() {
  const profile = useStore($activeGatewayProfile)
  const connectionId = useStoreSelector($gateway, () => activeGatewayConnectionId() ?? 'local')

  return (
    <CapabilitiesView
      aria-label={translateNow('catalog.installed')}
      fixedConnection={connectionId}
      fixedProfile={profile}
      installedOnly
      key={`${connectionId}:${profile}`}
    />
  )
}

export function registerInstalledCapabilities() {
  const register = () => {
    const label = translateNow('catalog.installed')

    registry.registerMany([
      {
        id: 'installed',
        area: ROUTES_AREA,
        title: label,
        data: { path: installedPath },
        render: () => <InstalledCapabilitiesPage />
      },
      {
        id: 'installed',
        area: SIDEBAR_NAV_AREA,
        data: { path: installedPath, codicon: 'extensions', label }
      }
    ])
  }

  register()
  subscribeRuntimeI18nLocale(register)
}
