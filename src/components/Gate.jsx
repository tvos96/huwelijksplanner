import React, { useState } from "react";
import { MONO } from "../data";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { syncAvailable } from "../lib/plannerStore";

export default function Gate({ onSubmit }) {
  const [value, setValue] = useState("");
  const trimmed = value.trim().toLowerCase();
  const canSubmit = trimmed.length >= 3;

  function submit() {
    if (!canSubmit) return;
    onSubmit(trimmed);
  }

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-canvas px-6 text-center">
      <div className="w-full max-w-[380px]">
        <img src={MONO} alt="" className="mx-auto mb-4 h-24 w-auto" />
        <h1 className="text-xl font-extrabold text-ink">Welkom bij jullie planner</h1>
        <p className="mt-1 mb-5 text-[15px] leading-relaxed text-muted">
          Vul jullie <b>gedeelde code</b> in. Gebruik op <b>beide telefoons exact dezelfde code</b> — zo
          zien jullie elkaars wijzigingen live.
        </p>
        <Input
          autoFocus
          type="text"
          placeholder="bijv. tim-ita-2027"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          className="mb-3 text-center text-[17px]"
        />
        <Button className="w-full" disabled={!canSubmit} onClick={submit}>Doorgaan</Button>
        <p className="mt-4 text-xs leading-relaxed text-muted">
          Verzin samen één code en houd 'm geheim. Wie de code niet kent, ziet jullie lijst niet.
          {!syncAvailable && (
            <>
              <br />
              <span className="text-rose-ink">Let op: live-sync kon niet starten — de app werkt nu alleen lokaal op dit toestel.</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
