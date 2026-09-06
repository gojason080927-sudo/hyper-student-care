import { CAREER_MAJOR_DICTIONARY } from '../src/features/careerAssessment/data/majorDictionary.ts'
import { CAREER_MAJOR_PROFILES } from '../src/features/careerAssessment/data/majorProfiles.ts'
import { CAREER_QUESTIONS } from '../src/features/careerAssessment/data/questions.ts'
import { DEFAULT_FIT_BANDS } from '../src/features/careerAssessment/data/labels.ts'

process.stdout.write(
  JSON.stringify({
    questions: CAREER_QUESTIONS,
    profiles: CAREER_MAJOR_PROFILES,
    dictionary: CAREER_MAJOR_DICTIONARY,
    bands: DEFAULT_FIT_BANDS,
  }),
)
