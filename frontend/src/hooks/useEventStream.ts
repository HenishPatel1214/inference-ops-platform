import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/hooks/useInferenceOps";
import { eventSocketUrl } from "@/lib/websocket";
import type { ConnectionState, SystemEvent } from "@/lib/types";

export function useEventStream(): ConnectionState {
  const queryClient = useQueryClient();
  const [state, setState] = useState<ConnectionState>("connecting");

  useEffect(() => {
    let isMounted = true;
    const socket = new WebSocket(eventSocketUrl());
    const heartbeat = window.setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send("ping");
      }
    }, 25000);

    socket.onopen = () => {
      if (isMounted) setState("live");
    };

    socket.onerror = () => {
      if (isMounted) setState("degraded");
    };

    socket.onclose = () => {
      if (isMounted) setState("offline");
    };

    socket.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data as string) as SystemEvent;
        queryClient.setQueryData<SystemEvent[]>(queryKeys.events, (current = []) => {
          if (current.some((item) => item.id === event.id)) return current;
          return [event, ...current].slice(0, 160);
        });

        if (event.event_type.includes("inference") || event.payload.request_id) {
          void queryClient.invalidateQueries({ queryKey: queryKeys.overview });
          void queryClient.invalidateQueries({ queryKey: queryKeys.failures });
          void queryClient.invalidateQueries({ queryKey: queryKeys.nodes });
        }
      } catch {
        setState("degraded");
      }
    };

    return () => {
      isMounted = false;
      window.clearInterval(heartbeat);
      socket.close();
    };
  }, [queryClient]);

  return state;
}
