import React, { useState, useRef, useEffect } from 'react';
import './App2.css'; 

const App2 = () => {
  const [position, setPosition] = useState(0); 
  const sliderRef = useRef(null);

  // Handle dragging (if needed, can be removed if only phone motion is used)
  const handleDrag = (event) => {
    const sliderWidth = sliderRef.current.offsetWidth;
    const newLeft = Math.min(
      Math.max(0, event.clientX - sliderRef.current.getBoundingClientRect().left),
      sliderWidth
    );
    setPosition(newLeft);
  };

  const handleMouseDown = () => {
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', () => {
      document.removeEventListener('mousemove', handleDrag);
    }, { once: true });
  };

  useEffect(() => {
    // Check if we need to request permission for motion sensors (iOS 13+)
    const requestMotionPermission = async () => {
      if (typeof DeviceMotionEvent.requestPermission === 'function') {
        try {
          const response = await DeviceMotionEvent.requestPermission();
          if (response === 'granted') {
            startTrackingMotion();
          } else {
            console.warn('Permission to access motion was denied.');
          }
        } catch (error) {
          console.error('Error requesting motion permission:', error);
        }
      } else {
        // For devices that don't require permission, just start tracking
        startTrackingMotion();
      }
    };

    const startTrackingMotion = () => {
      const handleMotion = (event) => {
        const { acceleration } = event;
        const sliderWidth = sliderRef.current ? sliderRef.current.offsetWidth : 0;

        // We use accelerationIncludingGravity.x for the x-axis movement
        const xAcceleration = acceleration?.x || 0;

        // Map phone movement to slider position
        const newLeft = Math.min(
          Math.max(0, position + xAcceleration * 10), // Adjust the multiplier (10) to tune sensitivity
          sliderWidth
        );
        setPosition(newLeft);
      };

      window.addEventListener('devicemotion', handleMotion);

      return () => {
        window.removeEventListener('devicemotion', handleMotion);
      };
    };

    // Request permission on mount
    requestMotionPermission();

  }, [position]);

  return (
    <>
      <div>Activity Right Now</div>
      <div className="slider-container">
        <div className="slider" ref={sliderRef}>
          <div
            className="slider-button"
            style={{ left: `${position}px` }}
            onMouseDown={handleMouseDown}
          />
        </div>
      </div>
    </>
  );
};

export default App2;