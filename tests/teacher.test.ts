import test from 'node:test'
import assert from 'node:assert/strict'
import { z } from 'zod'
import { advanceJourney, JourneyError } from '../app/lib/teacher/engine'
import {
  actionSchema, journeySchema, nextPhase, publicJourney, questionSchema,
  type Goal, type Journey, type Question,
} from '../app/lib/teacher/schema'

const question: Question = {
  prompt: 'Como pedir água?',
  options: [
    { id: 'A', text: 'De l’eau, s’il vous plaît.' },
    { id: 'B', text: 'Au revoir.' },
    { id: 'C', text: 'Bonne nuit.' },
    { id: 'D', text: 'Merci.' },
  ],
  correctId: 'A',
  explanation: 'A primeira opção pede água.',
}

test('nivelamento e respostas alteram a jornada usando apenas estado resumido', async () => {
  const contexts: object[] = []
  const results: unknown[] = [
    { introduction: 'Vamos praticar viagem.', questions: [question, question, question] },
    { phases: Array.from({ length: 5 }, (_, i) => ({ title: `Fase ${i + 1}`, objective: 'Praticar' })), level: 'A1', strengths: [], difficulties: ['vocabulário'], exercise: question },
    { suggestedPhase: 2, strengths: [], difficulties: ['pedidos'], encouragement: 'Continue.', exercise: question },
    { suggestedPhase: 2, strengths: ['pedidos'], difficulties: [], encouragement: 'Muito bem.', exercise: question },
  ]
  const generator = async <T>(_goal: Goal, _task: string, context: object, schema: z.ZodType<T>): Promise<T> => {
    contexts.push(context)
    return schema.parse(results.shift())
  }

  const placement = await advanceJourney({ action: 'start', goal: 'viagem' }, null, generator)
  assert.equal(placement.stage, 'placement')
  const lesson = await advanceJourney({ action: 'placement', revision: 1, answers: ['A', 'B', 'A'] }, { state: placement, revision: 1 }, generator)
  assert.equal(lesson.stage, 'lesson')
  if (lesson.stage !== 'lesson') throw new Error('Expected lesson')
  assert.equal(lesson.phases.length, 5)
  assert.equal(lesson.phase, 1)
  const failed = await advanceJourney({ action: 'answer', revision: 2, answer: 'B' }, { state: lesson, revision: 2 }, generator)
  assert.equal(failed.stage, 'lesson')
  if (failed.stage !== 'lesson') throw new Error('Expected lesson')
  assert.equal(failed.phase, 1)
  assert.equal(failed.correct, 0)
  assert.equal(failed.feedback?.correct, false)
  const passed = await advanceJourney({ action: 'answer', revision: 3, answer: 'A' }, { state: failed, revision: 3 }, generator)
  if (passed.stage !== 'lesson') throw new Error('Expected lesson')
  assert.equal(passed.phase, 2)
  assert.equal(passed.attempts, 2)
  assert.equal(passed.correct, 1)
  assert.deepEqual(passed.strengths, ['pedidos'])
  assert.match(JSON.stringify(contexts[2]), /Au revoir/)
  assert.doesNotMatch(JSON.stringify(contexts[2]), /introduction|questions/)
  assert.deepEqual(journeySchema.parse(passed), passed)
})

test('não expõe gabarito antes da resposta', () => {
  const state: Journey = { stage: 'placement', goal: 'tef', introduction: 'Introdução', questions: [question, question, question] }
  const output = JSON.stringify(publicJourney(state, 1))
  assert.doesNotMatch(output, /correctId|explanation/)
  assert.equal(publicJourney(state, 1).revision, 1)
})

test('valida respostas, versão e alternativas antes de gerar', async () => {
  assert.equal(actionSchema.safeParse({ action: 'answer', revision: 1, answer: 'E' }).success, false)
  assert.equal(questionSchema.safeParse({ ...question, options: [question.options[0], question.options[0], question.options[2], question.options[3]] }).success, false)
  const state: Journey = { stage: 'placement', goal: 'tef', introduction: 'Introdução', questions: [question, question, question] }
  const generator = async <T>(): Promise<T> => { throw new Error('Não deve gerar') }
  await assert.rejects(advanceJourney({ action: 'placement', revision: 2, answers: ['A', 'A', 'A'] }, { state, revision: 1 }, generator), (err: unknown) => err instanceof JourneyError && err.status === 409)
  await assert.rejects(advanceJourney({ action: 'placement', revision: 1, answers: ['A', 'A'] }, { state, revision: 1 }, generator), (err: unknown) => err instanceof JourneyError && err.status === 400)
  await assert.rejects(advanceJourney({ action: 'start', goal: 'viagem' }, { state, revision: 1 }, generator), (err: unknown) => err instanceof JourneyError && err.status === 409)
  assert.equal(nextPhase(1, 5, true), 2)
  assert.equal(nextPhase(2, 1, true), 2)
  assert.equal(nextPhase(5, 5, false), 5)
})
