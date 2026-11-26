import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'

register('./support/jsx-hooks.mjs', import.meta.url)

const {
  default: ticketsReducer,
  fetchSupportTickets,
  saveSupportTicketSolution,
  sendSupportTicketMessage,
  ticketEntityKey,
} = await import('../src/store/slices/ticketsSlice.js')

test('ticket entities prefer a nonblank ticketId and safely fall back to the legacy id', () => {
  assert.equal(ticketEntityKey({ ticketId: ' TKT-1 ', id: 'legacy-1' }), 'TKT-1')
  assert.equal(ticketEntityKey({ ticketId: '  ', id: ' legacy-1 ' }), 'legacy-1')
  assert.equal(ticketEntityKey({ ticketId: '\t', id: '  ' }), null)
})

test('support list records normalize into the scope and independent mutation maps stay isolated', () => {
  const supportTicket = { ticketId: 'TKT-1', subject: 'Payment issue', messages: [] }
  const legacyTicket = { id: 'legacy-2', subject: 'Older ticket', messages: [] }
  const listRequestId = 'support-list-request'
  let state = ticketsReducer(undefined, fetchSupportTickets.pending(listRequestId))
  state = ticketsReducer(state, fetchSupportTickets.fulfilled(
    { scope: 'support', tickets: [supportTicket, legacyTicket] },
    listRequestId,
  ))

  assert.deepEqual(state.scopeIds.support, ['TKT-1', 'legacy-2'])
  assert.equal(state.entities['TKT-1'].subject, 'Payment issue')
  assert.equal(state.entities['legacy-2'].subject, 'Older ticket')

  const messageArg = { ticketId: 'TKT-1', text: 'Customer update' }
  const solutionArg = { ticketId: 'TKT-1', solution: 'Payment has been reviewed.' }
  state = ticketsReducer(state, sendSupportTicketMessage.pending('message-request', messageArg))
  state = ticketsReducer(state, saveSupportTicketSolution.pending('solution-request', solutionArg))
  state = ticketsReducer(state, sendSupportTicketMessage.rejected(
    null,
    'message-request',
    messageArg,
    'Message could not be sent.',
  ))
  state = ticketsReducer(state, saveSupportTicketSolution.fulfilled(
    { ticketId: 'TKT-1', ticket: { ...supportTicket, supportUpdate: solutionArg.solution } },
    'solution-request',
    solutionArg,
  ))

  assert.equal(state.mutationStatus.supportMessageById['TKT-1'], 'failed')
  assert.equal(state.mutationError.supportMessageById['TKT-1'], 'Message could not be sent.')
  assert.equal(state.mutationStatus.supportSolutionById['TKT-1'], 'succeeded')
  assert.equal(state.mutationError.supportSolutionById['TKT-1'], null)
  assert.equal(state.entities['TKT-1'].supportUpdate, solutionArg.solution)
})
