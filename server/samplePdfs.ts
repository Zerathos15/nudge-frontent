// Helper to generate syntactically valid PDF files for testing the parser
export function createTextPdf(title: string, lines: string[]): Buffer {
  const contentStream = [
    'BT',
    '/F1 16 Tf',
    '50 750 Td',
    `(${escapePdf(title)}) Tj`,
    '/F1 10 Tf',
    '0 -24 Td',
  ];

  for (const line of lines) {
    if (!line.trim()) {
      contentStream.push('0 -14 Td');
    } else {
      contentStream.push(`(${escapePdf(line)}) Tj`);
      contentStream.push('0 -14 Td');
    }
  }
  contentStream.push('ET');

  const streamText = contentStream.join('\n');
  const streamLength = Buffer.byteLength(streamText);

  const objects = [
    // 1: Catalog
    `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj`,
    // 2: Pages
    `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj`,
    // 3: Page
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj`,
    // 4: Stream
    `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamText}\nendstream\nendobj`,
    // 5: Font
    `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`,
  ];

  let body = '%PDF-1.4\n';
  const xrefOffsets = [0];

  for (const obj of objects) {
    xrefOffsets.push(Buffer.byteLength(body));
    body += obj + '\n';
  }

  const xrefStart = Buffer.byteLength(body);
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;

  for (let i = 1; i <= objects.length; i++) {
    const offsetStr = String(xrefOffsets[i]).padStart(10, '0');
    body += `${offsetStr} 00000 n \n`;
  }

  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return Buffer.from(body);
}

function escapePdf(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

export function getSampleSchedulePdf(): Buffer {
  return createTextPdf('ACADEMIC & MASTERY SCHEDULE SPECIFICATION', [
    'SCHEDULE REFERENCE VERSION 1.0',
    'Authoritative Timing & Availability Blueprint',
    '',
    'SECTION 1: WEEKDAY SCHEDULE RULES (Monday - Friday)',
    '- Mandatory constraint: No scheduled study before college.',
    '- College Ending Time: 16:00 (4:00 PM)',
    '- Primary Study Window: 16:00 to 23:00 (4:00 PM to 11:00 PM)',
    '- Maximum Continuous Study Block: 60 minutes (1 hour) strictly enforced',
    '- Scheduled Break: 15 minutes between consecutive study blocks',
    '- Maximum Daily Study: 5 hours (4-5 focused 1-hour slots)',
    '- Track Rotation: DSA -> AIML -> Lyn System Implementation -> Research/Interview',
    '',
    'SECTION 2: SATURDAY WORKING SCHEDULE RULES',
    '- Condition: When Saturday is designated as a working college day',
    '- Timing: Operates under standard Weekday rules (16:00 to 23:00)',
    '- Maximum 5 hours focused study',
    '',
    'SECTION 3: SATURDAY NON-WORKING SCHEDULE RULES',
    '- Condition: Full study day with no college obligations',
    '- Start Time: 11:00 AM (11:00)',
    '- Target Duration: Approximately 8 focused study hours',
    '- Study Window: 11:00 to 21:30',
    '- Block Constraint: Maximum 1-hour blocks with 15-minute breaks and lunch recess',
    '- Deep focus on Core Architecture, Model Training & System Projects',
    '',
    'SECTION 4: SUNDAY SCHEDULE RULES',
    '- Condition: Deep work, Revision, and Milestone Evaluations',
    '- Start Time: 11:00 AM (11:00)',
    '- Target Duration: 8 focused study hours',
    '- Study Window: 11:00 to 21:30',
    '- Emphasis: Research ablation analysis, Mock technical interviews, Mastery tests',
  ]);
}

export function getSampleCurriculumPdf(): Buffer {
  return createTextPdf('CURRICULUM SPECIFICATION & ROADMAP', [
    'TOPIC / TASK REFERENCE VERSION 1.0',
    'Comprehensive Mastery Syllabus with Dependency Graph',
    '',
    'TRACK 1: DATA STRUCTURES & ALGORITHMS (DSA)',
    'Module 1: Advanced Arrays, Two Pointers & Sliding Window',
    '- Topic Code: DSA-M1-T1',
    '  Title: Dynamic Arrays & Amortized Complexity Analysis',
    '  Type: THEORY | Est: 60 mins | Requires Mastery: YES | Prerequisites: NONE',
    '- Topic Code: DSA-M1-T2',
    '  Title: Two-Pointer Squeeze & Container With Most Water',
    '  Type: PRACTICE | Est: 60 mins | Requires Mastery: YES | Prerequisites: DSA-M1-T1',
    '- Topic Code: DSA-M1-T3',
    '  Title: Variable & Fixed Sliding Window Optimizations',
    '  Type: PRACTICE | Est: 60 mins | Requires Mastery: YES | Prerequisites: DSA-M1-T2',
    'Module 2: Trees & Graph Traversal',
    '- Topic Code: DSA-M2-T1',
    '  Title: Binary Search Trees & Balanced Invariant Maintenance',
    '  Type: THEORY | Est: 60 mins | Requires Mastery: YES | Prerequisites: DSA-M1-T3',
    '- Topic Code: DSA-M2-T2',
    '  Title: Depth First Search, Backtracking & Topological Sort',
    '  Type: PRACTICE | Est: 60 mins | Requires Mastery: YES | Prerequisites: DSA-M2-T1',
    '',
    'TRACK 2: AI & MACHINE LEARNING (AIML)',
    'Module 1: Foundations of Deep Learning & Attention',
    '- Topic Code: AIML-M1-T1',
    '  Title: Neural Network Backpropagation & Gradient Calculus',
    '  Type: THEORY | Est: 60 mins | Requires Mastery: YES | Prerequisites: NONE',
    '- Topic Code: AIML-M1-T2',
    '  Title: Scaled Dot-Product Self-Attention Mathematical Formulation',
    '  Type: THEORY | Est: 60 mins | Requires Mastery: YES | Prerequisites: AIML-M1-T1',
    '- Topic Code: AIML-M1-T3',
    '  Title: Multi-Head Attention & KV Cache Architecture',
    '  Type: THEORY | Est: 60 mins | Requires Mastery: YES | Prerequisites: AIML-M1-T2',
    'Module 2: LLM Fine-Tuning & Quantization',
    '- Topic Code: AIML-M2-T1',
    '  Title: Parameter-Efficient Fine-Tuning (LoRA & QLoRA Matrix Decompositions)',
    '  Type: THEORY | Est: 60 mins | Requires Mastery: YES | Prerequisites: AIML-M1-T3',
    '',
    'TRACK 3: LYN SYSTEM ARCHITECTURE & IMPLEMENTATION (LYN)',
    'Module 1: High-Performance Engine Core',
    '- Topic Code: LYN-P1-01',
    '  Title: Core Memory Allocator & Zero-Copy Buffer Pipeline',
    '  Type: PROJECT | Est: 60 mins | Requires Mastery: YES | Prerequisites: NONE',
    '- Topic Code: LYN-P1-02',
    '  Title: Event-Driven Async Dispatcher & Actor Supervision',
    '  Type: PROJECT | Est: 60 mins | Requires Mastery: YES | Prerequisites: LYN-P1-01',
    '- Topic Code: LYN-P1-03',
    '  Title: Lyn State Machine Verification & Fault Recovery Testing',
    '  Type: PROJECT | Est: 60 mins | Requires Mastery: YES | Prerequisites: LYN-P1-02',
    '',
    'TRACK 4: RESEARCH & TECHNICAL INTERVIEW PREPARATION (RESEARCH)',
    'Module 1: Research Methodology & System Evaluation',
    '- Topic Code: RES-01',
    '  Title: Literature Survey: Speculative Decoding & Latency Optimization',
    '  Type: RESEARCH | Est: 60 mins | Requires Mastery: NO | Prerequisites: NONE',
    '- Topic Code: RES-02',
    '  Title: Empirical Benchmark & Baseline Replication Experiment',
    '  Type: RESEARCH | Est: 60 mins | Requires Mastery: NO | Prerequisites: RES-01',
    '- Topic Code: INT-01',
    '  Title: Mock Technical Interview: Distributed LLM Serving & KV Cache Limits',
    '  Type: INTERVIEW | Est: 60 mins | Requires Mastery: YES | Prerequisites: AIML-M1-T3',
  ]);
}
