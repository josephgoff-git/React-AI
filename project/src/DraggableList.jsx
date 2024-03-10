import React, { useState, useRef, useEffect } from 'react';
import Draggable from 'react-draggable';
import { useHeightStore, useWidthStore, useXValStore, useYValStore } from './activitiesStore';

const ResizableDraggableBox = () => {
  var height = useHeightStore((state) => state.height);
  const setHeight = useHeightStore((state) => state.setHeight);

  var width = useWidthStore((state) => state.width);
  const setWidth = useWidthStore((state) => state.setWidth);

  var xVal = useXValStore((state) => state.xVal);
  const setXVal = useXValStore((state) => state.setXVal);

  var yVal = useYValStore((state) => state.yVal);
  const setYVal = useYValStore((state) => state.setYVal);

  let uix = 0
  let uiy = 0

  const handleResize = (newWidth, newHeight) => {
    setWidth(newWidth);
    setHeight(newHeight);

    // console.log("X: ", xVal)
    // console.log("Y: ", yVal)
    // console.log('Width:', newWidth);
    // console.log('Height:', newHeight);
  };

  const handleMouseDown = (e, direction) => {
    const isResizer = e.target.classList.contains('resizer'); // Check if the clicked element has the 'resizer' class

    if (!isResizer) {
      return; // Do nothing if it's not the resizer element
    }

    e.preventDefault();
    e.stopPropagation(); // Stop the event from propagating to the Draggable component

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = width;
    const startHeight = height;

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      if (direction === 'bottom-right') {
        const newX = startWidth + deltaX;
        const newY = startHeight + deltaY;
    
        handleResize(newX, newY);
      }
    };

    const handleMouseUp = () => {
      // setXVal(uix)
      // setYVal(uiy)
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const [screenWidth, setScreenWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const initialPositions = [
    // { x: 0 * screenWidth, y: 0 * screenWidth },
    { x: xVal, y: yVal},
  ];

  const handleDrag = (e, ui, index) => {
    // You can handle drag events if needed
    // For example, update the state with the new position
    // or perform any other actions based on the drag event
       setXVal(uix)
      setYVal(uiy)
  };

  return (
    <div style={{ width: '100%', height: 'calc(100vh - 41px - 60px)', position: 'relative' }}>
      {initialPositions.map((position, index) => (
        <Draggable
          key={index}
          bounds="parent"
          onDrag={(e, ui) => {
            // console.log("X: ", ui.x)
            // console.log("Y: ", ui.y)
            // console.log('Width:', width);
            // console.log('Height:', height);
            setXVal(ui.x)
            setYVal(ui.y)
            uix = ui.x
            uiy = ui.y
          }}
          defaultPosition={position}
        >
          <div
            style={{
              zIndex: 201,
              width: `${width}px`, // Set the width dynamically
              height: `${height}px`, // Set the height dynamically
              border: '1px solid black',
              padding: '10px',
              boxSizing: 'border-box',
              position: 'absolute',
              cursor: 'move',
            }}
          >
            <div
            className="resizer" 
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                marginBottom: "-5px",
                marginRight: "-5px",
                width: '12px',
                height: '12px',
                borderRadius: "50%",
                background: 'lightblue',
                cursor: 'se-resize',
              }}
              onMouseDown={(e) => handleMouseDown(e, 'bottom-right')}
            ></div>
            Drag me!
          </div>
        </Draggable>
      ))}
    </div>
  );
};

export default ResizableDraggableBox;