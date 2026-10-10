import "./App.css";
import { Editor } from "@monaco-editor/react";
import { MonacoBinding } from "y-monaco";
import { useRef, useMemo, useState, useEffect } from "react";
import * as Y from "yjs";
import { SocketIOProvider } from "y-socket.io";
import DrawingBoard from "./DrawingBoard";
import { SiCollaboraonline } from "react-icons/si";
import CursorGrid from "./CursorGrid";
import {
  FiCode,
  FiCopy,
  FiEdit3,
  FiLogIn,
  FiLogOut,
  FiMenu,
  FiPlus,
  FiX,
} from "react-icons/fi";

// Picks a stable avatar colour from a username
const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-orange-500",
  "bg-emerald-500",
  "bg-pink-500",
  "bg-violet-500",
  "bg-cyan-600",
];
const avatarColor = (name = "") => {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

function App() {
  const editorRef = useRef(null);
  const [username, setUsername] = useState(() => {
    return new URLSearchParams(window.location.search).get("username") || "";
  });
  const [users, setUsers] = useState([]);
  const [currentView, setCurrentView] = useState("editor");
  const [language, setLanguage] = useState("javascript");
  const [roomId, setRoomId] = useState("");
  const [inputRoomId, setInputRoomId] = useState("");
  const [showJoinRoom, setShowJoinRoom] = useState(false);
  const [provider, setProvider] = useState(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(
    () => typeof window === "undefined" || window.innerWidth >= 1024,
  );
  const [stdin, setStdin] = useState("");
  const [ioTab, setIoTab] = useState("input");
  const [output, setOutput] = useState(null);
  const [running, setRunning] = useState(false);

  const RUNNABLE = ["nodejs", "html", "typescript", "python3", "java", "cpp"];

  const ydoc = useMemo(() => new Y.Doc(), []);
  const yText = useMemo(() => ydoc.getText("monaco"), [ydoc]);

  const handleMount = (editor) => {
    editorRef.current = editor;

    new MonacoBinding(
      yText,
      editorRef.current.getModel(),
      new Set([editorRef.current]),
    );
  };

  const BASE_URL = import.meta.env.VITE_BASE_URL;
  const runCode = async () => {
    const code = editorRef.current?.getValue() ?? "";
    setRunning(true);
    setOutput(null);
    setIoTab("output"); // jump to the output tab
    try {
      const res = await fetch(`${BASE_URL}/v1/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, code, stdin }),
      });
      const result = await res.json();
      if (!res.ok) {
        setOutput({ error: result.message || "Execution failed" });
      } else {
        setOutput({ stdout: result.data, time: result.cpuTime });
      }
    } catch {
      setOutput({ error: "Could not reach the server" });
    } finally {
      setRunning(false);
    }
  };

  // Generates an 8-character random room id, e.g. "Q8K2V9X1"
  const generateRoomId = () => {
    const set1 = Math.random().toString(36).substring(2, 10).toUpperCase();
    const set2 = Math.random().toString(36).substring(2, 10).toUpperCase();

    const temp = set1 + set2;
    let newRoomId = "";

    for (let i = 0; i < temp.length; i++) {
      if (i != 0 && i % 4 == 0) {
        newRoomId += "-";
      }
      newRoomId += temp[i];
    }

    setRoomId(newRoomId);
    return newRoomId;
  };

  // Username screen: needs both a username and a room id
  const handleJoin = (e) => {
    e.preventDefault();
    const name = e.target.elements.username.value.trim();
    const room = roomId.trim().toUpperCase();
    if (!name || !room) return;

    setRoomId(room);
    setUsername(name);
    window.history.pushState({}, "", "?username=" + encodeURIComponent(name));
  };

  // Sidebar: create a brand new room
  const createRoom = () => {
    generateRoomId();
    setInputRoomId("");
    setShowJoinRoom(false);
  };

  // Sidebar: join an existing room
  const joinRoom = () => {
    if (inputRoomId.trim()) {
      setRoomId(inputRoomId.trim().toUpperCase());
      setInputRoomId("");
      setShowJoinRoom(false);
    }
  };

  const leaveRoom = () => {
    if (provider) {
      provider.disconnect();
      setProvider(null);
    }
    setRoomId("");
    setUsers([]);
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
  };

  useEffect(() => {
    if (username && roomId) {
      const newProvider = new SocketIOProvider(BASE_URL, roomId, ydoc, {
        autoConnect: true,
      });

      newProvider.awareness.setLocalStateField("user", { username, roomId });

      const states = Array.from(newProvider.awareness.getStates().values());

      setUsers(
        states
          .filter((state) => state.user && state.user.username)
          .map((state) => state.user),
      );

      newProvider.awareness.on("change", () => {
        const states = Array.from(newProvider.awareness.getStates().values());
        setUsers(
          states
            .filter((state) => state.user && state.user.username)
            .map((state) => state.user),
        );
      });

      function handleBeforeUnload() {
        newProvider.awareness.setLocalStateField("user", null);
      }

      window.addEventListener("beforeunload", handleBeforeUnload);
      setProvider(newProvider);

      return () => {
        newProvider.disconnect();
        window.removeEventListener("beforeunload", handleBeforeUnload);
      };
    }
  }, [username, roomId]);

  /* ---------------------------- Welcome screen ---------------------------- */
  if (showWelcome) {
    return (
      <div className="relative bg-[#07080b] min-h-screen overflow-hidden">
        <CursorGrid theme="dark" />

        <main className="relative z-10 flex justify-center items-center p-4 w-full min-h-screen">
          <div className="bg-gray-900/80 backdrop-blur-sm shadow-2xl p-8 sm:p-12 border border-gray-800 rounded-2xl w-full max-w-4xl">
            <div className="mb-12 text-center">
              <h1 className="flex justify-center items-center gap-3 mb-4 font-bold text-white text-4xl sm:text-5xl">
                <SiCollaboraonline /> ExoticCode
              </h1>
              <p className="text-gray-400 text-lg sm:text-xl">
                Real-time collaborative coding & drawing platform
              </p>
            </div>

            <div className="gap-6 grid md:grid-cols-3 mb-12">
              <div className="bg-gray-800/70 p-6 border border-gray-700 rounded-xl">
                <div className="mb-4 text-4xl">💻</div>
                <h3 className="mb-2 font-bold text-white text-lg">
                  Code Editor
                </h3>
                <p className="text-gray-400 text-sm">
                  Collaborative editor with syntax highlighting for multiple
                  languages
                </p>
              </div>

              <div className="bg-gray-800/70 p-6 border border-gray-700 rounded-xl">
                <div className="mb-4 text-4xl">🎨</div>
                <h3 className="mb-2 font-bold text-white text-lg">
                  Drawing Board
                </h3>
                <p className="text-gray-400 text-sm">
                  Shared canvas for sketching diagrams, flowcharts, and visual
                  collaboration
                </p>
              </div>

              <div className="bg-gray-800/70 p-6 border border-gray-700 rounded-xl">
                <div className="mb-4 text-4xl">⚡</div>
                <h3 className="mb-2 font-bold text-white text-lg">
                  Real-time Sync
                </h3>
                <p className="text-gray-400 text-sm">
                  Instant synchronization across all users in the room
                </p>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={() => setShowWelcome(false)}
                className="bg-white hover:bg-gray-200 active:bg-gray-300 shadow-lg px-8 py-4 rounded-xl w-full max-w-xs font-bold text-black hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 transition-all transform"
              >
                Get Started
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  /* ---------------------------- Username screen --------------------------- */
  if (!username) {
    return (
      <main className="relative flex justify-center items-center bg-[#07080b] p-4 w-full min-h-screen overflow-hidden">
        <CursorGrid theme="dark" />

        <div className="relative z-10 bg-gray-900/80 backdrop-blur-sm shadow-2xl p-8 border border-gray-800 rounded-lg w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="flex justify-center items-center gap-2 mb-2 font-bold text-white text-4xl">
              <SiCollaboraonline /> ExoticCode
            </h1>
            <p className="text-gray-400">
              Real-time collaborative coding & drawing
            </p>
          </div>

          <form onSubmit={handleJoin} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="username"
                className="block mb-2 font-medium text-gray-300 text-sm"
              >
                Enter your username
              </label>
              <input
                id="username"
                type="text"
                placeholder="e.g. JohnDoe"
                className="bg-gray-800 p-4 border border-gray-700 focus:border-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 w-full text-white transition-all placeholder-gray-500"
                name="username"
                required
              />
            </div>

            <div>
              <label
                htmlFor="roomId"
                className="block mb-2 font-medium text-gray-300 text-sm"
              >
                Enter meeting id
              </label>
              <input
                id="roomId"
                type="text"
                placeholder="e.g. 1SZMW3ES"
                className="bg-gray-800 p-4 border border-gray-700 focus:border-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 w-full text-white uppercase transition-all placeholder-gray-500"
                name="roomId"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                required
              />
              <p className="flex justify-between items-center py-2 font-thin text-gray-400 text-sm">
                Don't have a meeting id?
                <button
                  type="button"
                  onClick={generateRoomId}
                  className="hover:scale-105 underline"
                >
                  Generate here
                </button>
              </p>
            </div>

            <button
              type="submit"
              className="bg-white hover:bg-gray-200 active:bg-gray-300 shadow-lg p-4 rounded-lg w-full font-bold text-black hover:scale-105 active:scale-95 transition-all transform"
            >
              Start Collaborating
            </button>
          </form>
        </div>
      </main>
    );
  }

  /* ------------------------------ Main screen ----------------------------- */
  return (
    <main className="relative flex gap-3 bg-[#07080b] p-3 w-full h-screen overflow-hidden">
      {/* Backdrop: only needed when the sidebar is a drawer on small screens */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden z-40 fixed inset-0 bg-black/60"
        />
      )}

      <aside
        className={`fixed lg:static inset-y-3 left-3 z-50 flex flex-col w-72 shrink-0 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl transition-transform duration-300 ${
          sidebarOpen
            ? "translate-x-0"
            : "translate-x-[120%] invisible lg:hidden lg:visible"
        }`}
      >
        {/* Brand + close */}
        <div className="flex justify-between items-center px-5 py-4 border-gray-800 border-b">
          <div className="flex items-center gap-2.5">
            <span className="flex justify-center items-center bg-white rounded-lg w-8 h-8 text-black">
              <SiCollaboraonline />
            </span>
            <span className="font-bold text-white text-lg tracking-tight">
              ExoticCode
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="hover:bg-white/10 p-2 rounded-lg text-gray-400 hover:text-white transition-colors"
            title="Close sidebar"
            aria-label="Close sidebar"
          >
            <FiX />
          </button>
        </div>

        {/* Signed-in user */}
        <div className="flex items-center gap-3 px-5 py-4 border-gray-800 border-b">
          <div
            className={`flex justify-center items-center rounded-full w-10 h-10 font-bold text-white ${avatarColor(username)}`}
          >
            {username.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-white truncate">{username}</p>
            <p className="text-gray-500 text-xs">
              {roomId ? "In a room" : "Not in a room"}
            </p>
          </div>
        </div>

        {!roomId ? (
          /* ------------------------- No room yet ------------------------- */
          <div className="flex flex-col flex-1 gap-3 p-5">
            <p className="text-gray-400 text-sm">
              Start a new session, or join one with a code.
            </p>
            <button
              onClick={createRoom}
              className="flex justify-center items-center gap-2 bg-white hover:bg-gray-200 active:scale-95 p-3 rounded-xl font-semibold text-black transition-all"
            >
              <FiPlus /> New room
            </button>
            <button
              onClick={() => setShowJoinRoom(!showJoinRoom)}
              className="flex justify-center items-center gap-2 bg-gray-800 hover:bg-gray-700 active:scale-95 p-3 border border-gray-700 rounded-xl font-semibold text-white transition-all"
            >
              <FiLogIn /> Join with a code
            </button>
            {showJoinRoom && (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Room ID"
                  value={inputRoomId}
                  onChange={(e) => setInputRoomId(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && joinRoom()}
                  className="flex-1 bg-gray-800 p-3 border border-gray-700 focus:border-gray-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-500 w-full min-w-0 font-mono text-white tracking-widest transition-all placeholder-gray-500"
                />
                <button
                  onClick={joinRoom}
                  className="bg-white hover:bg-gray-200 active:scale-95 px-4 rounded-xl font-bold text-black transition-all"
                >
                  Join
                </button>
              </div>
            )}
          </div>
        ) : (
          /* --------------------------- In a room --------------------------- */
          <>
            {/* Room ID */}
            <div className="px-5 py-4 border-gray-800 border-b">
              <p className="mb-2 text-gray-500 text-xs">Room ID</p>
              <div className="flex justify-between items-center gap-2 bg-gray-800/70 px-3 py-2 border border-gray-700 rounded-xl">
                <span className="font-mono font-bold text-white tracking-widest">
                  {roomId}
                </span>
                <button
                  onClick={copyRoomId}
                  className="hover:bg-white/10 p-2 rounded-lg text-gray-300 hover:text-white transition-colors"
                  title="Copy Room ID"
                  aria-label="Copy Room ID"
                >
                  <FiCopy />
                </button>
              </div>
            </div>

            {/* Tools */}
            <nav className="px-3 py-4 border-gray-800 border-b">
              <p className="mb-2 px-2 text-gray-500 text-xs">Tools</p>
              <div className="space-y-1">
                {[
                  { id: "editor", label: "Code editor", icon: <FiCode /> },
                  { id: "drawing", label: "Drawing board", icon: <FiEdit3 /> },
                ].map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => setCurrentView(tool.id)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg w-full font-medium text-left transition-colors ${
                      currentView === tool.id
                        ? "bg-white/10 text-white ring-1 ring-white/10"
                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {tool.icon}
                    {tool.label}
                  </button>
                ))}
              </div>
            </nav>

            {/* Online users */}
            <div className="flex flex-col flex-1 px-3 py-4 min-h-0">
              <p className="flex justify-between items-center mb-2 px-2 text-gray-500 text-xs">
                Online
                <span className="bg-gray-800 px-2 py-0.5 rounded-full text-gray-300">
                  {users.length}
                </span>
              </p>
              <ul className="space-y-1 pr-1 overflow-y-auto">
                {users.map((user, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-3 hover:bg-white/5 px-2 py-2 rounded-lg transition-colors"
                  >
                    <div className="relative">
                      <div
                        className={`flex justify-center items-center rounded-full w-8 h-8 font-bold text-white text-sm ${avatarColor(user.username)}`}
                      >
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="right-0 bottom-0 absolute bg-emerald-400 border-2 border-gray-900 rounded-full w-2.5 h-2.5" />
                    </div>
                    <span className="text-gray-200 text-sm truncate">
                      {user.username}
                    </span>
                    {user.username === username && (
                      <span className="ml-auto text-gray-500 text-xs">you</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Leave */}
            <div className="p-3 border-gray-800 border-t">
              <button
                onClick={leaveRoom}
                className="flex justify-center items-center gap-2 hover:bg-red-500/10 p-3 border border-gray-700 hover:border-red-500/40 rounded-xl w-full font-semibold text-gray-300 hover:text-red-400 transition-colors"
              >
                <FiLogOut /> Leave room
              </button>
            </div>
          </>
        )}
      </aside>

      <section className="relative flex-1 bg-gray-900 shadow-2xl border border-gray-800 rounded-2xl min-w-0 overflow-hidden">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="top-3 left-3 z-30 absolute bg-gray-800 hover:bg-gray-700 p-2.5 border border-gray-700 rounded-lg text-white transition-colors"
            title="Open sidebar"
            aria-label="Open sidebar"
          >
            <FiMenu />
          </button>
        )}

        {!roomId ? (
          <div className="flex justify-center items-center p-6 h-full">
            <div className="text-center">
              <div className="mb-4 text-6xl">🚀</div>
              <h2 className="mb-2 font-bold text-white text-2xl">
                Ready to Collaborate?
              </h2>
              <p className="text-gray-400">
                Create a room or join an existing one to start collaborating
              </p>
            </div>
          </div>
        ) : currentView === "editor" ? (
          <div className="flex lg:flex-row flex-col h-full">
            {/* ---------- Left: language bar + editor ---------- */}
            <div className="flex flex-col flex-1 min-w-0 min-h-0">
              <div
                className={`flex items-center gap-4 bg-gray-800 p-4 border-gray-700 border-b ${
                  !sidebarOpen ? "pl-16" : ""
                }`}
              >
                <label className="font-medium text-white">Language:</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="bg-gray-700 p-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 text-white"
                >
                  <option value="nodejs">JavaScript</option>
                  <option value="typescript">TypeScript</option>
                  <option value="python3">Python</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                  <option value="html">HTML</option>
                  <option value="html">CSS</option>
                  {/* <option value="json">JSON</option> */}
                  {/* <option value="markdown">Markdown</option> */}
                </select>

                <button
                  onClick={runCode}
                  disabled={running || !RUNNABLE.includes(language)}
                  className="ml-auto bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 px-4 py-2 rounded-lg font-semibold text-black transition-colors disabled:cursor-not-allowed"
                >
                  {running ? "Running…" : "▶ Run"}
                </button>
              </div>

              <div className="flex-1 min-h-0">
                <Editor
                  height="100%"
                  language={language}
                  defaultValue="// Start coding together!\n// All changes are synced in real-time"
                  theme="vs-dark"
                  onMount={handleMount}
                  key={language}
                />
              </div>
            </div>

            {/* ---------- Right: Input / Output tabs ---------- */}
            <div className="flex flex-col bg-gray-950 border-gray-700 border-t lg:border-t-0 lg:border-l w-full lg:w-96 h-64 lg:h-auto shrink-0">
              <div className="flex bg-gray-800 border-gray-700 border-b">
                {["input", "output"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setIoTab(tab)}
                    className={`flex-1 px-4 py-3 text-sm font-semibold capitalize transition-colors border-b-2 ${
                      ioTab === tab
                        ? "border-white text-white"
                        : "border-transparent text-gray-400 hover:text-white"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="flex-1 p-4 min-h-0 overflow-auto">
                {ioTab === "input" ? (
                  <textarea
                    value={stdin}
                    onChange={(e) => setStdin(e.target.value)}
                    placeholder="Program input (stdin), one value per line"
                    spellCheck={false}
                    className="bg-transparent focus:outline-none w-full h-full font-mono text-gray-200 text-sm resize-none placeholder-gray-600"
                  />
                ) : (
                  <>
                    {output?.status && (
                      <p className="mb-2 text-gray-500 text-xs">
                        {output.status}
                        {output.time && ` · ${output.time}s`}
                      </p>
                    )}
                    <pre className="font-mono text-gray-200 text-sm whitespace-pre-wrap">
                      {running && "Running…"}
                      {!running &&
                        !output &&
                        "Press Run to see the output here."}
                      {output?.error}
                      {output?.compile_output}
                      {output?.stderr && (
                        <span className="text-red-400">{output.stderr}</span>
                      )}
                      {output?.stdout}
                    </pre>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <DrawingBoard ydoc={ydoc} />
        )}
      </section>
    </main>
  );
}

export default App;
