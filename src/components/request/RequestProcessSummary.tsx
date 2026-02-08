import React, { useMemo, useState } from "react";
import { format } from "date-fns";
import { Download, Eye, File, Paperclip } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import { Attachment, CustomerRequest } from "@/types";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  request: CustomerRequest;
};

const Card: React.FC<{
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}> = ({ title, description, className, children }) => (
  <div className={cn("bg-card rounded-lg border border-border p-4 md:p-6 space-y-4", className)}>
    <div className="space-y-1">
      <h2 className="text-base md:text-lg font-semibold text-foreground">{title}</h2>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
    </div>
    {children}
  </div>
);

const Field: React.FC<{ label: string; value?: React.ReactNode; className?: string }> = ({ label, value, className }) => (
  <div className={cn("space-y-1", className)}>
    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="text-sm font-medium text-foreground break-words">{value ?? "-"}</div>
  </div>
);

const formatDate = (d: any) => {
  if (!d) return "-";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(+date)) return "-";
  return format(date, "MMM d, yyyy");
};

const buildAttachmentHref = (attachment: Attachment) => {
  const url = String(attachment?.url ?? "").trim();
  if (!url) return "";

  if (
    url.startsWith("data:") ||
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("blob:") ||
    url.startsWith("/")
  ) {
    return url;
  }

  const ext = (attachment.filename || "").split(".").pop()?.toLowerCase() ?? "";
  const imageTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    bmp: "image/bmp",
  };

  if (ext === "pdf") return `data:application/pdf;base64,${url}`;
  if (imageTypes[ext]) return `data:${imageTypes[ext]};base64,${url}`;
  return `data:application/octet-stream;base64,${url}`;
};

const isImageFile = (filename: string) => {
  const ext = filename.toLowerCase().split(".").pop();
  return ["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(ext || "");
};

const isPdfFile = (filename: string) => filename.toLowerCase().endsWith(".pdf");

const AttachmentList: React.FC<{
  title: string;
  attachments: Attachment[];
}> = ({ title, attachments }) => {
  const { t } = useLanguage();
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const openPreview = (a: Attachment) => {
    setPreviewAttachment(a);
    setIsPreviewOpen(true);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Paperclip className="h-4 w-4 text-muted-foreground" />
        {title}
      </div>
      {attachments.length ? (
        <div className="space-y-2">
          {attachments.map((a) => {
            const href = buildAttachmentHref(a);
            return (
              <div
                key={a.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <File className="h-4 w-4 text-primary" />
                  <span className="text-sm truncate text-foreground">{a.filename}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="hidden sm:inline text-xs text-muted-foreground">{formatDate(a.uploadedAt)}</span>
                  <button
                    type="button"
                    onClick={() => openPreview(a)}
                    className="rounded p-1.5 text-primary hover:bg-primary/15"
                    title={t.table.view}
                  >
                    <Eye size={16} />
                  </button>
                  <a
                    href={href}
                    download={a.filename}
                    className="rounded p-1.5 text-primary hover:bg-primary/15"
                    title={t.request.downloadFile}
                  >
                    <Download size={16} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">-</div>
      )}

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent
          className="max-w-4xl max-h-[90vh] overflow-auto"
          onInteractOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="truncate pr-8">{previewAttachment?.filename}</DialogTitle>
          </DialogHeader>
          <div className="flex min-h-[300px] items-center justify-center">
            {previewAttachment && isImageFile(previewAttachment.filename) && (
              <img
                src={buildAttachmentHref(previewAttachment)}
                alt={previewAttachment.filename}
                className="max-h-[70vh] max-w-full object-contain"
              />
            )}
            {previewAttachment && isPdfFile(previewAttachment.filename) && (
              <iframe
                src={buildAttachmentHref(previewAttachment)}
                title={previewAttachment.filename}
                className="h-[70vh] w-full border border-border rounded"
              />
            )}
            {previewAttachment &&
              !isImageFile(previewAttachment.filename) &&
              !isPdfFile(previewAttachment.filename) && (
                <div className="space-y-3 text-center">
                  <div className="text-sm text-muted-foreground">{t.request.previewNotAvailable}</div>
                  <a
                    href={buildAttachmentHref(previewAttachment)}
                    download={previewAttachment.filename}
                    className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    <Download size={16} className="mr-2" />
                    {t.request.downloadFile}
                  </a>
                </div>
              )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const RequestProcessSummary: React.FC<Props> = ({ request }) => {
  const { t, translateOption } = useLanguage();

  const showClarification = Boolean(
    request.status === "clarification_needed" ||
      (request.clarificationComment ?? "").trim() ||
      (request.clarificationResponse ?? "").trim()
  );

  const showDesign = Boolean(
    request.status !== "draft" ||
      request.expectedDesignReplyDate ||
      (request.acceptanceMessage ?? "").trim() ||
      (request.designResultComments ?? "").trim() ||
      (Array.isArray(request.designResultAttachments) && request.designResultAttachments.length > 0)
  );

  const showCosting = Boolean(
    ["in_costing", "costing_complete", "sales_followup", "gm_approval_pending", "gm_approved", "gm_rejected", "closed"].includes(
      request.status
    ) ||
      (request.costingNotes ?? "").trim() ||
      typeof request.sellingPrice === "number" ||
      typeof request.calculatedMargin === "number" ||
      (request.incoterm ?? "").trim() ||
      (request.deliveryLeadtime ?? "").trim() ||
      (Array.isArray(request.costingAttachments) && request.costingAttachments.length > 0)
  );

  const showSales = Boolean(
    ["sales_followup", "gm_approval_pending", "gm_approved", "gm_rejected", "closed"].includes(request.status) ||
      typeof request.salesFinalPrice === "number" ||
      (request.salesFeedbackComment ?? "").trim() ||
      (Array.isArray(request.salesAttachments) && request.salesAttachments.length > 0)
  );

  const designAttachments = Array.isArray(request.designResultAttachments) ? request.designResultAttachments : [];
  const costingAttachments = Array.isArray(request.costingAttachments) ? request.costingAttachments : [];
  const salesAttachments = Array.isArray(request.salesAttachments) ? request.salesAttachments : [];

  const statusLabel = useMemo(() => t.statuses[request.status as keyof typeof t.statuses] || request.status, [request.status, t.statuses]);

  if (!showClarification && !showDesign && !showCosting && !showSales) {
    return null;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {showClarification && (
        <Card title={t.panels.clarification} description={t.panels.designTeamNeedsInfo}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <Field label={t.panels.clarificationComment} value={request.clarificationComment?.trim() ? <div className="whitespace-pre-line">{request.clarificationComment}</div> : "-"} />
            <Field label={t.panels.clarificationResponse} value={request.clarificationResponse?.trim() ? <div className="whitespace-pre-line">{request.clarificationResponse}</div> : "-"} />
          </div>
        </Card>
      )}

      {showDesign && (
        <Card title={t.panels.designReview} description={`${t.common.status}: ${statusLabel}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <Field
              label={t.panels.expectedReplyDate}
              value={request.expectedDesignReplyDate ? formatDate(request.expectedDesignReplyDate) : "-"}
            />
            <Field
              label={t.panels.acceptanceMessage}
              value={request.acceptanceMessage?.trim() ? <div className="whitespace-pre-line">{request.acceptanceMessage}</div> : "-"}
            />
          </div>

          {(request.designResultComments?.trim() || designAttachments.length) && (
            <div className="mt-4 space-y-4">
              <Field
                label={t.panels.designResultComments}
                value={request.designResultComments?.trim() ? <div className="whitespace-pre-line">{request.designResultComments}</div> : "-"}
              />
              <AttachmentList title={t.panels.designResultUploads} attachments={designAttachments} />
            </div>
          )}
        </Card>
      )}

      {showCosting && (
        <Card title={t.panels.costingPanel} description={t.panels.manageCostingProcess}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <Field label={t.panels.sellingPrice} value={typeof request.sellingPrice === "number" ? request.sellingPrice : "-"} />
            <Field label={t.panels.currency} value={request.sellingCurrency ? request.sellingCurrency : "-"} />
            <Field label={t.panels.margin} value={typeof request.calculatedMargin === "number" ? request.calculatedMargin : "-"} />
            <Field label={t.panels.incoterm} value={request.incoterm ? translateOption(request.incoterm) : "-"} />
            <Field label={t.panels.vatMode} value={request.vatMode ? (request.vatMode === "with" ? t.panels.withVat : t.panels.withoutVat) : "-"} />
            <Field label={t.panels.deliveryLeadtime} value={request.deliveryLeadtime?.trim() ? request.deliveryLeadtime : "-"} />
          </div>
          {request.costingNotes?.trim() ? (
            <div className="mt-4">
              <Field label={t.panels.costingNotesInternal} value={<div className="whitespace-pre-line">{request.costingNotes}</div>} />
            </div>
          ) : null}
          <div className="mt-4">
            <AttachmentList title={t.panels.costingAttachments} attachments={costingAttachments} />
          </div>
        </Card>
      )}

      {showSales && (
        <Card title={t.panels.salesFollowup} description={t.panels.salesFollowupDesc}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <Field label={t.panels.salesFinalPrice} value={typeof request.salesFinalPrice === "number" ? request.salesFinalPrice : "-"} />
            <Field label={t.panels.currency} value={request.salesCurrency ? request.salesCurrency : "-"} />
            <Field label={t.panels.salesFeedback} value={request.salesFeedbackComment?.trim() ? <div className="whitespace-pre-line">{request.salesFeedbackComment}</div> : "-"} className="sm:col-span-2 lg:col-span-3" />
          </div>
          <div className="mt-4">
            <AttachmentList title={t.panels.salesAttachments} attachments={salesAttachments} />
          </div>
        </Card>
      )}
    </div>
  );
};

export default RequestProcessSummary;

