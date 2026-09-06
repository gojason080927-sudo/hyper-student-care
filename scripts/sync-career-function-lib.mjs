import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'

const destDir = 'supabase/functions/career-assessment/_lib'
mkdirSync(destDir, { recursive: true })

const files = [
  {
    from: 'src/features/careerAssessment/types.ts',
    to: 'types.ts',
    replace: [],
  },
  {
    from: 'src/features/careerAssessment/data/labels.ts',
    to: 'labels.ts',
    replace: [[/from '\.\.\/types'/g, "from './types.ts'"]],
  },
  {
    from: 'src/features/careerAssessment/engine/explanation.ts',
    to: 'explanation.ts',
    replace: [
      [/from '\.\.\/data\/labels'/g, "from './labels.ts'"],
      [/from '\.\.\/types'/g, "from './types.ts'"],
    ],
  },
  {
    from: 'src/features/careerAssessment/engine/scoring.ts',
    to: 'scoring.ts',
    replace: [
      [/from '\.\.\/data\/labels'/g, "from './labels.ts'"],
      [/from '\.\.\/types'/g, "from './types.ts'"],
      [/from '\.\/explanation'/g, "from './explanation.ts'"],
    ],
  },
]

for (const file of files) {
  const dest = join(destDir, file.to)
  mkdirSync(dirname(dest), { recursive: true })
  let text = readFileSync(file.from, 'utf8')
  for (const [pattern, value] of file.replace) {
    text = text.replace(pattern, value)
  }
  writeFileSync(dest, text)
}

console.log('synced career-assessment _lib')
