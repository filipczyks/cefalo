'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './page.module.css';

// Initialize IndexedDB
const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ImageGallery', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images', { keyPath: 'id' });
      }
    };
  });
};

export default function Home() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState([]);
  
  // New state for points and measurements
  const [points, setPoints] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  // Load saved images on component mount
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

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);

    if (selectedFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };

  const handleUpload = async (e) => {
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
        const imageData = {
          id: Date.now(),
          name: file.name,
          data: reader.result,
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
        e.target.reset();
        loadImages(); // Reload images list
      };

      reader.readAsDataURL(file);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.message || 'Error saving image'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const db = await initDB();
      const transaction = db.transaction(['images'], 'readwrite');
      const store = transaction.objectStore('images');
      await store.delete(id);
      loadImages(); // Reload images list
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  };

  // Function to calculate angle between three points
  const calculateAngle = (p1, p2, p3) => {
    const angle = Math.atan2(p3.y - p2.y, p3.x - p2.x) -
                 Math.atan2(p1.y - p2.y, p1.x - p2.x);
    let deg = angle * 180 / Math.PI;
    if (deg < 0) deg += 360;
    return Math.round(deg);
  };

  // Function to draw points and lines on canvas
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedImage) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw lines between points
    ctx.beginPath();
    ctx.strokeStyle = '#2196F3';
    ctx.lineWidth = 2;
    points.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.stroke();

    // Draw points
    points.forEach((point, index) => {
      ctx.beginPath();
      ctx.fillStyle = '#4CAF50';
      ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
      ctx.fill();
      
      // Add point number
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '12px Arial';
      ctx.fillText(index + 1, point.x, point.y);
    });

    // Calculate and display angles if we have at least 3 points
    if (points.length >= 3) {
      points.forEach((point, index) => {
        if (index > 0 && index < points.length - 1) {
          const prev = points[index - 1];
          const curr = point;
          const next = points[index + 1];
          const angle = calculateAngle(prev, curr, next);
          
          // Display angle
          ctx.fillStyle = '#FF5722';
          ctx.font = '14px Arial';
          ctx.fillText(`${angle}°`, curr.x + 15, curr.y + 15);
        }
      });
    }
  };

  // Handle canvas click for adding points
  const handleCanvasClick = (e) => {
    if (points.length >= 5) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setPoints([...points, { x, y }]);
  };

  // Effect to redraw canvas when points change
  useEffect(() => {
    drawCanvas();
  }, [points, selectedImage]);

  // Handle image selection for measurement
  const handleImageSelect = (image) => {
    setSelectedImage(image);
    setPoints([]);

    // Load image and set canvas size
    const img = new Image();
    img.src = image.data;
    img.onload = () => {
      const canvas = canvasRef.current;
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
    };
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
            {isLoading ? 'Saving...' : 'Save Image'}
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
          <h3>Measurement Tool</h3>
          <p>Click to add points (max 5). Lines will be drawn between points and angles will be calculated.</p>
          <div className={styles.canvasWrapper}>
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className={styles.measurementCanvas}
            />
          </div>
          <button 
            onClick={() => setPoints([])} 
            className={styles.resetButton}
          >
            Reset Points
          </button>
        </div>
      )}
    </main>
  );
} 