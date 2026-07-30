"use client";

import { useState, useTransition } from "react";
import { t, type TranslationKey } from "@/i18n";
import { updateMessageStatus, saveMessageNote } from "@/lib/actions/messages";
import { Button } from "@/components/ui/Button";
import type { MessageStatus } from "@/types/database";

const STATUSES: MessageStatus[] = ["nova", "em_atendimento", "aguardando_cliente", "resolvida", "spam"];

export function MessageDetailPanel({ messageId, initialStatus, initialNote }: { messageId: string; initialStatus: MessageStatus; initialNote: string }) {
  const [status, setStatus] = useState(initialStatus);
  const [note, setNote] = useState(initialNote);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function changeStatus(newStatus: MessageStatus) {
    setStatus(newStatus);
    startTransition(async () => {
      const result = await updateMessageStatus(messageId, newStatus);
      setMessage(result.message);
    });
  }

  function saveNote() {
    startTransition(async () => {
      const result = await saveMessageNote(messageId, note);
      setMessage(result.message);
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-gray-200 p-4">
      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("admin.messages.changeStatus")}
        <select
          value={status}
          disabled={isPending}
          onChange={(e) => changeStatus(e.target.value as MessageStatus)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {t(`admin.messages.status.${value}` as TranslationKey)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("admin.messages.adminNote")}
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </label>
      <Button size="sm" disabled={isPending} onClick={saveNote} className="w-fit">
        {t("admin.messages.saveNote")}
      </Button>

      {message && <p className="text-sm text-emerald-700">{message}</p>}
    </div>
  );
}
