import { execSync } from 'child_process'

function run(title, command) {
  console.log(`\n=== ${title} ===`)
  execSync(command, { stdio: 'inherit' })
}

run('scoring engine', 'npx tsx src/features/careerAssessment/engine/careerScoring.test.ts')
run('list progress', 'npx tsx src/features/careerAssessment/utils/careerListProgress.test.ts')
run('list rows', 'npx tsx src/features/careerAssessment/utils/careerListRows.test.ts')
run('parent nav', 'npx tsx src/components/parent/parentNavItems.test.ts')
console.log('\ncareer assessment verify OK')
