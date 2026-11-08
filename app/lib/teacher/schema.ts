import { z } from 'zod'

export const goalSchema = z.enum(['tef', 'viagem', 'intercambio'])
export type Goal = z.infer<typeof goalSchema>

export const goals: Record<Goal, { label: string; context: string }> = {
  tef: { label: 'Preparação para o TEF', context: 'leitura e compreensão para o TEF, sem alegar reproduzir questões oficiais' },
  viagem: { label: 'Viagem', context: 'comunicação prática em viagens, incluindo transporte, alimentação e situações cotidianas' },
  intercambio: { label: 'Intercâmbio', context: 'vida acadêmica e cotidiana em um intercâmbio francófono' },
}

const shortText = z.string().trim().min(1).max(500)
const optionId = z.enum(['A', 'B', 'C', 'D'])
export const questionSchema = z.object({
  prompt: shortText,
  options: z.array(z.object({ id: optionId, text: shortText })).length(4),
  correctId: optionId,
  explanation: shortText,
}).refine((question) => new Set(question.options.map((option) => option.id)).size === 4, 'Alternativas devem ser únicas')

export const onboardingSchema = z.object({
  introduction: shortText,
  questions: z.array(questionSchema).min(3).max(5),
})

const phaseSchema = z.object({ title: shortText, objective: shortText })
const exerciseSchema = questionSchema
export const lessonSchema = z.object({
  phases: z.array(phaseSchema).length(5),
  level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
  strengths: z.array(shortText).max(5),
  difficulties: z.array(shortText).max(5),
  exercise: exerciseSchema,
})
export const adaptationSchema = z.object({
  suggestedPhase: z.number().int().min(1).max(5),
  strengths: z.array(shortText).max(5),
  difficulties: z.array(shortText).max(5),
  encouragement: shortText,
  exercise: exerciseSchema,
})

export type Question = z.infer<typeof questionSchema>
export type Phase = z.infer<typeof phaseSchema>
export const journeySchema = z.discriminatedUnion('stage', [
  z.object({ stage: z.literal('placement'), goal: goalSchema, introduction: shortText, questions: z.array(questionSchema).min(3).max(5) }),
  z.object({
    stage: z.literal('lesson'), goal: goalSchema, phases: z.array(phaseSchema).length(5),
    level: lessonSchema.shape.level, phase: z.number().int().min(1).max(5),
    strengths: z.array(shortText).max(5), difficulties: z.array(shortText).max(5),
    attempts: z.number().int().nonnegative(), correct: z.number().int().nonnegative(),
    exercise: questionSchema,
    feedback: z.object({ correct: z.boolean(), explanation: shortText, encouragement: shortText }).nullable(),
  }),
])
export type Journey = z.infer<typeof journeySchema>

export const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('start'), goal: goalSchema, revision: z.number().int().positive().optional() }),
  z.object({ action: z.literal('placement'), answers: z.array(optionId).min(3).max(5), revision: z.number().int().positive() }),
  z.object({ action: z.literal('answer'), answer: optionId, revision: z.number().int().positive() }),
])
export type Action = z.infer<typeof actionSchema>

function publicQuestion(question: Question) {
  return { prompt: question.prompt, options: question.options }
}

export function publicJourney(journey: Journey, revision: number) {
  if (journey.stage === 'placement') {
    return { ...journey, questions: journey.questions.map(publicQuestion), revision }
  }
  return { ...journey, exercise: publicQuestion(journey.exercise), revision }
}

export function nextPhase(current: number, suggested: number, correct: boolean) {
  return correct ? Math.max(current, Math.min(current + 1, suggested, 5)) : current
}
