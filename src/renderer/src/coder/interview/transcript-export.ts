import type { TranscriptTurn } from '../../../../shared/interview-coach'
import {
  summarizeInterviewStats,
  formatDuration,
  isLowCandidateShare
} from '../../../../shared/interview-stats'
import type { AssistItem } from '@/lib/store/transcription'

function fmtTime(ts: number): string {
  const d = new Date(ts)
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

const speakerLabel: Record<TranscriptTurn['speaker'], string> = {
  interviewer: '面试官',
  candidate: '我',
  unknown: '?'
}

/** Render the interview transcript timeline + AI assist points + topic summary
   into a Markdown review document. Returns '' when there's nothing to export. */
export function transcriptToMarkdown(
  turns: TranscriptTurn[],
  assists: AssistItem[],
  summary: string
): string {
  if (turns.length === 0 && assists.length === 0 && !summary.trim()) return ''

  const sections: string[] = ['# Penumbra 面试记录']

  const stats = summarizeInterviewStats(turns)
  if (stats.totalTurns > 0) {
    const lines = [
      `- 时长：${formatDuration(stats.durationSeconds)}`,
      `- 发言轮次：面试官 ${stats.interviewerTurns} · 我 ${stats.candidateTurns}` +
        (stats.unknownTurns > 0 ? ` · 未知 ${stats.unknownTurns}` : ''),
      `- 面试官提问：${stats.questionCount}`,
      `- 我的发言占比：${Math.round(stats.candidateShare * 100)}%`
    ]
    // Mirror the live panel's hint: flag a low speaking share once there's
    // enough spoken content for the ratio to be meaningful.
    if (isLowCandidateShare(stats)) {
      lines.push(`- ⚠️ 你的发言偏少，复盘时可关注是否需要更主动地阐述`)
    }
    sections.push(`## 面试统计\n\n${lines.join('\n')}`)
  }

  if (summary.trim()) {
    sections.push(`## 话题总结\n\n${summary.trim()}`)
  }

  if (turns.length > 0) {
    const lines = turns
      .filter((turn) => !turn.isPartial && turn.text.trim())
      .map(
        (turn) =>
          `- \`${fmtTime(turn.timestamp)}\` **${speakerLabel[turn.speaker]}**：${turn.text.trim()}`
      )
    sections.push(`## 对话时间线\n\n${lines.join('\n')}`)
  }

  if (assists.length > 0) {
    const blocks = assists.map(
      (a) => `### ${fmtTime(a.timestamp)} · ${a.question.trim().slice(0, 60)}\n\n${a.points.trim()}`
    )
    sections.push(`## AI 回答要点\n\n${blocks.join('\n\n')}`)
  }

  return `${sections.join('\n\n')}\n`
}
