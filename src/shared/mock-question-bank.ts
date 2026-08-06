/** Deterministic fallback question bank for mock-interview practice mode. When
   no AI key is configured (or an AI call fails), the practice flow still works
   by drawing from these curated prompts. Pure: no IO, no clock, no randomness —
   selection is driven by a caller-provided index so it stays testable and
   reproducible. */

import type { Difficulty, Track } from './mock-interview'

type Bank = Record<Track, Record<Difficulty, string[]>>

const BANK: Bank = {
  behavioral: {
    easy: ['做个自我介绍，重点讲你最近一个项目。', '说说你为什么想换工作/加入这个团队。'],
    medium: [
      '讲一次你和同事产生分歧、最后如何推动达成一致的经历。',
      '描述一个你主动发现并解决的问题，结果如何？'
    ],
    hard: [
      '讲一次你负责的项目失败或严重延期的经历，你从中学到了什么？',
      '描述一次你在信息不足、时间紧迫下做出的重要决策。'
    ]
  },
  'system-design': {
    easy: ['设计一个短链接服务，说说核心组件。', '如何设计一个基础的评论系统？'],
    medium: [
      '设计一个支持百万级用户的消息推送系统，重点讲可扩展性。',
      '设计一个限流器，需要支持分布式部署。'
    ],
    hard: [
      '设计一个全球部署的实时协作文档系统（类似 Google Docs），如何处理并发编辑？',
      '设计一个每秒百万写入的时序数据库，讲存储与查询权衡。'
    ]
  },
  coding: {
    easy: ['实现一个函数，判断一个字符串是否为回文。', '实现两数之和（Two Sum）。'],
    medium: ['给定一棵二叉树，返回其层序遍历结果。', '实现 LRU 缓存，要求 get/put 都是 O(1)。'],
    hard: [
      '给定一个字符串，找出最长无重复字符子串的长度，并分析复杂度。',
      '实现一个支持通配符匹配（? 和 *）的字符串匹配算法。'
    ]
  }
}

/** Pick a fallback question for the given track+difficulty. `index` selects
   deterministically among the available prompts (wrapped), so callers can
   rotate through them (e.g. by session seq) without any randomness. Returns a
   generic prompt only if a bucket were ever empty (it never is here). */
export function pickBankQuestion(track: Track, difficulty: Difficulty, index: number): string {
  const bucket = BANK[track][difficulty]
  if (bucket.length === 0) return '请谈谈你最近的一个项目。'
  const i = ((index % bucket.length) + bucket.length) % bucket.length
  return bucket[i]
}

/** All prompts for a track+difficulty (for tests / callers that want the set). */
export function bankQuestions(track: Track, difficulty: Difficulty): string[] {
  return [...BANK[track][difficulty]]
}
