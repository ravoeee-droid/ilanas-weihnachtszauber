"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

type Wish = {
  id: string;
  name: string;
  emoji: string;
  target: number;
};

type HistoryEntry = {
  id: string;
  points: number;
  reason: string;
  createdAt: number;
};

type AppData = {
  points: number;
  wishes: Wish[];
  history: HistoryEntry[];
  parentPin: string;
};

const STORAGE_KEY = "ilanas-weihnachtszauber-v1";
const DB_NAME = "ilanas-weihnachtszauber";

const DEFAULT_DATA: AppData = {
  points: 0,
  parentPin: "2412",
  wishes: [
    { id: "wish-teddy", name: "Teddybär", emoji: "🧸", target: 80 },
    { id: "wish-dino", name: "Dinosaurier", emoji: "🦕", target: 100 },
    { id: "wish-house", name: "Puppenhaus", emoji: "🏠", target: 150 }
  ],
  history: []
};

function uid(prefix: string) {
  return prefix + "-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

function daysUntilChristmas() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let christmas = new Date(now.getFullYear(), 11, 24);
  if (today.getTime() > christmas.getTime()) {
    christmas = new Date(now.getFullYear() + 1, 11, 24);
  }
  return Math.max(0, Math.ceil((christmas.getTime() - today.getTime()) / 86400000));
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("state")) {
        db.createObjectStore("state");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readIndexedDb(): Promise<AppData | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const tx = db.transaction("state", "readonly");
      const request = tx.objectStore("state").get("main");
      request.onsuccess = () => resolve((request.result as AppData) || null);
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function writeIndexedDb(data: AppData) {
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction("state", "readwrite");
      tx.objectStore("state").put(data, "main");
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // localStorage bleibt als zweite Sicherung bestehen.
  }
}

function formatEntryDate(timestamp: number) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const prefix =
    date.toDateString() === today.toDateString()
      ? "Heute"
      : date.toDateString() === yesterday.toDateString()
        ? "Gestern"
        : date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });

  return prefix + ", " + date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

export default function Home() {
  const [data, setData] = useState<AppData>(DEFAULT_DATA);
  const [hydrated, setHydrated] = useState(false);
  const [parentOpen, setParentOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [toast, setToast] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const days = daysUntilChristmas();

  const stars = useMemo(
    () =>
      Array.from({ length: 44 }, (_, index) => ({
        left: ((index * 37) % 97) + "%",
        top: ((index * 53) % 70) + "%",
        delay: ((index * 17) % 25) / 10 + "s",
        size: 2 + ((index * 7) % 6)
      })),
    []
  );

  useEffect(() => {
    let mounted = true;

    async function load() {
      let saved: AppData | null = null;
      const local = window.localStorage.getItem(STORAGE_KEY);

      if (local) {
        try {
          saved = JSON.parse(local) as AppData;
        } catch {
          saved = null;
        }
      }

      if (!saved) saved = await readIndexedDb();

      if (mounted && saved) {
        setData({
          ...DEFAULT_DATA,
          ...saved,
          wishes: saved.wishes?.length ? saved.wishes : DEFAULT_DATA.wishes,
          history: saved.history || []
        });
      }

      if (mounted) setHydrated(true);
    }

    void load();

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    void writeIndexedDb(data);
  }, [data, hydrated]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }

  function adjustPoints(amount: number, customReason?: string) {
    const entryReason =
      customReason ||
      (amount === 5
        ? "Besonders fleißig gewesen"
        : amount > 0
          ? "Eine gute Tat"
          : "Grantelbart war aufmerksam");

    setData((current) => ({
      ...current,
      points: Math.max(0, current.points + amount),
      history: [
        {
          id: uid("entry"),
          points: amount,
          reason: entryReason,
          createdAt: Date.now()
        },
        ...current.history
      ].slice(0, 100)
    }));

    showToast(
      amount > 0
        ? "✨ Der Weihnachtsmann hat es gesehen!"
        : "🧙 Grantelbart hat Sterne eingepackt."
    );
  }

  function unlockParents() {
    const pin = window.prompt("Eltern-PIN eingeben");
    if (pin === data.parentPin) {
      setParentOpen(true);
      setReason("");
    } else if (pin !== null) {
      showToast("Der PIN stimmt leider nicht.");
    }
  }

  function subtract(amount: number) {
    adjustPoints(-amount, reason.trim() || "Heute hat es nicht so gut geklappt");
    setReason("");
  }

  function addWish() {
    const name = window.prompt("Was wünscht sich Ilana?");
    if (!name?.trim()) return;

    const targetRaw = window.prompt("Wie viele Sterne soll der Wunsch kosten?", "100");
    const target = Math.max(1, Number(targetRaw) || 100);
    const emoji = window.prompt("Welches Emoji passt zum Wunsch?", "🎁") || "🎁";

    setData((current) => ({
      ...current,
      wishes: [...current.wishes, { id: uid("wish"), name: name.trim(), emoji, target }]
    }));
    showToast("🎁 Wunsch hinzugefügt.");
  }

  function removeWish(id: string) {
    setData((current) => ({
      ...current,
      wishes: current.wishes.filter((wish) => wish.id !== id)
    }));
  }

  function changePin() {
    const nextPin = window.prompt("Neuen 4-stelligen Eltern-PIN eingeben", data.parentPin);
    if (nextPin && /^\d{4}$/.test(nextPin)) {
      setData((current) => ({ ...current, parentPin: nextPin }));
      showToast("🔐 Eltern-PIN geändert.");
    } else if (nextPin !== null) {
      showToast("Bitte genau 4 Zahlen verwenden.");
    }
  }

  function exportBackup() {
    const payload = JSON.stringify(data, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ilanas-weihnachtszauber-backup.json";
    anchor.click();
    URL.revokeObjectURL(url);
    showToast("💾 Backup erstellt.");
  }

  function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = JSON.parse(String(reader.result)) as AppData;
        if (
          typeof next.points !== "number" ||
          !Array.isArray(next.wishes) ||
          !Array.isArray(next.history)
        ) {
          throw new Error("invalid backup");
        }
        setData({ ...DEFAULT_DATA, ...next });
        showToast("✅ Backup wiederhergestellt.");
      } catch {
        showToast("Das Backup konnte nicht gelesen werden.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  const milestonePercent = Math.min(100, (data.points / 150) * 100);

  return (
    <main className="app">
      <div className="aurora" />
      <div className="stars" aria-hidden="true">
        {stars.map((star, index) => (
          <span
            key={index}
            style={{
              left: star.left,
              top: star.top,
              animationDelay: star.delay,
              width: star.size,
              height: star.size
            }}
          />
        ))}
      </div>

      {toast && <div className="toast">{toast}</div>}

      <section className="hero">
        <div className="santaScene" aria-hidden="true">
          <div className="moon" />
          <div className="santa">🎅</div>
          <div className="lantern">🏮</div>
          <p>
            Du machst die Welt
            <br />
            ein bisschen heller! ♡
          </p>
        </div>

        <div className="heroCenter">
          <div className="eyebrow">✦ KLEINE TATEN · GROSSE WUNDER ✦</div>
          <h1>
            Ilanas <span>Weihnachtszauber</span>
          </h1>

          <div className="countdown">
            🗓️ Noch <strong>{days} Tage</strong> bis Weihnachten
          </div>

          <div className="pointsRow">
            <button className="magicButton green" onClick={() => adjustPoints(1)}>
              <strong>★ +1 Stern</strong>
              <small>Für eine kleine gute Tat</small>
            </button>

            <div className="scoreStar" aria-label={data.points + " Fleißsterne"}>
              <strong>{data.points}</strong>
              <span>Fleißsterne</span>
            </div>

            <button className="magicButton red" onClick={() => adjustPoints(5)}>
              <strong>★★ +5 Sterne</strong>
              <small>Du bist großartig!</small>
            </button>
          </div>
        </div>

        <button
          className="grantelScene"
          onClick={unlockParents}
          aria-label="Elternbereich öffnen"
        >
          <span className="cloud">☁️</span>
          <span className="grantel">🧙‍♂️</span>
          <strong>Grantelbart</strong>
          <small>passt auf die Sterne auf</small>
          <em>🔐 Elternbereich</em>
        </button>
      </section>

      <section className="milestones">
        <div className="sectionLabel">Auf dem Weg zu großen Träumen …</div>
        <div className="progressTrack">
          <div className="progressFill" style={{ width: milestonePercent + "%" }} />
          {[25, 50, 100, 150].map((milestone) => (
            <div
              key={milestone}
              className={"milestone " + (data.points >= milestone ? "reached" : "")}
              style={{ left: (milestone / 150) * 100 + "%" }}
            >
              <span>{data.points >= milestone ? "🎁" : "✦"}</span>
              <strong>{milestone}</strong>
              <small>Sterne</small>
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard">
        <div className="panel wishesPanel">
          <div className="panelHeader">
            <div>
              <span className="panelIcon">♥</span>
              <h2>Meine Wünsche</h2>
            </div>
            <button onClick={unlockParents}>+ Wunsch</button>
          </div>

          <div className="wishGrid">
            {data.wishes.map((wish) => {
              const percent = Math.min(100, (data.points / wish.target) * 100);

              return (
                <article className="wishCard" key={wish.id}>
                  <button
                    className="wishDelete"
                    onClick={() => {
                      const pin = window.prompt("Eltern-PIN");
                      if (pin === data.parentPin) removeWish(wish.id);
                    }}
                    aria-label="Wunsch entfernen"
                  >
                    ×
                  </button>

                  <div className="wishImage">{wish.emoji}</div>
                  <h3>{wish.name}</h3>
                  <div className="wishTarget">{wish.target} Sterne</div>
                  <div className="miniProgress">
                    <span style={{ width: percent + "%" }} />
                  </div>
                  <small>
                    {data.points}/{wish.target}
                  </small>
                </article>
              );
            })}
          </div>
        </div>

        <div className="panel diaryPanel">
          <div className="panelHeader">
            <div>
              <span className="panelIcon">📖</span>
              <h2>Sternen-Tagebuch</h2>
            </div>
            <span className="saveBadge">● automatisch gespeichert</span>
          </div>

          <div className="history">
            {data.history.length === 0 ? (
              <div className="emptyHistory">
                <span>✨</span>
                <strong>Hier beginnt Ilanas Sternen-Geschichte.</strong>
                <small>Die erste gute Tat wartet schon.</small>
              </div>
            ) : (
              data.history.slice(0, 7).map((entry) => (
                <div className="historyRow" key={entry.id}>
                  <span
                    className={
                      entry.points >= 0 ? "historyPoints plus" : "historyPoints minus"
                    }
                  >
                    {entry.points > 0 ? "+" : ""}
                    {entry.points}
                  </span>

                  <div>
                    <strong>{entry.reason}</strong>
                    <small>{formatEntryDate(entry.createdAt)}</small>
                  </div>

                  <span className="historyNote">
                    {entry.points > 0
                      ? "Das war toll! ✨"
                      : "Morgen klappt es besser ♡"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <footer>
        <span>✦</span>
        Kleine Menschen können Großes bewirken.
        <span>✦</span>
        <button onClick={unlockParents}>Elternbereich</button>
      </footer>

      {parentOpen && (
        <div
          className="modalBackdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setParentOpen(false);
          }}
        >
          <div className="parentModal">
            <button className="modalClose" onClick={() => setParentOpen(false)}>
              ×
            </button>

            <div className="modalMascot">🧙‍♂️</div>
            <p className="modalEyebrow">GRANTELBARTS ELTERNBEREICH</p>
            <h2>Sterne verwalten</h2>
            <p className="modalIntro">
              Nur Mama & Papa können hier Sterne abziehen oder Wünsche verändern.
            </p>

            <label>
              Warum werden Sterne abgezogen?
              <input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="z. B. nicht aufgeräumt"
              />
            </label>

            <div className="minusButtons">
              <button onClick={() => subtract(1)}>−1 Stern</button>
              <button onClick={() => subtract(2)}>−2 Sterne</button>
              <button onClick={() => subtract(5)}>−5 Sterne</button>
            </div>

            <div className="parentActions">
              <button onClick={addWish}>🎁 Wunsch hinzufügen</button>
              <button onClick={changePin}>🔐 PIN ändern</button>
              <button onClick={exportBackup}>💾 Backup sichern</button>
              <button onClick={() => fileInputRef.current?.click()}>
                ↩ Backup laden
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                onChange={importBackup}
                hidden
              />
            </div>

            <p className="storageNote">
              Änderungen werden sofort auf diesem Gerät in zwei Speichern gesichert.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
