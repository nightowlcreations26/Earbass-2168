import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { HandHeart, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth";
import { orpc } from "@/lib/api";
import { donationConfirmMutation } from "@/queries/donations";

/** Stripe success redirect → settle the donation (retries while the payment lands). */
export default function DonateThanksPage() {
  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get("d"));
  const back = params.get("back")?.startsWith("/") ? params.get("back")! : "/";
  const { data: session, isPending } = authClient.useSession();
  const qc = useQueryClient();
  const tries = useRef(0);
  const [gaveUp, setGaveUp] = useState(false);
  const confirm = useMutation({
    ...donationConfirmMutation(),
    onSuccess: (r) => {
      if (r.status === "paid") {
        qc.invalidateQueries({ queryKey: orpc.donations.key() });
        return;
      }
      if (++tries.current < 8) setTimeout(() => confirm.mutate({ id }), 2000);
      else setGaveUp(true);
    },
  });

  useEffect(() => {
    if (session && id && confirm.isIdle) confirm.mutate({ id });
  }, [session, id, confirm]);

  const paid = confirm.data?.status === "paid";
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="mx-auto grid size-20 place-items-center rounded-full bg-grad glow">
        {paid ? <HandHeart className="size-9" /> : <Loader2 className="size-8 animate-spin" />}
      </div>
      {paid ? (
        <>
          <h1 className="mt-6 font-display text-3xl font-extrabold">Thank you!</h1>
          <p className="mt-2 text-muted-foreground">
            Your <span className="font-semibold text-lime">${confirm.data!.amount}</span> donation to {confirm.data!.recipientName} is in. It now counts toward their goal.
          </p>
        </>
      ) : confirm.error || gaveUp ? (
        <>
          <h1 className="mt-6 font-display text-2xl font-bold">Still confirming</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {confirm.error?.message ?? "Stripe hasn't reported the payment yet. If you were charged it will show up on the donation bar shortly."}
          </p>
          <button onClick={() => { tries.current = 0; setGaveUp(false); confirm.mutate({ id }); }} className="mt-4 rounded-full bg-surface-2 px-5 py-2.5 text-sm">Check again</button>
        </>
      ) : !isPending && !session ? (
        <p className="mt-6 text-sm text-muted-foreground">Sign in with the account you donated from to confirm.</p>
      ) : (
        <>
          <h1 className="mt-6 font-display text-2xl font-bold">Confirming your donation…</h1>
          <p className="mt-2 text-sm text-muted-foreground">Hang tight, this takes a few seconds.</p>
        </>
      )}
      <Link href={back} className="mt-8 inline-flex rounded-full bg-grad px-6 py-3 text-sm font-semibold">Back to Earbass</Link>
    </div>
  );
}
