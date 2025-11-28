export interface ParentTip {
  chapter: number;
  tip: string;
  discussion?: string;
}

export const defaultParentTips: Record<number, ParentTip> = {
  1: {
    chapter: 1,
    tip: 'Begin by asking your child what they learned in this chapter. Discuss the main characters or concepts introduced and encourage them to share what they found most interesting or surprising.',
    discussion: 'What was your favorite part of this chapter? Who is your favorite character and why?'
  },
  2: {
    chapter: 2,
    tip: 'Focus on the lessons and skills presented. Talk about how the characters solved problems or learned something new. Help your child connect these lessons to their own life and experiences.',
    discussion: 'How did the characters grow in this chapter? What would you do in their situation?'
  },
  3: {
    chapter: 3,
    tip: 'Encourage deeper thinking by asking questions about emotions, motivations, and relationships. Help your child understand the bigger messages and life lessons in the story.',
    discussion: 'What do you think the characters learned? How can you use these lessons in your life?'
  },
  4: {
    chapter: 4,
    tip: 'Highlight examples of characters working together and helping each other. Discuss how teamwork and cooperation lead to success and how your child can apply these in their own activities.',
    discussion: 'How did the characters help each other? How do you help your friends and family?'
  },
  5: {
    chapter: 5,
    tip: 'Talk about new discoveries and adventures in the story. Encourage your child to think about what adventures they might like to have and what they hope to discover about themselves.',
    discussion: 'What was the most exciting part? What would you like to discover or learn next?'
  },
  6: {
    chapter: 6,
    tip: 'Celebrate the progress made throughout the story. Reflect on how characters have changed and grown. Acknowledge your child\'s learning journey and the skills they\'re developing.',
    discussion: 'How have the characters changed since the beginning? What have you learned from this story?'
  },
  7: {
    chapter: 7,
    tip: 'Ask your child to think about themes and bigger messages in the story. Discuss how the story relates to real-world situations and their own experiences.',
    discussion: 'What is the main message of this chapter? How does it apply to your life?'
  },
  8: {
    chapter: 8,
    tip: 'Encourage your child to predict what might happen next. Discuss different possibilities and why they think certain outcomes are likely based on what they\'ve read.',
    discussion: 'What do you think will happen next? Why?'
  }
};

export const getParentTipsForChapters = (
  count: number,
  customTips?: Array<{ chapter: number; tip: string }>
): ParentTip[] => {
  if (customTips && customTips.length > 0) {
    return customTips.map(ct => ({
      ...defaultParentTips[ct.chapter],
      chapter: ct.chapter,
      tip: ct.tip
    }));
  }

  return Array.from({ length: Math.min(count, 8) }, (_, i) => {
    const chapter = i + 1;
    return defaultParentTips[chapter] || {
      chapter,
      tip: `Chapter ${chapter}: Explore the story elements and connect them to your child's life experience.`,
      discussion: 'What did you enjoy most about this chapter?'
    };
  });
};

export const generateChapterTipCards = (
  chapterCount: number,
  parentTips: Array<{ chapter: number; tip: string }> | undefined,
  chapterSummaries: Array<{ chapter: number; title: string; summary: string }> | undefined
) => {
  const tips = getParentTipsForChapters(chapterCount, parentTips);
  
  return tips.map(tip => ({
    id: String(tip.chapter),
    chapter: tip.chapter,
    title: chapterSummaries?.find(cs => cs.chapter === tip.chapter)?.title || `Chapter ${tip.chapter}`,
    tip: tip.tip,
    discussion: tip.discussion || ''
  }));
};
