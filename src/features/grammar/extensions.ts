import type { Lesson, Question } from './types'

// The local pack provides these six structures in its 16-tense overview.
// Explanations and exercises below are supplementary, not imported textbook items.
export const extensionSources = [
  { title: 'Cambridge · Past perfect continuous', url: 'https://dictionary.cambridge.org/uk/grammar/british-grammar/past-perfect-continuous-i-had-been-doing' },
  { title: 'British Council · Future perfect', url: 'https://learnenglish.britishcouncil.org/free-resources/grammar/b1-b2/future-continuous-future-perfect' },
  { title: 'Cambridge · Future perfect continuous', url: 'https://dictionary.cambridge.org/grammar/british-grammar/future-perfect-continuous-i-will-have-been-working-here-ten-years' },
  { title: 'Cambridge · Would / reported future', url: 'https://dictionary.cambridge.org/grammar/british-grammar/would' }
]

const specs: Array<[string, string, string, string, string, string, string, string, string, string]> = [
  ['t11', '过去完成进行时', 'Past Perfect Continuous', 'had been doing',
    '表示一个动作在过去某时之前已经开始，并持续了一段时间。常用于说明持续过程或当时的影响。',
    '找出句子中的过去时间，再判断动作是否在此之前开始，并持续了一段时间。',
    'for two hours表示持续两小时；before或when常引出过去的时间或事件。结合句子意思判断。',
    'I had been waiting for an hour when the bus finally arrived.', '公交车终于到来时，我已经等了一个小时。',
    '过去完成时强调完成结果；过去完成进行时突出此前持续的过程。状态动词通常不用进行形式。'],
  ['t12', '将来完成时', 'Future Perfect', 'will have done',
    '表示一个动作会在将来某个时间之前完成。',
    '找出句子中的将来时间，再判断动作是否会在此之前完成。',
    'by Friday / by the time …；时间状语从句通常用一般现在时。',
    'By Friday, I will have finished the report.', '到周五时，我将已经完成这份报告。',
    'will have 后接过去分词。将来进行时强调某时正在做，将来完成时强调某时之前已做完。'],
  ['t13', '将来完成进行时', 'Future Perfect Continuous', 'will have been doing',
    '表示到将来某个时间，一个动作将已经持续多久。',
    '找出句子中的将来时间，再看动作到那时会持续多久。',
    'by next month表示到下个月；for后常接持续时间。动作是否继续，要看句子意思。',
    'By next June, I will have been learning French for two years.', '到明年六月，我学法语就满两年了。',
    '强调动作持续多久；如果强调读完三章，用will have read three chapters。状态动词通常不用进行形式。'],
  ['t14', '过去将来进行时', 'Future Continuous in the Past', 'would be doing',
    '用于转述过去说过的计划或预测，表示之后某个时刻正在进行的动作。',
    'said或thought表示过去说过或想过的事；从句说的是之后某时正在做的事。',
    '转述过去说过的will be doing时，可改为would be doing；时间词也要相应调整。',
    'She said she would be studying at eight that evening.', '她说，那天晚上八点她会在学习。',
    'would还可以表示假设、意愿等。判断时态时，要结合句子意思。'],
  ['t15', '过去将来完成时', 'Future Perfect in the Past', 'would have done',
    '用于转述过去说过的计划或预测，表示一个动作会在之后某个时间前完成。',
    '找出过去说话的时间，再找之后的时间；动作要在后一个时间前完成。',
    '转述过去说过的will have done时，可改为would have done；by表示在某个时间之前。',
    'He said he would have finished the work by Friday.', '他说，到周五时，这项工作会已经完成。',
    'would have done还可以表示未实现的假设。本课介绍它在间接引语中表示将来完成的用法。'],
  ['t16', '过去将来完成进行时', 'Future Perfect Continuous in the Past', 'would have been doing',
    '用于转述过去说过的计划或预测，表示到之后某个时间，一个动作将已经持续多久。',
    '找出过去说话的时间，再看之后某时动作会持续多久。这种时态较少见。',
    '转述过去说过的will have been doing时，可改为would have been doing。',
    'She said that by July she would have been working there for ten years.', '她说到七月时，她在那里工作就满十年了。',
    '这种结构较少见，也用于假设。学习本课时，注意过去说话的时间和后来动作持续的时间。']
]

export const extendedLessons: Lesson[] = specs.map(([id, title, english, structure, summary, judgement, clues, example, translation, pitfall]) => ({
  id, title, english, level: 'extended', summary, structure,
  forms: [
    { label: '肯定句', example },
    { label: '否定结构', example: structure.replace(/^(had|will|would)/, '$1 not') },
    { label: '疑问结构', example: structure.replace(/^(had|will|would) (.*)$/, '$1 + 主语 + $2 … ?') }
  ],
  usages: [{ label: '例句', example, translation }],
  judgement, clues, pitfalls: [pitfall]
}))

const exercises: Array<[string, string, string, string]> = [
  ['t11', 'When the teacher arrived, we ____ (discuss) the problem for twenty minutes. [突出此前持续的过程]', 'had been discussing', '老师到达时，讨论已经持续了20分钟，用had been discussing。'],
  ['t11', 'He was tired because he ____ (run) for an hour before he got home. [突出持续过程]', 'had been running', '他到家前跑了一个小时，因此感到疲惫。强调过去持续的动作，用had been running。'],
  ['t11', 'How long ____ you ____ (wait) before the doors opened? [使用过去完成进行时]', 'had; been waiting', '疑问句把 had 提到主语前；后面保留 been waiting。'],
  ['t11', 'She ____ (not sleep) well for several nights before the exam. [突出此前持续的情况]', 'had not been sleeping / hadn’t been sleeping', '否定形式：had not been + 动词-ing。'],
  ['t11', 'I had been ____ (study) for two hours when you called.', 'studying', 'been 后接动词-ing，不能用原形或过去分词。'],
  ['t12', 'By tomorrow evening, we ____ (finish) the project. [强调届时已完成]', 'will have finished', '到明天晚上，项目将已经完成。用will have + 过去分词。'],
  ['t12', 'By the time you ____ (arrive) tomorrow, I will have cooked dinner.', 'arrive', '时间状语从句通常用一般现在时表示将来。'],
  ['t12', 'By Friday, she will have ____ (write) three reports.', 'written', 'have 后用过去分词 written，不能用过去式 wrote。'],
  ['t12', '____ they ____ (complete) the bridge by next June? [使用将来完成时]', 'Will; have completed', 'Will 提到主语前，后接 have + 过去分词。'],
  ['t12', 'We ____ (not finish) all the work by noon tomorrow. [使用将来完成时]', 'will not have finished / won’t have finished', '否定形式：will not have + 过去分词。'],
  ['t13', 'By next May, I ____ (learn) Spanish for three years. [强调持续时长]', 'will have been learning', '到将来的五月，这个学习过程将累计持续三年。'],
  ['t13', 'By six this evening, they ____ (travel) for ten hours. [强调持续时长]', 'will have been travelling / will have been traveling', '到今晚六点，旅行将已经持续十小时，用将来完成进行时。'],
  ['t13', 'By July, she will have been ____ (work) here for a year.', 'working', 'will have been 后接动词-ing。'],
  ['t13', 'How long ____ you ____ (study) here by next September? [使用将来完成进行时]', 'will; have been studying', '疑问句：will + 主语 + have been doing。'],
  ['t13', 'By ten tonight, we ____ (practise) for four hours. [强调持续过程]', 'will have been practising / will have been practicing', '到今晚十点，练习将已经持续四小时，用将来完成进行时。'],
  ['t14', 'Yesterday, Leo said he ____ (take) an exam at nine the next morning. [转述 will be taking]', 'would be taking', 'Leo昨天说，第二天早上九点他会在考试。转述时用would be taking。'],
  ['t14', 'She told me she ____ (not work) at eight that evening. [转述 will not be working]', 'would not be working / wouldn’t be working', '否定结构：would not be + 动词-ing。'],
  ['t14', 'He thought they would be ____ (wait) outside when he arrived.', 'waiting', 'would be 后接动词-ing。'],
  ['t14', 'Mia said, “I will be reading at ten tonight.” 改为间接引语：Mia said she ____ (read) at ten that night.', 'would be reading', '将will be reading改为would be reading，时间词改为that night。'],
  ['t14', 'Last Monday, we believed the team ____ (train) at this time the following day. [强调那时正在训练]', 'would be training', '上周一，我们认为球队在第二天这个时候会在训练，用would be training。'],
  ['t15', 'He said he ____ (finish) the report by Friday. [转述 will have finished]', 'would have finished', '他说报告会在周五前完成，转述时用would have finished。'],
  ['t15', 'She told us she ____ (not complete) the work by the following morning. [转述 will not have completed]', 'would not have completed / wouldn’t have completed', '否定结构：would not have + 过去分词。'],
  ['t15', 'They expected that by June the builders would have ____ (build) the bridge.', 'built', 'have 后接过去分词 built。'],
  ['t15', 'He said, “I will have read the book by Sunday.” 转述：He said he ____ (read) the book by Sunday.', 'would have read', '转述过去说过的话，将will have read改为would have read。'],
  ['t15', 'Last year, we believed she ____ (graduate) by the end of the following summer. [使用过去将来完成时]', 'would have graduated', '去年，我们认为她会在第二年夏末前毕业，用would have graduated。'],
  ['t16', 'She said that by July she ____ (work) there for ten years. [转述 will have been working]', 'would have been working', '她说到七月时，她在那里工作就满十年了。转述时用would have been working。'],
  ['t16', 'He said that by noon he would have been ____ (drive) for five hours.', 'driving', 'would have been 后接动词-ing。'],
  ['t16', 'Leo told us that by May he ____ (learn) English for six years. [强调持续时长；转述 will have been learning]', 'would have been learning', 'Leo过去告诉我们，到五月时，他学英语就满六年了。转述时用would have been learning。'],
  ['t16', 'She said that by six she ____ (not wait) for a full hour yet. [转述 will not have been waiting]', 'would not have been waiting / wouldn’t have been waiting', '否定结构：would not have been + 动词-ing。'],
  ['t16', 'They thought that by December they ____ (live) in the town for twenty years. [使用过去将来完成进行时]', 'would have been living', '他们当时认为，到十二月时，在镇上居住就满二十年了。用would have been living。']
]

export const extendedQuestions: Question[] = exercises.map(([tenseId, prompt, answer, explanation], index) => ({
  id: `extension:E-${index + 1}`, code: `拓展-${index + 1}`, tenseId, bank: 'extension', label: '拓展填空',
  kind: 'fill', prompt, context: '', blankCount: (prompt.match(/_{2,}/g) || []).length,
  options: [], answer, explanation
}))
