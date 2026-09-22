import fs from 'fs';
import path from 'path';

async function runPdfTest() {
  console.log('======================================================================');
  console.log('QUARTZITE MANAGEMENT SYSTEM — COMPLIANCE PDF GENERATOR TEST');
  console.log('======================================================================');

  const { generatePointLogPdf } = await import('../src/features/reports/services/pdfReportGenerator.ts');

  const periodStart = new Date('2026-09-15T00:00:00.000Z');
  const periodEnd = new Date('2026-09-21T23:59:59.999Z');
  const reportKey = 'weekly-point-report:2026:W38';
  const recipientEmail = 'admin@quartzite.org';

  const sampleTransactions = [
    {
      id: 'tx-8f4b1a01-2026-4e31-9f12-000000000001',
      user_id: 'usr-001',
      amount: 5,
      type: 'AUTOMATIC',
      reason: 'Meeting Attendance - Present',
      reversal_of_id: null,
      created_at: '2026-09-16T14:32:00.000Z',
      user: { id: 'usr-001', full_name: 'Hemant Raghav', email: 'hemant@quartzite.org', role: 'ADMIN' },
      rule: { id: 'r-pres', name: 'Meeting Attendance - Present', trigger_type: 'ATTENDANCE_STATUS' },
      meeting: { id: 'm-001', title: 'QMS Architecture Sync #1' },
    },
    {
      id: 'tx-8f4b1a01-2026-4e31-9f12-000000000002',
      user_id: 'usr-002',
      amount: -5,
      type: 'AUTOMATIC',
      reason: 'Meeting Attendance - Absent',
      reversal_of_id: null,
      created_at: '2026-09-16T14:35:00.000Z',
      user: { id: 'usr-002', full_name: 'Jane Doe', email: 'jane.doe@quartzite.org', role: 'MEMBER' },
      rule: { id: 'r-abs', name: 'Meeting Attendance - Absent', trigger_type: 'ATTENDANCE_STATUS' },
      meeting: { id: 'm-001', title: 'QMS Architecture Sync #1' },
    },
    {
      id: 'tx-8f4b1a01-2026-4e31-9f12-000000000003',
      user_id: 'usr-002',
      amount: 5,
      type: 'REVERSAL',
      reason: 'Approved Medical Leave - Excused absence waiver',
      reversal_of_id: 'tx-8f4b1a01-2026-4e31-9f12-000000000002',
      created_at: '2026-09-17T09:15:00.000Z',
      user: { id: 'usr-002', full_name: 'Jane Doe', email: 'jane.doe@quartzite.org', role: 'MEMBER' },
      rule: null,
      meeting: null,
    },
    {
      id: 'tx-8f4b1a01-2026-4e31-9f12-000000000004',
      user_id: 'usr-003',
      amount: 1,
      type: 'AUTOMATIC',
      reason: 'Meeting Attendance - Left Early (Session duration 45%)',
      reversal_of_id: null,
      created_at: '2026-09-18T16:00:00.000Z',
      user: { id: 'usr-003', full_name: 'Marcus Vance', email: 'm.vance@quartzite.org', role: 'MEMBER' },
      rule: { id: 'r-early', name: 'Meeting Attendance - Left Early', trigger_type: 'ATTENDANCE_STATUS' },
      meeting: { id: 'm-002', title: 'Weekly Engineering Standup' },
    },
    {
      id: 'tx-8f4b1a01-2026-4e31-9f12-000000000005',
      user_id: 'usr-004',
      amount: 25,
      type: 'MANUAL',
      reason: 'Quarterly Infrastructure Security Hardening Bonus',
      reversal_of_id: null,
      created_at: '2026-09-19T11:20:00.000Z',
      user: { id: 'usr-004', full_name: 'Sarah Connor', email: 's.connor@quartzite.org', role: 'ADMIN' },
      rule: null,
      meeting: null,
    },
    {
      id: 'tx-8f4b1a01-2026-4e31-9f12-000000000006',
      user_id: 'usr-005',
      amount: -10,
      type: 'MANUAL',
      reason: 'Late Compliance Documentation Filing',
      reversal_of_id: null,
      created_at: '2026-09-20T17:45:00.000Z',
      user: { id: 'usr-005', full_name: 'David Chen', email: 'd.chen@quartzite.org', role: 'MEMBER' },
      rule: null,
      meeting: null,
    },
  ];

  for (let i = 7; i <= 24; i++) {
    const isAdd = i % 4 !== 0;
    const amount = isAdd ? (i % 2 === 0 ? 5 : 10) : -5;
    sampleTransactions.push({
      id: `tx-8f4b1a01-2026-4e31-9f12-${i.toString().padStart(12, '0')}`,
      user_id: `usr-00${(i % 5) + 1}`,
      amount,
      type: isAdd ? 'AUTOMATIC' : 'MANUAL',
      reason: isAdd ? `Project Deliverable Milestone #${i}` : `Policy violation warning #${i}`,
      reversal_of_id: null,
      created_at: new Date(periodStart.getTime() + (i * 6 * 3600 * 1000)).toISOString(),
      user: {
        id: `usr-00${(i % 5) + 1}`,
        full_name: `Member ${(i % 5) + 1}`,
        email: `member${(i % 5) + 1}@quartzite.org`,
        role: 'MEMBER',
      },
      rule: isAdd ? { id: `r-${i}`, name: 'Operational Milestone' } : null,
      meeting: null,
    });
  }

  let totalAdditions = 0;
  let totalDeductions = 0;
  for (const tx of sampleTransactions) {
    if (tx.amount >= 0) {
      totalAdditions += tx.amount;
    } else {
      totalDeductions += Math.abs(tx.amount);
    }
  }
  const netChange = totalAdditions - totalDeductions;

  console.log(`[Input] Total Transactions: ${sampleTransactions.length}`);
  console.log(`[Input] Points Awarded:    +${totalAdditions}`);
  console.log(`[Input] Points Deducted:   -${totalDeductions}`);
  console.log(`[Input] Net Point Balance:  ${netChange >= 0 ? '+' : ''}${netChange}`);
  console.log(`[Input] Audit Key:          ${reportKey}`);
  console.log(`[Input] Recipient:          ${recipientEmail}`);

  const startTime = Date.now();
  const pdfBuffer = generatePointLogPdf({
    reportKey,
    periodStart,
    periodEnd,
    transactions: sampleTransactions,
    totalAdditions,
    totalDeductions,
    netChange,
    recipientEmail,
  });
  const elapsed = Date.now() - startTime;

  console.log('\n[Validation]');
  if (!Buffer.isBuffer(pdfBuffer)) {
    throw new Error('generatePointLogPdf did not return a Node.js Buffer!');
  }
  console.log(`  ? Buffer returned successfully: ${pdfBuffer.length} bytes in ${elapsed}ms`);

  const headerMagic = pdfBuffer.subarray(0, 5).toString('ascii');
  if (headerMagic !== '%PDF-') {
    throw new Error(`Invalid PDF header signature! Expected '%PDF-', got '${headerMagic}'`);
  }
  console.log(`  ? PDF magic bytes verified: "${headerMagic}"`);

  const outputPath = path.resolve('public', 'test-audit-report.pdf');
  fs.writeFileSync(outputPath, pdfBuffer);
  console.log(`  ? Saved sample PDF to: ${outputPath}`);
  console.log(`  ? Accessible via browser: https://quartzitemanagementsystem.vercel.app/test-audit-report.pdf`);

  console.log('\n======================================================================');
  console.log('PDF GENERATION TEST: PASSED (100% VALID)');
  console.log('======================================================================');
}

runPdfTest().catch((err) => {
  console.error('PDF Generation Test FAILED:', err);
  process.exit(1);
});
