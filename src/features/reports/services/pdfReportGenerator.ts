import { jsPDF } from 'jspdf';
import type { PointTransaction, Profile } from '@/types/database';

export interface PointTransactionWithMember extends PointTransaction {
  user?: Profile | null;
  creator?: Profile | null;
  rule?: { id: string; name: string; trigger_type?: string } | null;
  meeting?: { id: string; title: string } | null;
  reversal_of?: { id: string; type?: string; amount?: number } | null;
}

export interface ReportGenerationParams {
  reportKey: string;
  periodStart: Date;
  periodEnd: Date;
  transactions: PointTransactionWithMember[];
  totalAdditions: number;
  totalDeductions: number;
  netChange: number;
  recipientEmail: string;
}

export function generatePointLogPdf(params: ReportGenerationParams): Buffer {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const drawHeader = (isFirstPage: boolean) => {
    // Top primary bar
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(margin, y, contentWidth, 14, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('QUARTZITE MANAGEMENT SYSTEM', margin + 4, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(203, 213, 225); // slate-300
    doc.text('WEEKLY AUDIT & COMPLIANCE POINT LOG', margin + 4, y + 10.5);

    doc.setFontSize(8);
    doc.text(params.reportKey, pageWidth - margin - 4, y + 8, { align: 'right' });

    y += 18;

    if (isFirstPage) {
      // Period and metadata block
      doc.setTextColor(51, 65, 85); // slate-700
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);

      const periodStr = `${params.periodStart.toISOString().split('T')[0]} to ${params.periodEnd.toISOString().split('T')[0]}`;
      const genStr = new Date().toUTCString();

      const recipientLabel =
        params.recipientEmail.length > 65 && params.recipientEmail.includes(',')
          ? `System Administrators (${params.recipientEmail.split(',').length} recipients)`
          : params.recipientEmail;

      doc.text(`Audit Period: ${periodStr}`, margin, y);
      doc.text(`Generated At (UTC): ${genStr}`, margin, y + 4.5);
      doc.text(`Recipient: ${recipientLabel}`, margin, y + 9);

      y += 14;

      // Executive Summary Metrics Box
      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');

      const colWidth = contentWidth / 4;
      const metrics = [
        { label: 'TRANSACTIONS', val: params.transactions.length.toString(), color: [15, 23, 42] },
        { label: 'POINTS AWARDED', val: `+${params.totalAdditions}`, color: [16, 185, 129] }, // emerald
        { label: 'POINTS DEDUCTED', val: `-${params.totalDeductions}`, color: [239, 68, 68] }, // rose
        {
          label: 'NET CHANGE',
          val: `${params.netChange >= 0 ? '+' : ''}${params.netChange}`,
          color: params.netChange >= 0 ? [16, 185, 129] : [239, 68, 68],
        },
      ];

      metrics.forEach((m, idx) => {
        const xPos = margin + idx * colWidth + 4;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(m.label, xPos, y + 6);

        doc.setFontSize(11);
        doc.setTextColor(m.color[0], m.color[1], m.color[2]);
        doc.text(m.val, xPos, y + 13);
      });

      y += 24;
    }
  };

  const drawTableHeader = () => {
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, y + 7, margin + contentWidth, y + 7);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);

    doc.text('DATE / TIME (UTC)', margin + 2, y + 4.5);
    doc.text('TX ID', margin + 27, y + 4.5);
    doc.text('MEMBER', margin + 45, y + 4.5);
    doc.text('TYPE', margin + 78, y + 4.5);
    doc.text('DETAILS / RULE / REASON', margin + 102, y + 4.5);
    doc.text('AMOUNT', pageWidth - margin - 2, y + 4.5, { align: 'right' });

    y += 8;
  };

  // Draw initial page header
  drawHeader(true);
  drawTableHeader();

  // Draw transaction rows
  if (params.transactions.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text('No point transactions recorded during this audit period.', margin + 3, y + 6);
    y += 12;
  } else {
    params.transactions.forEach((tx, index) => {
      // Check for page overflow
      if (y > pageHeight - 22) {
        doc.addPage();
        y = margin;
        drawHeader(false);
        drawTableHeader();
      }

      // Alternating row background
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y - 1, contentWidth, 6.5, 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(71, 85, 105);

      // Date
      const dateFormatted = tx.created_at ? tx.created_at.slice(0, 16).replace('T', ' ') : '-';
      doc.text(dateFormatted, margin + 2, y + 3.5);

      // TX ID
      const txShortId = tx.id ? `#${tx.id.slice(0, 7)}` : '-';
      doc.text(txShortId, margin + 27, y + 3.5);

      // Member
      const memberName = tx.user?.full_name || tx.user?.email || (tx.user_id ? tx.user_id.slice(0, 8) : 'Unknown');
      const truncatedMember = memberName.length > 18 ? `${memberName.slice(0, 16)}..` : memberName;
      doc.text(truncatedMember, margin + 45, y + 3.5);

      // Type
      const txType = tx.type || 'MANUAL';
      doc.text(txType, margin + 78, y + 3.5);

      // Details / Rule / Reason / Reversal info
      let details = tx.reason || 'Manual ledger action';
      if (tx.reversal_of_id) {
        details = `[REV of #${tx.reversal_of_id.slice(0, 7)}] ${details}`;
      } else if (tx.rule?.name) {
        details = `${tx.rule.name} • ${details}`;
      }
      const truncatedDetails = details.length > 42 ? `${details.slice(0, 40)}..` : details;
      doc.text(truncatedDetails, margin + 102, y + 3.5);

      // Amount with color
      const isPositive = tx.amount >= 0;
      doc.setFont('helvetica', 'bold');
      if (isPositive) {
        doc.setTextColor(16, 185, 129); // emerald
      } else {
        doc.setTextColor(225, 29, 72); // rose
      }
      const amountStr = `${isPositive ? '+' : ''}${tx.amount}`;
      doc.text(amountStr, pageWidth - margin - 2, y + 3.5, { align: 'right' });

      y += 6.5;
    });
  }

  // Add Footers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('CONFIDENTIAL - QUARTZITE MANAGEMENT SYSTEM COMPLIANCE ARCHIVE', margin, pageHeight - 8);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
