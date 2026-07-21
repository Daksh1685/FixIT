import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { isRequestCancelled, toApiError } from '../../../services/api/client';
import { requestFollowUp } from '../../../services/api/follow-up.service';
import { DeviceDiagnosis, FollowUpMessage } from '../../../types/diagnosis';

export function useFollowUpConversation(diagnosis: DeviceDiagnosis | null) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<FollowUpMessage[]>([]);
  const activeRequest = useRef<AbortController | null>(null);
  const sessionKey = useMemo(() => (diagnosis ? JSON.stringify(diagnosis) : null), [diagnosis]);

  useEffect(() => {
    activeRequest.current?.abort();
    activeRequest.current = null;
    setErrorMessage(null);
    setIsSending(false);
    setMessages([]);
  }, [sessionKey]);

  useEffect(() => () => activeRequest.current?.abort(), []);

  const sendQuestion = useCallback(
    async (question: string, displayContent = question): Promise<boolean> => {
      const normalizedQuestion = question.trim();
      const normalizedDisplayContent = displayContent.trim();
      if (!diagnosis || !normalizedQuestion || isSending) {
        return false;
      }

      const history = messages;
      const controller = new AbortController();
      activeRequest.current = controller;
      setErrorMessage(null);
      setIsSending(true);
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          content: normalizedQuestion,
          displayContent: normalizedDisplayContent || normalizedQuestion,
          role: 'user',
        },
      ]);

      try {
        const answer = await requestFollowUp(diagnosis, history, normalizedQuestion, controller.signal);
        if (!controller.signal.aborted) {
          setMessages((currentMessages) => [...currentMessages, { content: answer, role: 'assistant' }]);
        }
        return true;
      } catch (error) {
        if (!controller.signal.aborted && !isRequestCancelled(error)) {
          setErrorMessage(toApiError(error).message);
        }
        return false;
      } finally {
        if (!controller.signal.aborted) {
          setIsSending(false);
        }
      }
    },
    [diagnosis, isSending, messages],
  );

  const retryLastQuestion = useCallback(async (): Promise<boolean> => {
    const lastMessage = messages.at(-1);
    if (!lastMessage || lastMessage.role !== 'user') {
      return false;
    }

    const history = messages.slice(0, -1);
    if (!diagnosis || isSending) {
      return false;
    }

    const controller = new AbortController();
    activeRequest.current = controller;
    setErrorMessage(null);
    setIsSending(true);

    try {
      const answer = await requestFollowUp(diagnosis, history, lastMessage.content, controller.signal);
      if (!controller.signal.aborted) {
        setMessages((currentMessages) => [...currentMessages, { content: answer, role: 'assistant' }]);
      }
      return true;
    } catch (error) {
      if (!controller.signal.aborted && !isRequestCancelled(error)) {
        setErrorMessage(toApiError(error).message);
      }
      return false;
    } finally {
      if (!controller.signal.aborted) {
        setIsSending(false);
      }
    }
  }, [diagnosis, isSending, messages]);

  return { errorMessage, isSending, messages, retryLastQuestion, sendQuestion };
}
