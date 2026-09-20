"use client";

import {
  ChangeEvent,
  CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

type Tab = "home" | "worlds" | "wishes" | "journal";

type Wish = {
  id: string;
  name: string;
  emoji: string;
  target: number;
  note?: string;
};

type HistoryEntry = {
  id: string;
  points: number;
  reason: string;
  createdAt: number;
  actor: "santa" | "grantelbart";
};

type AppData = {
  points: number;
  totalEarned: number;
  wishes: Wish[];
  history: HistoryEntry[];
  parentPin: string;
};

type World = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  accent: string;
  icon: string;
  mission: string;
  reward: number;
  friends: string[];
};

const STORAGE_KEY = "ilanas-weihnachtszauber-v2";
const LEGACY_STORAGE_KEY = "ilanas-weihnachtszauber-v1";
const DB_NAME = "ilanas-weihnachtszauber";

const DEFAULT_DATA: AppData = {
  points: 0,
  totalEarned: 0,
  parentPin: "2412",
  wishes: [
    { id: "wish-teddy", name: "Teddybär", emoji: "🧸", target: 80, note: "Zum Kuscheln" },
    { id: "wish-dino", name: "Dinosaurier", emoji: "🦕", target: 100, note: "Für neue Abenteuer" },
    { id: "wish-house", name: "Puppenhaus", emoji: "🏠", target: 150, note: "Ein kleines Zuhause" }
  ],
  history: []
};

const WORLDS: World[] = [
  {
    id: "puschelmeer",
    title: "Puschelplumps’ Unterwasserwelt",
    subtitle: "Mangroven · Muscheln · Mut",
    description:
      "Zwischen leuchtenden Muscheln, Mangrovenwurzeln und kleinen Meeresfreunden wartet jeden Tag eine neue gute Tat.",
    image: "/world/underwater.webp",
    accent: "#53d4d0",
    icon: "🫧",
    mission: "Hilf heute bei einer Sache, ohne dass Mama oder Papa dich zweimal fragen müssen.",
    reward: 2,
    friends: ["Puschelplumps", "Papa", "Schildkröte"]
  },
  {
    id: "freunde",
    title: "Die Freunde aus Puschelplumps’ Welt",
    subtitle: "Zusammen ist Magie stärker",
    description:
      "Mama, Papa, Mila, Zlata, Bello, Dino, Wolkenläufer und sogar Grantelbart begleiten Ilana bis Weihnachten.",
    image: "/world/characters.webp",
    accent: "#ffd272",
    icon: "✨",
    mission: "Sag heute jemandem etwas Liebes oder schenke jemandem eine Umarmung.",
    reward: 2,
    friends: ["Mila", "Zlata", "Bello", "Dino", "Wolkenläufer"]
  },
  {
    id: "katzenland",
    title: "Land der Millionen Katzen",
    subtitle: "Mila & Zlata zeigen den Weg",
    description:
      "Ein verschneites Katzenreich voller Pfotenabdrücke, Laternen und kleiner Überraschungen.",
    image: "/world/catland.webp",
    accent: "#ff9fbd",
    icon: "🐾",
    mission: "Räume heute drei Dinge ganz alleine an ihren Platz.",
    reward: 3,
    friends: ["Mila", "Zlata", "Puschelplumps"]
  },
  {
    id: "dinotal",
    title: "Das Dino-Zaubertal",
    subtitle: "Mutig · neugierig · freundlich",
    description:
      "Hier zählt nicht, wer am lautesten brüllt, sondern wer mutig hilft und freundlich bleibt.",
    image: "/world/dinoworld.webp",
    accent: "#9ad86d",
    icon: "🦕",
    mission: "Probiere heute etwas Neues aus, auch wenn du erst ein bisschen unsicher bist.",
    reward: 3,
    friends: ["Dino", "Puschelplumps", "Ilana"]
  },
  {
    id: "wolken",
    title: "Wolkenläufers Traumland",
    subtitle: "Ruhe · Träume · Geborgenheit",
    description:
      "Wenn der Tag langsam leise wird, trägt Wolkenläufer alle schönen Gedanken zu den Sternen.",
    image: "/world/dreams.webp",
    accent: "#b9b4ff",
    icon: "☁️",
    mission: "Mach dich heute ohne Streit bettfertig und erzähle, was dein schönster Moment war.",
    reward: 2,
    friends: ["Wolkenläufer", "Mama", "Papa"]
  }
];


const CHARACTER_FRIENDS = [
  {
    name: "Ilana",
    image: "/characters/ilana.webp",
    tagline: "Unsere kleine Abenteurerin"
  },
  {
    name: "Puschelplumps",
    image: "/characters/puschelplumps.webp",
    tagline: "Bester Freund & Mutmacher"
  },
  {
    name: "Mama",
    image: "/characters/mama.webp",
    tagline: "Immer an Ilanas Seite"
  },
  {
    name: "Papa",
    image: "/characters/papa.webp",
    tagline: "Lustiger Mitabenteurer"
  },
  {
    name: "Mila & Zlata",
    image: "/characters/mila-zlata.webp",
    tagline: "Freundinnen aus dem Katzenland"
  },
  {
    name: "Dino",
    image: "/characters/dino.webp",
    tagline: "Mutiger Freund aus dem Zaubertal"
  },
  {
    name: "Bello",
    image: "/characters/bello.webp",
    tagline: "Treuer Freund für jedes Abenteuer"
  },
  {
    name: "Wolkenläufer",
    image: "/characters/wolkenlaeufer.webp",
    tagline: "Begleiter durch das Traumland"
  },
  {
    name: "Grantelbart",
    image: "/characters/grantelbart.webp",
    tagline: "Passt auf die Sterne auf"
  },
  {
    name: "Weihnachtsmann",
    image: "/characters/santa.webp",
    tagline: "Sieht jede kleine gute Tat"
  }
] as const;

const QUICK_REASONS = [
  "Zimmer aufgeräumt",
  "Lieb geholfen",
  "Gut zugehört",
  "Geteilt",
  "Mutig gewesen",
  "Bettfertig ohne Streit"
];

const NEGATIVE_REASONS = [
  "Nicht zugehört",
  "Aufräumen nicht geklappt",
  "Regel nicht eingehalten",
  "Unfreundlich gewesen",
  "Bettfertig nicht geklappt"
];

function uid(prefix: string) {
  return prefix + "-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

function normalizeData(input: Partial<AppData> | null | undefined): AppData {
  if (!input) return DEFAULT_DATA;

  const history = Array.isArray(input.history)
    ? input.history.map((entry) => ({
        ...entry,
        actor: entry.actor || (entry.points >= 0 ? "santa" : "grantelbart")
      }))
    : [];

  const inferredEarned = history
    .filter((entry) => entry.points > 0)
    .reduce((sum, entry) => sum + entry.points, 0);

  return {
    ...DEFAULT_DATA,
    ...input,
    totalEarned:
      typeof input.totalEarned === "number"
        ? input.totalEarned
        : Math.max(inferredEarned, input.points || 0),
    wishes:
      Array.isArray(input.wishes) && input.wishes.length
        ? input.wishes
        : DEFAULT_DATA.wishes,
    history
  };
}

function daysUntilChristmas() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let christmas = new Date(now.getFullYear(), 11, 24);

  if (today.getTime() > christmas.getTime()) {
    christmas = new Date(now.getFullYear() + 1, 11, 24);
  }

  return Math.max(
    0,
    Math.ceil((christmas.getTime() - today.getTime()) / 86400000)
  );
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);

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
      request.onsuccess = () =>
        resolve(request.result ? normalizeData(request.result as AppData) : null);
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
    // localStorage bleibt die zweite lokale Sicherung.
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
        : date.toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "2-digit"
          });

  return (
    prefix +
    ", " +
    date.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit"
    })
  );
}

function dateKey(timestamp: number) {
  const date = new Date(timestamp);
  return (
    date.getFullYear() +
    "-" +
    String(date.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(date.getDate()).padStart(2, "0")
  );
}

function calculateStreak(history: HistoryEntry[]) {
  const positiveDays = new Set(
    history
      .filter((entry) => entry.points > 0)
      .map((entry) => dateKey(entry.createdAt))
  );

  if (!positiveDays.size) return 0;

  let cursor = new Date();
  cursor.setHours(12, 0, 0, 0);

  const todayKey = dateKey(cursor.getTime());
  if (!positiveDays.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;

  while (positiveDays.has(dateKey(cursor.getTime()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function weekPositivePoints(history: HistoryEntry[]) {
  const now = Date.now();
  const weekAgo = now - 7 * 86400000;

  return history
    .filter((entry) => entry.createdAt >= weekAgo && entry.points > 0)
    .reduce((sum, entry) => sum + entry.points, 0);
}

export default function Home() {
  const [data, setData] = useState<AppData>(DEFAULT_DATA);
  const [hydrated, setHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [toast, setToast] = useState("");
  const [burstKey, setBurstKey] = useState(0);
  const [selectedWorld, setSelectedWorld] = useState<World | null>(null);

  const [pinOpen, setPinOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [parentOpen, setParentOpen] = useState(false);
  const [parentUnlockedUntil, setParentUnlockedUntil] = useState(0);

  const [reason, setReason] = useState("");
  const [customPoints, setCustomPoints] = useState("1");

  const [wishOpen, setWishOpen] = useState(false);
  const [wishDraft, setWishDraft] = useState({
    name: "",
    emoji: "🎁",
    target: "100",
    note: ""
  });

  const [pinChangeOpen, setPinChangeOpen] = useState(false);
  const [newPin, setNewPin] = useState("");

  const pendingParentAction = useRef<null | (() => void)>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const days = daysUntilChristmas();
  const streak = useMemo(() => calculateStreak(data.history), [data.history]);
  const weekStars = useMemo(
    () => weekPositivePoints(data.history),
    [data.history]
  );

  const todayKey = dateKey(Date.now());
  const dailyWorld = useMemo(() => {
    const start = new Date(new Date().getFullYear(), 0, 0);
    const dayOfYear = Math.floor(
      (Date.now() - start.getTime()) / 86400000
    );
    return WORLDS[dayOfYear % WORLDS.length];
  }, [todayKey]);

  function isWorldCompletedToday(world: World) {
    const reason = world.title + ": Tagesmission geschafft";
    return data.history.some(
      (entry) =>
        entry.points > 0 &&
        entry.reason === reason &&
        dateKey(entry.createdAt) === todayKey
    );
  }

  const nextMilestone =
    [25, 50, 100, 150, 200, 300].find((value) => value > data.points) ||
    Math.ceil((data.points + 1) / 100) * 100;

  const previousMilestone =
    [0, 25, 50, 100, 150, 200, 300]
      .filter((value) => value <= data.points)
      .pop() || 0;

  const milestoneProgress = Math.min(
    100,
    ((data.points - previousMilestone) /
      Math.max(1, nextMilestone - previousMilestone)) *
      100
  );

  const snow = useMemo(
    () =>
      Array.from({ length: 26 }, (_, index) => ({
        left: ((index * 41) % 97) + "%",
        delay: ((index * 13) % 33) / 10 + "s",
        duration: 7 + ((index * 17) % 8) + "s",
        size: 3 + ((index * 5) % 7)
      })),
    []
  );

  useEffect(() => {
    let mounted = true;

    async function load() {
      let saved: AppData | null = null;
      const local =
        window.localStorage.getItem(STORAGE_KEY) ||
        window.localStorage.getItem(LEGACY_STORAGE_KEY);

      if (local) {
        try {
          saved = normalizeData(JSON.parse(local) as AppData);
        } catch {
          saved = null;
        }
      }

      if (!saved) saved = await readIndexedDb();

      if (mounted && saved) {
        setData(saved);
      }

      if (mounted) setHydrated(true);
    }

    void load();

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    if (navigator.storage?.persist) {
      navigator.storage.persist().catch(() => undefined);
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
    window.setTimeout(() => setToast(""), 2500);
  }

  function sparkle() {
    setBurstKey((value) => value + 1);
  }

  function adjustPoints(amount: number, customReason?: string) {
    setData((current) => {
      const nextPoints = Math.max(0, current.points + amount);
      const actualChange = nextPoints - current.points;

      if (actualChange === 0) return current;

      return {
        ...current,
        points: nextPoints,
        totalEarned:
          actualChange > 0
            ? current.totalEarned + actualChange
            : current.totalEarned,
        history: [
          {
            id: uid("entry"),
            points: actualChange,
            reason:
              customReason?.trim() ||
              (actualChange > 0
                ? "Eine gute Tat"
                : "Heute hat es noch nicht ganz geklappt"),
            createdAt: Date.now(),
            actor: actualChange > 0 ? ("santa" as const) : ("grantelbart" as const)
          },
          ...current.history
        ].slice(0, 180)
      };
    });

    if (amount > 0) {
      sparkle();
      showToast(
        amount >= 3
          ? "✨ Wow! Der Weihnachtsmann hat das bestimmt gesehen."
          : "⭐ Ein neuer Fleißstern leuchtet!"
      );
    } else {
      showToast("🧙‍♂️ Grantelbart passt heute besonders gut auf.");
    }

    if ("vibrate" in navigator) {
      navigator.vibrate?.(amount > 0 ? 18 : 10);
    }
  }

  function undoLastEntry() {
    guardParent(() => {
      if (!data.history.length) {
        showToast("Es gibt noch nichts zum Rückgängigmachen.");
        return;
      }

      setData((current) => {
        const last = current.history[0];
        if (!last) return current;

        return {
          ...current,
          points: Math.max(0, current.points - last.points),
          totalEarned:
            last.points > 0
              ? Math.max(0, current.totalEarned - last.points)
              : current.totalEarned,
          history: current.history.slice(1)
        };
      });

      showToast("↩ Letzte Änderung wurde rückgängig gemacht.");
    });
  }

  function guardParent(action: () => void) {
    if (Date.now() < parentUnlockedUntil) {
      action();
      return;
    }

    pendingParentAction.current = action;
    setPinInput("");
    setPinError(false);
    setPinOpen(true);
  }

  function verifyPin(value: string) {
    if (value.length !== 4) return;

    if (value === data.parentPin) {
      setParentUnlockedUntil(Date.now() + 5 * 60 * 1000);
      setPinOpen(false);
      setPinInput("");
      setPinError(false);

      const action = pendingParentAction.current;
      pendingParentAction.current = null;
      action?.();
    } else {
      setPinError(true);
      window.setTimeout(() => {
        setPinInput("");
        setPinError(false);
      }, 650);
    }
  }

  function pressPinKey(key: string) {
    if (key === "back") {
      setPinInput((value) => value.slice(0, -1));
      return;
    }

    setPinInput((value) => {
      if (value.length >= 4) return value;
      const next = value + key;
      window.setTimeout(() => verifyPin(next), 30);
      return next;
    });
  }

  function openParentCenter() {
    guardParent(() => setParentOpen(true));
  }

  function addQuickStars(points: number, quickReason?: string) {
    guardParent(() => {
      adjustPoints(points, quickReason || reason || "Eine gute Tat");
      setReason("");
    });
  }

  function subtractStars(points: number) {
    guardParent(() => {
      adjustPoints(
        -Math.abs(points),
        reason || "Heute hat es noch nicht ganz geklappt"
      );
      setReason("");
    });
  }

  function saveWish() {
    const name = wishDraft.name.trim();
    const target = Math.max(1, Number(wishDraft.target) || 100);

    if (!name) {
      showToast("Bitte gib dem Wunsch noch einen Namen.");
      return;
    }

    setData((current) => ({
      ...current,
      wishes: [
        ...current.wishes,
        {
          id: uid("wish"),
          name,
          emoji: wishDraft.emoji.trim() || "🎁",
          target,
          note: wishDraft.note.trim()
        }
      ]
    }));

    setWishDraft({
      name: "",
      emoji: "🎁",
      target: "100",
      note: ""
    });
    setWishOpen(false);
    showToast("🎁 Der Wunsch hängt jetzt am Wunschbaum.");
  }

  function deleteWish(id: string) {
    guardParent(() => {
      setData((current) => ({
        ...current,
        wishes: current.wishes.filter((wish) => wish.id !== id)
      }));
      showToast("Wunsch entfernt.");
    });
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
    showToast("💾 Sicherheitskopie erstellt.");
  }

  function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const next = normalizeData(JSON.parse(String(reader.result)) as AppData);
        setData(next);
        showToast("✅ Sicherheitskopie wiederhergestellt.");
      } catch {
        showToast("Diese Datei konnte leider nicht gelesen werden.");
      }
    };

    reader.readAsText(file);
    event.target.value = "";
  }

  function saveNewPin() {
    if (!/^\d{4}$/.test(newPin)) {
      showToast("Der PIN braucht genau vier Zahlen.");
      return;
    }

    setData((current) => ({
      ...current,
      parentPin: newPin
    }));

    setNewPin("");
    setPinChangeOpen(false);
    showToast("🔐 Eltern-PIN geändert.");
  }

  function completeWorldMission(world: World) {
    if (isWorldCompletedToday(world)) {
      showToast("✨ Diese Mission hat Ilana heute schon geschafft.");
      setSelectedWorld(null);
      return;
    }

    guardParent(() => {
      adjustPoints(world.reward, world.title + ": Tagesmission geschafft");
      setSelectedWorld(null);
    });
  }

  function renderHome() {
    const puschelMessage =
      data.points < 10
        ? "Jeder große Weihnachtszauber beginnt mit dem allerersten Stern."
        : data.points < 50
          ? "Ich sehe schon ganz viele kleine gute Taten funkeln!"
          : data.points < 100
            ? "Wow Ilana – unser Sternenhimmel wird immer heller."
            : "Der Weihnachtsmann wird staunen, wie viel Magie du gesammelt hast.";

    return (
      <div className="screen homeScreen">
        <section className="cinematicHero">
          <div className="heroVignette" />
          <div className="heroTopline">
            <div className="countdownPill">
              <span className="liveDot" />
              Noch <strong>{days}</strong> Tage bis Weihnachten
            </div>
            <button className="parentPill" onClick={openParentCenter}>
              <span>🔐</span>
              Eltern
            </button>
          </div>

          <div className="heroCopy">
            <span className="heroKicker">KLEINE TATEN · GROSSE WUNDER</span>
            <h1>
              Ilanas
              <span>Weihnachtszauber</span>
            </h1>
            <p>
              Puschelplumps und seine Freunde begleiten dich auf dem Weg zum
              Weihnachtsmann.
            </p>
          </div>

          <div className="scoreConsole">
            <button
              className="rewardButton rewardButtonSmall"
              onClick={() => addQuickStars(1)}
            >
              <span className="rewardIcon">＋</span>
              <span>
                <strong>1 Stern</strong>
                <small>schenken</small>
              </span>
            </button>

            <div className="starMedallion">
              <span className="starHalo" />
              <span className="scoreNumber">{data.points}</span>
              <span className="scoreLabel">Fleißsterne</span>
              <span className="scoreShine" />
            </div>

            <button
              className="rewardButton rewardButtonBig"
              onClick={() => addQuickStars(5)}
            >
              <span className="rewardIcon">✦</span>
              <span>
                <strong>5 Sterne</strong>
                <small>für etwas Besonderes</small>
              </span>
            </button>
          </div>
        </section>

        <section className="homeGrid">
          <article className="glassCard progressCard">
            <div className="cardEyebrow">DEIN WEG</div>
            <div className="progressHeader">
              <div>
                <h2>Nächstes Sternenziel</h2>
                <p>
                  Noch {Math.max(0, nextMilestone - data.points)} Sterne bis zum
                  nächsten magischen Geschenk.
                </p>
              </div>
              <div className="milestoneBadge">🎁 {nextMilestone}</div>
            </div>

            <div className="luxProgress">
              <div
                className="luxProgressFill"
                style={{ width: milestoneProgress + "%" }}
              />
              <span className="progressGlow" />
            </div>

            <div className="milestoneScale">
              <span>{previousMilestone}</span>
              <span>{Math.round(milestoneProgress)}%</span>
              <span>{nextMilestone}</span>
            </div>

            <div className="miniStats">
              <div>
                <span>🔥</span>
                <strong>{streak}</strong>
                <small>Tage Serie</small>
              </div>
              <div>
                <span>⭐</span>
                <strong>{weekStars}</strong>
                <small>diese Woche</small>
              </div>
              <div>
                <span>✨</span>
                <strong>{data.totalEarned}</strong>
                <small>insgesamt verdient</small>
              </div>
            </div>
          </article>

          <article className="glassCard puschelCard">
            <div className="puschelAvatar">
              <img src="/characters/puschelplumps.webp" alt="Puschelplumps" />
            </div>
            <div className="puschelWords">
              <div className="cardEyebrow">PUSCHELPLUMPS SAGT</div>
              <h2>„{puschelMessage}“</h2>
              <button
                className="textButton"
                onClick={() => setActiveTab("worlds")}
              >
                Eine Zauberwelt entdecken <span>→</span>
              </button>
            </div>
          </article>
        </section>

        <section className="sectionBlock dailyMissionSection">
          <div className="sectionHeading">
            <div>
              <span className="sectionKicker">HEUTIGE MISSION</span>
              <h2>Ein kleines Abenteuer für heute</h2>
            </div>
            <span className={"dailyStatus " + (isWorldCompletedToday(dailyWorld) ? "done" : "")}>
              {isWorldCompletedToday(dailyWorld) ? "Geschafft ✓" : "+" + dailyWorld.reward + " Sterne"}
            </span>
          </div>

          <button
            className={"dailyMissionCard " + (isWorldCompletedToday(dailyWorld) ? "completed" : "")}
            onClick={() => setSelectedWorld(dailyWorld)}
            style={{
              backgroundImage:
                "linear-gradient(90deg, rgba(3,12,24,.90), rgba(3,12,24,.25)), url(" +
                dailyWorld.image +
                ")"
            }}
          >
            <div className="dailyMissionCopy">
              <span>{dailyWorld.icon} {dailyWorld.subtitle}</span>
              <strong>{dailyWorld.mission}</strong>
              <small>
                {isWorldCompletedToday(dailyWorld)
                  ? "Heute bereits erledigt – morgen wartet eine neue Mission."
                  : "Tippe hier, wenn Ilana die Mission geschafft hat."}
              </small>
            </div>
            <div className="dailyMissionAction">
              {isWorldCompletedToday(dailyWorld) ? "✓" : "→"}
            </div>
          </button>
        </section>

        <section className="sectionBlock">
          <div className="sectionHeading">
            <div>
              <span className="sectionKicker">HEUTE MIT DABEI</span>
              <h2>Puschelplumps & seine Freunde</h2>
            </div>
            <button className="quietButton" onClick={() => setActiveTab("worlds")}>
              Alle Welten
            </button>
          </div>

          <button
            className="friendsPanorama"
            onClick={() => setActiveTab("worlds")}
          >
            <span className="friendsOverlay" />
            <div className="friendsCopy">
              <span className="friendsTag">✨ Freundschaft ist Weihnachtsmagie</span>
              <strong>
                Mama · Papa · Puschelplumps · Mila · Zlata · Bello · Dino ·
                Wolkenläufer
              </strong>
              <small>Tippe hier und reise in ihre Welten.</small>
            </div>
          </button>

          <div className="characterRail" aria-label="Freunde aus Puschelplumps Welt">
            {CHARACTER_FRIENDS.map((friend) => (
              <button
                className="characterCard"
                key={friend.name}
                onClick={() =>
                  friend.name === "Grantelbart"
                    ? openParentCenter()
                    : setActiveTab("worlds")
                }
              >
                <img src={friend.image} alt={friend.name} />
                <span>
                  <strong>{friend.name}</strong>
                  <small>{friend.tagline}</small>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="sectionBlock compactSection">
          <div className="sectionHeading">
            <div>
              <span className="sectionKicker">LETZTE MAGIE</span>
              <h2>Sternen-Tagebuch</h2>
            </div>
            <button
              className="quietButton"
              onClick={() => setActiveTab("journal")}
            >
              Alles ansehen
            </button>
          </div>

          <div className="timelinePreview">
            {data.history.length ? (
              data.history.slice(0, 4).map((entry) => (
                <div className="timelineRow" key={entry.id}>
                  <div
                    className={
                      "timelineOrb " +
                      (entry.points > 0 ? "positive" : "negative")
                    }
                  >
                    {entry.points > 0 ? "★" : "☁"}
                  </div>
                  <div className="timelineMain">
                    <strong>{entry.reason}</strong>
                    <small>{formatEntryDate(entry.createdAt)}</small>
                  </div>
                  <span
                    className={
                      "timelinePoints " +
                      (entry.points > 0 ? "positive" : "negative")
                    }
                  >
                    {entry.points > 0 ? "+" : ""}
                    {entry.points}
                  </span>
                </div>
              ))
            ) : (
              <div className="emptyState compactEmpty">
                <span>✨</span>
                <strong>Der erste Stern wartet schon.</strong>
                <small>
                  Sobald eine gute Tat eingetragen wird, beginnt hier Ilanas
                  Weihnachtsgeschichte.
                </small>
              </div>
            )}
          </div>
        </section>
      </div>
    );
  }

  function renderWorlds() {
    return (
      <div className="screen pageScreen">
        <header className="pageHero worldsHero">
          <span className="pageKicker">PUSCHELPLUMPS’ MAGISCHE KARTE</span>
          <h1>Wohin reisen wir heute?</h1>
          <p>
            Jede Welt hat eine kleine Mission. Nicht perfekt sein zählt –
            ausprobieren, helfen, wachsen und zusammen lachen.
          </p>
        </header>

        <div className="worldGrid">
          {WORLDS.map((world, index) => (
            <button
              className={
                "worldCard worldCard" + ((index % 3) + 1)
              }
              key={world.id}
              onClick={() => setSelectedWorld(world)}
              style={
                {
                  "--world-accent": world.accent,
                  backgroundImage:
                    "linear-gradient(180deg, rgba(3,12,24,.06), rgba(3,12,24,.86)), url(" +
                    world.image +
                    ")",
                  backgroundPosition:
                    world.id === "katzenland"
                      ? "38% center"
                      : world.id === "dinotal"
                        ? "70% center"
                        : "center"
                } as CSSProperties
              }
            >
              <div className="worldTop">
                <span className="worldIcon">{world.icon}</span>
                <span className="worldReward">+{world.reward} ⭐ Mission</span>
              </div>
              <div className="worldCopy">
                <small>{world.subtitle}</small>
                <h2>{world.title}</h2>
                <p>{world.description}</p>
                <span className="worldArrow">Welt betreten →</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  function renderWishes() {
    return (
      <div className="screen pageScreen">
        <header className="pageHero wishesHero">
          <span className="pageKicker">ILANAS WUNSCHHIMMEL</span>
          <h1>Wünsche werden zu Zielen.</h1>
          <p>
            Jeder Wunsch bekommt seinen eigenen Sternenweg. So sieht Ilana, wie
            viele gute Taten schon auf dem Weg dorthin leuchten.
          </p>
          <button
            className="primaryAction"
            onClick={() =>
              guardParent(() => {
                setParentOpen(false);
                setWishOpen(true);
              })
            }
          >
            ＋ Wunsch hinzufügen
          </button>
        </header>

        <div className="wishGallery">
          {data.wishes.map((wish, index) => {
            const percent = Math.min(100, (data.points / wish.target) * 100);
            const unlocked = data.points >= wish.target;

            return (
              <article
                className={"premiumWishCard " + (unlocked ? "unlocked" : "")}
                key={wish.id}
              >
                <div className="wishArt">
                  <span className="wishGlow" />
                  <span className="wishEmoji">{wish.emoji}</span>
                  {unlocked && <span className="wishUnlocked">GESCHAFFT ✨</span>}
                </div>

                <div className="wishContent">
                  <span className="wishNumber">
                    WUNSCH {String(index + 1).padStart(2, "0")}
                  </span>
                  <h2>{wish.name}</h2>
                  <p>{wish.note || "Ein besonderer Weihnachtswunsch."}</p>

                  <div className="wishProgressHeader">
                    <span>{data.points} Sterne</span>
                    <strong>{wish.target}</strong>
                  </div>

                  <div className="wishProgress">
                    <span style={{ width: percent + "%" }} />
                  </div>

                  <div className="wishFooter">
                    <span>
                      {unlocked
                        ? "Du hast genug Sterne gesammelt!"
                        : "Noch " +
                          Math.max(0, wish.target - data.points) +
                          " Sterne"}
                    </span>
                    <button onClick={() => deleteWish(wish.id)}>Entfernen</button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    );
  }

  function renderJournal() {
    const positives = data.history.filter((entry) => entry.points > 0).length;
    const grantelMoments = data.history.filter((entry) => entry.points < 0).length;

    return (
      <div className="screen pageScreen">
        <header className="pageHero journalHero">
          <span className="pageKicker">DAS STERNENBUCH</span>
          <h1>Jede kleine Tat erzählt eine Geschichte.</h1>
          <p>
            Hier bleibt sichtbar, worauf Ilana stolz sein kann – und auch, wann
            Grantelbart einmal einen Stern zurück in seinen Sack gepackt hat.
          </p>
        </header>

        <div className="journalStats">
          <article>
            <span>⭐</span>
            <strong>{data.points}</strong>
            <small>aktuell</small>
          </article>
          <article>
            <span>✨</span>
            <strong>{positives}</strong>
            <small>gute Momente</small>
          </article>
          <article>
            <span>🔥</span>
            <strong>{streak}</strong>
            <small>Tage in Folge</small>
          </article>
          <article>
            <span>🧙‍♂️</span>
            <strong>{grantelMoments}</strong>
            <small>Grantelbart-Momente</small>
          </article>
        </div>

        <section className="journalBook">
          <div className="journalBookHeader">
            <div>
              <span className="sectionKicker">CHRONIK</span>
              <h2>Ilanas Weihnachtsweg</h2>
            </div>
            <span className="saveStatus">
              <i />
              auf diesem iPad gespeichert
            </span>
          </div>

          <div className="journalList">
            {data.history.length ? (
              data.history.map((entry) => (
                <article className="journalEntry" key={entry.id}>
                  <div
                    className={
                      "journalSymbol " +
                      (entry.points > 0 ? "positive" : "negative")
                    }
                  >
                    {entry.points > 0 ? "★" : "☁"}
                  </div>

                  <div className="journalEntryCopy">
                    <strong>{entry.reason}</strong>
                    <small>{formatEntryDate(entry.createdAt)}</small>
                  </div>

                  <div className="journalActor">
                    <span>
                      {entry.actor === "santa"
                        ? "Weihnachtsmann"
                        : "Grantelbart"}
                    </span>
                  </div>

                  <div
                    className={
                      "journalPoints " +
                      (entry.points > 0 ? "positive" : "negative")
                    }
                  >
                    {entry.points > 0 ? "+" : ""}
                    {entry.points}
                  </div>
                </article>
              ))
            ) : (
              <div className="emptyState journalEmpty">
                <span>📖</span>
                <strong>Dieses Buch wartet auf seine erste Seite.</strong>
                <small>
                  Schenkt Ilana den ersten Fleißstern – danach wird jeder Moment
                  automatisch hier festgehalten.
                </small>
              </div>
            )}
          </div>
        </section>
      </div>
    );
  }

  return (
    <main className="appShell">
      <div className="ambientGlow ambientGlowOne" />
      <div className="ambientGlow ambientGlowTwo" />

      <div className="snowField" aria-hidden="true">
        {snow.map((flake, index) => (
          <span
            key={index}
            style={
              {
                left: flake.left,
                width: flake.size,
                height: flake.size,
                animationDelay: flake.delay,
                animationDuration: flake.duration
              } as CSSProperties
            }
          />
        ))}
      </div>

      {burstKey > 0 && (
        <div className="rewardBurst" key={burstKey} aria-hidden="true">
          {Array.from({ length: 18 }, (_, index) => (
            <span
              key={index}
              style={
                {
                  "--i": index
                } as CSSProperties
              }
            >
              {index % 3 === 0 ? "✦" : "★"}
            </span>
          ))}
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}

      <header className="nativeTopbar">
        <button
          className="brandLockup"
          onClick={() => setActiveTab("home")}
          aria-label="Startseite"
        >
          <span className="brandStar">✦</span>
          <span>
            <strong>Ilanas Weihnachtszauber</strong>
            <small>Puschelplumps & Freunde</small>
          </span>
        </button>

        <div className="topbarRight">
          <div className="saveChip">
            <span className="savePulse" />
            gespeichert
          </div>
          <button className="profileButton" onClick={openParentCenter}>
            <span className="profileAvatar profileAvatarPhoto">
              <img src="/characters/ilana.webp" alt="" />
            </span>
            <span className="profileCopy">
              <strong>Ilana</strong>
              <small>{data.points} Sterne</small>
            </span>
            <span className="chevron">⌄</span>
          </button>
        </div>
      </header>

      <div className="appViewport">
        {activeTab === "home" && renderHome()}
        {activeTab === "worlds" && renderWorlds()}
        {activeTab === "wishes" && renderWishes()}
        {activeTab === "journal" && renderJournal()}
      </div>

      <nav className="bottomDock" aria-label="App Navigation">
        {[
          { id: "home", icon: "⌂", label: "Zuhause" },
          { id: "worlds", icon: "✦", label: "Zauberwelten" },
          { id: "wishes", icon: "♡", label: "Wünsche" },
          { id: "journal", icon: "☆", label: "Sternenbuch" }
        ].map((item) => (
          <button
            key={item.id}
            className={activeTab === item.id ? "active" : ""}
            onClick={() => setActiveTab(item.id as Tab)}
          >
            <span>{item.icon}</span>
            <small>{item.label}</small>
          </button>
        ))}

        <div className="dockDivider" />

        <button className="parentDockButton" onClick={openParentCenter}>
          <span>🔐</span>
          <small>Eltern</small>
        </button>
      </nav>

      {selectedWorld && (
        <div
          className="modalLayer"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedWorld(null);
          }}
        >
          <div className="worldModal">
            <div
              className="worldModalArt"
              style={{
                backgroundImage:
                  "linear-gradient(180deg, rgba(5,13,25,.05), rgba(5,13,25,.88)), url(" +
                  selectedWorld.image +
                  ")"
              }}
            >
              <button
                className="floatingClose"
                onClick={() => setSelectedWorld(null)}
              >
                ×
              </button>
              <div className="worldModalTitle">
                <span>{selectedWorld.icon}</span>
                <small>{selectedWorld.subtitle}</small>
                <h2>{selectedWorld.title}</h2>
              </div>
            </div>

            <div className="worldModalBody">
              <div className="missionLabel">HEUTIGE FREUNDSCHAFTSMISSION</div>
              <h3>{selectedWorld.mission}</h3>
              <p>
                Es geht nicht darum, dass alles perfekt klappt. Puschelplumps
                freut sich schon, wenn Ilana es wirklich versucht.
              </p>

              <div className="friendsLine">
                <span>Mit dabei:</span>
                <strong>{selectedWorld.friends.join(" · ")}</strong>
              </div>

              <button
                className={"missionButton " + (isWorldCompletedToday(selectedWorld) ? "missionDone" : "")}
                onClick={() => completeWorldMission(selectedWorld)}
                disabled={isWorldCompletedToday(selectedWorld)}
              >
                <span>{isWorldCompletedToday(selectedWorld) ? "✓" : "✨"}</span>
                {isWorldCompletedToday(selectedWorld)
                  ? "Heute schon geschafft"
                  : "Mission geschafft"}
                <strong>
                  {isWorldCompletedToday(selectedWorld)
                    ? "Morgen geht es weiter"
                    : "+" + selectedWorld.reward + " Sterne"}
                </strong>
              </button>
            </div>
          </div>
        </div>
      )}

      {pinOpen && (
        <div className="modalLayer pinLayer">
          <div className={"pinModal " + (pinError ? "shake" : "")}>
            <button
              className="floatingClose darkClose"
              onClick={() => {
                setPinOpen(false);
                pendingParentAction.current = null;
              }}
            >
              ×
            </button>

            <div className="grantelMark">🧙‍♂️</div>
            <span className="modalKicker">GRANTELBART PASST AUF</span>
            <h2>Nur für Mama & Papa</h2>
            <p>Gib euren vierstelligen Eltern-PIN ein.</p>

            <div className="pinDots">
              {[0, 1, 2, 3].map((index) => (
                <span
                  className={pinInput.length > index ? "filled" : ""}
                  key={index}
                />
              ))}
            </div>

            {pinError && (
              <div className="pinError">Hmm … der PIN stimmt noch nicht.</div>
            )}

            <div className="pinPad">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((key) => (
                <button key={key} onClick={() => pressPinKey(key)}>
                  {key}
                </button>
              ))}
              <span />
              <button onClick={() => pressPinKey("0")}>0</button>
              <button
                className="pinBack"
                onClick={() => pressPinKey("back")}
                aria-label="Löschen"
              >
                ⌫
              </button>
            </div>
          </div>
        </div>
      )}

      {parentOpen && (
        <div
          className="modalLayer sheetLayer"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setParentOpen(false);
          }}
        >
          <section className="parentSheet">
            <div className="sheetHandle" />
            <div className="parentSheetHeader">
              <div>
                <span className="modalKicker">ELTERNZENTRALE</span>
                <h2>Sterne & Weihnachtsmagie</h2>
                <p>
                  Für fünf Minuten entsperrt · alles wird sofort lokal gesichert.
                </p>
              </div>
              <button
                className="roundClose"
                onClick={() => setParentOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="parentLayout">
              <div className="parentMain">
                <section className="parentSection">
                  <div className="parentSectionHeading">
                    <div>
                      <span className="parentMiniIcon positive">★</span>
                      <div>
                        <strong>Fleißsterne schenken</strong>
                        <small>Für gute Taten, Mut und liebe Momente.</small>
                      </div>
                    </div>
                  </div>

                  <div className="reasonChips">
                    {QUICK_REASONS.map((quickReason) => (
                      <button
                        key={quickReason}
                        className={reason === quickReason ? "active" : ""}
                        onClick={() => setReason(quickReason)}
                      >
                        {quickReason}
                      </button>
                    ))}
                  </div>

                  <input
                    className="premiumInput"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Oder eigenen Grund eintragen …"
                  />

                  <div className="rewardGrid">
                    {[1, 2, 3, 5].map((points) => (
                      <button
                        className="parentReward"
                        key={points}
                        onClick={() => {
                          adjustPoints(points, reason || "Eine gute Tat");
                          setReason("");
                        }}
                      >
                        <span>+{points}</span>
                        <small>{points === 1 ? "Stern" : "Sterne"}</small>
                      </button>
                    ))}
                  </div>

                  <div className="customReward">
                    <label>
                      Eigene Anzahl
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={customPoints}
                        onChange={(event) => setCustomPoints(event.target.value)}
                      />
                    </label>
                    <button
                      onClick={() => {
                        const value = Math.min(
                          50,
                          Math.max(1, Number(customPoints) || 1)
                        );
                        adjustPoints(value, reason || "Eine besondere gute Tat");
                        setReason("");
                      }}
                    >
                      Sterne schenken
                    </button>
                  </div>
                </section>

                <section className="parentSection grantelSection">
                  <div className="parentSectionHeading">
                    <div>
                      <span className="parentMiniIcon negative grantelPortrait">
                        <img src="/characters/grantelbart.webp" alt="" />
                      </span>
                      <div>
                        <strong>Grantelbart nimmt Sterne mit</strong>
                        <small>
                          Ruhig und nachvollziehbar – mit einem Grund im Sternenbuch.
                        </small>
                      </div>
                    </div>
                  </div>

                  <div className="reasonChips negativeReasonChips">
                    {NEGATIVE_REASONS.map((quickReason) => (
                      <button
                        key={quickReason}
                        className={reason === quickReason ? "active" : ""}
                        onClick={() => setReason(quickReason)}
                      >
                        {quickReason}
                      </button>
                    ))}
                  </div>

                  <div className="deductGrid">
                    {[1, 2, 3, 5].map((points) => (
                      <button
                        key={points}
                        onClick={() => {
                          adjustPoints(
                            -points,
                            reason || "Heute hat es noch nicht ganz geklappt"
                          );
                          setReason("");
                        }}
                      >
                        −{points}
                      </button>
                    ))}
                  </div>
                </section>
              </div>

              <aside className="parentSidebar">
                <div className="parentScoreCard">
                  <span>AKTUELL</span>
                  <strong>{data.points}</strong>
                  <small>Fleißsterne</small>
                  <div className="sideProgress">
                    <i style={{ width: milestoneProgress + "%" }} />
                  </div>
                  <p>
                    Noch {Math.max(0, nextMilestone - data.points)} bis{" "}
                    {nextMilestone}.
                  </p>
                </div>

                <div className="settingsList">
                  <button
                    onClick={() => {
                      setParentOpen(false);
                      setWishOpen(true);
                    }}
                  >
                    <span>🎁</span>
                    <div>
                      <strong>Wunsch hinzufügen</strong>
                      <small>Neues Sternenziel</small>
                    </div>
                    <b>›</b>
                  </button>

                  <button onClick={() => setPinChangeOpen(true)}>
                    <span>🔐</span>
                    <div>
                      <strong>Eltern-PIN ändern</strong>
                      <small>Vierstelliger Schutz</small>
                    </div>
                    <b>›</b>
                  </button>

                  <button onClick={exportBackup}>
                    <span>💾</span>
                    <div>
                      <strong>Sicherheitskopie</strong>
                      <small>JSON-Backup speichern</small>
                    </div>
                    <b>›</b>
                  </button>

                  <button onClick={() => fileInputRef.current?.click()}>
                    <span>↩</span>
                    <div>
                      <strong>Backup laden</strong>
                      <small>Daten wiederherstellen</small>
                    </div>
                    <b>›</b>
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json"
                    onChange={importBackup}
                    hidden
                  />
                </div>

                <div className="storageTrust">
                  <span>✓</span>
                  <p>
                    <strong>Doppelt lokal gespeichert</strong>
                    LocalStorage + IndexedDB auf diesem iPad. Für Geräteverlust
                    bitte gelegentlich eine Sicherheitskopie erstellen.
                  </p>
                </div>
              </aside>
            </div>
          </section>
        </div>
      )}

      {wishOpen && (
        <div className="modalLayer">
          <div className="formModal">
            <button
              className="floatingClose darkClose"
              onClick={() => setWishOpen(false)}
            >
              ×
            </button>
            <span className="modalKicker">NEUER WEIHNACHTSWUNSCH</span>
            <h2>Was darf an den Wunschhimmel?</h2>
            <p>
              Jeder Wunsch bekommt ein eigenes Sternenziel und wächst mit Ilanas
              guten Taten.
            </p>

            <div className="formGrid">
              <label className="emojiField">
                Symbol
                <input
                  value={wishDraft.emoji}
                  maxLength={4}
                  onChange={(event) =>
                    setWishDraft((current) => ({
                      ...current,
                      emoji: event.target.value
                    }))
                  }
                />
              </label>

              <label className="wideField">
                Wunsch
                <input
                  value={wishDraft.name}
                  onChange={(event) =>
                    setWishDraft((current) => ({
                      ...current,
                      name: event.target.value
                    }))
                  }
                  placeholder="z. B. großes Dino-Set"
                />
              </label>

              <label>
                Sternenziel
                <input
                  type="number"
                  min="1"
                  value={wishDraft.target}
                  onChange={(event) =>
                    setWishDraft((current) => ({
                      ...current,
                      target: event.target.value
                    }))
                  }
                />
              </label>

              <label className="wideField">
                Kleine Notiz
                <input
                  value={wishDraft.note}
                  onChange={(event) =>
                    setWishDraft((current) => ({
                      ...current,
                      note: event.target.value
                    }))
                  }
                  placeholder="Warum ist der Wunsch besonders?"
                />
              </label>
            </div>

            <button className="formSubmit" onClick={saveWish}>
              Wunsch an den Himmel hängen ✨
            </button>
          </div>
        </div>
      )}

      {pinChangeOpen && (
        <div className="modalLayer">
          <div className="formModal smallFormModal">
            <button
              className="floatingClose darkClose"
              onClick={() => setPinChangeOpen(false)}
            >
              ×
            </button>
            <span className="modalKicker">SICHERHEIT</span>
            <h2>Neuen Eltern-PIN setzen</h2>
            <p>Genau vier Zahlen. Bitte so wählen, dass Ilana ihn nicht errät.</p>

            <label className="singleField">
              Neuer PIN
              <input
                inputMode="numeric"
                maxLength={4}
                value={newPin}
                onChange={(event) =>
                  setNewPin(event.target.value.replace(/\D/g, "").slice(0, 4))
                }
                placeholder="••••"
              />
            </label>

            <button className="formSubmit" onClick={saveNewPin}>
              PIN sicher speichern
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
