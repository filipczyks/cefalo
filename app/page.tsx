'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './page.module.css';
import type { MouseEvent, ChangeEvent, FormEvent } from 'react';

interface Point {
  x: number;
  y: number;
}

interface CustomImageData {
  id: number;
  name: string;
  data: string;
  type: string;
  date: string;
}

interface Message {
  type: 'success' | 'error';
  text: string;
}

// Dodaj interfejs dla normy
interface AngleNorm {
  mean: number;  // wartość średnia
  deviation: number;  // odchylenie
}

// Zaktualizuj interfejs Angle
interface Angle {
  points: [Point, Point, Point];
  value: number;
  name: string;
  description: string;
  isNew: boolean;
  norm?: AngleNorm;  // dodaj normę
  deviation?: number;  // dodaj odchylenie od normy
}

// Add new interfaces for point meaning
interface PointDefinition {
  id: number;
  name: string;
  description: string;
}

interface AngleDefinition {
  points: [number, number, number]; // Point IDs that form the angle
  name: string;
  description: string;
  norm?: AngleNorm;
}

// Update point definitions for cephalometric landmarks
const POINT_DEFINITIONS: PointDefinition[] = [
  { id: 1, name: 'N', description: 'Nasion - Punkt nosowy' },
  { id: 2, name: 'S', description: 'Sella - Środek siodła tureckiego' },
  { id: 3, name: 'A', description: 'Punkt A - Najgłębszy punkt krzywizny szczęki' },
  { id: 4, name: 'B', description: 'Punkt B - Najgłębszy punkt krzywizny żuchwy' },
  { id: 5, name: 'Pg', description: 'Pogonion - Najbardziej wysunięty punkt bródki kostnej' },
  { id: 6, name: 'Go', description: 'Gonion - Punkt na kącie żuchwy' },
  { id: 7, name: 'Gn', description: 'Gnathion - Najbardziej dolny punkt bródki' },
  { id: 8, name: 'ANS', description: 'Kolec nosowy przedni' },
  { id: 9, name: 'PNS', description: 'Kolec nosowy tylny' },
  { id: 10, name: 'Ar', description: 'Articulare - Przecięcie podstawy czaszki z tylnym zarysem wyrostka kłykciowego' }
];

// Dodaj normy do definicji kątów
const ANGLE_DEFINITIONS: AngleDefinition[] = [
  {
    points: [2, 1, 3], // S-N-A
    name: 'Kąt SNA',
    description: 'Położenie szczęki względem podstawy czaszki',
    norm: { mean: 82, deviation: 2 }
  },
  {
    points: [2, 1, 4], // S-N-B
    name: 'Kąt SNB',
    description: 'Położenie żuchwy względem podstawy czaszki',
    norm: { mean: 80, deviation: 2 }
  },
  {
    points: [3, 1, 4], // A-N-B
    name: 'Kąt ANB',
    description: 'Wzajemne położenie szczęki i żuchwy',
    norm: { mean: 2, deviation: 2 }
  },
  {
    points: [6, 10, 1], // Go-Ar-N
    name: 'Kąt gonialny',
    description: 'Kąt żuchwy (norma: 130° ± 7°)'
  },
  {
    points: [8, 9, 6], // ANS-PNS-Go
    name: 'Kąt podstawy szczęki do żuchwy',
    description: 'Nachylenie płaszczyzny szczęki do żuchwy (norma: 25° ± 5°)'
  },
  {
    points: [1, 3, 5], // N-A-Pg
    name: 'Kąt wypukłości twarzy',
    description: 'Profil twarzy kostnej (norma: 0° ± 5°)'
  },
  {
    points: [1, 8, 6], // N-ANS-Go
    name: 'Kąt nachylenia szczęki',
    description: 'Nachylenie szczęki do podstawy czaszki (norma: 8° ± 3°)'
  },
  {
    points: [1, 7, 6], // N-Gn-Go
    name: 'Kąt osi Y',
    description: 'Kierunek wzrostu twarzy (norma: 59° ± 3°)'
  }
];

// Dodaj nowe interfejsy i stan
interface CalibrationLine {
  start: Point;
  end: Point | null;
}

// Dodaj funkcję initDB przed komponentem Home
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ImageGallery', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images', { keyPath: 'id' });
      }
    };
  });
};

// Dodaj funkcję pomocniczą do sprawdzania użycia punktu w kątach
const getAngleUsage = (pointId: number) => {
  return ANGLE_DEFINITIONS
    .filter(angle => angle.points.includes(pointId))
    .map(angle => angle.name);
};

// Zaktualizuj komponent PointsList
const PointsList = ({ points, definitions, angles }: { 
  points: Point[], 
  definitions: PointDefinition[],
  angles: Angle[]
}) => {
  const getDeviationColor = (deviation: number) => {
    if (Math.abs(deviation) <= 1) return '#38a169'; // zielony dla małych odchyleń
    if (Math.abs(deviation) <= 2) return '#d69e2e'; // żółty dla średnich
    return '#e53e3e'; // czerwony dla dużych odchyleń
  };

  return (
    <div className={styles.rightPanels}>
      <div className={styles.measurementsPanel}>
        <h3>Pomiary</h3>
        <div className={styles.anglesList}>
          {angles.map((angle, index) => (
            <div key={index} className={`${styles.angleItem} ${angle.isNew ? styles.newAngle : ''}`}>
              <div className={styles.angleInfo}>
                <span className={styles.angleName}>{angle.name}</span>
                <span className={styles.angleDescription}>{angle.description}</span>
                {angle.norm && (
                  <div className={styles.normInfo}>
                    <span className={styles.normValue}>
                      Norma: {angle.norm.mean}° ± {angle.norm.deviation}°
                    </span>
                    {angle.deviation !== undefined && (
                      <span 
                        className={styles.deviation}
                        style={{ color: getDeviationColor(angle.deviation) }}
                      >
                        Odchylenie: {angle.deviation > 0 ? '+' : ''}{angle.deviation.toFixed(1)}°
                      </span>
                    )}
                  </div>
                )}
              </div>
              <span className={styles.angleValue}>{angle.value}°</span>
            </div>
          ))}
          {angles.length === 0 && (
            <p className={styles.noAngles}>Ustaw punkty aby zobaczyć pomiary</p>
          )}
        </div>
      </div>

      <div className={styles.pointsPanel}>
        <h3>Lista punktów</h3>
        {definitions.map((def) => {
          const isSet = points.length > def.id - 1;
          return (
            <div 
              key={def.id} 
              className={`${styles.pointItem} ${isSet ? styles.pointSet : ''}`}
              title={def.description}
            >
              <div className={styles.pointHeader}>
                <span className={styles.pointName}>
                  {def.name}
                </span>
                <span className={styles.pointStatus}>
                  {isSet ? '✓' : '•'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Dodaj na początku pliku
interface SobelImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

// Zaktualizuj funkcję applySobelFilter
const applySobelFilter = (ctx: CanvasRenderingContext2D, imageData: SobelImageData) => {
  const pixels = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const output = ctx.createImageData(width, height);
  const outputData = output.data;

  // Sobel kernels
  const kernelX = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1]
  ];
  const kernelY = [
    [-1, -2, -1],
    [0, 0, 0],
    [1, 2, 1]
  ];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let pixelX = 0;
      let pixelY = 0;

      // Konwolucja z kernelem Sobela
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          const idx = ((y + i) * width + (x + j)) * 4;
          // Konwertuj wartości na number przed operacjami arytmetycznymi
          const r = Number(pixels[idx]);
          const g = Number(pixels[idx + 1]);
          const b = Number(pixels[idx + 2]);
          const gray = (r + g + b) / 3;
          pixelX += gray * kernelX[i + 1][j + 1];
          pixelY += gray * kernelY[i + 1][j + 1];
        }
      }

      // Oblicz magnitudę gradientu
      const magnitude = Math.sqrt(pixelX * pixelX + pixelY * pixelY);
      
      // Normalizuj i odwróć kolory (biały szkic na czarnym tle)
      const idx = (y * width + x) * 4;
      const edge = Math.min(255, magnitude);
      outputData[idx] = outputData[idx + 1] = outputData[idx + 2] = 255 - edge;
      outputData[idx + 3] = 255; // Alpha
    }
  }

  return output;
};

// Dodaj nowy komponent dla instrukcji
const PointInstruction = ({ currentPointIndex }: { currentPointIndex: number }) => {
  if (currentPointIndex >= POINT_DEFINITIONS.length) {
    return (
      <div className={styles.instruction}>
        Wszystkie punkty zostały zaznaczone
      </div>
    );
  }

  const point = POINT_DEFINITIONS[currentPointIndex];
  return (
    <div className={styles.instruction}>
      <div className={styles.instructionHeader}>
        Zaznacz punkt: <span className={styles.pointName}>{point.name}</span>
      </div>
      <div className={styles.instructionDescription}>
        {point.description}
      </div>
    </div>
  );
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [selectedImage, setSelectedImage] = useState<CustomImageData | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [angles, setAngles] = useState<Angle[]>([]);
  const [dragPoint, setDragPoint] = useState<number | null>(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [gamma, setGamma] = useState(1);
  const [isSketch, setIsSketch] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [calibrationLine, setCalibrationLine] = useState<{ start: Point; end: Point }>({
    start: { x: 100, y: 100 },
    end: { x: 200, y: 100 }
  });
  const [scale, setScale] = useState<number | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageData: CustomImageData = {
          id: Date.now(),
          name: selectedFile.name,
          data: reader.result as string,
          type: selectedFile.type,
          date: new Date().toISOString()
        };
        setSelectedImage(imageData);
        setupCanvas(imageData);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const setupCanvas = (image: CustomImageData) => {
    const img = new Image();
    img.src = image.data;
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const maxWidth = 800;
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Narysuj obraz od razu
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(100%)`;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.filter = 'none';

      // Zastosuj gamma jeśli potrzebne
      if (gamma !== 1) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        
        for (let i = 0; i < pixels.length; i += 4) {
          pixels[i] = 255 * Math.pow(pixels[i] / 255, gamma);
          pixels[i + 1] = 255 * Math.pow(pixels[i + 1] / 255, gamma);
          pixels[i + 2] = 255 * Math.pow(pixels[i + 2] / 255, gamma);
        }
        
        ctx.putImageData(imageData, 0, 0);
      }

      // Rysuj linię kalibracyjną
      ctx.beginPath();
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 2;
      ctx.moveTo(calibrationLine.start.x, calibrationLine.start.y);
      ctx.lineTo(calibrationLine.end.x, calibrationLine.end.y);
      ctx.stroke();

      // Rysuj punkty końcowe linii kalibracyjnej
      [calibrationLine.start, calibrationLine.end].forEach((point, i) => {
        ctx.beginPath();
        ctx.fillStyle = '#00FF00';
        ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(i === 0 ? '0' : '1cm', point.x, point.y - 8);
      });
    };
  };

  const drawPoints = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (selectedImage) {
      const img = new Image();
      img.src = selectedImage.data;
      
      // Zastosuj podstawowe filtry
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(100%)`;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.filter = 'none';

      // Zastosuj gamma jeśli potrzebne
      if (gamma !== 1) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        
        for (let i = 0; i < pixels.length; i += 4) {
          pixels[i] = 255 * Math.pow(pixels[i] / 255, gamma);
          pixels[i + 1] = 255 * Math.pow(pixels[i + 1] / 255, gamma);
          pixels[i + 2] = 255 * Math.pow(pixels[i + 2] / 255, gamma);
        }
        
        ctx.putImageData(imageData, 0, 0);
      }

      // Zastosuj filtr Sobela jeśli tryb szkicu jest włączony
      if (isSketch) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const edgeData = applySobelFilter(ctx, imageData as SobelImageData);
        ctx.putImageData(edgeData, 0, 0);
      }

      // Rysuj linię kalibracyjną
      ctx.beginPath();
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 2;
      ctx.moveTo(calibrationLine.start.x, calibrationLine.start.y);
      ctx.lineTo(calibrationLine.end.x, calibrationLine.end.y);
      ctx.stroke();

      // Rysuj punkty końcowe linii kalibracyjnej
      [calibrationLine.start, calibrationLine.end].forEach((point, i) => {
        ctx.beginPath();
        ctx.fillStyle = '#00FF00';
        ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(i === 0 ? '0' : '1cm', point.x, point.y - 8);
      });

      // Update point drawing style
      points.forEach((point: Point, index: number) => {
        const def = POINT_DEFINITIONS[index];
        
        // Draw point
        ctx.beginPath();
        ctx.fillStyle = '#FF5722';
        ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw point border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // Draw label with better styling
        const label = def.name;
        ctx.font = 'bold 14px Inter';
        const textMetrics = ctx.measureText(label);
        const padding = 6;
        const boxWidth = textMetrics.width + (padding * 2);
        const boxHeight = 22;
        const arrowSize = 4; // Zmniejszony rozmiar strzałki
        const tooltipGap = 8; // Mniejsza odległość od punktu
        
        // Calculate position for tooltip (closer to the point)
        const tooltipX = point.x - (boxWidth / 2);
        const tooltipY = point.y - tooltipGap - arrowSize;
        
        // Draw tooltip background
        ctx.fillStyle = 'rgba(33, 33, 33, 0.9)';
        
        // Draw main box
        ctx.beginPath();
        ctx.roundRect(tooltipX, tooltipY - boxHeight, boxWidth, boxHeight, 4);
        
        // Draw arrow (smaller and closer)
        ctx.moveTo(point.x - arrowSize, tooltipY);
        ctx.lineTo(point.x + arrowSize, tooltipY);
        ctx.lineTo(point.x, tooltipY + arrowSize);
        ctx.closePath();
        ctx.fill();
        
        // Draw label text
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, point.x, tooltipY - (boxHeight / 2));
      });

      // Draw measurement lines
      ANGLE_DEFINITIONS.forEach(angleDef => {
        if (points.length >= Math.max(...angleDef.points)) {
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(33, 150, 243, 0.7)';  // Semi-transparent blue
          ctx.lineWidth = 2;
          
          const p1 = points[angleDef.points[0] - 1];
          const p2 = points[angleDef.points[1] - 1];
          const p3 = points[angleDef.points[2] - 1];
          
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.lineTo(p3.x, p3.y);
          ctx.stroke();
        }
      });
    }
  };

  const handleMouseDown = (e: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    // Sprawdź czy kliknięcie jest blisko punktów kalibracyjnych
    const startDistance = Math.sqrt(
      Math.pow(calibrationLine.start.x - x, 2) + Math.pow(calibrationLine.start.y - y, 2)
    );
    const endDistance = Math.sqrt(
      Math.pow(calibrationLine.end.x - x, 2) + Math.pow(calibrationLine.end.y - y, 2)
    );

    if (startDistance < 10) {
      setDragPoint(-1); // -1 oznacza początek linii kalibracyjnej
      return;
    }
    if (endDistance < 10) {
      setDragPoint(-2); // -2 oznacza koniec linii kalibracyjnej
      return;
    }

    // Istniejąca logika dla punktów cefalometrycznych
    const pointIndex = points.findIndex((point: Point) => {
      const distance = Math.sqrt(
        Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2)
      );
      return distance < 10;
    });

    if (pointIndex !== -1) {
      setDragPoint(pointIndex);
    } else if (points.length < POINT_DEFINITIONS.length) {
      setPoints((prev: Point[]) => [...prev, { x, y }]);
    } else {
      setMessage({ 
        type: 'error', 
        text: 'Wszystkie punkty zostały już ustawione. Możesz je przesuwać.' 
      });
    }
  };

  const handleMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
    if (dragPoint === null) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    // Obsługa przeciągania punktów kalibracyjnych
    if (dragPoint === -1) {
      setCalibrationLine((prev: { start: Point; end: Point }) => ({
        ...prev,
        start: { x, y }
      }));
      return;
    }
    if (dragPoint === -2) {
      setCalibrationLine((prev: { start: Point; end: Point }) => ({
        ...prev,
        end: { x, y }
      }));
      return;
    }

    // Istniejąca logika dla punktów cefalometrycznych
    setPoints((prev: Point[]) => prev.map((point: Point, index: number) => 
      index === dragPoint ? { x, y } : point
    ));
  };

  const handleMouseUp = () => {
    setDragPoint(null);
  };

  useEffect(() => {
    if (selectedImage && points.length >= 2) { // Zmień warunek na minimum 2 punkty
      calculateDefinedAngles(points);
      drawPoints();
    }
  }, [points, selectedImage]);

  useEffect(() => {
    if (selectedImage) {
      drawPoints();
    }
  }, [
    points, 
    selectedImage, 
    brightness, 
    contrast, 
    gamma, 
    isSketch,
    calibrationLine,
  ]);

  useEffect(() => {
    if (calibrationLine.start && calibrationLine.end) {
      const pixelLength = Math.sqrt(
        Math.pow(calibrationLine.end.x - calibrationLine.start.x, 2) +
        Math.pow(calibrationLine.end.y - calibrationLine.start.y, 2)
      );
      setScale(pixelLength);
    }
  }, [calibrationLine]);

  const calculateAngle = (p1: Point, p2: Point, p3: Point): number => {
    const angle: number = Math.atan2(p3.y - p2.y, p3.x - p2.x) -
                Math.atan2(p1.y - p2.y, p1.x - p2.x);
    let deg: number = angle * (180 / Math.PI);
    if (deg < 0) deg += 360;
    return Math.round(deg);
  };

  const calculateDefinedAngles = (currentPoints: Point[]) => {
    if (currentPoints.length < 2) return;

    const newAngles: Angle[] = [];

    ANGLE_DEFINITIONS.forEach(def => {
      const [p1Id, p2Id, p3Id] = def.points;
      
      if (currentPoints.length >= Math.max(p1Id, p2Id, p3Id)) {
        const p1 = currentPoints[p1Id - 1];
        const p2 = currentPoints[p2Id - 1];
        const p3 = currentPoints[p3Id - 1];
        
        if (p1 && p2 && p3) {
          const value = calculateAngle(p1, p2, p3);
          const angle: Angle = {
            points: [p1, p2, p3],
            value,
            name: def.name,
            description: def.description,
            isNew: true,
            norm: def.norm
          };
          
          // Oblicz odchylenie od normy jeśli norma istnieje
          if (def.norm) {
            angle.deviation = value - def.norm.mean;
          }
          
          newAngles.push(angle);
        }
      }
    });

    newAngles.sort((a, b) => a.name.localeCompare(b.name));
    setAngles(newAngles);
  };

  return (
    <main className={styles.main}>
      <h1>Analiza cefalometryczna</h1>
      
      <div className={styles.measurementContainer}>
        <div className={styles.measurementGrid}>
          <div className={styles.canvasContainer}>
            <div className={styles.uploadSection}>
              {!selectedImage ? (
                <div className={styles.fileInput}>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept="image/*"
                    id="file-input"
                  />
                  <label htmlFor="file-input">
                    Wybierz zdjęcie cefalometryczne
                  </label>
                </div>
              ) : (
                <>
                  <div className={styles.imageControls}>
                    <div className={styles.controlGroup}>
                      <label htmlFor="brightness">Jasność: {brightness}%</label>
                      <input
                        type="range"
                        id="brightness"
                        min="0"
                        max="200"
                        value={brightness}
                        onChange={(e) => setBrightness(Number(e.target.value))}
                      />
                    </div>
                    <div className={styles.controlGroup}>
                      <label htmlFor="contrast">Kontrast: {contrast}%</label>
                      <input
                        type="range"
                        id="contrast"
                        min="0"
                        max="200"
                        value={contrast}
                        onChange={(e) => setContrast(Number(e.target.value))}
                      />
                    </div>
                    <div className={styles.controlGroup}>
                      <label htmlFor="gamma">Gamma: {gamma.toFixed(2)}</label>
                      <input
                        type="range"
                        id="gamma"
                        min="0.1"
                        max="2.5"
                        step="0.1"
                        value={gamma}
                        onChange={(e) => setGamma(Number(e.target.value))}
                      />
                    </div>
                    <div className={styles.controlButtons}>
                      <button 
                        onClick={() => setIsSketch(!isSketch)}
                        className={`${styles.sketchButton} ${isSketch ? styles.active : ''}`}
                      >
                        {isSketch ? 'Pokaż oryginał' : 'Pokaż szkic'}
                      </button>
                      <button 
                        onClick={() => {
                          setBrightness(100);
                          setContrast(100);
                          setGamma(1);
                          setIsSketch(false);
                        }}
                        className={styles.resetFiltersButton}
                      >
                        Reset filtrów
                      </button>
                    </div>
                  </div>
                  <PointInstruction currentPointIndex={points.length} />
                  <div className={styles.canvasWrapper}>
                    <canvas
                      ref={canvasRef}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      className={styles.measurementCanvas}
                    />
                  </div>
                  <button 
                    onClick={() => {
                      setPoints([]);
                      setMessage(null);
                    }} 
                    className={styles.resetButton}
                  >
                    Resetuj punkty
                  </button>
                </>
              )}
            </div>
          </div>
          
          {selectedImage && (
            <PointsList 
              points={points} 
              definitions={POINT_DEFINITIONS}
              angles={angles}
            />
          )}
        </div>
      </div>
    </main>
  );
}
