import { logger } from '@/lib/logger'
import { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import { isRestrictedMode } from '@/utils/restrictedMode'
import assetManifest from '@/constants/assetManifest.json'
import { withAccessPolicy } from '@/lib/accessPolicy/withAccessPolicy'
import { routePolicies } from '@/lib/accessPolicy/routePolicies'

export type LivLivModelEntry = {
  path: string
  name: string
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (isRestrictedMode()) {
    return res.status(200).json(assetManifest.livliv ?? [])
  }

  const livlivDir = path.join(process.cwd(), 'public/livliv')

  try {
    if (!fs.existsSync(livlivDir)) {
      return res.status(200).json([])
    }

    const entries = await fs.promises.readdir(livlivDir, {
      withFileTypes: true,
    })
    const models: LivLivModelEntry[] = []

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      if (entry.isFile() && entry.name.toLowerCase().endsWith('.livliv')) {
        models.push({
          path: `/livliv/${entry.name}`,
          name: entry.name.replace(/\.livliv$/i, ''),
        })
        continue
      }
      if (!entry.isDirectory()) continue
      const manifestPath = path.join(livlivDir, entry.name, 'model.json')
      if (fs.existsSync(manifestPath)) {
        models.push({
          path: `/livliv/${entry.name}/`,
          name: entry.name,
        })
      }
    }

    models.sort((a, b) => a.name.localeCompare(b.name))
    res.status(200).json(models)
  } catch (error) {
    logger.error('Error reading LivLiv directory:', error)
    res.status(500).json({
      error: 'Failed to get LivLiv model list',
    })
  }
}

export default withAccessPolicy(routePolicies['/api/get-livliv-list'], handler)
