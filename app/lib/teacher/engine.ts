import { z } from 'zod'
import { questionShape } from './ai'
import {
  adaptationSchema, lessonSchema, nextPhase, onboardingSchema,
  type Action, type Goal, type Journey,
} from './schema'

export class JourneyError extends Error {
  constructor(message: string, public readonly status: number) { super(message) }
}

type Generator = <T>(goal: Goal, task: string, context: object, schema: z.ZodType<T>) => Promise<T>

export async function advanceJourney(
  action: Action,
  current: { state: Journey; revision: number } | null,
  generate: Generator,
): Promise<Journey> {
  if (action.action === 'start') {
    if ((current && action.revision !== current.revision) || (!current && action.revision !== undefined)) {
      throw new JourneyError('A jornada foi alterada. Atualize a página e tente novamente.', 409)
    }
    const result = await generate(action.goal,
      `Crie uma introdução breve e um nivelamento de 3 a 5 questões adequadas ao objetivo. ${questionShape} Formato: {"introduction":"...","questions":[...]}.`,
      {}, onboardingSchema)
    return { stage: 'placement', goal: action.goal, ...result }
  }
  if (!current || action.revision !== current.revision) {
    throw new JourneyError('A jornada foi alterada. Atualize a página e tente novamente.', 409)
  }
  const state = current.state
  if (action.action === 'placement') {
    if (state.stage !== 'placement' || action.answers.length !== state.questions.length) {
      throw new JourneyError('Responda todas as questões do nivelamento.', 400)
    }
    const results = state.questions.map((question, index) => ({
      question: question.prompt,
      answer: question.options.find((option) => option.id === action.answers[index])?.text,
      correctAnswer: question.options.find((option) => option.id === question.correctId)?.text,
      correct: action.answers[index] === question.correctId, explanation: question.explanation,
    }))
    const lesson = await generate(state.goal,
      `Avalie o nivelamento e crie uma trilha de cinco fases e o primeiro exercício da fase 1. Nível CEFR é uma estimativa. ${questionShape} Formato: {"phases":[{"title":"...","objective":"..."}],"level":"A1","strengths":["..."],"difficulties":["..."],"exercise":{...}}.`,
      { results }, lessonSchema)
    return { stage: 'lesson', goal: state.goal, ...lesson, phase: 1, attempts: 0, correct: 0, feedback: null }
  }
  if (state.stage !== 'lesson') throw new JourneyError('Complete o nivelamento primeiro.', 400)
  const correct = action.answer === state.exercise.correctId
  const adapted = await generate(state.goal,
    `Adapte o próximo exercício ao estado e ao resultado. suggestedPhase deve ser a fase atual ou a seguinte; avance somente após acerto e quando apropriado. Atualize os pontos fortes e dificuldades cumulativos, de forma concisa. ${questionShape} Formato: {"suggestedPhase":1,"strengths":["..."],"difficulties":["..."],"encouragement":"...","exercise":{...}}.`,
    {
      level: state.level, phase: state.phase, phases: state.phases,
      strengths: state.strengths, difficulties: state.difficulties,
      attempts: state.attempts + 1, correct: state.correct + Number(correct),
      lastResult: {
        question: state.exercise.prompt,
        answer: state.exercise.options.find((option) => option.id === action.answer)?.text,
        correctAnswer: state.exercise.options.find((option) => option.id === state.exercise.correctId)?.text,
        correct, explanation: state.exercise.explanation,
      },
    }, adaptationSchema)
  return {
    ...state, phase: nextPhase(state.phase, adapted.suggestedPhase, correct),
    strengths: adapted.strengths, difficulties: adapted.difficulties,
    attempts: state.attempts + 1, correct: state.correct + Number(correct),
    exercise: adapted.exercise,
    feedback: { correct, explanation: state.exercise.explanation, encouragement: adapted.encouragement },
  }
}
