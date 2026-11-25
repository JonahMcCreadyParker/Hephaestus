import { expect, it } from 'vitest'

import { type GitCommit, layoutGitHistory } from './graph'

const commit = (hash: string, ...parents: string[]): GitCommit => ({
  author: 'Author',
  date: '2026-01-01T00:00:00Z',
  hash,
  message: '',
  parents,
  subject: hash
})

it('centers the main first-parent history and keeps both merge parents in separate lanes', () => {
  const nodes = layoutGitHistory({
    commits: [
      commit('merge', 'main', 'one', 'two'),
      commit('main', 'fork'),
      commit('one', 'fork'),
      commit('two', 'fork'),
      commit('fork')
    ],
    refs: [
      { name: 'refs/heads/main', hash: 'merge' },
      { name: 'refs/heads/topic', hash: 'one' }
    ],
    main_ref: 'refs/heads/main',
    truncated: false
  })

  expect(nodes.map(node => node.commit.hash)).toEqual(['fork', 'two', 'one', 'main', 'merge'])
  expect(nodes.map(node => node.lane)).toEqual([0, -1, 1, 0, 0])
  expect(nodes[2].labels).toEqual(['topic'])
  expect(nodes[4].commit.parents).toEqual(['main', 'one', 'two'])
})
