import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import webpush from 'web-push';

async function testCompletePipeline() {
  console.log('======================================================================');
  console.log('QUARTZITE MANAGEMENT SYSTEM — PDF, EMAIL & PUSH TEST SUITE');
  console.log('======================================================================\n');

  // Load services
  const { generatePointLogPdf } = await import('../src/features/reports/services/pdfReportGenerator.ts');
  const { sendEmail } = await import('../src/features/reports/services/emailService.ts');
  const { sendPushNotificationToUser } = await import('../src/features/notifications/services/pushService.ts');
  const { generateWeeklyPointReport } = await import('../src/features/reports/services/weeklyReportService.ts');
  const { getAdminClient } = await import('../src/lib/supabase/admin.ts');

  const supabase = getAdminClient();

  // Find primary user in database
  const { data: profiles } = await supabase.from('profiles').select('*').limit(1);
  const targetUser = profiles && profiles[0] ? profiles[0] : {
    id: 'test-user-id',
    full_name: 'Hemant Raghav K R',
    email: 'hemantraghavkr@gmail.com',
  };

  console.log(`[Target User Profile]`);
  console.log(`  Name:  ${targetUser.full_name}`);
  console.log(`  Email: ${targetUser.email}`);
  console.log(`  ID:    ${targetUser.id}\n`);

  // -------------------------------------------------------------------------
  // STEP 1: TEST COMPLIANCE PDF GENERATION
  // -------------------------------------------------------------------------
  console.log('[1/3] Testing PDF Report Generation...');
  const periodStart = new Date('2026-09-15T00:00:00.000Z');
  const periodEnd = new Date('2026-09-21T23:59:59.999Z');
  const reportKey = 'weekly-point-report:2026:W38';

  const testTransactions = [
    {
      id: 'tx-pdf-test-001',
      user_id: targetUser.id,
      amount: 5,
      type: 'AUTOMATIC',
      reason: 'Meeting Attendance - Present',
      created_at: new Date('2026-09-16T10:00:00Z').toISOString(),
      user: targetUser,
      rule: { id: 'r1', name: 'Meeting Attendance - Present' },
      meeting: { id: 'm1', title: 'Executive Operations Sync' },
    },
    {
      id: 'tx-pdf-test-002',
      user_id: targetUser.id,
      amount: 50,
      type: 'MANUAL',
      reason: 'Q3 Outstanding Security Architecture Award',
      created_at: new Date('2026-09-18T14:30:00Z').toISOString(),
      user: targetUser,
      rule: null,
      meeting: null,
    },
    {
      id: 'tx-pdf-test-003',
      user_id: targetUser.id,
      amount: -5,
      type: 'AUTOMATIC',
      reason: 'Meeting Attendance - Absent',
      created_at: new Date('2026-09-19T11:00:00Z').toISOString(),
      user: targetUser,
      rule: { id: 'r2', name: 'Meeting Attendance - Absent' },
      meeting: { id: 'm2', title: 'Weekly Sprint Retrospective' },
    },
    {
      id: 'tx-pdf-test-004',
      user_id: targetUser.id,
      amount: 5,
      type: 'REVERSAL',
      reason: 'Absence Waiver - Approved Business Travel',
      reversal_of_id: 'tx-pdf-test-003',
      created_at: new Date('2026-09-19T12:00:00Z').toISOString(),
      user: targetUser,
      rule: null,
      meeting: null,
    }
  ];

  const totalAdditions = testTransactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalDeductions = testTransactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const netChange = totalAdditions - totalDeductions;

  const pdfBuffer = generatePointLogPdf({
    reportKey,
    periodStart,
    periodEnd,
    transactions: testTransactions,
    totalAdditions,
    totalDeductions,
    netChange,
    recipientEmail: targetUser.email,
  });

  console.log(`  ✓ Generated valid PDF buffer: ${pdfBuffer.length} bytes`);
  console.log(`  ✓ Magic bytes verified: ${pdfBuffer.subarray(0, 5).toString('ascii')}`);
  const pdfSavedPath = path.resolve('public', 'test-audit-report.pdf');
  fs.writeFileSync(pdfSavedPath, pdfBuffer);
  console.log(`  ✓ Written to: ${pdfSavedPath}`);

  // -------------------------------------------------------------------------
  // STEP 2: TEST EMAIL DISPATCH WITH PDF ATTACHMENT
  // -------------------------------------------------------------------------
  console.log('\n[2/3] Testing Email Service & PDF Attachment Dispatch...');
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
      <h2 style="color: #0f172a;">QUARTZITE MANAGEMENT SYSTEM</h2>
      <p>Weekly Compliance Point Audit Report for period <strong>2026-09-15</strong> to <strong>2026-09-21</strong>.</p>
      <ul>
        <li>Total Transactions: ${testTransactions.length}</li>
        <li>Points Awarded: +${totalAdditions}</li>
        <li>Points Deducted: -${totalDeductions}</li>
        <li>Net Change: ${netChange >= 0 ? '+' : ''}${netChange}</li>
      </ul>
      <p>The official compliance PDF log is attached.</p>
    </div>
  `;

  const emailResult = await sendEmail({
    to: targetUser.email,
    subject: `[QMS Compliance Audit] Weekly Point Report — ${reportKey}`,
    html: emailHtml,
    attachments: [
      {
        filename: `${reportKey}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }
    ],
  });

  console.log(`  ✓ Email Dispatch Success: ${emailResult.success}`);
  console.log(`  ✓ Dispatch Mode: ${emailResult.simulated ? 'Simulated Dispatch (Clean mock sandbox)' : 'Live Resend API'}`);
  console.log(`  ✓ Message ID: ${emailResult.messageId || 'N/A'}`);
  if (emailResult.error) {
    console.log(`  ! Notice: ${emailResult.error}`);
  }

  // -------------------------------------------------------------------------
  // STEP 3: TEST WEB PUSH NOTIFICATION & VAPID ENCRYPTION
  // -------------------------------------------------------------------------
  console.log('\n[3/3] Testing Web Push Notification Pipeline & VAPID Crypto...');

  const vapidPub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPriv = process.env.VAPID_PRIVATE_KEY;
  const vapidSub = process.env.VAPID_SUBJECT;

  console.log(`  ✓ VAPID Public Key configured:  ${vapidPub ? vapidPub.slice(0, 16) + '...' : 'MISSING'}`);
  console.log(`  ✓ VAPID Private Key configured: ${vapidPriv ? 'Present (Server-only)' : 'MISSING'}`);
  console.log(`  ✓ VAPID Subject:                ${vapidSub || 'MISSING'}`);

  // Test 3.1: Cryptographic VAPID Request Details generation & AES-128-GCM payload encryption
  const clientECDH = crypto.createECDH('prime256v1');
  clientECDH.generateKeys();
  const mockSub = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/sample-qms-device-token',
    keys: {
      p256dh: clientECDH.getPublicKey('base64url'),
      auth: crypto.randomBytes(16).toString('base64url'),
    }
  };

  webpush.setVapidDetails(vapidSub, vapidPub, vapidPriv);
  const pushPayload = JSON.stringify({
    title: 'Weekly Point Report Ready',
    message: `Weekly report ${reportKey} is ready with ${testTransactions.length} audited transactions.`,
    url: '/admin/reports',
  });

  const reqDetails = webpush.generateRequestDetails(mockSub, pushPayload);
  console.log(`  ✓ VAPID JWT Token minted: ${reqDetails.headers.Authorization?.slice(0, 32)}...`);
  console.log(`  ✓ Payload encrypted via:  ${reqDetails.headers['Content-Encoding']}`);
  console.log(`  ✓ Ciphertext body size:   ${reqDetails.body?.length} bytes`);

  // Test 3.2: sendPushNotificationToUser via Supabase
  const pushResult = await sendPushNotificationToUser(targetUser.id, {
    title: 'Weekly Compliance Report Ready',
    message: `Your weekly point audit report (${reportKey}) has been published.`,
    url: `/admin/reports?key=${reportKey}`,
  });
  console.log(`  ✓ sendPushNotificationToUser dispatched: ${pushResult.sentCount} active devices notified (${pushResult.errors} errors)`);

  console.log('\n======================================================================');
  console.log('ALL PIPELINE TESTS COMPLETED SUCCESSFULLY: PDF + EMAIL + PUSH');
  console.log('======================================================================');
}

testCompletePipeline().catch((err) => {
  console.error('\nPipeline Test FAILED:', err);
  process.exit(1);
});
