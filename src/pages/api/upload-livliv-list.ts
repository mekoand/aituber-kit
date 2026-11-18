import { logger } from '@/lib/logger'
import { NextApiRequest, NextApiResponse } from 'next'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'
import { withAccessPolicy } from '@/lib/accessPolicy/withAccessPolicy'
import { routePolicies } from '@/lib/accessPolicy/routePolicies'
import {
  isPathInsideDirectory,
  livlivUploadFileName,
} from '@/features/livliv/livlivFileName'

export const config = {
  api: {
    bodyParser: false,
  },
}

const formOptions = {
  maxFileSize: 200 * 1024 * 1024,
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const form = formidable(formOptions)

  try {
    const [, files] = await form.parse(req)
    const file = files.file?.[0]

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const fileName = livlivUploadFileName(file.originalFilename)
    if (!fileName) {
      return res.status(400).json({
        error: 'Invalid file type',
        message: 'Only .livliv files can be uploaded',
      })
    }

    const livlivDir = path.join(process.cwd(), 'public/livliv')
    if (!fs.existsSync(livlivDir)) {
      fs.mkdirSync(livlivDir, { recursive: true })
    }

    const newPath = path.join(livlivDir, fileName)
    if (!isPathInsideDirectory(livlivDir, newPath)) {
      return res.status(400).json({
        error: 'Invalid file type',
        message: 'Only .livliv files can be uploaded',
      })
    }

    await fs.promises.copyFile(file.filepath, newPath)

    res.status(200).json({
      path: `/livliv/${fileName}`,
    })
  } catch (error) {
    logger.error('Failed to upload LivLiv model:', error)
    res.status(500).json({ error: 'Failed to upload file' })
  }
}

export default withAccessPolicy(
  routePolicies['/api/upload-livliv-list'],
  handler
)
