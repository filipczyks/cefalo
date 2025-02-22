'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './page.module.css';

interface Point {
  x: number;
  y: number;
}

interface ImageData {
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

// Add new interface for angle
interface Angle {
  points: [Point, Point, Point];
  value: number;
  name: string;
  description: string;
  isNew: boolean;
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
}

// Update point definitions for cephalometric landmarks
const POINT_DEFINITIONS: PointDefinition[] = [
  { id: 1, name: 'N', description: 'Nasion - Punkt nosowy' },
  { id: 2, name: 'S', description: 'Sella - Środek siodła tureckiego' },
  { id: 3, name: 'Or', description: 'Orbitale - Najniższy punkt oczodołu' },
  { id: 4, name: 'Po', description: 'Porion - Najwyższy punkt przewodu słuchowego zewnętrznego' },
  { id: 5, name: 'A', description: 'Punkt A - Najgłębszy punkt krzywizny szczęki' },
  { id: 6, name: 'B', description: 'Punkt B - Najgłębszy punkt krzywizny żuchwy' },
  { id: 7, name: 'Pg', description: 'Pogonion - Najbardziej wysunięty punkt bródki kostnej' },
  { id: 8, name: 'Gn', description: 'Gnathion - Najbardziej dolny punkt bródki' },
  { id: 9, name: 'Me', description: 'Menton - Najniższy punkt żuchwy' },
  { id: 10, name: 'Go', description: 'Gonion - Punkt na kącie żuchwy' },
  { id: 11, name: 'ANS', description: 'Kolec nosowy przedni' },
  { id: 12, name: 'PNS', description: 'Kolec nosowy tylny' },
  { id: 13, name: 'Ba', description: 'Basion - Najniższy punkt foramen magnum' },
  { id: 14, name: 'Ar', description: 'Articulare - Punkt przecięcia kości podstawy czaszki z tylnym zarysem wyrostka kłykciowego' },
  { id: 15, name: 'Pt', description: 'Pterygomaxillare - Punkt na tylnym zarysie szczeliny skrzydłowo-szczękowej' }
];

// Update angle definitions for cephalometric measurements
const ANGLE_DEFINITIONS: AngleDefinition[] = [
  {
    points: [1, 2, 3], // N-S-Or
    name: 'Kąt podstawy czaszki',
    description: 'Nachylenie podstawy czaszki przedniego dołu czaszkowego'
  },
  {
    points: [2, 1, 5], // S-N-A
    name: 'Kąt SNA',
    description: 'Położenie szczęki względem podstawy czaszki'
  },
  {
    points: [2, 1, 6], // S-N-B
    name: 'Kąt SNB',
    description: 'Położenie żuchwy względem podstawy czaszki'
  },
  {
    points: [5, 1, 6], // A-N-B
    name: 'Kąt ANB',
    description: 'Wzajemne położenie szczęki i żuchwy'
  },
  {
    points: [10, 14, 1], // Go-Ar-N
    name: 'Kąt gonialny',
    description: 'Kąt żuchwy'
  },
  {
    points: [1, 5, 7], // N-A-Pg
    name: 'Kąt wypukłości twarzy',
    description: 'Profil twarzy kostnej'
  },
  {
    points: [2, 10, 9], // S-Go-Me
    name: 'Kąt trzonu żuchwy',
    description: 'Nachylenie trzonu żuchwy do podstawy czaszki'
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

// Zaktualizuj interfejs ImageData dla funkcji applySobelFilter
interface SobelImageData extends ImageData {
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
          const gray = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
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

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState<ImageData[]>([]);
  const [points, setPoints] = useState<Point[]>([]);
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [angles, setAngles] = useState<Angle[]>([]);
  const [dragPoint, setDragPoint] = useState<number | null>(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [calibrationLine, setCalibrationLine] = useState<{ start: Point; end: Point }>({
    start: { x: 100, y: 100 },
    end: { x: 200, y: 100 }
  });
  const [scale, setScale] = useState<number | null>(null);
  const [gamma, setGamma] = useState(1);
  const [isSketch, setIsSketch] = useState(false);

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      const db = await initDB();
      const transaction = db.transaction(['images'], 'readonly');
      const store = transaction.objectStore('images');
      const request = store.getAll();

      request.onsuccess = () => {
        setImages(request.result);
      };
    } catch (error) {
      console.error('Error loading images:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setFile(null);
      setPreview(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setMessage({ type: 'error', text: 'Please select a file' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const imageData: ImageData = {
          id: Date.now(),
          name: file.name,
          data: reader.result as string,
          type: file.type,
          date: new Date().toISOString()
        };

        const db = await initDB();
        const transaction = db.transaction(['images'], 'readwrite');
        const store = transaction.objectStore('images');
        await store.add(imageData);

        setMessage({ type: 'success', text: 'Image saved successfully' });
        setFile(null);
        setPreview(null);
        (e.target as HTMLFormElement).reset();
        await loadImages();
        // Automatically select the uploaded image
        handleImageSelect(imageData);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Error saving image'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAngle = (p1: Point, p2: Point, p3: Point): number => {
    const angle = Math.atan2(p3.y - p2.y, p3.x - p2.x) -
                 Math.atan2(p1.y - p2.y, p1.x - p2.x);
    let deg = angle * 180 / Math.PI;
    if (deg < 0) deg += 360;
    // Zaokrąglij do 1 miejsca po przecinku i zwróć mniejszy kąt
    return Number((deg > 180 ? 360 - deg : deg).toFixed(1));
  };

  const calculateDefinedAngles = (currentPoints: Point[]) => {
    if (currentPoints.length < 2) return; // Potrzebujemy minimum 3 punktów do kąta

    const newAngles: Angle[] = [];

    // Sprawdź każdą definicję kąta
    ANGLE_DEFINITIONS.forEach(def => {
      const [p1Id, p2Id, p3Id] = def.points;
      
      // Sprawdź czy mamy wszystkie potrzebne punkty dla tego kąta
      if (currentPoints.length >= Math.max(p1Id, p2Id, p3Id)) {
        const p1 = currentPoints[p1Id - 1];
        const p2 = currentPoints[p2Id - 1];
        const p3 = currentPoints[p3Id - 1];
        
        if (p1 && p2 && p3) { // Upewnij się, że wszystkie punkty istnieją
          const angle: Angle = {
            points: [p1, p2, p3],
            value: calculateAngle(p1, p2, p3),
            name: def.name,
            description: def.description,
            isNew: true
          };
          newAngles.push(angle);
        }
      }
    });

    // Sortuj kąty alfabetycznie według nazwy
    newAngles.sort((a, b) => a.name.localeCompare(b.name));
    
    setAngles(newAngles);
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
      points.forEach((point, index) => {
        const def = POINT_DEFINITIONS[index];
        
        // Draw point
        ctx.beginPath();
        ctx.fillStyle = '#FF5722';
        ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI); // Mniejsze punkty dla większej precyzji
        ctx.fill();
        
        // Draw point border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // Draw point label with background
        const label = `${def.name}`;
        ctx.font = 'bold 14px Arial';
        const textMetrics = ctx.measureText(label);
        const padding = 3;
        
        // Draw label background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(
          point.x - textMetrics.width/2 - padding,
          point.y - 20 - padding,
          textMetrics.width + padding * 2,
          16 + padding * 2
        );
        
        // Draw label text
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, point.x, point.y - 20);
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

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
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
    const pointIndex = points.findIndex(point => {
      const distance = Math.sqrt(
        Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2)
      );
      return distance < 10;
    });

    if (pointIndex !== -1) {
      setDragPoint(pointIndex);
    } else if (points.length < POINT_DEFINITIONS.length) {
      setPoints(prev => [...prev, { x, y }]);
    } else {
      setMessage({ 
        type: 'error', 
        text: 'Wszystkie punkty zostały już ustawione. Możesz je przesuwać.' 
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragPoint === null) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    // Obsługa przeciągania punktów kalibracyjnych
    if (dragPoint === -1) {
      setCalibrationLine(prev => ({
        ...prev,
        start: { x, y }
      }));
      return;
    }
    if (dragPoint === -2) {
      setCalibrationLine(prev => ({
        ...prev,
        end: { x, y }
      }));
      return;
    }

    // Istniejąca logika dla punktów cefalometrycznych
    setPoints(prev => prev.map((point, index) => 
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

  const handleImageSelect = (image: ImageData) => {
    setSelectedImage(image);
    // Usuń linię resetującą punkty:
    // setPoints([]);

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

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Przerysuj punkty i kąty jeśli istnieją
      if (points.length > 0) {
        drawPoints();
        if (points.length === POINT_DEFINITIONS.length) {
          calculateDefinedAngles(points);
        }
      }
    };
  };

  const handleDelete = async (id: number) => {
    try {
      const db = await initDB();
      const transaction = db.transaction(['images'], 'readwrite');
      const store = transaction.objectStore('images');
      await store.delete(id);
      loadImages();
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  };

  const createSketch = (ctx: CanvasRenderingContext2D, imageData: ImageData) => {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const edge = 255 - brightness;
      data[i] = data[i + 1] = data[i + 2] = edge;
    }
    return imageData;
  };

  return (
    <main className={styles.main}>
      <h1>Photo Gallery & Measurement</h1>
      
      {message && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      <div className={styles.uploadContainer}>
        <form onSubmit={handleUpload}>
          <div className={styles.fileInputContainer}>
            <input
              type="file"
              onChange={handleFileChange}
              accept="image/*"
              id="file-input"
            />
            <label htmlFor="file-input" className={styles.fileInputLabel}>
              Choose a file
            </label>
          </div>

          {preview && (
            <div className={styles.previewContainer}>
              <img src={preview} alt="Preview" className={styles.previewImage} />
            </div>
          )}

          <button 
            type="submit" 
            disabled={!file || isLoading}
            className={styles.uploadButton}
          >
            {isLoading ? 'Saving...' : 'Upload'}
          </button>
        </form>
      </div>

      <div className={styles.gallery}>
        <h2>Saved Images</h2>
        <div className={styles.imageGrid}>
          {images.map((image) => (
            <div 
              key={image.id} 
              className={`${styles.imageCard} ${selectedImage?.id === image.id ? styles.selected : ''}`}
              onClick={() => handleImageSelect(image)}
            >
              <img src={image.data} alt={image.name} />
              <div className={styles.imageInfo}>
                <span>{image.name}</span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(image.id);
                  }}
                  className={styles.deleteButton}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedImage && (
        <div className={styles.measurementContainer}>
          {scale && (
            <div className={styles.scaleInfo}>
              1 cm = {scale.toFixed(2)} pikseli
            </div>
          )}
          <div className={styles.measurementGrid}>
            <div className={styles.canvasContainer}>
              <h3>Measurement Tool</h3>
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
              
              <p>Kliknij aby dodać punkty cefalometryczne ({points.length}/{POINT_DEFINITIONS.length})</p>
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
            </div>
            
            <PointsList 
              points={points} 
              definitions={POINT_DEFINITIONS}
              angles={angles}
            />
          </div>
        </div>
      )}
    </main>
  );
}
