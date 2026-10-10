import { useRef, useState, useEffect } from "react";
import * as Y from "yjs";

function DrawingBoard({ ydoc }) {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState("pencil");
  const [color, setColor] = useState("#fff");
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPath, setCurrentPath] = useState([]);

  const yShapes = ydoc.getArray("shapes");
  const yElements = ydoc.getMap("elements");

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const handleResize = () => {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
      redrawCanvas();
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    yShapes.observe(() => redrawCanvas());
    yElements.observe(() => redrawCanvas());

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    yShapes.forEach((shape) => {
      drawShape(ctx, shape);
    });

    yElements.forEach((element) => {
      if (element.type === "text") {
        ctx.font = "16px sans-serif";
        ctx.fillStyle = element.color;
        ctx.fillText(element.text, element.x, element.y);
      }
    });
  };

  const drawShape = (ctx, shape) => {
    ctx.strokeStyle = shape.color;
    ctx.fillStyle = shape.color;
    ctx.lineWidth =
      shape.type === "pencil" && shape.color === "#ffffff" ? 20 : 2;
    ctx.lineCap =
      shape.type === "pencil" && shape.color === "#ffffff" ? "round" : "butt";
    ctx.beginPath();

    if (shape.type === "pencil") {
      if (shape.points.length > 0) {
        ctx.moveTo(shape.points[0].x, shape.points[0].y);
        shape.points.forEach((point) => ctx.lineTo(point.x, point.y));
        ctx.stroke();
      }
    } else if (shape.type === "rectangle") {
      ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
    } else if (shape.type === "circle") {
      ctx.arc(shape.x, shape.y, shape.radius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (shape.type === "line") {
      ctx.moveTo(shape.x1, shape.y1);
      ctx.lineTo(shape.x2, shape.y2);
      ctx.stroke();
    }
  };

  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e) => {
    setIsDrawing(true);
    const pos = getMousePos(e);
    setStartPos(pos);
    setCurrentPath([pos]);

    if (tool === "pencil") {
      // Don't push to yShapes yet, wait for mouse up
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;

    const pos = getMousePos(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (tool === "pencil") {
      setCurrentPath((prev) => [...prev, pos]);
      redrawCanvas();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (currentPath.length > 0) {
        ctx.moveTo(currentPath[0].x, currentPath[0].y);
        currentPath.forEach((point) => ctx.lineTo(point.x, point.y));
      }
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
    // else if (tool === "eraser") {
    //   redrawCanvas();
    //   ctx.strokeStyle = "#ffffff";
    //   ctx.lineWidth = 20;
    //   ctx.lineCap = "round";
    //   ctx.beginPath();
    //   if (currentPath.length > 0) {
    //     ctx.moveTo(currentPath[0].x, currentPath[0].y);
    //     currentPath.forEach((point) => ctx.lineTo(point.x, point.y));
    //   }
    //   ctx.lineTo(pos.x, pos.y);
    //   ctx.stroke();
    // }
    else if (tool === "rectangle" || tool === "circle" || tool === "line") {
      redrawCanvas();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      if (tool === "rectangle") {
        ctx.strokeRect(
          startPos.x,
          startPos.y,
          pos.x - startPos.x,
          pos.y - startPos.y,
        );
      } else if (tool === "circle") {
        const radius = Math.sqrt(
          Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2),
        );
        ctx.arc(startPos.x, startPos.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (tool === "line") {
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      }
    }
  };

  const handleMouseUp = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const pos = getMousePos(e);
    const finalPath = [...currentPath, pos];

    if (tool === "pencil") {
      const newShape = {
        type: "pencil",
        color,
        points: finalPath,
        id: Date.now(),
      };
      yShapes.push([newShape]);
    }
    // else if (tool === "eraser") {
    //   const newShape = {
    //     type: "pencil",
    //     color: "#ffffff",
    //     points: finalPath,
    //     id: Date.now(),
    //   };
    //   yShapes.push([newShape]);
    // }
    else if (tool === "rectangle") {
      const newShape = {
        type: "rectangle",
        color,
        x: startPos.x,
        y: startPos.y,
        width: pos.x - startPos.x,
        height: pos.y - startPos.y,
        id: Date.now(),
      };
      yShapes.push([newShape]);
    } else if (tool === "circle") {
      const radius = Math.sqrt(
        Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2),
      );
      const newShape = {
        type: "circle",
        color,
        x: startPos.x,
        y: startPos.y,
        radius,
        id: Date.now(),
      };
      yShapes.push([newShape]);
    } else if (tool === "line") {
      const newShape = {
        type: "line",
        color,
        x1: startPos.x,
        y1: startPos.y,
        x2: pos.x,
        y2: pos.y,
        id: Date.now(),
      };
      yShapes.push([newShape]);
    }

    redrawCanvas();
    setCurrentPath([]);
  };

  const clearCanvas = () => {
    yShapes.delete(0, yShapes.length);
    yElements.clear();
  };

  return (
    <div className="flex flex-col bg-white h-full">
      <div className="flex flex-wrap pl-16 items-center gap-2 bg-gray-900 p-4 border border-gray-800">
        <button
          onClick={() => setTool("pencil")}
          className={`px-4 py-2 rounded-lg font-semibold transition-all hover:scale-105 active:scale-95 ${
            tool === "pencil"
              ? "bg-white text-black shadow-md"
              : "bg-gray-800 text-white hover:bg-gray-700 border border-gray-700"
          }`}
        >
          ✏️ Pencil
        </button>
        {/* <button
          onClick={() => setTool("eraser")}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            tool === "eraser"
              ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
              : "bg-white/20 text-white hover:bg-white/30"
          }`}
        >
          🧹 Eraser
        </button> */}
        <button
          onClick={() => setTool("rectangle")}
          className={`px-4 py-2 rounded-lg font-semibold transition-all hover:scale-105 active:scale-95 ${
            tool === "rectangle"
              ? "bg-white text-black shadow-md"
              : "bg-gray-800 text-white hover:bg-gray-700 border border-gray-700"
          }`}
        >
          ⬜ Rectangle
        </button>
        <button
          onClick={() => setTool("circle")}
          className={`px-4 py-2 rounded-lg font-semibold transition-all hover:scale-105 active:scale-95 ${
            tool === "circle"
              ? "bg-white text-black shadow-md"
              : "bg-gray-800 text-white hover:bg-gray-700 border border-gray-700"
          }`}
        >
          ⭕ Circle
        </button>
        <button
          onClick={() => setTool("line")}
          className={`px-4 py-2 rounded-lg font-semibold transition-all hover:scale-105 active:scale-95 ${
            tool === "line"
              ? "bg-white text-black shadow-md"
              : "bg-gray-800 text-white hover:bg-gray-700 border border-gray-700"
          }`}
        >
          📏 Line
        </button>
        <div className="flex items-center gap-2 ml-4">
          <label className="font-medium text-white">Color:</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="border-2 border-gray-600 rounded-lg w-10 h-10 hover:scale-110 transition-transform cursor-pointer"
          />
        </div>
        <button
          onClick={clearCanvas}
          className="bg-gray-800 hover:bg-gray-700 active:bg-gray-600 shadow-md ml-auto px-4 py-2 border border-gray-700 rounded-lg font-semibold text-white hover:scale-105 active:scale-95 transition-all"
        >
          🗑️ Clear
        </button>
      </div>
      <div className="relative flex-1">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="w-full h-full cursor-crosshair"
        />
      </div>
    </div>
  );
}

export default DrawingBoard;
