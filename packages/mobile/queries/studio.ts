import { useMutation } from "@tanstack/react-query";
import { client } from "@/lib/api";

export const useGeneratePattern = () =>
  useMutation({ mutationFn: (prompt: string) => client.studio.generatePattern({ prompt }) });
